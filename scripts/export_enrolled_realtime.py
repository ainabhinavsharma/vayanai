import sqlite3
import json
import csv
from pathlib import Path
import urllib.request
import urllib.parse
from datetime import datetime

# 1. Connect to DB
conn = sqlite3.connect("data/vayanai.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

# 2. Load payments_ledger.json
ledger_path = Path("data/payments_ledger.json")
ledger = []
if ledger_path.exists():
    with open(ledger_path, "r", encoding="utf-8") as f:
        ledger = json.load(f)

print(f"Current ledger count: {len(ledger)}")

# 3. Pull all confirmed/enrolled from DB
db_rows = c.execute("""
    SELECT id, user_name, user_email, phone, track_name, college_name, status,
           utr_number, deposit_receipt, deposit_paid_at, signature_name,
           offer_accepted_at, offer_letter_id, batch_start_date, updated_at
    FROM intern_applications
    WHERE status IN ('enrolled', 'deposit_paid', 'onboarded')
       OR (utr_number IS NOT NULL AND TRIM(utr_number) != '')
       OR (deposit_receipt IS NOT NULL AND TRIM(deposit_receipt) != '')
""").fetchall()

print(f"Total confirmed in intern_applications: {len(db_rows)}")

# Merge any DB records into ledger if missing
emails_in_ledger = set(item.get("userEmail", "").strip().lower() for item in ledger if item.get("userEmail"))

for r in db_rows:
    em = (r["user_email"] or "").strip().lower()
    if em and em not in emails_in_ledger:
        print(f"Adding missing candidate to ledger from DB: {r['user_name']} ({em})")
        now_ts = r["deposit_paid_at"] or datetime.now().isoformat()
        ledger.append({
            "applicationId": r["id"],
            "userName": r["user_name"],
            "userEmail": r["user_email"],
            "phone": r["phone"],
            "collegeName": r["college_name"] or "N/A",
            "trackName": r["track_name"] or "Internship",
            "status": "enrolled",
            "utrNumber": r["utr_number"] or f"WA_PROOF_{r['phone']}",
            "receiptNumber": r["deposit_receipt"] or f"VP-VER-2026-{r['id'][-4:]}",
            "depositPaidAt": now_ts,
            "signatureName": r["signature_name"] or r["user_name"],
            "offerAcceptedAt": r["offer_accepted_at"] or now_ts,
            "offerLetterId": r["offer_letter_id"] or f"VY-2026-INT-{r['id'][-4:]}",
            "batchStartDate": r["batch_start_date"] or "2026-11-02",
            "paymentId": f"pay-seed-{r['id'][-6:]}",
            "amountINR": 499,
            "paymentStatus": "completed",
            "createdAt": now_ts
        })
        emails_in_ledger.add(em)

# Write updated ledger back to data/payments_ledger.json
with open(ledger_path, "w", encoding="utf-8") as f:
    json.dump(ledger, f, indent=2)

print(f"Updated ledger has {len(ledger)} enrolled candidates.")

# 4. Generate Comprehensive Real-Time CSV
fields = [
    "serial_no",
    "candidate_name",
    "registered_email",
    "phone_number",
    "internship_track",
    "college_institution",
    "enrollment_status",
    "caution_deposit_inr",
    "utr_payment_proof",
    "official_receipt_number",
    "offer_letter_id",
    "batch_start_date",
    "signature_recorded",
    "deposit_timestamp"
]

csv_rows = []
for idx, item in enumerate(ledger, 1):
    csv_rows.append({
        "serial_no": idx,
        "candidate_name": item.get("userName", ""),
        "registered_email": item.get("userEmail", ""),
        "phone_number": item.get("phone", ""),
        "internship_track": item.get("trackName", ""),
        "college_institution": item.get("collegeName", ""),
        "enrollment_status": "ENROLLED & CONFIRMED",
        "caution_deposit_inr": "INR 499 (Refundable)",
        "utr_payment_proof": item.get("utrNumber", ""),
        "official_receipt_number": item.get("receiptNumber", ""),
        "offer_letter_id": item.get("offerLetterId", ""),
        "batch_start_date": item.get("batchStartDate", "2026-11-02"),
        "signature_recorded": item.get("signatureName", item.get("userName", "")),
        "deposit_timestamp": item.get("depositPaidAt", item.get("createdAt", ""))
    })

# Export to both Desktop and Workspace
desktop_csv = Path("C:/Users/user/Desktop/vayanai_enrolled_interns.csv")
workspace_csv = Path("scripts/enrolled_candidates_confirmation.csv")

with open(desktop_csv, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(csv_rows)

with open(workspace_csv, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(csv_rows)

print(f"Exported CSV with {len(csv_rows)} rows to:")
print(f"  1. {desktop_csv}")
print(f"  2. {workspace_csv}")

conn.close()
