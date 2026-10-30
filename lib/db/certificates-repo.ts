import { getDb } from './sqlite';
import { Certificate } from '@/types/certificates';
import QRCode from 'qrcode';

interface CertificateRow {
  id: string;
  certificate_id: string;
  intern_id: string;
  user_id: string | null;
  intern_name: string;
  intern_email: string;
  phone: string | null;
  college_name: string | null;
  domain: string;
  topics_covered: string;
  project_name: string;
  project_description: string | null;
  project_deliverables: string | null;
  mentor_name: string;
  mentor_role: string;
  mentor_email: string | null;
  joining_date: string;
  completion_date: string;
  issue_date: string;
  qr_payload_url: string;
  status: 'active' | 'revoked' | 'pending_approval' | 'rejected';
  udyam_reg_number: string | null;
  issuing_authority: string;
  payment_proof_url: string | null;
  placement_prep: string | null;
  fee_inr: number | null;
  utr_number: string | null;
  approved_by: string | null;
  approved_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToCertificate(row: CertificateRow): Certificate {
  let parsedDeliverables: string[] = [];
  if (row.project_deliverables) {
    try {
      parsedDeliverables = JSON.parse(row.project_deliverables);
    } catch {
      parsedDeliverables = [row.project_deliverables];
    }
  }

  return {
    id: row.id,
    certificateId: row.certificate_id,
    internId: row.intern_id,
    userId: row.user_id || undefined,
    internName: row.intern_name,
    internEmail: row.intern_email,
    phone: row.phone || undefined,
    collegeName: row.college_name || undefined,
    domain: row.domain,
    topicsCovered: row.topics_covered,
    projectName: row.project_name,
    projectDescription: row.project_description || undefined,
    projectDeliverables: parsedDeliverables,
    mentorName: row.mentor_name,
    mentorRole: row.mentor_role,
    mentorEmail: row.mentor_email || undefined,
    joiningDate: row.joining_date,
    completionDate: row.completion_date,
    issueDate: row.issue_date,
    qrPayloadUrl: row.qr_payload_url,
    status: row.status,
    udyamRegNumber: row.udyam_reg_number || undefined,
    issuingAuthority: row.issuing_authority,
    paymentProofUrl: row.payment_proof_url || undefined,
    placementPrep: row.placement_prep || undefined,
    feeINR: row.fee_inr || undefined,
    utrNumber: row.utr_number || undefined,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    adminNotes: row.admin_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function getCertificateByCertId(certId: string): Certificate | null {
  const db = getDb();
  const cleanId = certId.trim().toUpperCase();

  const stmt = db.prepare(`
    SELECT * FROM certificates
    WHERE UPPER(certificate_id) = ?
    LIMIT 1
  `);

  const row = stmt.get(cleanId) as unknown as CertificateRow | undefined;
  return row ? mapRowToCertificate(row) : null;
}

export function getCertificateByInternId(internId: string): Certificate | null {
  const db = getDb();
  const cleanId = internId.trim().toUpperCase();

  const stmt = db.prepare(`
    SELECT * FROM certificates
    WHERE UPPER(intern_id) = ?
    LIMIT 1
  `);

  const row = stmt.get(cleanId) as unknown as CertificateRow | undefined;
  return row ? mapRowToCertificate(row) : null;
}

export function getCertificatesByUserId(userId: string): Certificate[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM certificates
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(userId) as unknown as CertificateRow[];
  return rows.map(mapRowToCertificate);
}

export function getCertificatesByEmail(email: string): Certificate[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM certificates
    WHERE LOWER(intern_email) = LOWER(?)
    ORDER BY created_at DESC
  `);

  const rows = stmt.all(email) as unknown as CertificateRow[];
  return rows.map(mapRowToCertificate);
}

export function getAllCertificates(limit = 100): Certificate[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM certificates
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as unknown as CertificateRow[];
  return rows.map(mapRowToCertificate);
}

export function searchCertificates(query: string): Certificate[] {
  const db = getDb();
  const pattern = `%${query.trim().toLowerCase()}%`;

  const stmt = db.prepare(`
    SELECT * FROM certificates
    WHERE LOWER(certificate_id) LIKE ?
       OR LOWER(intern_id) LIKE ?
       OR LOWER(intern_name) LIKE ?
       OR LOWER(intern_email) LIKE ?
       OR LOWER(domain) LIKE ?
       OR LOWER(project_name) LIKE ?
       OR LOWER(COALESCE(college_name, '')) LIKE ?
       OR LOWER(COALESCE(phone, '')) LIKE ?
    ORDER BY created_at DESC
    LIMIT 50
  `);

  const rows = stmt.all(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern) as unknown as CertificateRow[];
  return rows.map(mapRowToCertificate);
}

export function getPendingCertificates(): Certificate[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM certificates
    WHERE status = 'pending_approval'
    ORDER BY created_at DESC
  `);
  const rows = stmt.all() as unknown as CertificateRow[];
  return rows.map(mapRowToCertificate);
}

export function approveCertificate(
  certificateId: string,
  approvedBy: string,
  adminNotes?: string
): Certificate | null {
  const db = getDb();
  const cleanId = certificateId.trim().toUpperCase();
  const now = new Date().toISOString();

  // Find cert
  const existing = getCertificateByCertId(cleanId);
  if (!existing) return null;

  db.prepare(`
    UPDATE certificates
    SET status = 'active',
        approved_by = ?,
        approved_at = ?,
        admin_notes = ?,
        updated_at = ?
    WHERE UPPER(certificate_id) = ?
  `).run(approvedBy, now, adminNotes || 'Approved via Admin Review Console', now, cleanId);

  // Also update associated payment record
  try {
    db.prepare(`
      UPDATE payments
      SET payment_status = 'completed'
      WHERE user_email = ? OR receipt_number = ? OR transaction_ref = ?
    `).run(existing.internEmail.toLowerCase(), existing.paymentProofUrl || '', existing.utrNumber || '');
  } catch (payErr) {
    console.warn('Payment status sync non-fatal:', payErr);
  }

  return getCertificateByCertId(cleanId);
}

export function rejectCertificate(
  certificateId: string,
  adminNotes: string
): Certificate | null {
  const db = getDb();
  const cleanId = certificateId.trim().toUpperCase();
  const now = new Date().toISOString();

  const existing = getCertificateByCertId(cleanId);
  if (!existing) return null;

  db.prepare(`
    UPDATE certificates
    SET status = 'rejected',
        admin_notes = ?,
        updated_at = ?
    WHERE UPPER(certificate_id) = ?
  `).run(adminNotes || 'Payment verification failed', now, cleanId);

  try {
    db.prepare(`
      UPDATE payments
      SET payment_status = 'failed'
      WHERE user_email = ? OR receipt_number = ? OR transaction_ref = ?
    `).run(existing.internEmail.toLowerCase(), existing.paymentProofUrl || '', existing.utrNumber || '');
  } catch (payErr) {
    console.warn('Payment status sync non-fatal:', payErr);
  }

  return getCertificateByCertId(cleanId);
}

export function createCertificate(
  cert: Omit<Certificate, 'id' | 'createdAt' | 'updatedAt'>
): Certificate {
  const db = getDb();
  const id = `cert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const deliverablesJson = cert.projectDeliverables
    ? JSON.stringify(cert.projectDeliverables)
    : null;

  db.prepare(`
    INSERT INTO certificates (
      id, certificate_id, intern_id, user_id, intern_name, intern_email, phone, college_name,
      domain, topics_covered, project_name, project_description, project_deliverables,
      mentor_name, mentor_role, mentor_email, joining_date, completion_date, issue_date,
      qr_payload_url, status, udyam_reg_number, issuing_authority, payment_proof_url,
      placement_prep, fee_inr, utr_number, approved_by, approved_at, admin_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    cert.certificateId.trim().toUpperCase(),
    cert.internId.trim().toUpperCase(),
    cert.userId || null,
    cert.internName.trim(),
    cert.internEmail.trim().toLowerCase(),
    cert.phone || null,
    cert.collegeName || null,
    cert.domain.trim(),
    cert.topicsCovered.trim(),
    cert.projectName.trim(),
    cert.projectDescription || null,
    deliverablesJson,
    cert.mentorName.trim(),
    cert.mentorRole.trim(),
    cert.mentorEmail || null,
    cert.joiningDate,
    cert.completionDate,
    cert.issueDate,
    cert.qrPayloadUrl,
    cert.status || 'pending_approval',
    cert.udyamRegNumber || 'UDYAM-UP-29-0109046',
    cert.issuingAuthority || 'DBERT Technical Council & Vayanai Operations Platform',
    cert.paymentProofUrl || null,
    cert.placementPrep || null,
    cert.feeINR || 299,
    cert.utrNumber || null,
    cert.approvedBy || null,
    cert.approvedAt || null,
    cert.adminNotes || null,
    now,
    now
  );

  return {
    ...cert,
    id,
    createdAt: now,
    updatedAt: now
  };
}

export function revokeCertificate(certificateId: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();
  const res = db.prepare(`
    UPDATE certificates
    SET status = 'revoked', updated_at = ?
    WHERE UPPER(certificate_id) = ?
  `).run(now, certificateId.trim().toUpperCase());

  return res.changes > 0;
}

/**
 * Generate a PNG Data URL QR code for a given verification URL
 */
export async function generateQRCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
    color: {
      dark: '#141E18', // ink brand color
      light: '#FAF7F0'  // paper brand color
    }
  });
}
