"""BOTSKILL — Windows Outlook Candidate Dispatcher & Deliverability Guardian.

Integrates with local Windows Microsoft Outlook Desktop (pywin32) to dispatch
personalized Stage 2 Virtual Assessment interview invitations to genuine applicants
strictly through the designated Outlook account (manpreet@vayanai.in.net).
"""

from __future__ import annotations

import csv
import io
import logging
import os
import random
import re
import secrets
import sqlite3
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("botskill.mail_providers.candidate_dispatcher")

DEFAULT_SENDER_ACCOUNT = "manpreet@vayanai.in.net"
DEFAULT_BASE_URL = "https://vayanai.in.net"
DEFAULT_BATCH_START_DATE = "Monday, 2 November 2026"
DEFAULT_WHATSAPP_LINK = "https://chat.whatsapp.com/GQDe0hBYEWZ1k7ZKKeVXoi"
GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1koeFclx1MsMM_cQXk3hrU-JTLXlj3OGrDegQIG9-Zio/export?format=csv&gid=1670509518"
UDYAM_REG_NUMBER = "UDYAM-UP-29-0109046"

# Safety Pacing Defaults (Requested: 55s to 90s continuous random breaks)
DEFAULT_DELAY_MIN = 55.0
DEFAULT_DELAY_MAX = 90.0


def get_default_db_paths() -> List[str]:
    """Returns local and deployment database paths."""
    workspace_root = Path(__file__).resolve().parents[5]  # vayanai project root
    paths = [
        str(workspace_root / "data" / "vayanai.db"),
        str(workspace_root / "cpanel_deploy" / "data" / "vayanai.db"),
    ]
    return [p for p in paths if os.path.exists(p)]


