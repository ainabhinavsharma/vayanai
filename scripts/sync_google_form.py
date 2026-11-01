#!/usr/bin/env python3
"""
Sync New Entries from Google Form / Google Sheet into VayanAI Database
"""

import sqlite3
import urllib.request
import csv
import io
import time
import secrets
from datetime import datetime, timezone
from pathlib import Path

GOOGLE_SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/1koeFclx1MsMM_cQXk3hrU-JTLXlj3OGrDegQIG9-Zio/export?format=csv&gid=1670509518"
)

DB_PATH = Path("data/vayanai.db")

def parse_sheet_timestamp(ts_str: str) -> str:
    if not ts_str:
        return datetime.now(timezone.utc).isoformat()
    try:
        # e.g. "10/31/2026 20:43:58"
        dt = datetime.strptime(ts_str.strip(), "%m/%d/%Y %H:%M:%S")
        return dt.isoformat() + "Z"
    except Exception:
        return ts_str.strip()

def sync_new_google_form_entries():
    print("=" * 76)
    print("  CHECKING GOOGLE FORM / SHEET FOR NEW APPLICANT SUBMISSIONS")
    print("=" * 76)
    
    # 1. Fetch live Google Sheet
    req = urllib.request.Request(
        GOOGLE_SHEET_URL,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VayanaiSync/1.0"}
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        csv_text = resp.read().decode("utf-8", errors="ignore")

    reader = list(csv.DictReader(io.StringIO(csv_text)))
    print(f"Total rows currently in Google Sheet: {len(reader)}")

    # 2. Check existing emails in local database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    existing_emails = set(r[0].strip().lower() for r in c.execute("SELECT user_email FROM intern_applications WHERE user_email IS NOT NULL").fetchall())
    print(f"Total applicants already in local database: {len(existing_emails)}")

    new_entries = []
    seen_in_sheet = set()

    for r in reader:
        email = (r.get("Email Address") or r.get("email") or "").strip().lower()
        name = (r.get("Name") or r.get("Full Name") or r.get("name") or "").strip()
        
        if not email or not name:
            continue
        if email in existing_emails or email in seen_in_sheet:
            continue

        seen_in_sheet.add(email)
        track = (r.get("Select Internship") or r.get("Track") or "Genrative AI").strip()
        college = (r.get("College Name") or r.get("College") or "Verified University").strip()
        phone = (r.get("WhatsApp number ") or r.get("WhatsApp number") or r.get("Phone") or "").strip()
        cv_url = (r.get("Please Upload Your CV") or r.get("CV") or r.get("Resume") or "").strip()
        raw_ts = r.get("Timestamp") or ""
        applied_at = parse_sheet_timestamp(raw_ts)

        new_entries.append({
            "name": name,
            "email": email,
            "phone": phone,
            "track": track,
            "college": college,
            "cv_url": cv_url,
            "applied_at": applied_at,
            "raw_timestamp": raw_ts
        })

    print(f"\nNew applicant submissions found: {len(new_entries)}")
    if not new_entries:
        print("[OK] Database is already fully up-to-date with Google Form! No new entries.")
        conn.close()
        return []

    now_iso = datetime.now(timezone.utc).isoformat()

    # 3. Ingest each new applicant
    ingested = []
    for item in new_entries:
        user_id = f"usr-{int(time.time()*1000)}-{secrets.token_hex(3)}"
        app_id = f"app-{int(time.time()*1000)}-{secrets.token_hex(3)}"
        magic_tok = secrets.token_hex(24)
        
        # Track prefix
        tr_lower = item["track"].lower()
        if "data" in tr_lower:
            track_code = "DA"
        elif "full" in tr_lower or "stack" in tr_lower:
            track_code = "FS"
        elif "ai" in tr_lower or "gen" in tr_lower:
            track_code = "AI"
        elif "ml" in tr_lower or "machine" in tr_lower:
            track_code = "ML"
        else:
            track_code = "OPS"
            
        offer_id = f"VY-2026-{track_code}-{secrets.token_hex(2).upper()}"

        # Insert user if not exists
        u_row = c.execute("SELECT id FROM users WHERE LOWER(email) = ?", (item["email"],)).fetchone()
        if not u_row:
            c.execute("""
                INSERT INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
                VALUES (?, ?, 'N/A', 'N/A', ?, 'intern', ?, 'pending', ?, ?)
            """, (user_id, item["email"], item["name"], item["phone"], now_iso, now_iso))
            actual_user_id = user_id
        else:
            actual_user_id = u_row["id"]

        # Insert intern application
        c.execute("""
            INSERT INTO intern_applications (
                id, user_id, user_name, user_email, phone, college_name, track_name,
                cv_url, status, magic_token, offer_letter_id, batch_start_date, applied_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, ?, '2026-11-02', ?, ?)
        """, (
            app_id, actual_user_id, item["name"], item["email"], item["phone"],
            item["college"], item["track"], item["cv_url"], magic_tok, offer_id,
            item["applied_at"], now_iso
        ))

        ingested.append({
            "name": item["name"],
            "email": item["email"],
            "phone": item["phone"],
            "track": item["track"],
            "college": item["college"],
            "applied_at": item["raw_timestamp"],
            "offer_letter_id": offer_id
        })

    conn.commit()
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()

    print("\n--- NEW INGESTED APPLICANTS ---")
    for i, a in enumerate(ingested, 1):
        print(f"  {i}. {a['name']:<24} | {a['email']:<30} | {a['phone']:<14} | Track: {a['track']} | Applied: {a['applied_at']}")

    print(f"\n[SUCCESS] Successfully ingested {len(ingested)} new Google Form submissions into database!")
    return ingested

if __name__ == "__main__":
    sync_new_google_form_entries()
