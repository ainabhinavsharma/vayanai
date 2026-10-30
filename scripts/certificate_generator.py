#!/usr/bin/env python3
"""
Certificate Generator & Registry Synchronizer
DBERT Technical Council & Vayanai Operations Platform

Generates high-fidelity PDF certificates with embedded QR codes that redirect
to the official public verification page (https://vayanai.in.net/verify?certid=...).
Synchronizes generated certificates directly to SQLite (data/vayanai.db) and verify/certificates.csv.
"""

import os
import sys
import argparse
import logging
import sqlite3
import json
from datetime import datetime, date
from io import BytesIO

import pandas as pd
import qrcode
from dateutil.relativedelta import relativedelta
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import inch

# Optional Outlook Mailer (won't crash if win32com is absent)
try:
    import win32com.client
    HAS_WIN32COM = True
except ImportError:
    HAS_WIN32COM = False

DEFAULT_BASE_URL = "https://vayanai.in.net/verify?certid="
OUTPUT_DIR = "certificates"
VERIFY_DIR = "verify"
DB_PATH = os.path.join("data", "vayanai.db")
VERIFY_CSV = os.path.join(VERIFY_DIR, "certificates.csv")

PDF_AUTHOR = "DBERT_Vayanai_Operations_Council"
INTERNSHIP_MONTHS = 2

QR_SIZE = 64
QR_X = 540
QR_Y = 55

DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d.%m.%Y",
    "%d/%m/%y",
    "%d-%m-%y",
    "%d %B %Y",
    "%d %b %Y",
    "%d %B, %Y",
    "%d %b, %Y",
    "%B %d, %Y",
    "%b %d, %Y",
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("certificate_progress.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)


def parse_joining_date(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if value is None or pd.isna(value):
        raise ValueError("Joining Date is empty")
    text = str(value).strip()
    if not text or text.lower() in ("nan", "nat", "none"):
        raise ValueError("Joining Date is empty")
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognised date format '{text}'")


def calc_end_date(joining_date):
    return joining_date + relativedelta(months=INTERNSHIP_MONTHS)


def format_date(d):
    return f"{d.day} {d.strftime('%B %Y')}"


def get_topics(domain):
    mapping = {
        "Python Automation": (
            "Python Programming, Automation Scripts, File Handling, "
            "Batch CSV/Excel Processing, REST APIs, Task Scheduling"
        ),
        "AI Agent Development": (
            "Prompt Engineering, AI Agents, RAG Pipelines, "
            "LangChain, Multi-Agent Workflows, Grounded Citation Verification"
        ),
        "Full Stack Development": (
            "TypeScript, React, Next.js, REST APIs, "
            "SQLite Persistence, Component Styling, Authentication Workflows"
        ),
        "Data Analyst": (
            "Excel, SQL, Python, Pandas, Data Cleaning, "
            "Visualization, Power BI, Economic Direct-Spend Modeling"
        ),
        "Sustainable Regional Operations & Growth": (
            "Homestay Auditing, Pacing Protocols, Partner Integrity, "
            "Direct-Spend Retention Metrics, Regional Transport Logistics"
        ),
        "Field Tourism Audit & Compliance": (
            "Safety Certifications, Accessibility Inspections, "
            "Zero-Fabrication Partner Verification, Local Council Liason"
        )
    }
    return mapping.get(domain.strip(), "Operational Pacing, Regional Verification, Integrity Standards")


def generate_ids(name, email, domain, year, serial):
    initials = "".join(x[0].upper() for x in (name or "").split()[:2]) or "INT"
    user = email.split("@")[0] if email else ""
    last4 = user[-4:] if user else "0000"

    is_ops = "Operations" in domain or "Tourism" in domain
    prefix = "VAY" if is_ops else "DBERT"

    intern_id = f"{prefix}-INT-{initials}-{last4}-{serial:03d}".upper()

    code = "".join(w[0].upper() for w in domain.split()[:2]) or "OP"
    cert_id = f"CERT-{prefix}-{year}-{code}-{serial:03d}".upper()

    return intern_id, cert_id


def generate_qr_buffer(verify_url):
    q = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=1,
    )
    q.add_data(verify_url)
    q.make(fit=True)
    img = q.make_image(fill_color="#141E18", back_color="#FAF7F0")
    b = BytesIO()
    img.save(b, format="PNG")
    b.seek(0)
    return b


def generate_pdf_certificate(
    name,
    domain,
    certid,
    internid,
    project,
    joining_date,
    mentor_name="Sarita Bansal",
    mentor_role="Program Head",
    bg_path="targets12.png",
    sig_path="h.png",
    base_url=DEFAULT_BASE_URL
):
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=(640, 495))
    c.setAuthor(PDF_AUTHOR)
    c.setTitle(f"Certificate - {name} ({certid})")

    end_date = calc_end_date(joining_date)
    verify_url = f"{base_url}{certid}"
    qr_buf = generate_qr_buffer(verify_url)

    # Check if user provided custom PNG background
    if os.path.exists(bg_path):
        c.drawImage(bg_path, 0, 0, width=640, height=495)
        text_color = colors.white
        accent_color = colors.yellow
        title_color = colors.darkgoldenrod
    else:
        # Editorial vector fallback background
        c.setFillColor(colors.HexColor("#FAF7F0"))
        c.rect(0, 0, 640, 495, fill=1, stroke=0)

        # Double decorative border
        c.setStrokeColor(colors.HexColor("#C4974F"))
        c.setLineWidth(3)
        c.rect(14, 14, 612, 467, stroke=1, fill=0)

        c.setStrokeColor(colors.HexColor("#3C493F"))
        c.setLineWidth(1)
        c.rect(20, 20, 600, 455, stroke=1, fill=0)

        # Institution Header
        c.setFillColor(colors.HexColor("#141E18"))
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(320, 452, "DBERT TECHNICAL COUNCIL & VAYANAI OPERATIONS PLATFORM")

        c.setFillColor(colors.HexColor("#79664F"))
        c.setFont("Helvetica", 8)
        c.drawCentredString(320, 438, "MSME Reg. UDYAM-UP-29-0109046 • Credential & Operations Verification")

        # Decorative line
        c.setStrokeColor(colors.HexColor("#E2DAC9"))
        c.setLineWidth(1)
        c.line(40, 428, 600, 428)

        text_color = colors.HexColor("#2C3A33")
        accent_color = colors.HexColor("#1A2A22")
        title_color = colors.HexColor("#9C6C2E")

    # Certificate body
    c.setFillColor(text_color)
    c.setFont("Helvetica", 11)
    c.drawCentredString(320, 395, "THIS CERTIFICATE IS OFFICIALLY AWARDED TO")

    c.setFillColor(accent_color)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(320, 368, name.upper())

    c.setFillColor(text_color)
    c.setFont("Helvetica", 11)
    c.drawCentredString(320, 344, "on successful completion of the intensive practical internship in")

    c.setFillColor(title_color)
    c.setFont("Helvetica-BoldOblique", 14)
    c.drawCentredString(320, 320, domain)

    c.setFillColor(text_color)
    c.setFont("Helvetica", 9)
    topics = get_topics(domain)
    c.drawCentredString(320, 292, f"Covering Topics: {topics}")

    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(320, 268, f"Project Worked: {project}")

    c.setFont("Helvetica", 10)
    c.drawCentredString(
        320,
        244,
        f"Internship Duration: {format_date(joining_date)} to {format_date(end_date)}"
    )

    c.setFont("Helvetica", 9)
    c.drawCentredString(320, 215, f"Intern ID: {internid}")

    # Signature Block
    if os.path.exists(sig_path):
        c.drawImage(ImageReader(sig_path), 60, 95, width=1.3 * inch, height=0.65 * inch, mask="auto")
    else:
        c.setStrokeColor(colors.HexColor("#77887A"))
        c.setLineWidth(1)
        c.line(60, 105, 180, 105)

    c.setFillColor(colors.HexColor("#141E18") if not os.path.exists(bg_path) else colors.white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60, 88, mentor_name)

    c.setFont("Helvetica", 9)
    c.drawString(60, 75, mentor_role)

    # Scannable QR Code
    c.drawImage(ImageReader(qr_buf), QR_X, QR_Y, width=QR_SIZE, height=QR_SIZE)
    c.setFont("Helvetica", 7)
    c.drawCentredString(QR_X + (QR_SIZE / 2), QR_Y - 8, "Scan to Verify")

    # Bottom Metadata Strip
    c.setFillColor(colors.HexColor("#88998B") if not os.path.exists(bg_path) else colors.gray)
    c.setFont("Helvetica", 8)
    c.drawCentredString(320, 38, f"Certificate ID: {certid}")
    c.drawCentredString(320, 26, "Udyam Number: UDYAM-UP-29-0109046 • DBERT, H-182, Sec-62 Noida - 201301")
    c.drawCentredString(320, 14, f"Official Verification Registry: {verify_url}")

    c.showPage()
    c.save()
    buf.seek(0)
    return buf, verify_url


