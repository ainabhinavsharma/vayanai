#!/usr/bin/env python3
"""
================================================================================
VayanAI — Dual-Account WhatsApp Candidate Enrollment Dispatcher
================================================================================
Purpose:
  Sends personalized WhatsApp selection notices to candidates from the VayanAI
  database, starting with the newest applications and progressing to the oldest.

Dual-Account Architecture:
  - Account 1 (Odd Serials):  .chrome_session_account1 (46 candidates)
  - Account 2 (Even Serials): .chrome_session_account2 (46 candidates)
  - Anti-Ban Pacing: 18s–35s randomized delay between messages.
  - Circuit Breaker: Pauses worker if 3 consecutive failures occur.
  - Multi-Run Queue: Automatically skips already sent candidates in subsequent runs.
================================================================================
"""

import os
import sys
import re
import csv
import time
import random
import sqlite3
import argparse
import urllib.parse
from datetime import datetime
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Paths and Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_PATH = PROJECT_ROOT / "data" / "vayanai.db"
LEDGER_PATH = PROJECT_ROOT / "data" / "payments_ledger.json"

# Default session directories from existing authenticated Chrome profiles
AIVARA_DIR = Path(r"C:\Users\user\Desktop\aivara\aivara")
DEFAULT_SESSION_ACC1 = AIVARA_DIR / ".chrome_session_account1"
DEFAULT_SESSION_ACC2 = AIVARA_DIR / ".chrome_session_account2"

ENROLL_PORTAL_URL = "https://vayanai.onrender.com/enroll"
WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/Kn6o6hMoFfc7rIVx0wgZt3"

MAX_MESSAGES_PER_ACCOUNT = 46
TOTAL_TARGET_CANDIDATES = MAX_MESSAGES_PER_ACCOUNT * 2  # 92
MAX_CONSECUTIVE_WA_FAILURES = 3


def clean_phone_number(raw_phone) -> str:
    """Normalize phone number to 12 digits (with 91 country code for Indian numbers)."""
    if not raw_phone:
        return ""
    digits = re.sub(r"\D", "", str(raw_phone))
    if digits.startswith("91") and len(digits) == 12:
        return digits
    if len(digits) == 10:
        return "91" + digits
    if digits.startswith("0") and len(digits) == 11:
        return "91" + digits[1:]
    return digits


