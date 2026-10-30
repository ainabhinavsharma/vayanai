import { getDb } from './sqlite';
import { StaffLead } from '@/types/auth';

export function getStaffLeads(bdaUserId?: string): StaffLead[] {
  const db = getDb();
  let query = 'SELECT * FROM staff_leads';
  const params: (string | number | null)[] = [];

  if (bdaUserId) {
    query += ' WHERE bda_user_id = ?';
    params.push(bdaUserId);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    bdaUserId: String(r.bda_user_id),
    leadName: String(r.lead_name),
    leadType: r.lead_type as StaffLead['leadType'],
    region: String(r.region),
    contactInfo: String(r.contact_info),
    pipelineStage: r.pipeline_stage as StaffLead['pipelineStage'],
    estimatedValueINR: r.estimated_value_inr ? Number(r.estimated_value_inr) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));
}

export function createStaffLead(
  data: Omit<StaffLead, 'id' | 'createdAt' | 'updatedAt'>
): StaffLead {
  const db = getDb();
  const id = `lead-${Date.now()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO staff_leads (id, bda_user_id, lead_name, lead_type, region, contact_info, pipeline_stage, estimated_value_inr, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.bdaUserId,
    data.leadName.trim(),
    data.leadType,
    data.region.trim(),
    data.contactInfo.trim(),
    data.pipelineStage || 'outreach',
    data.estimatedValueINR || 0,
    data.notes || null,
    now,
    now
  );

  return {
    ...data,
    id,
    createdAt: now,
    updatedAt: now
  };
}

export function updateStaffLeadStage(
  leadId: string,
  stage: 'outreach' | 'discovery' | 'verified_onboard',
  notes?: string
): StaffLead | null {
  const db = getDb();
  const now = new Date().toISOString();

  let query = 'UPDATE staff_leads SET pipeline_stage = ?, updated_at = ?';
  const params: (string | number | null)[] = [stage, now];

  if (notes) {
    query += ', notes = ?';
    params.push(notes);
  }

  query += ' WHERE id = ?';
  params.push(leadId);

  const res = db.prepare(query).run(...params);
  if (res.changes === 0) return null;

  const row = db.prepare('SELECT * FROM staff_leads WHERE id = ?').get(leadId) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: String(row.id),
    bdaUserId: String(row.bda_user_id),
    leadName: String(row.lead_name),
    leadType: row.lead_type as StaffLead['leadType'],
    region: String(row.region),
    contactInfo: String(row.contact_info),
    pipelineStage: row.pipeline_stage as StaffLead['pipelineStage'],
    estimatedValueINR: row.estimated_value_inr ? Number(row.estimated_value_inr) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function getBdaOverviewMetrics() {
  const db = getDb();

  const leadsRow = db.prepare('SELECT COUNT(*) as count FROM staff_leads').get() as { count: number };
  const verifiedRow = db.prepare("SELECT COUNT(*) as count FROM staff_leads WHERE pipeline_stage = 'verified_onboard'").get() as { count: number };
  const internsRow = db.prepare('SELECT COUNT(*) as count FROM intern_applications').get() as { count: number };
  const depositsRow = db.prepare("SELECT COUNT(*) as count FROM payments WHERE product_type = 'security_deposit' AND payment_status = 'completed'").get() as { count: number };

  return {
    activeLeads: Number(leadsRow?.count || 0),
    verifiedOnboardedPartners: Number(verifiedRow?.count || 0),
    totalInternCandidates: Number(internsRow?.count || 0),
    depositsCollected: Number(depositsRow?.count || 0),
    totalDepositRevenueINR: Number(depositsRow?.count || 0) * 499
  };
}

export const getAllStaffLeads = (bdaUserId?: string): StaffLead[] => getStaffLeads(bdaUserId);
export const getStaffPlatformMetrics = () => getBdaOverviewMetrics();

