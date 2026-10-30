#!/usr/bin/env python3
"""
Vayanai Live Database Synchronizer (Local <-> cPanel)
-----------------------------------------------------
Synchronizes candidate records between local SQLite database and live cPanel server:
1. Pushes local email dispatch timestamps (invite_sent_at) to cPanel.
2. Pulls candidate assessment submissions, test scores, and proctoring logs from cPanel to local DB.
3. Keeps data/vayanai.db and cpanel_deploy/data/vayanai.db in 100% lockstep.

Usage:
  # Normal sync using CRON_SECRET or admin credentials:
  python scripts/sync_db_with_cpanel.py --secret YOUR_CRON_SECRET

  # Or sync using admin credentials:
  python scripts/sync_db_with_cpanel.py --admin admin@vayanai.in --password AdminSecure123!
"""

import sys
import os
import json
import sqlite3
import argparse
import urllib.request
import urllib.error
from pathlib import Path

DEFAULT_APP_URL = "https://vayanai.in.net"
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
LOCAL_DB = WORKSPACE_ROOT / "data" / "vayanai.db"
DEPLOY_DB = WORKSPACE_ROOT / "cpanel_deploy" / "data" / "vayanai.db"


def get_local_invited_candidates(db_path):
    """Retrieves list of candidates invited locally."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT user_email, invite_sent_at
            FROM intern_applications
            WHERE invite_sent_at IS NOT NULL
            """
        )
        return [{"email": r[0], "invite_sent_at": r[1]} for r in cur.fetchall()]
    finally:
        conn.close()


def get_admin_session_cookie(base_url, email, password):
    """Logs in to obtain session cookie if cron secret is not used."""
    url = f"{base_url.rstrip('/')}/api/v1/auth/signin"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VayanaiSync/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            cookie_header = resp.headers.get("Set-Cookie")
            return cookie_header
    except Exception as ex:
        print(f"[AUTH ERROR] Admin signin failed: {ex}")
        return None


def execute_server_sync(base_url, pushed_invites, cron_secret=None, cookie=None):
    """Calls POST /api/v1/portal/admin/interns/sync-state on cPanel."""
    url = f"{base_url.rstrip('/')}/api/v1/portal/admin/interns/sync-state"
    payload = json.dumps({"pushedInvites": pushed_invites}).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VayanaiSync/1.0",
    }
    if cron_secret:
        headers["X-Cron-Secret"] = cron_secret
    if cookie:
        headers["Cookie"] = cookie

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as ex:
        err_msg = ex.read().decode("utf-8", errors="ignore")
        return {"success": False, "error": f"HTTP {ex.code}: {err_msg}"}
    except Exception as ex:
        return {"success": False, "error": str(ex)}