def sync_certificate_to_sqlite(
    db_path,
    cert_id,
    intern_id,
    name,
    email,
    domain,
    project,
    mentor_name,
    mentor_role,
    joining_date,
    completion_date,
    verify_url,
    phone=None,
    college_name=None,
    payment_proof_url=None,
    placement_prep=None,
    fee_inr=299
):
    if not os.path.exists(db_path):
        logging.warning("SQLite DB path %s does not exist; skipping SQLite sync", db_path)
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    now = datetime.now().isoformat()
    issue_date = format_date(completion_date)

    # Ensure schema has extended columns
    for col_sql in [
        "ALTER TABLE certificates ADD COLUMN phone TEXT;",
        "ALTER TABLE certificates ADD COLUMN college_name TEXT;",
        "ALTER TABLE certificates ADD COLUMN payment_proof_url TEXT;",
        "ALTER TABLE certificates ADD COLUMN placement_prep TEXT;",
        "ALTER TABLE certificates ADD COLUMN fee_inr INTEGER DEFAULT 299;"
    ]:
        try:
            cur.execute(col_sql)
            conn.commit()
        except sqlite3.OperationalError:
            pass

    topics = get_topics(domain)
    deliverables = json.dumps([
        f"Verified deliverables for {project}",
        f"Academic credential validation from {college_name}" if college_name else "Academic credential verification",
        "100% adherence to zero-fabrication platform integrity standards",
        "Successful review by supervising mentor"
    ])

    cur.execute("""
        INSERT INTO certificates (
            id, certificate_id, intern_id, user_id, intern_name, intern_email, phone, college_name,
            domain, topics_covered, project_name, project_description, project_deliverables,
            mentor_name, mentor_role, mentor_email, joining_date, completion_date, issue_date,
            qr_payload_url, status, udyam_reg_number, issuing_authority, payment_proof_url,
            placement_prep, fee_inr, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(certificate_id) DO UPDATE SET
            intern_name = excluded.intern_name,
            intern_email = excluded.intern_email,
            phone = excluded.phone,
            college_name = excluded.college_name,
            domain = excluded.domain,
            project_name = excluded.project_name,
            payment_proof_url = excluded.payment_proof_url,
            placement_prep = excluded.placement_prep,
            qr_payload_url = excluded.qr_payload_url,
            updated_at = excluded.updated_at
    """, (
        f"cert-{cert_id.lower()}",
        cert_id,
        intern_id,
        None,
        name,
        email,
        phone,
        college_name,
        domain,
        topics,
        project,
        f"Applied internship project on {project} under {mentor_name}. Institution: {college_name or 'N/A'}.",
        deliverables,
        mentor_name,
        mentor_role,
        f"{mentor_name.lower().replace(' ', '.')}@vayanai.in",
        format_date(joining_date),
        format_date(completion_date),
        issue_date,
        verify_url,
        "active",
        "UDYAM-UP-29-0109046",
        "DBERT Technical Council & Vayanai Operations Platform",
        payment_proof_url,
        placement_prep,
        fee_inr,
        now,
        now
    ))

    conn.commit()
    conn.close()


def parse_batch_to_dates(batch_str):
    text = (batch_str or "").strip().lower()
    year = 2026
    if "july to sep" in text or "jul to sep" in text:
        return date(year, 7, 1), date(year, 9, 30)
    elif "aug to oct" in text:
        return date(year, 8, 1), date(year, 10, 31)
    elif "june to aug" in text or "jun to aug" in text:
        return date(year, 6, 1), date(year, 8, 31)
    elif "may to july" in text or "may to jul" in text:
        return date(year, 5, 1), date(year, 7, 31)
    elif "sep to nov" in text:
        return date(year, 9, 1), date(year, 11, 30)
    elif "oct to dec" in text:
        return date(year, 10, 1), date(year, 12, 31)
    return date(year, 8, 1), date(year, 10, 31)


