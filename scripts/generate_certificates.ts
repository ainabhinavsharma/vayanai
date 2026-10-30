/**
 * Batch Certificate Generator (Node.js / TypeScript)
 * Reads past batch interns CSV and synchronizes to SQLite & verify/certificates.csv
 */

import fs from 'fs';
import path from 'path';
import { getDb, seedInitialData } from '../lib/db/sqlite';
import { createCertificate, generateQRCodeDataUrl } from '../lib/db/certificates-repo';

const DEFAULT_BASE_URL = 'https://vayanai.in.net/verify?certid=';
const CSV_PATH = path.resolve(process.cwd(), 'data', 'sample_past_interns.csv');
const VERIFY_DIR = path.resolve(process.cwd(), 'verify');
const VERIFY_CSV = path.join(VERIFY_DIR, 'certificates.csv');

interface ParsedRow {
  name: string;
  email: string;
  domain: string;
  project: string;
  mentor: string;
  joiningDate: string;
}

function parseCSV(content: string): ParsedRow[] {
  const lines = content.trim().split('\n');
  if (lines.length <= 1) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 6) {
      rows.push({
        name: parts[0].trim(),
        email: parts[1].trim(),
        domain: parts[2].trim(),
        project: parts[3].trim(),
        mentor: parts[4].trim(),
        joiningDate: parts[5].trim()
      });
    }
  }
  return rows;
}

function getTopics(domain: string): string {
  const mapping: Record<string, string> = {
    'Python Automation':
      'Python Programming, Automation Scripts, File Handling, Batch CSV/Excel Processing, REST APIs, Task Scheduling',
    'AI Agent Development':
      'Prompt Engineering, AI Agents, RAG Pipelines, LangChain, Multi-Agent Workflows, Grounded Citation Verification',
    'Full Stack Development':
      'TypeScript, React, Next.js, REST APIs, SQLite Persistence, Component Styling, Authentication Workflows',
    'Data Analyst':
      'Excel, SQL, Python, Pandas, Data Cleaning, Visualization, Power BI, Economic Direct-Spend Modeling',
    'Sustainable Regional Operations & Growth':
      'Homestay Auditing, Pacing Protocols, Partner Integrity, Direct-Spend Retention Metrics, Regional Transport Logistics',
    'Field Tourism Audit & Compliance':
      'Safety Certifications, Accessibility Inspections, Zero-Fabrication Partner Verification, Local Council Liason'
  };
  return mapping[domain] || 'Operational Pacing, Regional Verification, Integrity Standards';
}

function generateIds(name: string, email: string, domain: string, year: number, serial: number) {
  const initials = (name || '')
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() || '')
    .join('') || 'INT';

  const user = email.split('@')[0] || '';
  const last4 = user.slice(-4) || '0000';

  const isOps = domain.includes('Operations') || domain.includes('Tourism');
  const prefix = isOps ? 'VAY' : 'DBERT';

  const internId = `${prefix}-INT-${initials}-${last4}-${String(serial).padStart(3, '0')}`.toUpperCase();

  const code = domain
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'OP';

  const certId = `CERT-${prefix}-${year}-${code}-${String(serial).padStart(3, '0')}`.toUpperCase();

  return { internId, certId };
}

async function main() {
  console.log('[BATCH-CERT-TS] Initializing database...');
  const db = getDb();

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`[ERROR] CSV not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`[BATCH-CERT-TS] Parsed ${rows.length} intern records from CSV.`);

  if (!fs.existsSync(VERIFY_DIR)) {
    fs.mkdirSync(VERIFY_DIR, { recursive: true });
  }

  const currentYear = new Date().getFullYear();
  const verifyCsvLines = ['email,name,domain,internid,certificateid,verify_url,status'];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const { internId, certId } = generateIds(row.name, row.email, row.domain, currentYear, idx + 1);
    const verifyUrl = `${DEFAULT_BASE_URL}${certId}`;

    const mentorRole = row.mentor.includes('Rohit')
      ? 'Senior BDA Lead & Regional Supervisor'
      : 'Program Head, DBERT Technical Council';

    // Calculate dates
    const joinD = new Date(row.joiningDate);
    const endD = new Date(joinD);
    endD.setMonth(endD.getMonth() + 2);

    const formatD = (d: Date) =>
      `${d.getDate()} ${d.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;

    try {
      createCertificate({
        certificateId: certId,
        internId,
        internName: row.name,
        internEmail: row.email,
        domain: row.domain,
        topicsCovered: getTopics(row.domain),
        projectName: row.project,
        projectDescription: `Applied milestone project on ${row.project} under mentor ${row.mentor}.`,
        projectDeliverables: [
          `Verified project deliverables for ${row.project}`,
          'Zero-fabrication supplier compliance audit sign-off',
          'Completed milestone report reviewed by Program Lead'
        ],
        mentorName: row.mentor,
        mentorRole,
        mentorEmail: `${row.mentor.toLowerCase().replace(' ', '.')}@vayanai.in`,
        joiningDate: formatD(joinD),
        completionDate: formatD(endD),
        issueDate: formatD(endD),
        qrPayloadUrl: verifyUrl,
        status: 'active',
        udyamRegNumber: 'UDYAM-UP-29-0109046',
        issuingAuthority: 'DBERT Technical Council & Vayanai Operations Platform'
      });
      console.log(`[CREATED] ${certId} for ${row.name}`);
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        console.log(`[EXISTS] ${certId} already registered in SQLite.`);
      } else {
        console.error(`[ERROR] Failed to insert ${certId}:`, err);
      }
    }

    verifyCsvLines.push(`${row.email},${row.name},${row.domain},${internId},${certId},${verifyUrl},active`);
  }

  fs.writeFileSync(VERIFY_CSV, verifyCsvLines.join('\n'), 'utf-8');
  console.log(`[DONE] Synced verification entries to ${VERIFY_CSV}`);
}

main().catch(console.error);
