import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import {
  getStaffLeads,
  createStaffLead,
  updateStaffLeadStage,
  getBdaOverviewMetrics
} from '@/lib/db/staff-repo';
import { listAllInternApplications } from '@/lib/db/intern-repo';

export async function GET(req: NextRequest) {
  const token = await getAuthToken();
  const user = token ? getSessionUser(token) : null;

  const { searchParams } = new URL(req.url);
  const filterUserId = searchParams.get('bdaUserId') || (user?.role === 'staff' ? user.id : undefined);

  const leads = getStaffLeads(filterUserId);
  const metrics = getBdaOverviewMetrics();
  const internApplications = listAllInternApplications();

  return apiSuccess({
    leads,
    metrics,
    internApplications
  });
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const user = token ? getSessionUser(token) : null;

    if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
      return apiError('Staff or Admin privileges required to manage leads', 'FORBIDDEN', 403);
    }

    const body = await req.json();

    if (body.action === 'update_stage') {
      if (!body.leadId || !body.stage) {
        return apiError('leadId and stage are required', 'MISSING_FIELDS', 400);
      }
      const success = updateStaffLeadStage(body.leadId, body.stage);
      return apiSuccess({ success, message: 'Lead stage updated' });
    }

    if (!body.leadName || !body.region || !body.contactInfo) {
      return apiError('leadName, region, and contactInfo are required', 'MISSING_FIELDS', 400);
    }

    const newLead = createStaffLead({
      bdaUserId: user.id,
      leadName: body.leadName,
      leadType: body.leadType || 'homestay_partner',
      region: body.region,
      contactInfo: body.contactInfo,
      pipelineStage: body.pipelineStage || 'outreach',
      estimatedValueINR: Number(body.estimatedValueINR) || 0,
      notes: body.notes
    });

    return apiSuccess({
      lead: newLead,
      message: 'New partner lead registered in BDA pipeline'
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lead operation failed';
    return apiError(message, 'STAFF_ERROR', 400);
  }
}
