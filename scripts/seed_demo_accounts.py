import sqlite3
import hashlib
import time
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'vayanai.db')

def hash_pw(password):
    salt = hashlib.md5(f"{password}_salt_vayanai_2026".encode()).hexdigest()
    h = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1, maxmem=0).hex()
    return h, salt

def seed():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    users_data = [
        # Admin & Staff
        ("usr-admin-01", "admin@vayanai.in", "AdminPass123!", "Integrity Operations Lead", "admin", "verified"),
        ("usr-staff-01", "rohit.bda@vayanai.in", "StaffPass123!", "Rohit Sen (BDA Lead)", "staff", "verified"),
        
        # Intern Stage 1: Applied / Pre-Interview Agreement (Not started)
        ("usr-int-stg1", "vikram.applicant@example.com", "InternPass123!", "Vikram Joshi", "intern", "pending"),

        # Intern Stage 2: Interview Completed / Telemetry Audit Under Review
        ("usr-int-maya", "maya.interviewed@example.com", "InternPass123!", "Maya Kulkarni", "intern", "pending"),
        
        # Intern Stage 3: Selected / Offer Letter Generated / Deposit Required
        ("usr-int-stg2", "sneha.selected@example.com", "InternPass123!", "Sneha Patel", "intern", "pending"),
        
        # Intern Stage 4: Offer Accepted / ₹499 Deposit UTR Submitted (Verification Pending)
        ("usr-int-stg3", "aditya.pending@example.com", "InternPass123!", "Aditya Verma", "intern", "pending"),
        
        # Intern Stage 5: Enrolled / ₹499 Deposit Verified / Active Sprint Unlocked
        ("usr-intern-05", "ananya.intern@example.com", "InternPass123!", "Ananya Ghosh", "intern", "verified"),
        
        # Intern Stage 6: Completed 3-Month Tenure / Certified Graduate
        ("usr-int-stg5", "kushal.certified@example.com", "InternPass123!", "Kushal Agarwal", "intern", "verified"),

        # Traveler & Host
        ("usr-trav-01", "aarav.traveler@example.com", "TravelerPass123!", "Aarav Sharma", "traveler", "verified"),
        ("usr-host-01", "sohra.host@example.com", "PartnerPass123!", "Banteilang Marbaniang", "partner", "verified"),
    ]

    print("Seeding Users...")
    resolved_user_ids = {}
    for default_uid, email, pwd, name, role, vstatus in users_data:
        h, salt = hash_pw(pwd)
        existing = cur.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email.lower(),)).fetchone()
        if existing:
            uid = existing["id"]
            cur.execute("""
                UPDATE users SET
                    password_hash = ?, salt = ?, name = ?, role = ?, verification_status = ?, updated_at = ?
                WHERE id = ?
            """, (h, salt, name, role, vstatus, now, uid))
        else:
            uid = default_uid
            cur.execute("""
                INSERT INTO users (id, email, password_hash, salt, name, role, verification_status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (uid, email, h, salt, name, role, vstatus, now, now))
        resolved_user_ids[email.lower()] = uid
        print(f"  [OK] User {email} ({role}, id={uid}) -> ready")

    # Seed Applications Across All Stages
    applications_data = [
        # Stage 1: Vikram Joshi (applied, ready for interview & pre-interview integrity agreement)
        {
            "id": "app-vikram-01",
            "user_id": resolved_user_ids["vikram.applicant@example.com"],
            "user_name": "Vikram Joshi",
            "user_email": "vikram.applicant@example.com",
            "track_name": "Data Analyst",
            "status": "applied",
            "college_name": "BITS Pilani",
            "phone": "+91 98765 00001",
            "interview_score": None,
            "interview_answers_json": None,
            "magic_token": "tok-vikram-2026",
            "offer_letter_id": None,
            "signature_name": None,
            "utr_number": None,
            "deposit_receipt": None,
            "proctoring_telemetry_json": None,
            "batch_start_date": "2026-11-02",
        },
        # Stage 2: Maya Kulkarni (interview_completed, score 86%, telemetry with 2 tab switches, waiting for Admin review)
        {
            "id": "app-maya-02",
            "user_id": resolved_user_ids["maya.interviewed@example.com"],
            "user_name": "Maya Kulkarni",
            "user_email": "maya.interviewed@example.com",
            "track_name": "AI & Machine Learning",
            "status": "interview_completed",
            "college_name": "COEP Pune",
            "phone": "+91 98765 00006",
            "interview_score": 86,
            "interview_answers_json": json.dumps({
                "q-pacing-safety": "opt-1-optimal",
                "q-partner-integrity": "opt-2-optimal",
                "q-altitude-protocol": "opt-3-optimal",
                "q-community-spend": "opt-4-optimal"
            }),
            "magic_token": "tok-maya-2026",
            "offer_letter_id": None,
            "signature_name": None,
            "utr_number": None,
            "deposit_receipt": None,
            "proctoring_telemetry_json": json.dumps({
                "tabSwitchCount": 2,
                "copyPasteAttempts": 1,
                "totalDurationSeconds": 540,
                "webcamVerified": False,
                "integrityScore": "FLAGGED_MODERATE",
                "flags": [
                    "2 tab switches detected during examination",
                    "1 clipboard copy/paste attempt blocked"
                ],
                "proctoringMode": "camera_free",
                "submittedAt": now
            }),
            "batch_start_date": "2026-11-02",
        },
        # Stage 3: Sneha Patel (selected, 88% score, offer issued, signable, ₹499 deposit QR, download locked)
        {
            "id": "app-sneha-03",
            "user_id": resolved_user_ids["sneha.selected@example.com"],
            "user_name": "Sneha Patel",
            "user_email": "sneha.selected@example.com",
            "track_name": "AI & Machine Learning",
            "status": "selected",
            "college_name": "IIT Roorkee",
            "phone": "+91 98765 00002",
            "interview_score": 88,
            "interview_answers_json": json.dumps({
                "q-pacing-safety": "opt-1-optimal",
                "q-partner-integrity": "opt-2-optimal",
                "q-altitude-protocol": "opt-3-optimal",
                "q-community-spend": "opt-4-optimal"
            }),
            "magic_token": "tok-sneha-2026",
            "offer_letter_id": "VY-2026-AI-8841",
            "signature_name": None,
            "utr_number": None,
            "deposit_receipt": None,
            "proctoring_telemetry_json": json.dumps({
                "tabSwitchCount": 0,
                "copyPasteAttempts": 0,
                "totalDurationSeconds": 480,
                "webcamVerified": False,
                "integrityScore": "CLEAN",
                "flags": [],
                "proctoringMode": "camera_free",
                "submittedAt": now
            }),
            "batch_start_date": "2026-11-02",
        },
        # Stage 4: Aditya Verma (deposit_pending_verification, signed, ₹499 UTR submitted, download locked)
        {
            "id": "app-aditya-04",
            "user_id": resolved_user_ids["aditya.pending@example.com"],
            "user_name": "Aditya Verma",
            "user_email": "aditya.pending@example.com",
            "track_name": "Python Automation",
            "status": "deposit_pending_verification",
            "college_name": "NIT Trichy",
            "phone": "+91 98765 00003",
            "interview_score": 92,
            "interview_answers_json": json.dumps({
                "q-pacing-safety": "opt-1-optimal",
                "q-partner-integrity": "opt-2-optimal",
                "q-altitude-protocol": "opt-3-optimal",
                "q-community-spend": "opt-4-optimal"
            }),
            "magic_token": "tok-aditya-2026",
            "offer_letter_id": "VY-2026-PA-3829",
            "signature_name": "Aditya Verma",
            "utr_number": "UPI-499-982144",
            "deposit_receipt": "VP-VER-2026-3829",
            "proctoring_telemetry_json": json.dumps({
                "tabSwitchCount": 0,
                "copyPasteAttempts": 0,
                "totalDurationSeconds": 420,
                "webcamVerified": False,
                "integrityScore": "CLEAN",
                "flags": [],
                "proctoringMode": "camera_free",
                "submittedAt": now
            }),
            "batch_start_date": "2026-11-02",
        },
        # Stage 5: Ananya Ghosh (enrolled, deposit verified, active workspace unlocked, download unlocked)
        {
            "id": "app-ananya-05",
            "user_id": resolved_user_ids["ananya.intern@example.com"],
            "user_name": "Ananya Ghosh",
            "user_email": "ananya.intern@example.com",
            "track_name": "Sustainable Regional Operations & Growth",
            "status": "enrolled",
            "college_name": "St. Xavier's College",
            "phone": "+91 98765 00004",
            "interview_score": 96,
            "interview_answers_json": json.dumps({
                "q-pacing-safety": "opt-1-optimal",
                "q-partner-integrity": "opt-2-optimal",
                "q-altitude-protocol": "opt-3-optimal",
                "q-community-spend": "opt-4-optimal"
            }),
            "magic_token": "tok-ananya-2026",
            "offer_letter_id": "VY-2026-SO-1102",
            "signature_name": "Ananya Ghosh",
            "utr_number": "UPI-499-110294",
            "deposit_receipt": "VP-VER-2026-1102",
            "proctoring_telemetry_json": json.dumps({
                "tabSwitchCount": 0,
                "copyPasteAttempts": 0,
                "totalDurationSeconds": 510,
                "webcamVerified": False,
                "integrityScore": "CLEAN",
                "flags": [],
                "proctoringMode": "camera_free",
                "submittedAt": now
            }),
            "batch_start_date": "2026-10-15",
        },
        # Stage 6: Kushal Agarwal (completed, certified graduate)
        {
            "id": "app-kushal-06",
            "user_id": resolved_user_ids["kushal.certified@example.com"],
            "user_name": "Kushal Agarwal",
            "user_email": "kushal.certified@example.com",
            "track_name": "Data Analyst",
            "status": "completed",
            "college_name": "Delhi Technological University",
            "phone": "+91 98765 00005",
            "interview_score": 94,
            "interview_answers_json": json.dumps({
                "q-pacing-safety": "opt-1-optimal",
                "q-partner-integrity": "opt-2-optimal",
                "q-altitude-protocol": "opt-3-optimal",
                "q-community-spend": "opt-4-optimal"
            }),
            "magic_token": "tok-kushal-2026",
            "offer_letter_id": "VY-2026-DA-0166",
            "signature_name": "Kushal Agarwal",
            "utr_number": "UPI-499-016688",
            "deposit_receipt": "VP-VER-2026-0166",
            "proctoring_telemetry_json": json.dumps({
                "tabSwitchCount": 0,
                "copyPasteAttempts": 0,
                "totalDurationSeconds": 600,
                "webcamVerified": False,
                "integrityScore": "CLEAN",
                "flags": [],
                "proctoringMode": "camera_free",
                "submittedAt": now
            }),
            "batch_start_date": "2026-07-01",
        }
    ]

    demo_emails = [a["user_email"].lower() for a in applications_data]
    cur.execute(f"DELETE FROM intern_applications WHERE LOWER(user_email) IN ({','.join(['?']*len(demo_emails))})", demo_emails)
    cur.execute(f"DELETE FROM payments WHERE LOWER(user_email) IN ({','.join(['?']*len(demo_emails))})", demo_emails)

    print("\nSeeding Intern Applications Across All 6 Stages...")
    for a in applications_data:
        # Check if exists by id or user_email
        cur.execute("""
            INSERT INTO intern_applications 
            (id, user_id, user_name, user_email, track_name, status, college_name, phone,
             interview_score, interview_answers_json, magic_token, offer_letter_id, signature_name,
             utr_number, deposit_receipt, proctoring_telemetry_json, batch_start_date, applied_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                user_id=excluded.user_id,
                user_name=excluded.user_name,
                user_email=excluded.user_email,
                track_name=excluded.track_name,
                status=excluded.status,
                interview_score=excluded.interview_score,
                interview_answers_json=excluded.interview_answers_json,
                magic_token=excluded.magic_token,
                offer_letter_id=excluded.offer_letter_id,
                signature_name=excluded.signature_name,
                utr_number=excluded.utr_number,
                deposit_receipt=excluded.deposit_receipt,
                proctoring_telemetry_json=excluded.proctoring_telemetry_json,
                batch_start_date=excluded.batch_start_date,
                updated_at=excluded.updated_at
        """, (
            a["id"], a["user_id"], a["user_name"], a["user_email"], a["track_name"],
            a["status"], a["college_name"], a["phone"], a["interview_score"], a["interview_answers_json"],
            a["magic_token"], a["offer_letter_id"], a["signature_name"], a["utr_number"],
            a["deposit_receipt"], a["proctoring_telemetry_json"], a["batch_start_date"], now, now
        ))
        print(f"  [OK] Application {a['user_name']} ({a['track_name']}) -> Status: {a['status']}")

    # Seed Payments
    payments_data = [
        # Aditya: pending verification
        ("pay-aditya-01", resolved_user_ids["aditya.pending@example.com"], "aditya.pending@example.com", "Aditya Verma", "security_deposit", 499, "INR", "pending", "upi_qr", "UPI-499-982144", "VP-VER-2026-3829", now),
        # Ananya: completed
        ("pay-ananya-01", resolved_user_ids["ananya.intern@example.com"], "ananya.intern@example.com", "Ananya Ghosh", "security_deposit", 499, "INR", "completed", "upi_qr", "UPI-499-110294", "VP-VER-2026-1102", now),
        # Kushal: completed
        ("pay-kushal-01", resolved_user_ids["kushal.certified@example.com"], "kushal.certified@example.com", "Kushal Agarwal", "security_deposit", 499, "INR", "completed", "upi_qr", "UPI-499-016688", "VP-VER-2026-0166", now),
    ]

    print("\nSeeding Payments...")
    for p in payments_data:
        cur.execute("""
            INSERT OR REPLACE INTO payments
            (id, user_id, user_email, user_name, product_type, amount_inr, currency,
             payment_status, payment_method, transaction_ref, receipt_number, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, p)
        print(f"  [OK] Payment for {p[2]} -> {p[7]}")

    # Seed Certificates
    certs_data = [
        # Kushal Agarwal
        (
            "cert-kushal-01", "CERT-VAY-2026-DA-166", "VAY-INT-KA-2026-166", resolved_user_ids["kushal.certified@example.com"],
            "Kushal Agarwal", "kushal.certified@example.com", "Data Analyst",
            "High-Altitude Weather Modeling, Time-Series Forecasts, Terrain Pacing Protocols, Incident Correlation",
            "High-Altitude Weather & Pacing Predictive Engine",
            "Engineered predictive meteorological risk scoring for high-altitude passes in Ladakh and Spiti. Analyzed 4 seasons of telemetry to optimize acclimatization pauses.",
            json.dumps([
                "Pacing & Weather Severity Index with 91.4% precipitation anomaly detection accuracy",
                "Automated offline altitude sickness buffer calculator adopted by 14 community travel leads",
                "Telemetry pipeline ingesting open-source Indian Meteorological Department feeds"
            ]),
            "Dr. Vikramaditya Rao", "Principal Data Scientist & Academic Mentor", "vikram.mentor@vayanai.in",
            "01 July 2026", "30 September 2026", "02 October 2026",
            "https://vayanai.in.net/verify?certid=CERT-VAY-2026-DA-166", "active",
            "UDYAM-KR-03-0412891", "Vayanai Journeys Council & Academic Board", "DTU-2026-DA-166"
        ),
        # Ananya Ghosh
        (
            "cert-seed-01", "CERT-VAY-2026-SO-001", "VAY-INT-AG-2345-001", resolved_user_ids["ananya.intern@example.com"],
            "Ananya Ghosh", "ananya.intern@example.com", "Sustainable Regional Operations & Growth",
            "Homestay Auditing, Pacing Protocols, Partner Integrity, Community Direct-Spend Metrics, Regional Logistics",
            "Northeast Meghalaya Community Homestays Audit",
            "Audited 12 indigenous Khasi homestays across Mawlynnong and Sohra valleys. Verified step-free accessibility, indigenous rainwater conservation capacity, and village council contact information.",
            json.dumps([
                "Standardized Pacing Matrix for high-rainfall regions and elder travelers",
                "100% verified zero-fabrication supplier catalog with authentic local contact references",
                "Community revenue retention framework guaranteeing 88%+ direct spend to family hosts"
            ]),
            "Rohit Sen", "Senior BDA Lead & Regional Supervisor", "rohit.bda@vayanai.in",
            "10 January 2026", "10 March 2026", "12 March 2026",
            "https://vayanai.in.net/verify?certid=CERT-VAY-2026-SO-001", "active",
            "UDYAM-UP-29-0109046", "DBERT Technical Council & Vayanai Operations Platform", "SX-KOL-2026-GEO-881"
        )
    ]

    print("\nSeeding Verified Certificates...")
    for c in certs_data:
        cur.execute("""
            INSERT INTO certificates
            (id, certificate_id, intern_id, user_id, intern_name, intern_email, domain, topics_covered,
             project_name, project_description, project_deliverables, mentor_name, mentor_role, mentor_email,
             joining_date, completion_date, issue_date, qr_payload_url, status, udyam_reg_number,
             issuing_authority, utr_number, fee_inr, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            ON CONFLICT(certificate_id) DO UPDATE SET
                intern_name=excluded.intern_name,
                intern_email=excluded.intern_email,
                user_id=excluded.user_id,
                domain=excluded.domain,
                status=excluded.status,
                project_name=excluded.project_name,
                project_deliverables=excluded.project_deliverables,
                updated_at=excluded.updated_at
        """, (*c, now, now))
        print(f"  [OK] Certificate {c[1]} for {c[4]} -> active")

    conn.commit()
    conn.close()
    print("\n[DONE] SEEDING COMPLETE! All 6 stages, admin, staff, and traveler/host accounts ready.")

if __name__ == "__main__":
    seed()
