#!/usr/bin/env python3
"""
VayanAI — Generate Next 36 Candidates Batch (Single WhatsApp Number Dispatch)
----------------------------------------------------------------------------
Pulls the next 36 newest candidates who:
1. Have NOT enrolled (strictly excludes all confirmed/enrolled interns).
2. Have NOT received any WhatsApp message (strictly excludes all 220 logged sends).
3. Are NOT blacklisted.

Output Deliverables:
- data/vayanai_whatsapp_next_36_batch.csv
- scripts/vayanai_whatsapp_next_36_batch.csv
"""

import sqlite3
import json
import csv
import urllib.parse
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "vayanai.db"
LEDGER_PATH = PROJECT_ROOT / "data" / "payments_ledger.json"
OUTPUT_DATA_CSV = PROJECT_ROOT / "data" / "vayanai_whatsapp_next_36_batch.csv"
OUTPUT_SCRIPTS_CSV = PROJECT_ROOT / "scripts" / "vayanai_whatsapp_next_36_batch.csv"
UNCONTACTED_POOL_CSV = PROJECT_ROOT / "data" / "vayanai_uncontacted_pool_newest_first.csv"

BLACKLIST_PHONES = {
    "9415177333",
    "7990611904",
    "7306902513",
    "9321995648",
    "8457013679",
    "8467013679"
}

def clean_phone(raw_phone: str) -> str:
    if not raw_phone:
        return ""
    digits = "".join(filter(str.isdigit, str(raw_phone)))
    # If 12 digits starting with 91
    if digits.startswith("91") and len(digits) == 12:
        if digits[2] in "6789":
            return digits
    # If 10 digits starting with 6, 7, 8, or 9 (Standard Indian mobile)
    if len(digits) == 10 and digits[0] in "6789":
        return "91" + digits
    # If 11 digits starting with 0 (Indian landline/mobile with trunk 0)
    if len(digits) == 11 and digits.startswith("0") and digits[1] in "6789":
        return "91" + digits[1:]
    # If Sri Lankan mobile (e.g. 0713307710 -> 94713307710)
    if len(digits) == 10 and digits.startswith("07"):
        return "94" + digits[1:]
    return ""

def generate_offer_id(track_name: str, app_id: str) -> str:
    track = (track_name or "").lower()
    if "data" in track:
        code = "DA"
    elif "ai" in track or "agentic" in track or "genrative" in track or "generative" in track:
        code = "AI"
    elif "python" in track:
        code = "PA"
    elif "stack" in track or "full" in track or "web" in track:
        code = "FS"
    elif "ml" in track or "machine" in track:
        code = "ML"
    else:
        code = "OPS"
    suffix = app_id[-4:].upper() if len(app_id) >= 4 else f"{int(datetime.now().timestamp()) % 9000 + 1000}"
    return f"VY-2026-{code}-{suffix}"

def build_whatsapp_message(name: str, track: str, offer_id: str, email: str) -> str:
    first_name = (name or "Candidate").split()[0].title()
    track_title = track.strip() if track else "Technology Internship"
    
    msg = (
        f"Hi *{first_name}*,\n\n"
        f"Congratulations! We reviewed your profile and the Admissions Council at *VayanAI* "
        f"has officially selected you for the *{track_title}* Internship Program (Cohort 2026).\n\n"
        f"📄 *Offer Letter ID:* {offer_id}\n"
        f"📅 *Batch Commencement:* 2026-11-02\n\n"
        f"📌 *View & Digitally Sign Your Offer Letter:*\n"
        f"👉 https://vayanai.onrender.com/enroll\n\n"
        f"Enter your registered email address (*{email}*) on the portal to access your "
        f"verified offer letter, review your stipend structure, and confirm your batch slot.\n\n"
        f"👥 *Join Official Cohort Community:*\n"
        f"https://chat.whatsapp.com/Kn6o6hMoFfc7rIVx0wgZt3\n\n"
        f"Please confirm your slot today so we can finalize the cohort roster.\n\n"
        f"Warm regards,\n"
        f"Admissions Council, VayanAI"
    )
    return msg

