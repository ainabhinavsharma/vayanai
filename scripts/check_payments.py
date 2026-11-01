#!/usr/bin/env python3
"""
================================================================================
VayanAI — Candidate Payment & UTR Verification Desk (CLI)
================================================================================
Purpose:
  1. Inspect all candidates who submitted ₹499 refundable deposit UTR proofs.
  2. Record manual payments from WhatsApp screenshot confirmations.
  3. Approve and enroll candidates with 1 command.
  4. Sync live payment submissions directly from Render into local SQLite.
  5. Maintain persistent payments_ledger.json to prevent data loss on rebuilds.
================================================================================
"""

import os
import sys
import json
import sqlite3
import urllib.request
import urllib.parse
import argparse
from datetime import datetime
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "data" / "vayanai.db"
LEDGER_PATH = PROJECT_ROOT / "data" / "payments_ledger.json"
RENDER_BASE_URL = "https://vayanai.onrender.com"
RENDER_PAYMENTS_URL = f"{RENDER_BASE_URL}/api/v1/admin/payments"


def get_db():
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


def save_to_ledger(item: dict):
    try:
        ledger = []
        if LEDGER_PATH.exists():
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    ledger = data
        
        clean_email = item.get("userEmail", "").strip().lower()
        idx = next((i for i, x in enumerate(ledger) if x.get("userEmail", "").strip().lower() == clean_email or (item.get("utrNumber") and x.get("utrNumber") == item["utrNumber"])), -1)
        
        if idx >= 0:
            ledger[idx].update(item)
        else:
            ledger.append(item)
            
        with open(LEDGER_PATH, "w", encoding="utf-8") as f:
            json.dump(ledger, f, indent=2)
    except Exception as e:
        print(f"[!] Warning: Could not save to ledger: {e}")


def list_payments(status_filter=None):
    conn = get_db()
    query = """
        SELECT 
            id, user_name, user_email, phone, track_name, college_name,
            status, utr_number, deposit_receipt, deposit_paid_at, signature_name,
            offer_accepted_at, offer_letter_id, batch_start_date
        FROM intern_applications
        WHERE status IN ('deposit_pending_verification', 'enrolled', 'deposit_paid', 'onboarded')
           OR utr_number IS NOT NULL
           OR deposit_receipt IS NOT NULL
        ORDER BY 
            CASE WHEN status = 'deposit_pending_verification' THEN 0 ELSE 1 END,
            COALESCE(deposit_paid_at, updated_at) DESC
    """
    rows = conn.execute(query).fetchall()
    conn.close()

    if status_filter:
        rows = [r for r in rows if r["status"] == status_filter]

    total = len(rows)
    pending = [r for r in rows if r["status"] == "deposit_pending_verification"]
    enrolled = [r for r in rows if r["status"] in ("enrolled", "onboarded", "deposit_paid")]

    print("\n" + "=" * 78)
    print("  VAYANAI — CANDIDATE PAYMENT & UTR VERIFICATION DESK")
    print("=" * 78)
    print(f"  Total Payment Submissions : {total}")
    print(f"  Pending UTR Verification  : {len(pending)} (Requires Bank Check)")
    print(f"  Enrolled & Confirmed      : {len(enrolled)}")
    print(f"  Total Deposit Pool Value  : ₹{(len(pending) + len(enrolled)) * 499:,}")
    print("=" * 78 + "\n")

    if not rows:
        print("[*] No payment records found in the database.\n")
        return

    print(f"{'#':<3} | {'Name':<22} | {'Email':<26} | {'UTR Reference':<16} | {'Status':<15} | {'Signed By'}")
    print("-" * 105)
    for idx, r in enumerate(rows, 1):
        if r["status"] == "deposit_pending_verification":
            status_display = "⏳ PENDING"
        elif r["status"] in ("enrolled", "onboarded", "deposit_paid"):
            status_display = "✓ ENROLLED"
        elif r["status"] == "offer_accepted":
            status_display = "❌ REJECTED"
        else:
            status_display = r["status"]
        signed = r["signature_name"] or "Not signed"
        utr = r["utr_number"] or "N/A"
        print(f"{idx:<3} | {r['user_name'][:22]:<22} | {r['user_email'][:26]:<26} | {utr:<16} | {status_display:<15} | {signed}")
    print("-" * 105 + "\n")


