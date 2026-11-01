import json

with open("data/payments_ledger.json", "r", encoding="utf-8") as f:
    ledger = json.load(f)

print(f"Total enrolled candidates in ledger: {len(ledger)}")
for i, r in enumerate(ledger, 1):
    print(f"  {i:2d}. {r['userName']:<24} | {r['userEmail']:<30} | {r.get('phone', 'N/A'):<12} | {r['status']}")
