import sqlite3
import json
from pathlib import Path

conn = sqlite3.connect("data/vayanai.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

# 1. Sent log
sent_rows = c.execute("SELECT * FROM whatsapp_sent_log").fetchall()
print(f"Total in whatsapp_sent_log: {len(sent_rows)}")
sent_emails = set((r["user_email"] or "").strip().lower() for r in sent_rows if r["user_email"])
sent_phones = set((r["clean_phone"] or "").strip()[-10:] for r in sent_rows if r["clean_phone"])
sent_ids = set((r["application_id"] or "").strip() for r in sent_rows if r["application_id"])

# 2. Payments ledger
with open("data/payments_ledger.json", "r", encoding="utf-8") as f:
    ledger = json.load(f)
print(f"Total in payments_ledger.json: {len(ledger)}")

paid_emails = set((r["userEmail"] or "").strip().lower() for r in ledger if r.get("userEmail"))
paid_phones = set((r["phone"] or "").strip()[-10:] for r in ledger if r.get("phone"))
paid_ids = set((r["applicationId"] or "").strip() for r in ledger if r.get("applicationId"))

# Also enrolled applicants in DB
db_enrolled = c.execute("""
    SELECT id, user_name, user_email, phone, status, utr_number 
    FROM intern_applications 
    WHERE status IN ('enrolled', 'deposit_paid', 'onboarded', 'deposit_pending_verification')
       OR (utr_number IS NOT NULL AND TRIM(utr_number) != '')
       OR (deposit_receipt IS NOT NULL AND TRIM(deposit_receipt) != '')
""").fetchall()
print(f"Total enrolled/paid in intern_applications: {len(db_enrolled)}")
for r in db_enrolled:
    if r["user_email"]:
        paid_emails.add(r["user_email"].strip().lower())
    if r["phone"]:
        p = "".join(ch for ch in r["phone"] if ch.isdigit())
        if len(p) >= 10:
            paid_phones.add(p[-10:])
    if r["id"]:
        paid_ids.add(r["id"].strip())

# Check user mentioned numbers earlier:
# 8016065592, 7267950321, 9060662348, vaishnavi1657@gmail.com, 7306902513, 9321995648, 8457013679, 9099089554, 9603742553
extra_paid_phones = {
    "8016065592", "7267950321", "9060662348", "7306902513", "9321995648", 
    "8457013679", "8467013679", "9099089554", "9603742553", "7209905770", 
    "8639704486", "9471988277", "8923834883", "03190504492"
}
paid_phones.update(extra_paid_phones)
paid_emails.add("vaishnavi1657@gmail.com")

print(f"\nTotal unique EXCLUDED sent emails: {len(sent_emails)}")
print(f"Total unique EXCLUDED sent phones: {len(sent_phones)}")
print(f"Total unique EXCLUDED paid emails: {len(paid_emails)}")
print(f"Total unique EXCLUDED paid phones: {len(paid_phones)}")

# 3. Check whatsapp_dispatch queue
dispatch_rows = c.execute("SELECT * FROM whatsapp_dispatch ORDER BY serial_no ASC").fetchall()
print(f"\nTotal currently in whatsapp_dispatch: {len(dispatch_rows)}")

overlaps_sent = []
overlaps_paid = []

for r in dispatch_rows:
    em = (r["user_email"] or "").strip().lower()
    ph = "".join(ch for ch in (r["clean_phone"] or "") if ch.isdigit())[-10:]
    app_id = (r["application_id"] or "").strip()

    if em in sent_emails or ph in sent_phones or app_id in sent_ids:
        overlaps_sent.append((r["serial_no"], r["user_name"], em, ph))

    if em in paid_emails or ph in paid_phones or app_id in paid_ids:
        overlaps_paid.append((r["serial_no"], r["user_name"], em, ph))

print(f"Overlaps with SENT messages : {len(overlaps_sent)}")
for o in overlaps_sent:
    print("  SENT OVERLAP:", o)

print(f"Overlaps with PAID/ENROLLED : {len(overlaps_paid)}")
for o in overlaps_paid:
    print("  PAID OVERLAP:", o)

conn.close()

# Check numbers in entire intern_applications database
conn = sqlite3.connect("data/vayanai.db")
c = conn.cursor()
for ph in ["7306902513", "9321995648", "8457013679", "8016065592", "7267950321", "9060662348", "9099089554", "9603742553"]:
    found = c.execute(f"SELECT id, user_name, user_email, phone, status FROM intern_applications WHERE phone LIKE '%{ph[-8:]}%'").fetchall()
    print(f"Check DB for {ph}: {found}")
conn.close()