def record_manual_payment(identifier: str, utr: str = None):
    conn = get_db()
    c = conn.cursor()

    clean_id = identifier.strip()
    digits = "".join(filter(str.isdigit, clean_id))
    phone_query = f"%{digits[-10:]}" if len(digits) >= 10 else "NOMATCH"

    row = c.execute(
        """
        SELECT id, user_id, user_name, user_email, phone, college_name, track_name,
               status, utr_number, deposit_receipt, offer_letter_id, batch_start_date
        FROM intern_applications 
        WHERE id = ? 
           OR LOWER(user_email) = ? 
           OR phone LIKE ? 
           OR LOWER(user_name) LIKE ?
        LIMIT 1
        """,
        (clean_id, clean_id.lower(), phone_query, f"%{clean_id.lower()}%")
    ).fetchone()

    if not row:
        print(f"[ERROR] No candidate found matching: '{identifier}'")
        print("Tip: Enter their exact email address, 10-digit mobile number, or full name.")
        conn.close()
        return

    now = datetime.now().isoformat()
    now_date = now.split("T")[0]
    final_utr = utr.strip() if utr and len(utr.strip()) >= 4 else f"WA_PROOF_{int(datetime.now().timestamp())}"
    receipt = f"VP-VER-2026-{int(datetime.now().timestamp()) % 9000 + 1000}"

    # Ensure offer letter ID
    offer_id = row["offer_letter_id"]
    if not offer_id:
        track = (row["track_name"] or "").lower()
        track_code = "DA" if "data" in track else "AI" if "ai" in track else "PA" if "python" in track else "FS"
        offer_id = f"VY-2026-{track_code}-{int(datetime.now().timestamp()) % 9000 + 1000}"

    # Update candidate in DB
    c.execute(
        """
        UPDATE intern_applications
        SET status = 'enrolled',
            utr_number = ?,
            deposit_receipt = ?,
            deposit_paid_at = ?,
            signature_name = COALESCE(signature_name, ?),
            offer_accepted_at = COALESCE(offer_accepted_at, ?),
            offer_letter_id = ?,
            batch_start_date = COALESCE(batch_start_date, '2026-11-02'),
            updated_at = ?
        WHERE id = ?
        """,
        (final_utr, receipt, now, row["user_name"], now, offer_id, now, row["id"])
    )

    # Insert payment record
    pay_id = f"pay-wa-{int(datetime.now().timestamp() * 1000)}"
    c.execute(
        """
        INSERT OR REPLACE INTO payments (
            id, user_id, user_email, user_name, product_type, amount_inr,
            currency, payment_status, payment_method, transaction_ref,
            receipt_number, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            pay_id, row["user_id"], row["user_email"], row["user_name"],
            "security_deposit", 499, "INR", "completed", "whatsapp_screenshot",
            final_utr, receipt, now
        )
    )

    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()

    # Save to persistent ledger
    save_to_ledger({
        "applicationId": row["id"],
        "userName": row["user_name"],
        "userEmail": row["user_email"],
        "phone": row["phone"],
        "collegeName": row["college_name"],
        "trackName": row["track_name"],
        "status": "enrolled",
        "utrNumber": final_utr,
        "receiptNumber": receipt,
        "depositPaidAt": now,
        "signatureName": row["user_name"],
        "offerAcceptedAt": now,
        "offerLetterId": offer_id,
        "batchStartDate": row["batch_start_date"] or "2026-11-02",
        "paymentId": pay_id,
        "amountINR": 499,
        "paymentStatus": "completed",
        "createdAt": now
    })

    # Build WhatsApp URL
    clean_phone = "".join(filter(str.isdigit, str(row["phone"] or "")))
    if not clean_phone.startswith("91") and len(clean_phone) == 10:
        clean_phone = "91" + clean_phone

    first_name = row["user_name"].split()[0]
    wa_msg = (
        f"🎉 *Batch Slot Confirmed — VayanAI Internship Program*\n\n"
        f"Dear *{first_name}*,\n\n"
        f"Congratulations! Your ₹499 refundable caution deposit (UTR: *{final_utr}*) has been verified and approved by the Admissions Council.\n\n"
        f"✅ *Your Enrollment Status:* Confirmed & Admitted\n"
        f"📅 *Batch Commencement:* 2026-11-02\n"
        f"📄 *Official Receipt #:* {receipt}\n\n"
        f"📌 *Download Your Verified Offer Letter:*\n"
        f"👉 https://vayanai.onrender.com/enroll\n\n"
        f"Enter your registered email address (*{row['user_email']}*) to view your confirmed batch slot and download your digitally signed offer letter.\n\n"
        f"👥 *Official Cohort Community:*\n"
        f"https://chat.whatsapp.com/Kn6o6hMoFfc7rIVx0wgZt3\n\n"
        f"Welcome to the team!\n— Admissions Council, VayanAI"
    )
    wa_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(wa_msg)}"

    print("\n" + "=" * 78)
    print("  [SUCCESS] Payment Recorded & Candidate Enrolled!")
    print("=" * 78)
    print(f"  Name      : {row['user_name']}")
    print(f"  Email     : {row['user_email']}")
    print(f"  Phone     : {row['phone']}")
    print(f"  Track     : {row['track_name']}")
    print(f"  Receipt # : {receipt}")
    print(f"  UTR #     : {final_utr}")
    print(f"  Status    : ENROLLED (Slot Confirmed)")
    print("=" * 78)
    print("\n[WhatsApp Confirmation Link]:")
    print(wa_url)
    print("\nClick the link above (or paste in browser) to send confirmation directly to the candidate!\n")


def approve_candidate(identifier: str):
    conn = get_db()
    c = conn.cursor()

    row = c.execute(
        """
        SELECT id, user_name, user_email, phone, college_name, track_name,
               status, utr_number, deposit_receipt, offer_letter_id, batch_start_date, signature_name
        FROM intern_applications 
        WHERE id = ? OR LOWER(user_email) = ? OR utr_number = ?
        """,
        (identifier, identifier.strip().lower(), identifier.strip())
    ).fetchone()

    if not row:
        print(f"[ERROR] No candidate found matching: {identifier}")
        conn.close()
        return

    now = datetime.now().isoformat()

    c.execute("""
        UPDATE intern_applications
        SET status = 'enrolled',
            batch_start_date = COALESCE(batch_start_date, '2026-11-02'),
            updated_at = ?
        WHERE id = ?
    """, (now, row["id"]))

    if row["deposit_receipt"]:
        c.execute("""
            UPDATE payments
            SET payment_status = 'completed'
            WHERE receipt_number = ?
        """, (row["deposit_receipt"],))

    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()

    save_to_ledger({
        "applicationId": row["id"],
        "userName": row["user_name"],
        "userEmail": row["user_email"],
        "phone": row["phone"],
        "collegeName": row["college_name"],
        "trackName": row["track_name"],
        "status": "enrolled",
        "utrNumber": row["utr_number"] or "VERIFIED_BY_ADMIN",
        "receiptNumber": row["deposit_receipt"] or f"VP-VER-2026-{int(datetime.now().timestamp()) % 9000 + 1000}",
        "depositPaidAt": now,
        "signatureName": row["signature_name"] or row["user_name"],
        "offerLetterId": row["offer_letter_id"],
        "batchStartDate": row["batch_start_date"] or "2026-11-02",
        "amountINR": 499,
        "paymentStatus": "completed",
        "createdAt": now
    })

    # Sync approval to Render production
    try:
        payload = json.dumps({
            "candidateId": row["id"],
            "action": "approve"
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{RENDER_BASE_URL}/api/v1/admin/payments",
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[✓] Synced approval to Render server: {data.get('data', {}).get('message')}")
    except Exception as e:
        print(f"[!] Warning: Could not sync approval to Render: {e}")

    print("\n" + "=" * 78)
    print(f"  [SUCCESS] Candidate Verified & Enrolled!")
    print(f"  Name      : {row['user_name']}")
    print(f"  Email     : {row['user_email']}")
    print(f"  UTR #     : {row['utr_number']}")
    print(f"  Status    : ENROLLED (Batch Slot Confirmed)")
    print(f"  Portal    : https://vayanai.onrender.com/enroll")
    print("=" * 78 + "\n")


def reject_candidate(identifier: str, reason: str = "Deposit UTR verification failed: Payment not found in bank statement."):
    conn = get_db()
    c = conn.cursor()

    row = c.execute(
        """
        SELECT id, user_name, user_email, phone, college_name, track_name,
               status, utr_number, deposit_receipt, offer_letter_id, batch_start_date, signature_name
        FROM intern_applications 
        WHERE id = ? OR LOWER(user_email) = ? OR utr_number = ?
        """,
        (identifier, identifier.strip().lower(), identifier.strip())
    ).fetchone()

    if not row:
        print(f"[ERROR] No candidate found matching: {identifier}")
        conn.close()
        return

    now = datetime.now().isoformat()

    # 1. Update local database
    c.execute("""
        UPDATE intern_applications
        SET status = 'offer_accepted',
            feedback_note = ?,
            updated_at = ?
        WHERE id = ?
    """, (reason, now, row["id"]))

    if row["deposit_receipt"]:
        c.execute("""
            UPDATE payments
            SET payment_status = 'failed'
            WHERE receipt_number = ?
        """, (row["deposit_receipt"],))

    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()

    # 2. Update Render production live server
    try:
        payload = json.dumps({
            "candidateId": row["id"],
            "action": "reject",
            "reason": reason
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{RENDER_BASE_URL}/api/v1/admin/payments",
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[✓] Synced rejection to Render server: {data.get('data', {}).get('message')}")
    except Exception as e:
        print(f"[!] Warning: Could not sync rejection to Render: {e}")

    # 3. Clean from payments_ledger.json
    try:
        if LEDGER_PATH.exists():
            with open(LEDGER_PATH, "r", encoding="utf-8") as f:
                ledger = json.load(f)
            cleaned = [item for item in ledger if item.get("userEmail", "").strip().lower() != row["user_email"].strip().lower()]
            with open(LEDGER_PATH, "w", encoding="utf-8") as f:
                json.dump(cleaned, f, indent=2)
    except Exception as e:
        print(f"[!] Warning: Could not update ledger: {e}")

    print("\n" + "=" * 78)
    print(f"  [SUCCESS] Deposit Rejected & Slot Released!")
    print(f"  Name      : {row['user_name']}")
    print(f"  Email     : {row['user_email']}")
    print(f"  Status    : offer_accepted (Deposit Rejected)")
    print(f"  Reason    : {reason}")
    print("=" * 78 + "\n")


def sync_from_render():
    print(f"[*] Fetching live submissions from {RENDER_PAYMENTS_URL}...")
    try:
        req = urllib.request.Request(
            RENDER_PAYMENTS_URL,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        if not data.get("success"):
            print(f"[!] Server returned error: {data.get('error')}")
            return

        records = data["data"]["records"]
        print(f"[✓] Retrieved {len(records)} records from Render live server.")

        conn = get_db()
        c = conn.cursor()
        synced_count = 0

        for r in records:
            email = r["email"].strip().lower()
            utr = r["utrNumber"] if r["utrNumber"] != "N/A" else None
            receipt = r["receiptNumber"] if r["receiptNumber"] != "N/A" else None
            
            c.execute("""
                UPDATE intern_applications
                SET status = ?,
                    utr_number = COALESCE(?, utr_number),
                    deposit_receipt = COALESCE(?, deposit_receipt),
                    deposit_paid_at = COALESCE(?, deposit_paid_at),
                    signature_name = COALESCE(?, signature_name),
                    offer_accepted_at = COALESCE(?, offer_accepted_at),
                    offer_letter_id = COALESCE(?, offer_letter_id),
                    updated_at = ?
                WHERE LOWER(user_email) = ?
            """, (
                r["status"], utr, receipt, r["depositPaidAt"],
                r["signatureName"], r["offerAcceptedAt"], r["offerLetterId"],
                r["updatedAt"] or datetime.now().isoformat(), email
            ))

            if r["status"] in ("enrolled", "deposit_pending_verification"):
                save_to_ledger({
                    "applicationId": r["id"],
                    "userName": r["name"],
                    "userEmail": r["email"],
                    "phone": r["phone"],
                    "collegeName": r["college"],
                    "trackName": r["track"],
                    "status": r["status"],
                    "utrNumber": utr or "N/A",
                    "receiptNumber": receipt or "N/A",
                    "depositPaidAt": r["depositPaidAt"],
                    "signatureName": r["signatureName"],
                    "offerAcceptedAt": r["offerAcceptedAt"],
                    "offerLetterId": r["offerLetterId"],
                    "batchStartDate": r["batchStartDate"],
                    "amountINR": r["amountINR"],
                    "paymentStatus": r["paymentStatus"]
                })
            else:
                # If rejected or not enrolled, remove from ledger
                try:
                    if LEDGER_PATH.exists():
                        with open(LEDGER_PATH, "r", encoding="utf-8") as lf:
                            ldata = json.load(lf)
                        cleaned_ldata = [x for x in ldata if x.get("userEmail", "").strip().lower() != email]
                        with open(LEDGER_PATH, "w", encoding="utf-8") as lf:
                            json.dump(cleaned_ldata, lf, indent=2)
                except Exception:
                    pass
            synced_count += 1

        conn.commit()
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
        conn.close()

        print(f"[✓] Successfully synced {synced_count} payment records to local SQLite and ledger!\n")
        list_payments()

    except Exception as e:
        print(f"[ERROR] Sync failed: {e}\n")


def main():
    parser = argparse.ArgumentParser(description="VayanAI Payment Verification & Management Desk")
    parser.add_argument("--list", action="store_true", help="List all candidate payments and UTRs")
    parser.add_argument("--pending", action="store_true", help="List only pending verification submissions")
    parser.add_argument("--approve", type=str, help="Approve and enroll candidate by Email, UTR, or ID")
    parser.add_argument("--reject", type=str, help="Reject candidate deposit by Email, UTR, or ID")
    parser.add_argument("--reason", type=str, default="Deposit UTR verification failed: Payment not found in bank statement.", help="Rejection reason")
    parser.add_argument("--record", type=str, help="Record WhatsApp screenshot payment for candidate by Email, Phone, or Name")
    parser.add_argument("--utr", type=str, help="12-digit UTR reference number (used with --record)")
    parser.add_argument("--sync", action="store_true", help="Sync real-time payment submissions from Render cloud server")

    args = parser.parse_args()

    if args.sync:
        sync_from_render()
    elif args.record:
        record_manual_payment(args.record, args.utr)
    elif args.approve:
        approve_candidate(args.approve)
    elif args.reject:
        reject_candidate(args.reject, args.reason)
    elif args.pending:
        list_payments(status_filter="deposit_pending_verification")
    else:
        list_payments()


if __name__ == "__main__":
    main()