def parse_applied_date(raw_date) -> datetime:
    """Parses application timestamps accurately across ISO and standard date formats."""
    if not raw_date:
        return datetime(1970, 1, 1)
    raw = str(raw_date).strip()
    if "T" in raw:
        clean = raw.split(".")[0].replace("Z", "")
        try:
            return datetime.fromisoformat(clean)
        except Exception:
            pass
    for fmt in ("%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt)
        except Exception:
            pass
    return datetime(1970, 1, 1)


# ---------------------------------------------------------------------------
# Database & Queue Management
# ---------------------------------------------------------------------------
def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db():
    conn = get_db_connection()
    # Active queue table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS whatsapp_dispatch (
            serial_no       INTEGER PRIMARY KEY,
            application_id  TEXT NOT NULL,
            user_name       TEXT NOT NULL,
            user_email      TEXT NOT NULL,
            clean_phone     TEXT NOT NULL,
            raw_phone       TEXT,
            track_name      TEXT,
            college_name    TEXT,
            applied_at      TEXT,
            account_group   TEXT NOT NULL,
            whatsapp_status TEXT DEFAULT 'PENDING',
            whatsapp_sent_at TEXT,
            whatsapp_error  TEXT
        )
    """)
    # Permanent sent history log (persists across runs and batches)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS whatsapp_sent_log (
            serial_no       INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id  TEXT UNIQUE NOT NULL,
            user_name       TEXT NOT NULL,
            user_email      TEXT NOT NULL,
            clean_phone     TEXT NOT NULL,
            raw_phone       TEXT,
            track_name      TEXT,
            college_name    TEXT,
            applied_at      TEXT,
            account_group   TEXT NOT NULL,
            whatsapp_sent_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def sync_sources_to_db(force_reseed: bool = False):
    init_db()
    conn = get_db_connection()

    existing_count = conn.execute("SELECT count(*) as count FROM whatsapp_dispatch").fetchone()["count"]

    if existing_count == 0 or force_reseed:
        load_next_batch(batch_size=TOTAL_TARGET_CANDIDATES)
    else:
        print(f"[*] Queue table currently has {existing_count} records. State preserved.")

    conn.close()
    export_queues_csv()


def load_next_batch(batch_size: int = TOTAL_TARGET_CANDIDATES):
    """
    Loads the next batch of remaining uncontacted candidates, ordered strictly
    chronologically descending (newest remaining applications first).
    All previously SENT candidates are permanently preserved in whatsapp_sent_log
    and excluded from receiving messages again.
    """
    init_db()
    conn = get_db_connection()

    # 1. Sync any existing SENT records in whatsapp_dispatch into whatsapp_sent_log
    sent_in_dispatch = conn.execute("""
        SELECT application_id, user_name, user_email, clean_phone, raw_phone, track_name, college_name, applied_at, account_group, whatsapp_sent_at
        FROM whatsapp_dispatch
        WHERE whatsapp_status = 'SENT'
    """).fetchall()

    for r in sent_in_dispatch:
        now_ts = r["whatsapp_sent_at"] or datetime.now().isoformat()
        conn.execute("""
            INSERT OR IGNORE INTO whatsapp_sent_log
            (application_id, user_name, user_email, clean_phone, raw_phone, track_name, college_name, applied_at, account_group, whatsapp_sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (r["application_id"], r["user_name"], r["user_email"], r["clean_phone"], r["raw_phone"], r["track_name"], r["college_name"], r["applied_at"], r["account_group"], now_ts))
    conn.commit()

    # 2. Get list of already sent identifiers (candidates who received message yesterday or in prior runs)
    sent_rows = conn.execute("SELECT user_email, clean_phone, application_id FROM whatsapp_sent_log").fetchall()
    sent_emails = set((r["user_email"] or "").strip().lower() for r in sent_rows if r["user_email"])
    sent_phones = set((r["clean_phone"] or "").strip() for r in sent_rows if r["clean_phone"])
    sent_app_ids = set((r["application_id"] or "").strip() for r in sent_rows if r["application_id"])

    # 3. Get list of already PAID or ENROLLED candidates (must NEVER receive initial invite)
    paid_rows = conn.execute("""
        SELECT id, user_email, phone 
        FROM intern_applications 
        WHERE status IN ('enrolled', 'deposit_paid', 'onboarded', 'deposit_pending_verification')
           OR (utr_number IS NOT NULL AND TRIM(utr_number) != '')
           OR (deposit_receipt IS NOT NULL AND TRIM(deposit_receipt) != '')
    """).fetchall()
    paid_emails = set((r["user_email"] or "").strip().lower() for r in paid_rows if r["user_email"])
    paid_phones = set(clean_phone_number(r["phone"]) for r in paid_rows if r["phone"])
    paid_ids = set((r["id"] or "").strip() for r in paid_rows if r["id"])

    # Also check payments table
    payments_rows = conn.execute("SELECT user_email FROM payments").fetchall()
    for pr in payments_rows:
        if pr["user_email"]:
            paid_emails.add(pr["user_email"].strip().lower())

    # Also check payments_ledger.json if present
    if LEDGER_PATH.exists():
        try:
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                ledger_items = json.load(f)
                if isinstance(ledger_items, list):
                    for item in ledger_items:
                        if item.get("userEmail"):
                            paid_emails.add(item["userEmail"].strip().lower())
                        if item.get("phone"):
                            p = clean_phone_number(item["phone"])
                            if p:
                                paid_phones.add(p)
        except Exception:
            pass

    # 4. Fetch all active candidates from intern_applications
    query = """
        SELECT id, user_name, user_email, phone, track_name, college_name, applied_at, status
        FROM intern_applications
        WHERE phone IS NOT NULL AND TRIM(phone) != '' 
          AND status NOT IN ('rejected', 'enrolled', 'deposit_paid', 'onboarded', 'deposit_pending_verification')
          AND (utr_number IS NULL OR TRIM(utr_number) = '')
    """
    all_candidates = [dict(r) for r in conn.execute(query).fetchall()]

    # Sort strictly chronologically: newest remaining FIRST
    all_candidates.sort(key=lambda r: (parse_applied_date(r.get("applied_at")), r.get("id", "")), reverse=True)

    # 5. Filter for uncontacted and unpaid
    eligible_remaining = []
    seen_phones = set(sent_phones) | paid_phones
    seen_emails = set(sent_emails) | paid_emails

    for cand in all_candidates:
        clean_phone = clean_phone_number(cand["phone"])
        clean_email = (cand["user_email"] or "").strip().lower()
        cand_id = (cand["id"] or "").strip()

        # Exclude if sent yesterday/previously
        if cand_id in sent_app_ids or clean_phone in sent_phones or clean_email in sent_emails:
            continue

        # Exclude if already paid/enrolled
        if cand_id in paid_ids or clean_phone in paid_phones or clean_email in paid_emails:
            continue

        if not clean_phone or len(clean_phone) < 10:
            continue
        if clean_phone in seen_phones or clean_email in seen_emails:
            continue

        seen_phones.add(clean_phone)
        seen_emails.add(clean_email)
        eligible_remaining.append(cand)

        if len(eligible_remaining) >= batch_size:
            break

    # 5. Clear current dispatch queue and load the new batch
    conn.execute("DELETE FROM whatsapp_dispatch")
    conn.commit()

    serial_no = 1
    for cand in eligible_remaining:
        clean_phone = clean_phone_number(cand["phone"])
        clean_email = (cand["user_email"] or "").strip().lower()
        name = (cand["user_name"] or "Candidate").strip()
        track = (cand["track_name"] or "Internship").strip()
        college = (cand["college_name"] or "").strip()
        applied_at = cand["applied_at"] or ""

        # Split Odd / Even across the 2 accounts
        account_group = "account1_odd" if (serial_no % 2 != 0) else "account2_even"

        conn.execute("""
            INSERT OR REPLACE INTO whatsapp_dispatch
            (serial_no, application_id, user_name, user_email, clean_phone, raw_phone, track_name, college_name, applied_at, account_group, whatsapp_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        """, (serial_no, cand["id"], name, clean_email, clean_phone, cand["phone"], track, college, applied_at, account_group))
        serial_no += 1

    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")

    acc1_count = conn.execute("SELECT count(*) as c FROM whatsapp_dispatch WHERE account_group = 'account1_odd'").fetchone()["c"]
    acc2_count = conn.execute("SELECT count(*) as c FROM whatsapp_dispatch WHERE account_group = 'account2_even'").fetchone()["c"]
    total_sent_so_far = len(sent_rows)
    total_apps = len(all_candidates)
    remaining_uncontacted = max(0, total_apps - total_sent_so_far - len(eligible_remaining))

    conn.close()
    export_queues_csv()

    print("\n" + "=" * 76)
    print("  VAYANAI — NEXT BATCH LOADED (NEWEST REMAINING FIRST)")
    print("=" * 76)
    print(f"  Successfully Sent in Previous Runs : {total_sent_so_far} candidates (Archived & Excluded)")
    print(f"  Queued for This Run                : {len(eligible_remaining)} candidates")
    print(f"    - Account 1 (Odd Serials)        : {acc1_count} candidates")
    print(f"    - Account 2 (Even Serials)       : {acc2_count} candidates")
    print(f"  Remaining After This Run           : {remaining_uncontacted} candidates")
    print("=" * 76)

    if eligible_remaining:
        print("\nNext 3 candidates to be messaged:")
        for cand in eligible_remaining[:3]:
            print(f"  - {cand['user_name']} | {cand['user_email']} | +{clean_phone_number(cand['phone'])} | Applied: {cand['applied_at']}")
        print()


