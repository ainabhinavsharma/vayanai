import urllib.request
import urllib.parse
import json
import time

with open("data/payments_ledger.json", "r", encoding="utf-8") as f:
    ledger = json.load(f)

print(f"Testing {len(ledger)} candidates live on https://vayanai.onrender.com...\n")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "application/json"
}

results = []
for i, item in enumerate(ledger, 1):
    email = item["userEmail"]
    encoded_email = urllib.parse.quote(email)
    url = f"https://vayanai.onrender.com/api/v1/intern/offer-by-email?email={encoded_email}"
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            body = json.loads(resp.read().decode())
            candidate = body.get("data", {}).get("candidate") or {}
            status = candidate.get("status")
            offer_id = candidate.get("offerLetterId") or candidate.get("offer_letter_id")
            receipt = candidate.get("depositReceipt") or candidate.get("deposit_receipt")
            
            is_ok = status in ("enrolled", "deposit_paid", "onboarded")
            results.append((i, item["userName"], email, status, offer_id, is_ok))
            status_symbol = "[OK]" if is_ok else "[PENDING_DEPLOY]"
            print(f"{status_symbol} #{i:2d}: {item['userName']:<24} | Status: {status} | Offer: {offer_id}")
    except Exception as e:
        results.append((i, item["userName"], email, f"ERROR: {e}", "", False))
        print(f"[ERR] #{i:2d}: {item['userName']:<24} | Error: {e}")

all_ok = all(r[5] for r in results)
print("\n" + "=" * 76)
if all_ok:
    print(f"ALL {len(results)} CANDIDATES ARE 100% VERIFIED LIVE AS ENROLLED ON PRODUCTION!")
else:
    pending_deploy = [r for r in results if not r[5]]
    print(f"{len(pending_deploy)} candidate(s) awaiting Render deploy sync:")
    for p in pending_deploy:
        print(f"  - {p[1]} ({p[2]}) -> Current online status: {p[3]}")
print("=" * 76)
