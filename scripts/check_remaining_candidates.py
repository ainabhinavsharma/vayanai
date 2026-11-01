import sqlite3
import json

conn = sqlite3.connect('data/vayanai.db')
c = conn.cursor()

# 1. Total applicants
c.execute('SELECT COUNT(*) FROM intern_applications')
total_applicants = c.fetchone()[0]

# 2. Sent log
c.execute('SELECT COUNT(DISTINCT user_email), COUNT(DISTINCT clean_phone) FROM whatsapp_sent_log')
sent_log_emails, sent_log_phones = c.fetchone()

# 3. Active batch in whatsapp_dispatch
c.execute('SELECT whatsapp_status, COUNT(*) FROM whatsapp_dispatch GROUP BY whatsapp_status')
dispatch_breakdown = dict(c.fetchall())

# Also breakdown by account
c.execute('SELECT account_group, whatsapp_status, COUNT(*) FROM whatsapp_dispatch GROUP BY account_group, whatsapp_status')
account_breakdown = c.fetchall()

# 4. Enrolled candidates
with open('data/payments_ledger.json', 'r', encoding='utf-8') as f:
    ledger = json.load(f)
enrolled_emails = set(item.get('userEmail', '').strip().lower() for item in ledger if item.get('status') == 'enrolled')

c.execute("SELECT user_email FROM intern_applications WHERE status = 'enrolled'")
db_enrolled = set(r[0].strip().lower() for r in c.fetchall() if r[0])
all_enrolled_emails = enrolled_emails.union(db_enrolled)

# 5. All contacted emails and phones
c.execute('SELECT DISTINCT LOWER(user_email), clean_phone FROM whatsapp_sent_log')
contacted_pairs = c.fetchall()
contacted_emails = set(p[0] for p in contacted_pairs if p[0])
contacted_phones = set(p[1] for p in contacted_pairs if p[1])

c.execute("SELECT DISTINCT LOWER(user_email), clean_phone FROM whatsapp_dispatch WHERE whatsapp_status = 'SENT'")
for r in c.fetchall():
    if r[0]: contacted_emails.add(r[0])
    if r[1]: contacted_phones.add(r[1])

# Blacklisted numbers
BLACKLIST = {'919415177333', '917990611904', '917306902513', '919321995648', '918457013679'}

# 6. Calculate remaining uncontacted applicants from intern_applications
c.execute('SELECT id, user_name, user_email, phone, status, applied_at FROM intern_applications ORDER BY applied_at DESC')
all_apps = c.fetchall()

remaining = []
failed_in_dispatch = []
pending_in_dispatch = []

# Fetch status of active batch
c.execute('SELECT serial_no, account_group, user_name, user_email, clean_phone, whatsapp_status, whatsapp_error FROM whatsapp_dispatch WHERE whatsapp_status IN ("FAILED", "PENDING")')
incomplete_dispatch = c.fetchall()

for app_id, name, email, raw_phone, status, applied_at in all_apps:
    em = (email or '').strip().lower()
    digits = ''.join(filter(str.isdigit, str(raw_phone or '')))
    if len(digits) == 10:
        cphone = '91' + digits
    elif digits.startswith('0') and len(digits) == 11:
        cphone = '91' + digits[1:]
    else:
        cphone = digits

    # Exclude enrolled
    if em in all_enrolled_emails or status == 'enrolled':
        continue
    # Exclude already sent
    if em in contacted_emails or cphone in contacted_phones:
        continue
    # Exclude blacklist
    if cphone in BLACKLIST:
        continue

    remaining.append({
        'id': app_id,
        'name': name,
        'email': em,
        'phone': cphone,
        'status': status,
        'applied_at': applied_at
    })

print("=" * 70)
print("  VAYANAI CANDIDATE WHATSAPP DISPATCH & REMAINING AUDIT")
print("=" * 70)
print(f"Total Applicants in Database             : {total_applicants}")
print(f"Total Enrolled Interns (Never contact)    : {len(all_enrolled_emails)}")
print(f"Total Contacted Candidates (Messages Sent): {len(contacted_emails)}")
print("-" * 70)
print("ACTIVE BATCH OF 92 BREAKDOWN:")
for acc, st, cnt in account_breakdown:
    print(f"  * {acc:<15} | Status: {st:<8} | Count: {cnt}")
print("-" * 70)
print(f"Active Batch Total Sent                  : {dispatch_breakdown.get('SENT', 0)} / 92")
print(f"Active Batch Failed                      : {dispatch_breakdown.get('FAILED', 0)} / 92")
print(f"Active Batch Pending (Window Closed)     : {dispatch_breakdown.get('PENDING', 0)} / 92")
print("-" * 70)
print(f"REMAINING UNCONTACTED POOL (Next Batches): {len(remaining)} candidates")
print("=" * 70)

if incomplete_dispatch:
    print("\nIncomplete Candidates in Active 92 Batch:")
    for r in incomplete_dispatch:
        print(f"  #{r[0]:<2} | {r[1]:<13} | {r[2]:<22} | {r[4]} | {r[5]} | {r[6] or 'Not attempted yet'}")

# Export updated uncontacted pool CSV
import csv
csv_out = 'data/vayanai_uncontacted_pool_newest_first.csv'
csv_rows = []
for idx, item in enumerate(remaining, 1):
    csv_rows.append({
        'rank_newest_first': idx,
        'application_id': item['id'],
        'candidate_name': item['name'],
        'registered_email': item['email'],
        'phone': item['phone'],
        'applied_at': item['applied_at'] or 'N/A',
        'status': 'UNCONTACTED'
    })

with open(csv_out, 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=['rank_newest_first', 'application_id', 'candidate_name', 'registered_email', 'phone', 'applied_at', 'status'])
    w.writeheader()
    w.writerows(csv_rows)

print(f"\n[SUCCESS] Exported {len(csv_rows)} clean uncontacted candidates to {csv_out}")

conn.close()
