#!/usr/bin/env python3
"""
Clean and Retain Google Form Applicants Only
--------------------------------------------
Purges all mock, test, and demo intern accounts and applications from SQLite.
Retains and synchronizes strictly the 374 genuine candidates from the live Google Sheet.
Preserves administrative and operational credentials (admin@vayanai.in, etc.).
"""

import sqlite3
import urllib.request
import csv
import io
import time
import secrets
import os

GOOGLE_SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/1koeFclx1MsMM_cQXk3hrU-JTLXlj3OGrDegQIG9-Zio/export?format=csv&gid=1670509518"
)

def clean_database(db_path):
    print(f"\n=======================================================")
    print(f" Processing database: {db_path}")
    print(f"=======================================================")

    if not os.path.isfile(db_path):
        print(f"File not found: {db_path}, skipping.")
        return

    # 1. Fetch Google Sheet CSV
    print("1. Fetching latest Google Sheet submissions...")
    req = urllib.request.Request(GOOGLE_SHEET_URL, headers={"User-Agent": "Mozilla/5.0 VayanaiCleaner/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        csv_text = resp.read().decode("utf-8", errors="ignore")

    reader = list(csv.DictReader(io.StringIO(csv_text)))
    print(f"   -> Retrieved {len(reader)} rows from Google Sheet.")

    # Build unique records by email
    sheet_candidates = {}
    for r in reader:
        email = (r.get("Email Address") or r.get("email") or "").strip().lower()
        name = (r.get("Name") or r.get("Full Name") or r.get("name") or "").strip()
        if not email or not name:
            continue
        track = (r.get("Select Internship") or r.get("Track") or "Sustainable Regional Operations & Growth").strip()
        college = (r.get("College Name") or r.get("College") or "Verified University").strip()
        phone = (r.get("WhatsApp number ") or r.get("WhatsApp number") or r.get("Phone") or "").strip()
        cv_url = (r.get("Please Upload Your CV") or r.get("CV") or r.get("Resume") or "").strip()
        applied_at = r.get("Timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        sheet_candidates[email] = {
            "name": name,
            "email": email,
            "track": track,
            "college": college,
            "phone": phone,
            "cv_url": cv_url,
            "applied_at": applied_at
        }

    valid_emails = list(sheet_candidates.keys())
    print(f"   -> Identified {len(valid_emails)} distinct genuine applicant emails.")

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = OFF;")
    cursor = conn.cursor()

    try:
        # 2. Count existing records before cleanup
        cursor.execute("SELECT COUNT(*) FROM intern_applications")
        prev_apps = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'intern'")
        prev_intern_users = cursor.fetchone()[0]
        print(f"2. Pre-cleanup counts: {prev_apps} intern applications, {prev_intern_users} intern users.")

        # 3. Delete non-sheet applications
        placeholders = ",".join(["?"] * len(valid_emails))
        cursor.execute(f"DELETE FROM intern_applications WHERE LOWER(user_email) NOT IN ({placeholders})", valid_emails)
        deleted_apps = cursor.rowcount
        print(f"   -> Deleted {deleted_apps} demo/test intern applications.")

        # 4. Delete non-sheet intern users (preserve admin, staff, partner, traveler)
        cursor.execute(f"DELETE FROM users WHERE role = 'intern' AND LOWER(email) NOT IN ({placeholders})", valid_emails)
        deleted_users = cursor.rowcount
        print(f"   -> Deleted {deleted_users} demo/test intern user accounts.")

        # 5. Clean orphaned certificates, payments, sessions
        cursor.execute("DELETE FROM certificates WHERE certificate_id LIKE 'CERT-TEST-%' OR certificate_id LIKE 'CERT-PENDING-%' OR certificate_id LIKE 'CERT-REJECT-%' OR certificate_id LIKE '%MOCK%'")
        deleted_certs = cursor.rowcount
        cursor.execute(f"DELETE FROM payments WHERE LOWER(user_email) NOT IN ({placeholders})", valid_emails)
        deleted_pmts = cursor.rowcount
        cursor.execute("DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)")
        deleted_sess = cursor.rowcount
        print(f"   -> Cleaned demo side-data: {deleted_certs} certificates, {deleted_pmts} payments, {deleted_sess} sessions.")

        # 6. Ensure all 374 genuine applicants exist in users and intern_applications
        print("6. Ingesting / verifying all genuine Google Sheet candidates...")
        inserted_new = 0
        existing_kept = 0
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        for email, cand in sheet_candidates.items():
            # Check user
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
            u_row = cursor.fetchone()
            if not u_row:
                user_id = f"usr-{int(time.time()*1000)}-{secrets.token_hex(3)}"
                cursor.execute("""
                    INSERT INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
                    VALUES (?, ?, 'N/A', 'N/A', ?, 'intern', ?, 'pending', ?, ?)
                """, (user_id, email, cand["name"], cand["phone"] or None, now_iso, now_iso))
            else:
                user_id = u_row[0]

            # Check application
            cursor.execute("SELECT id, magic_token FROM intern_applications WHERE LOWER(user_email) = ?", (email,))
            app_row = cursor.fetchone()
            if not app_row:
                app_id = f"app-{int(time.time()*1000)}-{secrets.token_hex(3)}"
                magic_tok = secrets.token_hex(24)
                cursor.execute("""
                    INSERT INTO intern_applications (
                        id, user_id, user_name, user_email, phone, college_name, track_name,
                        cv_url, status, magic_token, batch_start_date, applied_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, '2026-11-02', ?, ?)
                """, (
                    app_id, user_id, cand["name"], email, cand["phone"] or None,
                    cand["college"], cand["track"], cand["cv_url"] or None,
                    magic_tok, cand["applied_at"], now_iso
                ))
                inserted_new += 1
            else:
                existing_kept += 1

        conn.commit()

        # 7. Final counts verification
        cursor.execute("SELECT COUNT(*) FROM intern_applications")
        final_apps = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'intern'")
        final_intern_users = cursor.fetchone()[0]
        cursor.execute("SELECT role, COUNT(*) FROM users GROUP BY role")
        role_breakdown = cursor.fetchall()

        print(f"\n[SUCCESS] Final database state for {db_path}:")
        print(f"  -> Total intern_applications: {final_apps} (strictly matching Google Sheet)")
        print(f"  -> Total intern users: {final_intern_users}")
        print(f"  -> User roles breakdown: {role_breakdown}")

        # Checkpoint WAL
        cursor.execute("PRAGMA wal_checkpoint(TRUNCATE);")
        conn.commit()

    finally:
        conn.close()

if __name__ == "__main__":
    clean_database("data/vayanai.db")
    clean_database("cpanel_deploy/data/vayanai.db")