def export_queues_csv():
    conn = get_db_connection()
    rows = [dict(r) for r in conn.execute("SELECT * FROM whatsapp_dispatch ORDER BY serial_no ASC").fetchall()]
    conn.close()

    master_csv = SCRIPT_DIR / "vayanai_whatsapp_master.csv"
    acc1_csv = SCRIPT_DIR / "vayanai_whatsapp_acc1.csv"
    acc2_csv = SCRIPT_DIR / "vayanai_whatsapp_acc2.csv"

    headers = [
        "serial_no", "application_id", "user_name", "user_email", "clean_phone", "raw_phone",
        "track_name", "college_name", "applied_at", "account_group", "whatsapp_status", "whatsapp_sent_at", "whatsapp_error"
    ]

    with open(master_csv, "w", newline="", encoding="utf-8-sig") as fm, \
         open(acc1_csv, "w", newline="", encoding="utf-8-sig") as f1, \
         open(acc2_csv, "w", newline="", encoding="utf-8-sig") as f2:

        wm = csv.DictWriter(fm, fieldnames=headers)
        w1 = csv.DictWriter(f1, fieldnames=headers)
        w2 = csv.DictWriter(f2, fieldnames=headers)

        wm.writeheader(); w1.writeheader(); w2.writeheader()

        for r in rows:
            wm.writerow(r)
            if r["account_group"] == "account1_odd":
                w1.writerow(r)
            else:
                w2.writerow(r)