class OutlookCandidateDispatcher:
    """Automates personalized candidate invitation dispatch via Windows Outlook COM."""

    def __init__(
        self,
        sender_email: str = DEFAULT_SENDER_ACCOUNT,
        base_url: str = DEFAULT_BASE_URL,
        whatsapp_url: str = DEFAULT_WHATSAPP_LINK,
        db_path: Optional[str] = None,
    ):
        if sys.platform != "win32":
            raise RuntimeError("OutlookCandidateDispatcher requires Windows OS with Outlook Desktop installed.")

        self.sender_email = sender_email.strip().lower()
        self.base_url = base_url.rstrip("/")
        self.whatsapp_url = whatsapp_url.strip()

        if db_path and os.path.exists(db_path):
            self.db_path = db_path
        else:
            db_candidates = get_default_db_paths()
            self.db_path = db_candidates[0] if db_candidates else "data/vayanai.db"

        self._outlook = None
        self._namespace = None
        self._account_obj = None
        self._store_outbox = None
        self._default_outbox = None

    def connect_outlook(self) -> Any:
        """Initializes Outlook COM session and binds strictly to sender account."""
        if self._account_obj is not None:
            return self._account_obj

        import win32com.client  # type: ignore

        self._outlook = win32com.client.Dispatch("Outlook.Application")
        self._namespace = self._outlook.GetNamespace("MAPI")

        found_account = None
        available_accounts: List[str] = []

        if hasattr(self._namespace, "Accounts"):
            for acc in self._namespace.Accounts:
                disp = str(getattr(acc, "DisplayName", "")).strip()
                smtp = str(getattr(acc, "SmtpAddress", "")).strip().lower()
                available_accounts.append(f"{disp} ({smtp})")

                if self.sender_email in disp.lower() or self.sender_email in smtp:
                    found_account = acc
                    break

        if not found_account:
            raise ValueError(
                f"Required Outlook account '{self.sender_email}' was not found in Outlook Desktop.\n"
                f"Available accounts in Outlook: {available_accounts}"
            )

        self._account_obj = found_account

        # Locate Outbox folders
        self._default_outbox = self._namespace.GetDefaultFolder(4)  # 4 = olFolderOutbox
        try:
            for st in self._namespace.Stores:
                if self.sender_email in st.DisplayName.lower():
                    root = st.GetRootFolder()
                    for f in root.Folders:
                        if f.Name.lower() == "outbox":
                            self._store_outbox = f
                            break
        except Exception:
            pass

        logger.info("Successfully bound to Outlook sender account: %s", self._account_obj.DisplayName)
        return self._account_obj

    def get_outbox_count(self) -> int:
        """Returns total number of items currently waiting in any Outbox folder."""
        self.connect_outlook()
        count = 0
        if self._store_outbox:
            try:
                count += self._store_outbox.Items.Count
            except Exception:
                pass
        if self._default_outbox:
            try:
                count += self._default_outbox.Items.Count
            except Exception:
                pass
        return count

    def wait_for_outbox_drain(self, timeout_sec: float = 30.0) -> bool:
        """Monitors the Outbox until the sent message clears or timeout occurs."""
        start = time.time()
        while time.time() - start < timeout_sec:
            out_count = self.get_outbox_count()
            if out_count == 0:
                return True
            time.sleep(1.0)
        return False

    def sync_google_form_submissions(self) -> int:
        """Fetches live Google Sheet CSV and ingests newly submitted applicants into all databases with matching tokens."""
        try:
            req = urllib.request.Request(
                GOOGLE_SHEET_CSV_URL,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VayanaiSheetSync/1.0"}
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                csv_text = resp.read().decode("utf-8", errors="ignore")

            reader = list(csv.DictReader(io.StringIO(csv_text)))
            now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            db_paths = get_default_db_paths()
            if not db_paths:
                db_paths = [self.db_path]

            # Read existing emails from primary DB
            primary_conn = sqlite3.connect(db_paths[0])
            p_cur = primary_conn.cursor()
            p_cur.execute("SELECT LOWER(user_email) FROM intern_applications")
            existing_emails = {row[0] for row in p_cur.fetchall()}
            primary_conn.close()

            new_applicants_to_insert = []
            seen_in_batch = set()

            for r in reader:
                email = (r.get("Email Address") or r.get("email") or "").strip().lower()
                name = (r.get("Name") or r.get("Full Name") or r.get("name") or "").strip()
                if not email or not name or email in existing_emails or email in seen_in_batch:
                    continue

                seen_in_batch.add(email)
                track = (r.get("Select Internship") or r.get("Track") or "Sustainable Regional Operations & Growth").strip()
                college = (r.get("College Name") or r.get("College") or "Verified University").strip()
                phone = (r.get("WhatsApp number ") or r.get("WhatsApp number") or r.get("Phone") or "").strip()
                cv_url = (r.get("Please Upload Your CV") or r.get("CV") or r.get("Resume") or "").strip()
                applied_at = r.get("Timestamp") or now_iso

                user_id = f"usr-{int(time.time()*1000)}-{secrets.token_hex(3)}"
                app_id = f"app-{int(time.time()*1000)}-{secrets.token_hex(3)}"
                magic_tok = secrets.token_hex(24)

                new_applicants_to_insert.append({
                    "user_id": user_id,
                    "app_id": app_id,
                    "name": name,
                    "email": email,
                    "phone": phone or None,
                    "college": college,
                    "track": track,
                    "cv_url": cv_url or None,
                    "magic_token": magic_tok,
                    "applied_at": applied_at,
                })

            if not new_applicants_to_insert:
                return 0

            # Insert identical records into all database paths
            for path in db_paths:
                conn = sqlite3.connect(path)
                conn.execute("PRAGMA foreign_keys = OFF;")
                cur = conn.cursor()
                try:
                    for item in new_applicants_to_insert:
                        cur.execute("SELECT id FROM users WHERE LOWER(email) = ?", (item["email"],))
                        u_row = cur.fetchone()
                        if not u_row:
                            cur.execute(
                                """
                                INSERT INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
                                VALUES (?, ?, 'N/A', 'N/A', ?, 'intern', ?, 'pending', ?, ?)
                                """,
                                (item["user_id"], item["email"], item["name"], item["phone"], now_iso, now_iso)
                            )
                            u_id = item["user_id"]
                        else:
                            u_id = u_row[0]

                        cur.execute("SELECT id FROM intern_applications WHERE LOWER(user_email) = ?", (item["email"],))
                        if not cur.fetchone():
                            cur.execute(
                                """
                                INSERT INTO intern_applications (
                                    id, user_id, user_name, user_email, phone, college_name, track_name,
                                    cv_url, status, magic_token, batch_start_date, applied_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, '2026-11-02', ?, ?)
                                """,
                                (
                                    item["app_id"], u_id, item["name"], item["email"], item["phone"],
                                    item["college"], item["track"], item["cv_url"],
                                    item["magic_token"], item["applied_at"], now_iso
                                )
                            )
                    conn.commit()
                finally:
                    conn.close()

            logger.info("Successfully ingested %d new Google Form applicant(s)", len(new_applicants_to_insert))
            return len(new_applicants_to_insert)

        except Exception as ex:
            logger.error("Failed to check Google Sheet for new submissions: %s", ex)
            return 0

    def get_queue_statistics(self) -> Dict[str, Any]:
        """Returns pending vs sent applicant statistics from the local SQLite database."""
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        try:
            cur.execute("SELECT COUNT(*) FROM intern_applications")
            total = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM intern_applications WHERE invite_sent_at IS NOT NULL")
            sent = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM intern_applications WHERE invite_sent_at IS NULL")
            pending = cur.fetchone()[0]

            # Last 1 hour dispatch count (normalized datetime comparison)
            cur.execute(
                "SELECT COUNT(*) FROM intern_applications WHERE datetime(invite_sent_at) >= datetime('now', '-1 hour')"
            )
            sent_last_hour = cur.fetchone()[0]

            return {
                "total_applicants": total,
                "sent_count": sent,
                "pending_count": pending,
                "sent_last_hour": sent_last_hour,
                "sender_account": self.sender_email,
                "whatsapp_community": self.whatsapp_url,
                "db_path": self.db_path,
            }
        finally:
            conn.close()

    def get_pending_applicants(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieves next pending candidates who have not yet received an interview invite."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        try:
            cur.execute(
                """
                SELECT id, user_id, user_name, user_email, phone, college_name, track_name,
                       magic_token, batch_start_date, applied_at, invite_sent_at
                FROM intern_applications
                WHERE invite_sent_at IS NULL
                ORDER BY rowid ASC
                LIMIT ?
                """,
                (limit,),
            )
            rows = [dict(r) for r in cur.fetchall()]
            return rows
        finally:
            conn.close()

    def mark_applicant_sent(self, candidate_id: str) -> None:
        """Marks candidate as invited with current UTC timestamp in all local/deploy databases."""
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        for path in get_default_db_paths():
            try:
                conn = sqlite3.connect(path)
                with conn:
                    conn.execute(
                        """
                        UPDATE intern_applications
                        SET invite_sent_at = ?, updated_at = ?
                        WHERE id = ?
                        """,
                        (now_iso, now_iso, candidate_id),
                    )
                conn.close()
            except Exception as ex:
                logger.warning("Could not update invite_sent_at in %s: %s", path, ex)

    def build_invite_payload(self, applicant: Dict[str, Any]) -> Tuple[str, str, str]:
        """Constructs text-forward, inbox-deliverability optimized email with assessment & WhatsApp links."""
        candidate_name = (applicant.get("user_name") or "Candidate").strip()
        track_name = (applicant.get("track_name") or "Sustainable Regional Operations & Growth").strip()
        college = (applicant.get("college_name") or "Verified University").strip()
        token = (applicant.get("magic_token") or "").strip()
        batch_date = applicant.get("batch_start_date") or DEFAULT_BATCH_START_DATE

        assessment_url = f"{self.base_url}/intern/assessment?token={token}"

        subject = f"Next Step: Virtual Assessment & Cohort Community | Vayanai ({track_name})"

        # Clean Text-Forward Plain Text Body (Zero spam markers)
        text_body = f"""Dear {candidate_name},

Thank you for applying for the {track_name} internship program at Vayanai for our upcoming cohort starting {batch_date}.

We have reviewed your application from {college}. The next step in our admissions process is completing your personalized online virtual assessment.

1. LAUNCH YOUR VIRTUAL ASSESSMENT (10-15 minutes):
Please open your personalized link below to complete the assessment in a single sitting:
{assessment_url}

Assessment Guidelines:
- Strict single-attempt sitting (cannot be paused or restarted once submitted).
- Requires 10 to 15 minutes of uninterrupted time.
- Video camera proctoring or camera-free focus mode are both supported with zero penalties.
- Structure: Briefing by virtual interviewer Ananya, followed by 8 situational and domain challenges.
- Please complete within 48 hours to be considered for final offer letter issuance.

2. JOIN THE OFFICIAL INTERN WHATSAPP COMMUNITY:
We have set up an official WhatsApp Community for applicants in this cohort to share updates, preparation materials, and batch announcements:
🔗 {self.whatsapp_url}

If you have any questions or require assistance, feel free to reply directly to this email or reach out in the WhatsApp group.

Warm regards,

Manpreet Singh
Talent Council & Operations Lead
Vayanai Platform (In partnership with DBERT Technical Council - MSME Udyam: {UDYAM_REG_NUMBER})
contactus@vayanai.in.net | manpreet@vayanai.in.net | {self.base_url}

----------------------------------------------------------------------
Compliance Notice: You received this email because you submitted an application for the Vayanai Internship & Incubation Program. If you did not apply or wish to withdraw, simply reply with "Withdraw".
"""

        # Ultra-Clean Text-Forward HTML (High text-to-code ratio, white background, no heavy spam blocks)
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; background-color: #ffffff; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; }}
    p {{ margin: 0 0 16px 0; }}
    .section-box {{ background-color: #f8faf9; border-left: 4px solid #0f5132; padding: 14px 18px; margin: 20px 0; border-radius: 0 6px 6px 0; }}
    .btn {{ display: inline-block; background-color: #0f5132; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 10px 0; }}
    .wa-box {{ background-color: #e7f7ed; border: 1px solid #c3e6cb; border-radius: 6px; padding: 14px 18px; margin: 20px 0; }}
    .wa-link {{ color: #155724; font-weight: bold; text-decoration: none; font-size: 14px; }}
    .footer {{ margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666666; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <p>Dear <strong>{candidate_name}</strong>,</p>
    <p>Thank you for applying for the <strong>{track_name}</strong> internship program at Vayanai for our upcoming cohort starting <strong>{batch_date}</strong>.</p>
    <p>We have reviewed your application from <strong>{college}</strong>. The next step in our admissions process is completing your personalized online virtual assessment.</p>

    <div class="section-box">
      <strong style="color: #0f5132; font-size: 15px;">Step 1: Complete Your Virtual Assessment</strong>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #333333;">
        &bull; <strong>Time required:</strong> 10 to 15 minutes in a single sitting.<br>
        &bull; <strong>Mode:</strong> Interactive scenario assessment with virtual panelist Ananya.<br>
        &bull; <strong>Proctoring:</strong> Webcam or camera-free focus mode both accepted.
      </p>
      <div style="margin-top: 12px;">
        <a href="{assessment_url}" class="btn">Launch Virtual Assessment &rarr;</a>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #555555;">
        Direct link: <a href="{assessment_url}" style="color: #0f5132; word-break: break-all;">{assessment_url}</a>
      </p>
    </div>

    <div class="wa-box">
      <strong style="color: #155724; font-size: 15px;">🔗 Step 2: Join the Official WhatsApp Community</strong>
      <p style="margin: 6px 0 10px 0; font-size: 14px; color: #155724;">
        Connect with fellow applicants and the Vayanai admissions council for cohort updates, preparation materials, and batch announcements:
      </p>
      <div>
        <a href="{self.whatsapp_url}" class="wa-link">&rarr; Click Here to Join Vayanai WhatsApp Community</a>
      </div>
      <div style="font-size: 12px; color: #444444; margin-top: 6px; word-break: break-all;">
        {self.whatsapp_url}
      </div>
    </div>

    <p>Please complete your assessment within 48 hours to be considered for final offer letter issuance.</p>
    <p>If you have any questions or require assistance, feel free to reply directly to this email or reach out in the WhatsApp community.</p>

    <p style="margin-top: 24px;">
      Warm regards,<br>
      <strong>Manpreet Singh</strong><br>
      Talent Council & Operations Lead &bull; Vayanai<br>
      <span style="font-size: 13px; color: #555555;">{self.sender_email} &bull; In partnership with DBERT Technical Council (MSME Udyam: {UDYAM_REG_NUMBER})</span>
    </p>

    <div class="footer">
      Compliance Notice: You received this email because you submitted an application for the Vayanai Internship & Incubation Program. If you wish to withdraw your application, simply reply to this email with "Withdraw".
    </div>
  </div>
</body>
</html>"""

        return subject, html_body, text_body

    def create_mail_item(self, applicant: Dict[str, Any], recipient_override: Optional[str] = None) -> Any:
        """Instantiates an Outlook MailItem bound to the sender account with dual HTML/text payload."""
        account = self.connect_outlook()
        mail = self._outlook.CreateItem(0)  # 0 = olMailItem

        # Strict Account Binding via COM DISPID 64209 & SentOnBehalfOfName
        try:
            mail._oleobj_.Invoke(*(64209, 0, 8, 0, account))
        except Exception:
            pass
        mail.SentOnBehalfOfName = self.sender_email

        recipient = recipient_override if recipient_override else applicant["user_email"]
        subject, html_body, text_body = self.build_invite_payload(applicant)

        mail.To = recipient
        mail.Subject = subject
        mail.Body = text_body
        mail.HTMLBody = html_body

        return mail

    def stage_draft(self, applicant: Dict[str, Any], recipient_override: Optional[str] = None) -> str:
        """Saves candidate email to Outlook Drafts folder without sending."""
        mail = self.create_mail_item(applicant, recipient_override=recipient_override)
        mail.Save()
        logger.info("Staged sample draft in Outlook Drafts for: %s", mail.To)
        return mail.To

    def send_single_invite(
        self,
        applicant: Dict[str, Any],
        recipient_override: Optional[str] = None,
        mark_db: bool = True,
        drain_timeout_sec: float = 30.0,
    ) -> bool:
        """Transmits single email via Outlook Desktop, ensures Outbox is drained, and updates DB."""
        mail = self.create_mail_item(applicant, recipient_override=recipient_override)
        candidate_email = mail.To

        # Physical Send via Outlook COM (never call mail.Save() here so nothing stays in Drafts!)
        mail.Send()

        # Check and wait for Outbox to drain so emails never pile up
        drained = self.wait_for_outbox_drain(timeout_sec=drain_timeout_sec)
        out_pending = self.get_outbox_count()
        if not drained and out_pending > 0:
            logger.warning("Message for %s is still in Outlook Outbox (%d items pending).", candidate_email, out_pending)

        if mark_db and not recipient_override:
            self.mark_applicant_sent(applicant["id"])

        logger.info("Dispatched invite via Outlook to %s (%s)", candidate_email, applicant.get("id"))
        return True

    def dispatch_batch(
        self,
        batch_size: int = 10,
        delay_min: float = DEFAULT_DELAY_MIN,
        delay_max: float = DEFAULT_DELAY_MAX,
    ) -> Dict[str, Any]:
        """Dispatches a controlled batch of pending candidates with continuous 55s-90s safety pauses."""
        candidates = self.get_pending_applicants(limit=batch_size)
        if not candidates:
            return {
                "success": True,
                "message": "All candidates have already received their assessment invitations! Queue is clear.",
                "dispatched": 0,
            }

        dispatched_ids = []
        for i, cand in enumerate(candidates, start=1):
            print(f"[{i}/{len(candidates)}] Sending invite to {cand['user_name']} ({cand['user_email']})...")
            self.send_single_invite(cand, mark_db=True)
            dispatched_ids.append(cand["id"])

            # Verify Outbox cleared
            out_items = self.get_outbox_count()
            if out_items == 0:
                print(f"  [OK] Outbox cleared: message transmitted to mail server.")
            else:
                print(f"  [INFO] Outlook Outbox currently holds {out_items} item(s); waiting for transport...")
                self.wait_for_outbox_drain(timeout_sec=20)

            # Pause between emails with visible countdown if more candidates remain
            if i < len(candidates):
                pause_sec = int(random.uniform(delay_min, delay_max))
                print(f"  [PAUSE] Resting for {pause_sec}s ({delay_min:.0f}s-{delay_max:.0f}s human jitter for inbox deliverability)...")
                for remaining in range(pause_sec, 0, -5):
                    print(f"    ... {remaining}s remaining before next applicant", end="\r", flush=True)
                    time.sleep(min(5, remaining))
                print("    ... ready for next send!                             ")

        stats = self.get_queue_statistics()
        return {
            "success": True,
            "dispatched": len(dispatched_ids),
            "candidate_ids": dispatched_ids,
            "remaining_pending": stats["pending_count"],
        }
