import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data', 'vayanai.db');
if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at:', dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
const rows = db.prepare('SELECT * FROM certificates ORDER BY created_at DESC').all();

const mapped = rows.map((row) => {
  let parsedDeliverables = [];
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
    udyamRegNumber: row.udyam_reg_number || 'UDYAM-UP-29-0109046',
    issuingAuthority: row.issuing_authority || 'DBERT Technical Council & Vayanai Operations Platform',
    paymentProofUrl: row.payment_proof_url || undefined,
    placementPrep: row.placement_prep || undefined,
    feeINR: row.fee_inr || 299,
    utrNumber: row.utr_number || undefined,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    adminNotes: row.admin_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
});

const outDir = path.resolve(process.cwd(), 'public', 'data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const targetPath = path.join(outDir, 'certificates.json');
fs.writeFileSync(targetPath, JSON.stringify(mapped, null, 2), 'utf-8');
console.log(`✓ Exported ${mapped.length} certificates to ${targetPath}`);