def reset_failed_to_pending():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE whatsapp_dispatch SET whatsapp_status = 'PENDING', whatsapp_error = NULL WHERE whatsapp_status = 'FAILED'")
    count = c.rowcount
    conn.commit()
    conn.close()
    print(f"[OK] Reset {count} FAILED records back to PENDING.")
    export_queues_csv()


def print_overall_status():
    init_db()
    conn = get_db_connection()

    total_candidates = conn.execute("SELECT count(*) as c FROM intern_applications WHERE status != 'rejected'").fetchone()["c"]
    total_sent_log = conn.execute("SELECT count(*) as c FROM whatsapp_sent_log").fetchone()["c"]

    dispatch_pending = conn.execute("SELECT count(*) as c FROM whatsapp_dispatch WHERE whatsapp_status = 'PENDING'").fetchone()["c"]
    dispatch_sent = conn.execute("SELECT count(*) as c FROM whatsapp_dispatch WHERE whatsapp_status = 'SENT'").fetchone()["c"]
    dispatch_failed = conn.execute("SELECT count(*) as c FROM whatsapp_dispatch WHERE whatsapp_status = 'FAILED'").fetchone()["c"]

    sent_emails = set(r[0] for r in conn.execute("SELECT user_email FROM whatsapp_sent_log").fetchall() if r[0])
    sent_phones = set(r[0] for r in conn.execute("SELECT clean_phone FROM whatsapp_sent_log").fetchall() if r[0])

    all_apps = conn.execute("SELECT phone, user_email FROM intern_applications WHERE status != 'rejected'").fetchall()
    uncontacted_count = 0
    seen = set()
    for a in all_apps:
        ph = clean_phone_number(a["phone"])
        em = (a["user_email"] or "").strip().lower()
        if not ph or len(ph) < 10:
            continue
        if ph in sent_phones or em in sent_emails or ph in seen:
            continue
        seen.add(ph)
        uncontacted_count += 1

    conn.close()

    print("\n" + "=" * 76)
    print("  VAYANAI — WHATSAPP DISPATCH OVERALL PROGRESS STATUS")
    print("=" * 76)
    print(f"  Total Eligible Applicants in DB    : {total_candidates}")
    print(f"  Total Messages Sent So Far         : {total_sent_log} (Logged in permanent record)")
    print(f"  Current Active Queue               : {dispatch_pending + dispatch_sent + dispatch_failed} candidates")
    print(f"    - Pending in current queue       : {dispatch_pending}")
    print(f"    - Sent in current queue          : {dispatch_sent}")
    print(f"    - Failed in current queue        : {dispatch_failed}")
    print(f"  Total Uncontacted Candidates Left  : {uncontacted_count}")
    print("=" * 76 + "\n")


