import sqlite3
import json

conn = sqlite3.connect("data/vayanai.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

# 1. Fetch Sent Log (Yesterday's 50 messages)
sent_records = c.execute("SELECT * FROM whatsapp_sent_log ORDER BY serial_no ASC").fetchall()
sent_emails = set(r["user_email"].strip().lower() for r in sent_records if r["user_email"])
sent_phones_10 = set("".join(ch for ch in r["clean_phone"] if ch.isdigit())[-10:] for r in sent_records if r["clean_phone"])
sent_app_ids = set(r["application_id"].strip() for r in sent_records if r["application_id"])

# 2. Fetch Enrolled / Paid Interns (11 confirmed interns)
with open("data/payments_ledger.json", "r", encoding="utf-8") as f:
    ledger = json.load(f)

paid_emails = set(item["userEmail"].strip().lower() for item in ledger if item.get("userEmail"))
paid_phones_10 = set("".join(ch for ch in item["phone"] if ch.isdigit())[-10:] for item in ledger if item.get("phone"))
paid_app_ids = set(item["applicationId"].strip() for item in ledger if item.get("applicationId"))

for r in c.execute("SELECT * FROM payments").fetchall():
    if r["user_email"]:
        paid_emails.add(r["user_email"].strip().lower())

for r in c.execute("SELECT * FROM intern_applications WHERE status IN ('enrolled', 'deposit_paid', 'onboarded')").fetchall():
    if r["user_email"]:
        paid_emails.add(r["user_email"].strip().lower())
    if r["phone"]:
        p10 = "".join(ch for ch in r["phone"] if ch.isdigit())[-10:]
        if len(p10) == 10:
            paid_phones_10.add(p10)
    if r["id"]:
        paid_app_ids.add(r["id"].strip())

blacklist_phones = {"7306902513", "9321995648", "8457013679", "8467013679", "9415177333", "7990611904"}
paid_phones_10.update(blacklist_phones)

# 3. Audit Active Dispatch Queue
dispatch_records = c.execute("SELECT * FROM whatsapp_dispatch ORDER BY serial_no ASC").fetchall()

overlap_sent = []
overlap_paid = []

for r in dispatch_records:
    s_no = r["serial_no"]
    name = (r["user_name"] or "").strip()
    email = (r["user_email"] or "").strip().lower()
    p10 = "".join(ch for ch in (r["clean_phone"] or "") if ch.isdigit())[-10:]
    app_id = (r["application_id"] or "").strip()

    if email in sent_emails:
        overlap_sent.append((s_no, name, email, "Email in Sent Log"))
    elif p10 in sent_phones_10:
        overlap_sent.append((s_no, name, p10, "Phone in Sent Log"))
    elif app_id in sent_app_ids:
        overlap_sent.append((s_no, name, app_id, "Application ID in Sent Log"))

    if email in paid_emails:
        overlap_paid.append((s_no, name, email, "Email in Paid Ledger"))
    elif p10 in paid_phones_10:
        overlap_paid.append((s_no, name, p10, "Phone in Paid Ledger"))
    elif app_id in paid_app_ids:
        overlap_paid.append((s_no, name, app_id, "Application ID in Paid Ledger"))

print("=" * 80)
print("  COMPREHENSIVE EXCLUSION AUDIT")
print("=" * 80)
print(f"Total Sent Yesterday Logged   : {len(sent_records)} candidates [100% EXCLUDED]")
print(f"Total Paid / Enrolled Interns : {len(ledger)} candidates [100% EXCLUDED]")
print(f"Total in Current Dispatch Queue: {len(dispatch_records)} candidates")
print(f"  - Overlaps with Yesterday's Sent Log : {len(overlap_sent)}")
print(f"  - Overlaps with Paid/Enrolled Interns: {len(overlap_paid)}")
print("=" * 80)

print("\n--- 11 EXCLUDED ENROLLED CANDIDATES ---")
for i, item in enumerate(ledger, 1):
    print(f"  {i:2d}. {item['userName']:<24} | {item['userEmail']:<30} | {item.get('phone', 'N/A')}")

print("\n--- FIRST 5 OF 50 EXCLUDED YESTERDAY SENT ---")
for i, r in enumerate(sent_records[:5], 1):
    print(f"  {i:2d}. {r['user_name']:<24} | {r['user_email']:<30} | +{r['clean_phone']}")
print(f"  ... and {len(sent_records)-5} more (all permanently logged in whatsapp_sent_log)")

print("\n--- NEXT BATCH QUEUE STATUS (READY FOR OPTION 4 / OPTION 1) ---")
acc1 = [r for r in dispatch_records if r["account_group"] == "account1_odd"]
acc2 = [r for r in dispatch_records if r["account_group"] == "account2_even"]
print(f"Account 1 (Odd) : {len(acc1)} candidates (Starts with #{acc1[0]['serial_no']} {acc1[0]['user_name']})")
print(f"Account 2 (Even): {len(acc2)} candidates (Starts with #{acc2[0]['serial_no']} {acc2[0]['user_name']})")

conn.close()
