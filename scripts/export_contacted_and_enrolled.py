#!/usr/bin/env python3
"""
VayanAI — Master Contacted & Enrolled Candidates Exporter
---------------------------------------------------------
Exports a unified, deduplicated list of all candidates who have:
1. Been sent a WhatsApp invitation message (136 candidates in whatsapp_sent_log)
2. Completed enrollment / caution deposit payment (16 candidates in payments_ledger.json)

Output file: data/vayanai_contacted_and_enrolled_interns.csv
"""

import sqlite3
import json
import csv
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "vayanai.db"
LEDGER_PATH = PROJECT_ROOT / "data" / "payments_ledger.json"
OUTPUT_CSV = PROJECT_ROOT / "data" / "vayanai_contacted_and_enrolled_interns.csv"

def clean_phone(raw_phone: str) -> str:
    if not raw_phone:
        return ""
    digits = "".join(filter(str.isdigit, str(raw_phone)))
    if len(digits) == 10:
        return "91" + digits
    if digits.startswith("0") and len(digits) == 11:
        return "91" + digits[1:]
    return digits

def main():
    print("=" * 78)
    print("  EXPORTING CONTACTED & ENROLLED INTERNS AUDIT LIST")
    print("=" * 78)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. Fetch all sent from whatsapp_sent_log
    sent_rows = c.execute("""
        SELECT 
            application_id, user_name, user_email, clean_phone, raw_phone,
            track_name, college_name, applied_at, account_group, whatsapp_sent_at
        FROM whatsapp_sent_log
        ORDER BY serial_no ASC
    """).fetchall()
    print(f"Loaded {len(sent_rows)} sent records from whatsapp_sent_log.")

    # 2. Fetch all enrolled from payments_ledger.json
    ledger = []
    if LEDGER_PATH.exists():
        with open(LEDGER_PATH, "r", encoding="utf-8") as f:
            ledger = json.load(f)
    print(f"Loaded {len(ledger)} enrolled records from payments_ledger.json.")

    # Map enrolled by email and clean phone
    enrolled_by_email = {}
    enrolled_by_phone = {}
    for item in ledger:
        if item.get("status") not in ("enrolled", "deposit_paid", "onboarded"):
            continue
        em = (item.get("userEmail") or "").strip().lower()
        ph10 = "".join(filter(str.isdigit, str(item.get("phone", ""))))[-10:]
        if em:
            enrolled_by_email[em] = item
        if ph10:
            enrolled_by_phone[ph10] = item

    # Also build dictionary of applications from intern_applications
    apps_dict = {}
    for r in c.execute("SELECT id, user_name, user_email, phone, track_name, college_name, offer_letter_id, deposit_receipt, utr_number FROM intern_applications").fetchall():
        em = (r["user_email"] or "").strip().lower()
        if em:
            apps_dict[em] = dict(r)

    conn.close()

    # 3. Build unified master list
    unified_records = {}

    # First, insert all enrolled interns
    for item in ledger:
        if item.get("status") not in ("enrolled", "deposit_paid", "onboarded"):
            continue
        em = (item.get("userEmail") or "").strip().lower()
        ph = clean_phone(item.get("phone", ""))
        ph10 = ph[-10:] if len(ph) >= 10 else ""

        key = em if em else ph10
        unified_records[key] = {
            "category": "ENROLLED_INTERN",
            "candidate_name": item.get("userName", ""),
            "registered_email": item.get("userEmail", ""),
            "phone_number": ph,
            "internship_track": item.get("trackName", ""),
            "college_institution": item.get("collegeName", ""),
            "enrollment_status": "ENROLLED & CONFIRMED",
            "caution_deposit_status": "₹499 PAID (VERIFIED)",
            "utr_payment_proof": item.get("utrNumber", ""),
            "official_receipt_number": item.get("receiptNumber", ""),
            "offer_letter_id": item.get("offerLetterId", ""),
            "whatsapp_invite_status": "NOT_APPLICABLE",
            "whatsapp_invite_sent_at": "",
            "enrolled_at": item.get("depositPaidAt", item.get("createdAt", "")),
            "batch_start_date": item.get("batchStartDate", "2026-11-02")
        }

    # Next, merge all sent candidates
    for r in sent_rows:
        em = (r["user_email"] or "").strip().lower()
        ph = clean_phone(r["clean_phone"])
        ph10 = ph[-10:] if len(ph) >= 10 else ""
        key = em if em else ph10

        app_info = apps_dict.get(em, {})

        if key in unified_records:
            # Candidate was sent a message AND has enrolled!
            unified_records[key]["category"] = "ENROLLED_AND_MESSAGED"
            unified_records[key]["whatsapp_invite_status"] = f"DELIVERED ({r['account_group']})"
            unified_records[key]["whatsapp_invite_sent_at"] = r["whatsapp_sent_at"]
        else:
            # Candidate was sent a message, pending enrollment
            unified_records[key] = {
                "category": "WHATSAPP_INVITE_SENT",
                "candidate_name": r["user_name"],
                "registered_email": r["user_email"],
                "phone_number": ph,
                "internship_track": r["track_name"] or app_info.get("track_name", ""),
                "college_institution": r["college_name"] or app_info.get("college_name", ""),
                "enrollment_status": "INVITED (AWAITING ENROLLMENT)",
                "caution_deposit_status": "PENDING",
                "utr_payment_proof": "",
                "official_receipt_number": "",
                "offer_letter_id": app_info.get("offer_letter_id", ""),
                "whatsapp_invite_status": f"DELIVERED ({r['account_group']})",
                "whatsapp_invite_sent_at": r["whatsapp_sent_at"],
                "enrolled_at": "",
                "batch_start_date": "2026-11-02"
            }

    # Sort: Enrolled interns first (by name), then sent candidates by invite timestamp descending
    all_rows = list(unified_records.values())
    all_rows.sort(key=lambda x: (
        0 if "ENROLLED" in x["category"] else 1,
        x["whatsapp_invite_sent_at"] if x["whatsapp_invite_sent_at"] else x["enrolled_at"]
    ))

    # Add serial numbers
    for idx, r in enumerate(all_rows, 1):
        r["serial_no"] = idx

    fieldnames = [
        "serial_no",
        "category",
        "candidate_name",
        "registered_email",
        "phone_number",
        "internship_track",
        "college_institution",
        "enrollment_status",
        "caution_deposit_status",
        "utr_payment_proof",
        "official_receipt_number",
        "offer_letter_id",
        "whatsapp_invite_status",
        "whatsapp_invite_sent_at",
        "enrolled_at",
        "batch_start_date"
    ]

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in all_rows:
            writer.writerow(r)

    enrolled_count = len([r for r in all_rows if "ENROLLED" in r["category"]])
    messaged_only_count = len([r for r in all_rows if r["category"] == "WHATSAPP_INVITE_SENT"])

    print(f"\n[SUCCESS] Master contacted & enrolled audit list exported successfully!")
    print(f"  * Total Unique Candidates : {len(all_rows)}")
    print(f"  * Enrolled Interns        : {enrolled_count}")
    print(f"  * WhatsApp Messaged Only  : {messaged_only_count}")
    print(f"  * Output CSV Path         : {OUTPUT_CSV}")
    print("=" * 78 + "\n")

if __name__ == "__main__":
    main()