# ---------------------------------------------------------------------------
# Message Formatting
# ---------------------------------------------------------------------------
def format_whatsapp_message(cand: dict) -> str:
    cand_email = (cand.get("user_email") or cand.get("email") or "").strip().lower()

    return f"""🎉 *Selection Update – VayanAI Internship Program*

Dear Candidates,

We are pleased to inform you that *a few candidates have been shortlisted based on their profiles and application details* for the upcoming internship cohort.

📌 *Check Your Selection Status & Download Your Offer Letter:*
👉 {ENROLL_PORTAL_URL}

📧 *Your Registered Email to Check Status:*
👉 {cand_email}

*Steps to Follow:*
1️⃣ Visit the link above.
2️⃣ Enter your registered email address ({cand_email}) to check your selection status.
3️⃣ If selected, digitally sign your offer letter.
4️⃣ Download your digitally signed Offer Letter for your records.

💬 *Join Official WhatsApp Group for Real-Time Updates:*
👉 {WHATSAPP_GROUP_URL}

⚠️ *Important:* Please check your status at the earliest. Selection is profile-based, and only shortlisted candidates will be able to access their offer letters.

📩 *Have any queries?* Feel free to DM us for assistance.

Congratulations to all the selected candidates! 🎊

*Team VayanAI*"""


# ---------------------------------------------------------------------------
# WhatsApp Dispatch (Playwright Persistent Context)
# ---------------------------------------------------------------------------
def send_whatsapp_single(page, cand: dict) -> tuple[bool, str]:
    if page.is_closed():
        return False, "BROWSER_CLOSED"

    phone = cand.get("clean_phone") or clean_phone_number(cand.get("phone", ""))
    if not phone or len(phone) < 10:
        return False, "INVALID_PHONE"

    msg = format_whatsapp_message(cand)
    encoded_msg = urllib.parse.quote(msg)
    url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_msg}"

    try:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=35000)
        except Exception as e_nav:
            err_msg = str(e_nav).lower()
            if "closed" in err_msg:
                return False, f"BROWSER_CLOSED: {str(e_nav)}"

        t_start = time.time()
        sent = False
        while time.time() - t_start < 35:
            if page.is_closed():
                return False, "BROWSER_CLOSED"

            dialogs = page.query_selector_all("[role='dialog']")
            starting_chat = False
            for d in dialogs:
                try:
                    txt = d.inner_text().lower()
                    if any(term in txt for term in ["invalid", "not on whatsapp", "url is invalid", "couldn't find"]):
                        btn = d.query_selector("button")
                        if btn:
                            btn.click()
                        return False, "NOT_ON_WHATSAPP"
                    elif "starting chat" in txt:
                        starting_chat = True
                except Exception:
                    pass

            if starting_chat:
                time.sleep(1)
                continue

            # 1. Try finding and clicking Send button
            send_btn = page.query_selector('button[aria-label="Send"], button[data-testid="send"], button[data-testid="compose-btn-send"], span[data-icon="send"]')
            if send_btn:
                try:
                    time.sleep(0.5)
                    tag = page.evaluate("(el) => el.tagName.toLowerCase()", send_btn)
                    if tag != "button":
                        btn_parent = page.evaluate_handle("(el) => el.closest('button') || el", send_btn)
                        btn_parent.click()
                    else:
                        send_btn.click()
                    time.sleep(2)
                    sent = True
                    break
                except Exception:
                    pass

            # 2. Try focusing the chat message input box and pressing Enter
            chat_input = page.query_selector('footer div[contenteditable="true"], div[role="textbox"], div[contenteditable="true"][data-tab="10"]')
            if chat_input:
                try:
                    text_content = chat_input.inner_text().strip()
                    if text_content:
                        chat_input.focus()
                        time.sleep(0.5)
                        page.keyboard.press("Enter")
                        time.sleep(2)
                        sent = True
                        break
                except Exception:
                    pass

            time.sleep(1)

        if not sent:
            return False, "TIMEOUT_SEND_NOT_COMPLETED"

        return True, "SENT"
    except Exception as e:
        return False, f"ERROR: {str(e)}"


