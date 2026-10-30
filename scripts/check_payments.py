#!/usr/bin/env python3
"""
================================================================================
VayanAI — Candidate Payment & UTR Verification Desk (CLI)
================================================================================
Purpose:
  Inspect all candidates who submitted ₹499 refundable deposit UTR proofs,
  verify their transaction details, and approve/enroll candidates directly.
================================================================================
"""

import os
import sys
import sqlite3
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


def get_db():
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn


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
            deposit_paid_at DESC
    """
    rows = conn.execute(query).fetchall()
    conn.close()

    if status_filter:
        rows = [r for r in rows if r["status"] == status_filter]

    total = len(rows)
    pending = [r for r in rows if r["status"] == "deposit_pending_verification"]
    enrolled = [r for r in rows if r["status"] in ("enrolled", "onboarded", "deposit_paid")]

    print("\n" + "=" * 76)
    print("  VAYANAI — CANDIDATE PAYMENT & UTR VERIFICATION DESK")
    print("=" * 76)
    print(f"  Total Payment Submissions : {total}")
    print(f"  Pending UTR Verification  : {len(pending)} (Requires Bank Check)")
    print(f"  Enrolled & Confirmed      : {len(enrolled)}")
    print(f"  Total Deposit Pool Value  : ₹{(len(pending) + len(enrolled)) * 499:,}")
    print("=" * 76 + "\n")

    if not rows:
        print("[*] No payment records found in the database.\n")
        return

    print(f"{'#':<3} | {'Name':<22} | {'Email':<26} | {'UTR Reference':<16} | {'Status':<15} | {'Signed By'}")
    print("-" * 105)
    for idx, r in enumerate(rows, 1):
        status_display = "⏳ PENDING" if r["status"] == "deposit_pending_verification" else "✓ ENROLLED"
        signed = r["signature_name"] or "Not signed"
        utr = r["utr_number"] or "N/A"
        print(f"{idx:<3} | {r['user_name'][:22]:<22} | {r['user_email'][:26]:<26} | {utr:<16} | {status_display:<15} | {signed}")
    print("-" * 105 + "\n")


def approve_candidate(identifier: str):
    conn = get_db()
    c = conn.cursor()

    row = c.execute(
        "SELECT id, user_name, user_email, phone, status, utr_number, deposit_receipt FROM intern_applications WHERE id = ? OR LOWER(user_email) = ? OR utr_number = ?",
        (identifier, identifier.strip().lower(), identifier.strip())
    ).fetchone()

    if not row:
        print(f"[ERROR] No candidate found matching: {identifier}")
        conn.close()
        return

    now = datetime.now().isoformat()
    now_date = now.split("T")[0]

    # Update candidate status
    c.execute("""
        UPDATE intern_applications
        SET status = 'enrolled',
            batch_start_date = COALESCE(batch_start_date, '2026-11-02'),
            updated_at = ?
        WHERE id = ?
    """, (now, row["id"]))

    # Update payment record
    if row["deposit_receipt"]:
        c.execute("""
            UPDATE payments
            SET payment_status = 'completed'
            WHERE receipt_number = ?
        """, (row["deposit_receipt"],))

    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()

    print("\n" + "=" * 76)
    print(f"  [SUCCESS] Candidate Verified & Enrolled!")
    print(f"  Name      : {row['user_name']}")
    print(f"  Email     : {row['user_email']}")
    print(f"  UTR #     : {row['utr_number']}")
    print(f"  Status    : ENROLLED (Batch Slot Confirmed)")
    print(f"  Portal    : https://vayanai.onrender.com/enroll")
    print("=" * 76 + "\n")
    print("The candidate can now visit https://vayanai.onrender.com/enroll, enter their email,")
    print("and immediately see their 'Batch Slot Confirmed & Verified' badge and download their signed offer letter.\n")


def main():
    parser = argparse.ArgumentParser(description="VayanAI Payment Verification Desk")
    parser.add_argument("--list", action="store_true", help="List all candidate payments and UTRs")
    parser.add_argument("--pending", action="store_true", help="List only pending verification submissions")
    parser.add_argument("--approve", type=str, help="Approve and enroll candidate by Email, UTR, or ID")

    args = parser.parse_args()

    if args.approve:
        approve_candidate(args.approve)
    elif args.pending:
        list_payments(status_filter="deposit_pending_verification")
    else:
        list_payments()


if __name__ == "__main__":
    main()