def process_csv(csv_path, base_url=DEFAULT_BASE_URL, sync_db=True):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(VERIFY_DIR, exist_ok=True)

    if not os.path.exists(csv_path):
        logging.error("CSV file not found: %s", csv_path)
        return

    df = pd.read_csv(csv_path)
    logging.info("Loaded %d intern rows from %s", len(df), csv_path)

    verify_records = []
    year = datetime.now().year

    for idx, row in df.iterrows():
        name = str(row.get("Name", "")).strip()
        email = str(row.get("Email Address") or row.get("Email", "")).strip()
        domain = str(row.get("Select Internship") or row.get("Domain", "Data Analyst")).strip()
        project = str(row.get("Project Contibuted On") or row.get("Project", "Gayatri Ai")).strip()
        college = str(row.get("College Name", "")).strip() if pd.notna(row.get("College Name")) else None
        phone = str(row.get("WhatsApp number", "")).strip() if pd.notna(row.get("WhatsApp number")) else None
        placement = str(row.get("Do You want Placement and Interview Prepration ?", "")).strip() if pd.notna(row.get("Do You want Placement and Interview Prepration ?")) else None
        payment_proof = str(row.get("Certification Fee 299/-", "")).strip() if pd.notna(row.get("Certification Fee 299/-")) else None
        batch_raw = str(row.get("Choose Internship Batch", "")).strip()
        joining_date_raw = row.get("Joining Date")

        if not name:
            continue

        if batch_raw:
            joining_date, end_date = parse_batch_to_dates(batch_raw)
        elif joining_date_raw:
            try:
                joining_date = parse_joining_date(joining_date_raw)
                end_date = calc_end_date(joining_date)
            except Exception as e:
                logging.warning("Skipping row %d (%s): invalid date %s (%s)", idx, name, joining_date_raw, e)
                continue
        else:
            joining_date = date(year, 8, 1)
            end_date = date(year, 10, 31)

        mentor = str(row.get("Mentor", "")).strip()
        if not mentor:
            mentor = "Rohit Sen" if "Full Stack" in domain or "Operations" in domain else "Sarita Bansal"

        mentor_role = "Senior BDA Lead & Technical Advisor" if "Rohit" in mentor else "Program Head, DBERT Technical Council"
        serial = 100 + idx + 1
        intern_id, cert_id = generate_ids(name, email, domain, year, serial)

        pdf_buf, verify_url = generate_pdf_certificate(
            name=name,
            domain=domain,
            certid=cert_id,
            internid=intern_id,
            project=project,
            joining_date=joining_date,
            mentor_name=mentor,
            mentor_role=mentor_role,
            base_url=base_url
        )

        safe_name = name.replace(" ", "_")
        pdf_path = os.path.join(OUTPUT_DIR, f"Certificate_{safe_name}_{cert_id}.pdf")
        with open(pdf_path, "wb") as f:
            f.write(pdf_buf.read())

        logging.info("Generated PDF -> %s", pdf_path)

        if sync_db:
            sync_certificate_to_sqlite(
                db_path=DB_PATH,
                cert_id=cert_id,
                intern_id=intern_id,
                name=name,
                email=email,
                domain=domain,
                project=project,
                mentor_name=mentor,
                mentor_role=mentor_role,
                joining_date=joining_date,
                completion_date=end_date,
                verify_url=verify_url,
                phone=phone,
                college_name=college,
                payment_proof_url=payment_proof,
                placement_prep=placement,
                fee_inr=299
            )

        verify_records.append({
            "email": email,
            "name": name,
            "domain": domain,
            "internid": intern_id,
            "certificateid": cert_id,
            "verify_url": verify_url,
            "status": "active"
        })

    # Save to verify/certificates.csv
    verify_df = pd.DataFrame(verify_records)
    verify_df.to_csv(VERIFY_CSV, index=False)
    logging.info("Saved %d records to %s", len(verify_df), VERIFY_CSV)
    print(f"\n[DONE] Successfully generated {len(verify_records)} certificates in '{OUTPUT_DIR}' and synced to SQLite '{DB_PATH}'.")


def main():
    parser = argparse.ArgumentParser(description="Generate Certificates with Scannable QR Codes & Database Sync")
    parser.add_argument("--csv", default="data/sample_past_interns.csv", help="Path to intern CSV file")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base verification URL")
    parser.add_argument("--no-db-sync", action="store_true", help="Skip SQLite database synchronization")
    args = parser.parse_args()

    process_csv(
        csv_path=args.csv,
        base_url=args.base_url,
        sync_db=not args.no_db_sync
    )


if __name__ == "__main__":
    main()