# ---------------------------------------------------------------------------
# Account Worker Process
# ---------------------------------------------------------------------------
def run_worker(account_group: str, delay_min: float = 18.0, delay_max: float = 35.0, auto_start: bool = True):
    init_db()

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM whatsapp_dispatch
        WHERE account_group = ? AND whatsapp_status = 'PENDING'
        ORDER BY serial_no ASC
        LIMIT ?
    """, (account_group, MAX_MESSAGES_PER_ACCOUNT))
    candidates = [dict(r) for r in c.fetchall()]
    conn.close()

    acc_num = 1 if account_group == "account1_odd" else 2
    session_dir = str(DEFAULT_SESSION_ACC1 if acc_num == 1 else DEFAULT_SESSION_ACC2)

    print("\n" + "=" * 76)
    print(f"  VAYANAI — WHATSAPP WORKER ACCOUNT {acc_num} ({account_group.upper()})")
    print(f"  Session Folder     : {session_dir}")
    print(f"  Queue Size         : {len(candidates)} candidates (Max cap: {MAX_MESSAGES_PER_ACCOUNT})")
    print(f"  Pacing Delay       : {delay_min}s – {delay_max}s randomized")
    print("=" * 76)

    if not candidates:
        print(f"[OK] No pending candidates for {account_group}. Queue complete!")
        return

    from playwright.sync_api import sync_playwright

    consecutive_wa_failures = 0
    delivered_count = 0

    try:
        with sync_playwright() as p:
            launch_args = [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-infobars",
                "--remote-debugging-port=0",
            ]

            browser = None
            try:
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    channel="chrome",
                    headless=False,
                    ignore_default_args=["--enable-automation"],
                    args=launch_args,
                )
            except Exception as e_chrome:
                print(f"[*] System Chrome failed ({e_chrome}). Launching bundled Chromium...")
                browser = p.chromium.launch_persistent_context(
                    user_data_dir=session_dir,
                    headless=False,
                    ignore_default_args=["--enable-automation"],
                    args=launch_args,
                )

            browser.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            page = browser.pages[0] if browser.pages else browser.new_page()
            page.on("dialog", lambda d: d.accept())

            print(f"\n[*] Opening WhatsApp Web for Account {acc_num}...")
            page.goto("https://web.whatsapp.com", wait_until="domcontentloaded", timeout=60000)

            print(f"[*] Checking session status for Account {acc_num}...")
            logged_in = False
            for _ in range(25):
                if page.is_closed():
                    break
                if page.query_selector("[aria-label='Chat list'], #pane-side, [data-testid='chat-list'], header"):
                    logged_in = True
                    break
                time.sleep(1)

            if logged_in or auto_start:
                print(f"[OK] Account {acc_num} WhatsApp session is active! Auto-starting in 3 seconds...")
                time.sleep(3)
            else:
                input(f"\n>>> Verify Account {acc_num} is logged into WhatsApp Web, then press [ENTER] to start: ")

            total = len(candidates)
            for idx, cand in enumerate(candidates, 1):
                s_no = cand["serial_no"]
                name = cand["user_name"]
                phone = cand["clean_phone"]
                email = cand["user_email"]

                # Refresh status from DB
                conn = get_db_connection()
                cur = conn.execute("SELECT whatsapp_status FROM whatsapp_dispatch WHERE serial_no = ?", (s_no,)).fetchone()
                conn.close()

                wa_status = cur["whatsapp_status"] if cur else "PENDING"
                if wa_status == "SENT":
                    print(f"  [{idx:2d}/{total}] SKIPPED: Serial #{s_no} ({name}) already sent.")
                    continue

                print(f"\n----------------------------------------------------------------------")
                print(f"  [{idx:2d}/{total}] Processing #{s_no}: {name} | Phone: +{phone} | Email: {email}")
                print(f"----------------------------------------------------------------------")

                wa_ok, wa_detail = send_whatsapp_single(page, cand)
                conn = get_db_connection()
                if wa_ok:
                    consecutive_wa_failures = 0
                    delivered_count += 1
                    print(f"  [WA SUCCESS] Delivered to {name} (+{phone}) | Total Sent: {delivered_count}/{total}")
                    now_iso = datetime.now().isoformat()
                    conn.execute("""
                        UPDATE whatsapp_dispatch 
                        SET whatsapp_status = 'SENT', whatsapp_sent_at = ?, whatsapp_error = NULL
                        WHERE serial_no = ?
                    """, (now_iso, s_no))
                    # Also log to permanent sent history
                    conn.execute("""
                        INSERT OR REPLACE INTO whatsapp_sent_log
                        (application_id, user_name, user_email, clean_phone, raw_phone, track_name, college_name, applied_at, account_group, whatsapp_sent_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (cand["application_id"], name, email, phone, cand.get("raw_phone"), cand.get("track_name"), cand.get("college_name"), cand.get("applied_at"), account_group, now_iso))
                else:
                    consecutive_wa_failures += 1
                    print(f"  [WA FAILED] Detail: {wa_detail} | Consecutive Failures: {consecutive_wa_failures}/{MAX_CONSECUTIVE_WA_FAILURES}")
                    conn.execute("""
                        UPDATE whatsapp_dispatch 
                        SET whatsapp_status = 'FAILED', whatsapp_error = ?
                        WHERE serial_no = ?
                    """, (wa_detail, s_no))

                conn.commit()
                conn.close()

                if consecutive_wa_failures >= MAX_CONSECUTIVE_WA_FAILURES:
                    print(f"\n[ALERT] Reached {MAX_CONSECUTIVE_WA_FAILURES} consecutive WhatsApp failures! Pausing worker for inspection.")
                    input(">>> Press [ENTER] when ready to resume: ")
                    consecutive_wa_failures = 0

                # Randomized safety pacing
                if idx < total:
                    sleep_time = random.uniform(delay_min, delay_max)
                    print(f"  [Pacing Delay] Sleeping {sleep_time:.1f}s before next contact...")
                    time.sleep(sleep_time)

            print(f"\n[OK] Worker for Account {acc_num} completed dispatch! ({delivered_count} messages sent)")
            export_queues_csv()

    except Exception as e_worker:
        print(f"\n[ERROR] Worker failed: {e_worker}")
        export_queues_csv()


