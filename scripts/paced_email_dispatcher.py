#!/usr/bin/env python3
"""
Vayanai Paced Email Dispatcher & Deliverability Guardian
-------------------------------------------------------
Executes email dispatch at a controlled, non-spammy pace.
- Rate limits to a maximum of 60 emails per hour (standard cPanel hosting cap).
- Introduces randomized jitter/breaks between consecutive emails to prevent burst detection.
- Supports both direct local SQLite execution and remote live API trigger via HTTPS.

Usage:
  # Mode 1: Send immediate batch of 10 to applied applicants (bypassing 2h queue):
  python scripts/paced_email_dispatcher.py --immediate --secret YOUR_CRON_SECRET --batch 10

  # Mode 2: Run continuous paced daemon (~1 email/min up to 60/hr):
  python scripts/paced_email_dispatcher.py --immediate --continuous --secret YOUR_CRON_SECRET
"""

import sys
import os
import time
import random
import argparse
import json
import urllib.request
import urllib.error

DEFAULT_BASE_URL = "https://vayanai.in.net"

def trigger_remote_dispatch(base_url, cron_secret, action="dispatch_due", limit=10, delay_min=3.0, delay_max=8.0):
    endpoint = f"{base_url.rstrip('/')}/api/v1/portal/admin/interns/dispatch"
    payload = json.dumps({
        "action": action,
        "limit": limit,
        "delayMin": delay_min,
        "delayMax": delay_max,
        "ignoreSchedule": action in ("dispatch_all", "dispatch_immediate")
    }).encode("utf-8")

    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Cron-Secret": cron_secret,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VayanaiPacingBot/1.0"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        return {"success": False, "error": f"HTTP {e.code}: {err_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def trigger_remote_purge(base_url, cron_secret):
    endpoint = f"{base_url.rstrip('/')}/api/v1/portal/admin/interns/purge-demo"
    req = urllib.request.Request(
        endpoint,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "X-Cron-Secret": cron_secret,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VayanaiPacingBot/1.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        return {"success": False, "error": f"HTTP {e.code}: {err_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def trigger_remote_sync(base_url, cron_secret):
    endpoint = f"{base_url.rstrip('/')}/api/v1/portal/admin/interns/sync"
    req = urllib.request.Request(
        endpoint,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "X-Cron-Secret": cron_secret,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VayanaiPacingBot/1.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="Vayanai Paced Email Dispatcher")
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help="Base app URL (default: https://vayanai.in.net)")
    parser.add_argument("--secret", default=os.environ.get("CRON_SECRET", ""), help="CRON_SECRET for authentication")
    parser.add_argument("--purge", action="store_true", help="Purge all demo/mock records from the database and retain only genuine Google Form applicants")
    parser.add_argument("--sync", action="store_true", help="Sync Google Sheet before dispatching")
    parser.add_argument("--immediate", action="store_true", help="Bypass 2-hour queue and send invites immediately to all applied candidates")
    parser.add_argument("--batch", type=int, default=10, help="Batch limit per execution (default: 10)")
    parser.add_argument("--delay-min", type=float, default=3.0, help="Min jitter delay in seconds (default: 3.0)")
    parser.add_argument("--delay-max", type=float, default=8.0, help="Max jitter delay in seconds (default: 8.0)")
    parser.add_argument("--continuous", action="store_true", help="Run continuously in background with 55s average pacing")

    args = parser.parse_args()

    if not args.secret:
        print("[ERROR] Please provide --secret <CRON_SECRET> or set CRON_SECRET environment variable.")
        sys.exit(1)

    dispatch_action = "dispatch_all" if args.immediate else "dispatch_due"

    print("==================================================================")
    print(" VAYANAI PACED EMAIL DISPATCHER & DELIVERABILITY GUARDIAN")
    print(f" Target Domain: {args.url}")
    print(f" Dispatch Mode: {'IMMEDIATE (All Applied)' if args.immediate else 'SCHEDULED DUE (Past 2h)'}")
    print(f" Safety Pacing: Max 60 emails/hr | Random Break: {args.delay_min}s - {args.delay_max}s")
    print("==================================================================")

    if args.purge:
        print("\n[*] Purging demo records and synchronizing genuine Google Sheet entries...")
        purge_res = trigger_remote_purge(args.url, args.secret)
        if purge_res.get("success"):
            print(f"  -> Success: {purge_res.get('data', {}).get('message')}")
        else:
            print(f"  -> Purge failed: {purge_res.get('error')}")

    if args.sync:
        print("\n[1/2] Synchronizing with Google Sheet submissions...")
        sync_res = trigger_remote_sync(args.url, args.secret)
        if sync_res.get("success"):
            print(f"  -> Success: {sync_res.get('data', {}).get('message')}")
        else:
            print(f"  -> Sync failed: {sync_res.get('error')}")

    if not args.continuous:
        print(f"\n[2/2] Triggering paced dispatch batch (action={dispatch_action}, limit={args.batch})...")
        res = trigger_remote_dispatch(args.url, args.secret, action=dispatch_action, limit=args.batch, delay_min=args.delay_min, delay_max=args.delay_max)
        print("Dispatch Response:")
        print(json.dumps(res, indent=2))
        return

    # Continuous Daemon Mode: loops safely at ~1 email/min
    print(f"\n[DAEMON MODE] Starting continuous pacing loop ({dispatch_action}, averaging ~55s per email)...")
    try:
        while True:
            res = trigger_remote_dispatch(args.url, args.secret, action=dispatch_action, limit=1, delay_min=0, delay_max=0)
            if res.get("success"):
                data = res.get("data", {})
                count = data.get("dispatchedCount", 0)
                sent_hour = data.get("sentInLastHour", 0)
                limit_hour = data.get("hourlyLimit", 60)
                errors = data.get("errors")
                if count > 0:
                    cand_id = data.get("candidateIds", [""])[0]
                    print(f"[{time.strftime('%X')}] [OK] Dispatched invite to {cand_id} | Hourly Usage: {sent_hour}/{limit_hour}")
                    pause = random.uniform(45.0, 75.0)
                    print(f"  -> Random pause: {pause:.1f}s before next candidate...")
                    time.sleep(pause)
                elif errors:
                    print(f"[{time.strftime('%X')}] [DELIVERY NOTICE] {errors[0]}")
                    print("  -> Retrying in 30s...")
                    time.sleep(30)
                else:
                    if sent_hour >= limit_hour:
                        print(f"[{time.strftime('%X')}] [PAUSE] Hourly quota reached ({sent_hour}/{limit_hour}). Sleeping 5 minutes...")
                        time.sleep(300)
                    else:
                        print(f"[{time.strftime('%X')}] [IDLE] No pending candidates awaiting dispatch. Checking again in 60s...")
                        time.sleep(60)
            else:
                print(f"[{time.strftime('%X')}] [ERROR] Dispatch error: {res.get('error')}. Retrying in 30s...")
                time.sleep(30)
    except KeyboardInterrupt:
        print("\n[DAEMON STOPPED] Clean exit.")

if __name__ == "__main__":
    main()