def main():
    print("=" * 78)
    print("  GENERATING NEXT BATCH OF 36 UNCONTACTED CANDIDATES")
    print("=" * 78)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. Gather all excluded phones & emails
    excluded_emails = set()
    excluded_phones_10 = set()

    # Exclude blacklist
    for p in BLACKLIST_PHONES:
        excluded_phones_10.add(p[-10:])

    # Exclude whatsapp_sent_log
    sent_log = c.execute("SELECT clean_phone, raw_phone, user_email FROM whatsapp_sent_log").fetchall()
    for r in sent_log:
        em = (r["user_email"] or "").strip().lower()
        if em:
            excluded_emails.add(em)
        if r["clean_phone"]:
            excluded_phones_10.add(r["clean_phone"][-10:])
        if r["raw_phone"]:
            d = "".join(filter(str.isdigit, str(r["raw_phone"])))
            if len(d) >= 10:
                excluded_phones_10.add(d[-10:])

    # Exclude whatsapp_dispatch SENT
    dispatch_sent = c.execute("SELECT clean_phone, raw_phone, user_email FROM whatsapp_dispatch WHERE whatsapp_status = 'SENT'").fetchall()
    for r in dispatch_sent:
        em = (r["user_email"] or "").strip().lower()
        if em:
            excluded_emails.add(em)
        if r["clean_phone"]:
            excluded_phones_10.add(r["clean_phone"][-10:])
        if r["raw_phone"]:
            d = "".join(filter(str.isdigit, str(r["raw_phone"])))
            if len(d) >= 10:
                excluded_phones_10.add(d[-10:])

    # Exclude enrolled from DB
    enrolled_db = c.execute("SELECT phone, user_email FROM intern_applications WHERE status IN ('enrolled', 'deposit_paid', 'onboarded')").fetchall()
    for r in enrolled_db:
        em = (r["user_email"] or "").strip().lower()
        if em:
            excluded_emails.add(em)
        if r["phone"]:
            d = "".join(filter(str.isdigit, str(r["phone"])))
            if len(d) >= 10:
                excluded_phones_10.add(d[-10:])

    # Exclude enrolled from payments_ledger.json
    if LEDGER_PATH.exists():
        with open(LEDGER_PATH, "r", encoding="utf-8") as f:
            ledger = json.load(f)
        for item in ledger:
            if item.get("status") in ("enrolled", "deposit_paid", "onboarded"):
                em = (item.get("userEmail") or "").strip().lower()
                if em:
                    excluded_emails.add(em)
                if item.get("phone"):
                    d = "".join(filter(str.isdigit, str(item["phone"])))
                    if len(d) >= 10:
                        excluded_phones_10.add(d[-10:])

    print(f"Total Unique Excluded Emails : {len(excluded_emails)}")
    print(f"Total Unique Excluded Phones : {len(excluded_phones_10)}")

    # 2. Fetch all applicants from DB ordered by applied_at DESC
    all_applicants = c.execute("""
        SELECT id, user_name, user_email, phone, track_name, college_name, applied_at, offer_letter_id
        FROM intern_applications
        ORDER BY applied_at DESC, id DESC
    """).fetchall()

    print(f"Total applicants in database : {len(all_applicants)}")

    # 3. Filter full uncontacted pool
    uncontacted_pool = []
    seen_pool_phones = set()
    seen_pool_emails = set()

    for r in all_applicants:
        em = (r["user_email"] or "").strip().lower()
        clean_p = clean_phone(r["phone"])
        p10 = clean_p[-10:] if len(clean_p) >= 10 else ""

        # Validate basic requirements
        if not em or not p10 or len(p10) != 10:
            continue
        if em in excluded_emails or p10 in excluded_phones_10:
            continue
        if em in seen_pool_emails or p10 in seen_pool_phones:
            continue

        seen_pool_emails.add(em)
        seen_pool_phones.add(p10)

        offer_id = r["offer_letter_id"]
        if not offer_id:
            offer_id = generate_offer_id(r["track_name"], r["id"])
            c.execute("UPDATE intern_applications SET offer_letter_id = ? WHERE id = ?", (offer_id, r["id"]))

        uncontacted_pool.append({
            "id": r["id"],
            "name": r["user_name"],
            "email": em,
            "clean_phone": clean_p,
            "raw_phone": r["phone"],
            "track": r["track_name"] or "Internship",
            "college": r["college_name"] or "N/A",
            "applied_at": r["applied_at"] or "N/A",
            "offer_letter_id": offer_id
        })

    conn.commit()
    conn.close()

    print(f"Total Available Uncontacted Candidates : {len(uncontacted_pool)}")

    # 4. Save entire remaining uncontacted pool CSV
    pool_fields = ["rank", "application_id", "candidate_name", "registered_email", "clean_phone", "raw_phone", "track_name", "college_name", "applied_at", "offer_letter_id"]
    with open(UNCONTACTED_POOL_CSV, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(pool_fields)
        for idx, u in enumerate(uncontacted_pool, 1):
            w.writerow([idx, u["id"], u["name"], u["email"], u["clean_phone"], u["raw_phone"], u["track"], u["college"], u["applied_at"], u["offer_letter_id"]])

    # 5. Extract top 36 candidates for active batch
    batch_36 = uncontacted_pool[:36]
    print(f"\n[SUCCESS] Extracted Top {len(batch_36)} Candidates for Next WhatsApp Batch!")

    # 6. Format batch deliverable and update whatsapp_dispatch
    batch_fields = [
        "serial_no",
        "candidate_name",
        "first_name",
        "registered_email",
        "clean_phone",
        "raw_phone",
        "internship_track",
        "college_institution",
        "applied_date",
        "offer_letter_id",
        "whatsapp_url",
        "message_preview"
    ]

    batch_rows = []
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Clear old dispatch queue and seed the 36 candidates for Account 1 single worker
    c.execute("DELETE FROM whatsapp_dispatch")

    for idx, cand in enumerate(batch_36, 1):
        msg = build_whatsapp_message(cand["name"], cand["track"], cand["offer_letter_id"], cand["email"])
        wa_url = f"https://wa.me/{cand['clean_phone']}?text={urllib.parse.quote(msg)}"
        first_name = (cand["name"] or "Candidate").split()[0].title()

        batch_rows.append({
            "serial_no": idx,
            "candidate_name": cand["name"],
            "first_name": first_name,
            "registered_email": cand["email"],
            "clean_phone": cand["clean_phone"],
            "raw_phone": cand["raw_phone"],
            "internship_track": cand["track"],
            "college_institution": cand["college"],
            "applied_date": cand["applied_at"],
            "offer_letter_id": cand["offer_letter_id"],
            "whatsapp_url": wa_url,
            "message_preview": msg.replace("\n", " ")
        })

        c.execute("""
            INSERT INTO whatsapp_dispatch (
                serial_no, application_id, user_name, user_email, clean_phone, raw_phone,
                track_name, college_name, applied_at, account_group, whatsapp_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'account1_odd', 'PENDING')
        """, (
            idx, cand["id"], cand["name"], cand["email"], cand["clean_phone"], cand["raw_phone"],
            cand["track"], cand["college"], cand["applied_at"]
        ))

    conn.commit()
    conn.close()

    # Write CSVs
    output_acc1_csv = PROJECT_ROOT / "scripts" / "vayanai_whatsapp_acc1.csv"
    for out_path in [OUTPUT_DATA_CSV, OUTPUT_SCRIPTS_CSV, output_acc1_csv]:
        with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=batch_fields)
            w.writeheader()
            w.writerows(batch_rows)

    print(f"Generated Batch CSV Deliverables:")
    print(f"  1. {OUTPUT_DATA_CSV}")
    print(f"  2. {OUTPUT_SCRIPTS_CSV}")
    print(f"  3. {output_acc1_csv}")
    print("=" * 78)

if __name__ == "__main__":
    main()