def dry_run():
    init_db()
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM whatsapp_dispatch ORDER BY serial_no ASC").fetchall()
    conn.close()

    total = len(rows)
    acc1_rows = [dict(r) for r in rows if r["account_group"] == "account1_odd"]
    acc2_rows = [dict(r) for r in rows if r["account_group"] == "account2_even"]

    print("\n" + "=" * 76)
    print("  VAYANAI — DUAL WHATSAPP DISPATCH QUEUE SUMMARY (DRY RUN)")
    print("=" * 76)
    print(f"  Total Candidates in Queue : {total}")
    print(f"  Account 1 (Odd Serials)   : {len(acc1_rows)} candidates (Capped at {MAX_MESSAGES_PER_ACCOUNT})")
    print(f"  Account 2 (Even Serials)  : {len(acc2_rows)} candidates (Capped at {MAX_MESSAGES_PER_ACCOUNT})")
    print("=" * 76)

    print("\n--- FIRST 5 CANDIDATES FOR ACCOUNT 1 (ODD) ---")
    for r in acc1_rows[:5]:
        print(f"  #{r['serial_no']:2d} | {r['user_name']:<24} | {r['user_email']:<30} | +{r['clean_phone']}")

    print("\n--- FIRST 5 CANDIDATES FOR ACCOUNT 2 (EVEN) ---")
    for r in acc2_rows[:5]:
        print(f"  #{r['serial_no']:2d} | {r['user_name']:<24} | {r['user_email']:<30} | +{r['clean_phone']}")

    if rows:
        print("\n" + "=" * 76)
        print("  SAMPLE FORMATTED MESSAGE PREVIEW (CANDIDATE #1):")
        print("=" * 76)
        cand1 = dict(rows[0])
        print(f"Recipient: {cand1['user_name']} (+{cand1['clean_phone']})")
        print(f"Email    : {cand1['user_email']}")
        print(f"Account  : {cand1['account_group']}\n")
        msg = format_whatsapp_message(cand1)
        for i, line in enumerate(msg.split("\n"), 1):
            print(f"Line {i:2d}: {line}")
        print("=" * 76 + "\n")


