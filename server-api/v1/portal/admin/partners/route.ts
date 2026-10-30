import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAdminPartners, reviewAdminPartner } from '@/lib/portal/portal-service';

export async function GET() {
  const partners = getAdminPartners();
  return apiSuccess({ partners });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partnerId, status, reason } = body;

    if (!partnerId || !status || !['verified', 'rejected'].includes(status)) {
      return apiError('Invalid review parameters. Required: partnerId, status ("verified" | "rejected")', 'INVALID_PARAMS', 400);
    }

    const updated = reviewAdminPartner(partnerId, status, reason);
    if (!updated) {
      return apiError(`Partner '${partnerId}' not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess({
      message: `Partner status updated to ${status}`,
      partner: updated
    });
  } catch (err) {
    return apiError('Failed to review partner', 'REVIEW_FAILED', 500, String(err));
  }
}