def update_local_db_with_server_records(db_path, server_candidates):
    """Updates local database with assessment scores, answers, and status submitted on cPanel."""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    updated_submissions = 0
    try:
        for cand in server_candidates:
            email = (cand.get("user_email") or "").strip().lower()
            if not email:
                continue

            status = cand.get("status")
            score = cand.get("interview_score")
            answers = cand.get("interview_answers_json")
            telemetry = cand.get("proctoring_telemetry_json")
            dbert = cand.get("dbert_profile_json")
            feedback = cand.get("feedback_note")
            offer_id = cand.get("offer_letter_id")
            offer_sent = cand.get("offer_sent_at")
            deposit_rcpt = cand.get("deposit_receipt")
            deposit_paid = cand.get("deposit_paid_at")
            utr = cand.get("utr_number")

            # Only update if server has assessment progress
            if score is not None or status not in ("applied", "invited"):
                cur.execute(
                    """
                    UPDATE intern_applications
                    SET status = COALESCE(?, status),
                        interview_score = COALESCE(?, interview_score),
                        interview_answers_json = COALESCE(?, interview_answers_json),
                        proctoring_telemetry_json = COALESCE(?, proctoring_telemetry_json),
                        dbert_profile_json = COALESCE(?, dbert_profile_json),
                        feedback_note = COALESCE(?, feedback_note),
                        offer_letter_id = COALESCE(?, offer_letter_id),
                        offer_sent_at = COALESCE(?, offer_sent_at),
                        deposit_receipt = COALESCE(?, deposit_receipt),
                        deposit_paid_at = COALESCE(?, deposit_paid_at),
                        utr_number = COALESCE(?, utr_number),
                        updated_at = datetime('now')
                    WHERE LOWER(user_email) = ?
                    """,
                    (
                        status, score, answers, telemetry, dbert,
                        feedback, offer_id, offer_sent, deposit_rcpt, deposit_paid, utr,
                        email,
                    ),
                )
                if cur.rowcount > 0:
                    updated_submissions += 1

        conn.commit()
        return updated_submissions
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Vayanai Live Database Synchronizer")
    parser.add_argument("--url", default=DEFAULT_APP_URL, help=f"cPanel app URL (default: {DEFAULT_APP_URL})")
    parser.add_argument("--secret", default=os.environ.get("CRON_SECRET", "your_cron_secret_here"), help="CRON_SECRET header")
    parser.add_argument("--admin", default="", help="Admin email for login session")
    parser.add_argument("--password", default="", help="Admin password for login session")

    args = parser.parse_args()

    print("=" * 72)
    print("      VAYANAI DATABASE SYNCHRONIZER (LOCAL <-> CPANEL)")
    print(f"  Live Target Server : {args.url}")
    print(f"  Local Database     : {LOCAL_DB}")
    print("=" * 72)

    # 1. Gather local invited candidates
    pushed_invites = get_local_invited_candidates(LOCAL_DB)
    print(f"\n[1/3] Local database has {len(pushed_invites)} candidate(s) marked as invited.")

    # 2. Authenticate
    cookie = None
    if args.admin and args.password:
        print(f"  -> Logging in as admin: {args.admin}...")
        cookie = get_admin_session_cookie(args.url, args.admin, args.password)
        if not cookie:
            print("[ERROR] Could not authenticate with cPanel. Aborting.")
            sys.exit(1)

    # 3. Call Server Sync Endpoint
    print(f"[2/3] Synchronizing with live cPanel server at {args.url}...")
    res = execute_server_sync(args.url, pushed_invites, cron_secret=args.secret, cookie=cookie)

    if not res.get("success"):
        print(f"\n[SYNC FAILED] Server responded with error:")
        print(f"  {res.get('error')}")
        print("\nPossible solutions:")
        print("1. If you haven't uploaded the latest cpanel-vayanai-deployment.zip yet, upload it to public_html/ and visit:")
        print(f"   👉 {args.url}/fix-perms.php?extract=1")
        print("2. Ensure your CRON_SECRET in cPanel matches the --secret flag.")
        sys.exit(1)

    data = res.get("data", {})
    updated_invites_on_server = data.get("updatedInvitesCount", 0)
    server_candidates = data.get("candidates", [])
    print(f"  [OK] Server acknowledged sync: {updated_invites_on_server} invite timestamp(s) updated on cPanel.")
    print(f"  [OK] Received {len(server_candidates)} total candidate record(s) from cPanel.")

    # 4. Pull Server Submissions into Local Databases
    print("\n[3/3] Pulling latest candidate assessments, scores, and status into local database...")
    for p in (LOCAL_DB, DEPLOY_DB):
        if p.exists():
            updated = update_local_db_with_server_records(p, server_candidates)
            print(f"  -> Updated {updated} submission record(s) in: {p.name}")

    print("\n" + "=" * 72)
    print("               SYNCHRONIZATION COMPLETED SUCCESSFULLY!        ")
    print("=" * 72)
    print(f"  • Total Candidates in System   : {len(server_candidates)}")
    print(f"  • Pushed Local Invites to Live : {len(pushed_invites)}")
    print(f"  • Live Status Updated on Server: {updated_invites_on_server}")
    print("=" * 72 + "\n")


if __name__ == "__main__":
    main()