def send_test_message(phone: str, account_num: int = 1):
    clean_phone = clean_phone_number(phone)
    if not clean_phone or len(clean_phone) < 10:
        print(f"[ERROR] Invalid phone number: {phone}")
        return

    sample_cand = {
        "user_name": "Test Candidate",
        "user_email": "test.applicant@example.com",
        "clean_phone": clean_phone,
        "track_name": "Full Stack Development",
        "college_name": "Demo Engineering College"
    }

    session_dir = str(DEFAULT_SESSION_ACC1 if account_num == 1 else DEFAULT_SESSION_ACC2)

    print("\n" + "=" * 76)
    print(f"  SENDING TEST WHATSAPP MESSAGE VIA ACCOUNT {account_num}")
    print(f"  Recipient Phone: +{clean_phone}")
    print(f"  Session Dir    : {session_dir}")
    print("=" * 76)

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=session_dir,
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        page = browser.pages[0] if browser.pages else browser.new_page()
        ok, detail = send_whatsapp_single(page, sample_cand)
        time.sleep(3)
        browser.close()

        if ok:
            print(f"\n[OK] Test message successfully delivered to +{clean_phone} via Account {account_num}!")
        else:
            print(f"\n[FAILED] Test delivery failed: {detail}")


def main():
    parser = argparse.ArgumentParser(description="VayanAI Dual WhatsApp Candidate Dispatcher")
    parser.add_argument("--init-db", action="store_true", help="Initialize database tables")
    parser.add_argument("--reseed", action="store_true", help="Force re-seed queue with newest applications")
    parser.add_argument("--next-batch", action="store_true", help="Load next batch of remaining uncontacted candidates")
    parser.add_argument("--status", action="store_true", help="Display overall campaign progress and counts")
    parser.add_argument("--dry-run", action="store_true", help="Display queue counts and sample message preview")
    parser.add_argument("--reset-failed", action="store_true", help="Reset FAILED records back to PENDING")
    parser.add_argument("--worker", choices=["account1", "account2"], help="Run dispatch worker for account1 or account2")
    parser.add_argument("--test-to", type=str, help="Send 1 test message to the specified phone number")
    parser.add_argument("--account", type=int, choices=[1, 2], default=1, help="Account number for test send (default: 1)")
    parser.add_argument("--delay-min", type=float, default=18.0, help="Minimum delay between messages in seconds")
    parser.add_argument("--delay-max", type=float, default=35.0, help="Maximum delay between messages in seconds")
    parser.add_argument("--auto-start", action="store_true", default=True, help="Auto start without extra prompt")

    args = parser.parse_args()

    if args.init_db:
        sync_sources_to_db(force_reseed=args.reseed)
    elif args.next_batch:
        load_next_batch()
    elif args.status:
        print_overall_status()
    elif args.reset_failed:
        reset_failed_to_pending()
    elif args.dry_run:
        dry_run()
    elif args.test_to:
        send_test_message(args.test_to, account_num=args.account)
    elif args.worker:
        account_group = "account1_odd" if args.worker == "account1" else "account2_even"
        run_worker(account_group, delay_min=args.delay_min, delay_max=args.delay_max, auto_start=args.auto_start)
    else:
        dry_run()


if __name__ == "__main__":
    main()
