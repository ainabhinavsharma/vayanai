import { NextRequest } from 'next/server';
import { listAllInternApplications, rejectCandidate, getInternApplicationById } from '@/lib/db/intern-repo';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const track = searchParams.get('track') || undefined;
    const search = searchParams.get('search') || undefined;
    const dbertLead = searchParams.get('dbertLead') || undefined;

    const candidates = listAllInternApplications({ status, track, search, dbertLead });

    // Compute comprehensive KPIs
    const all = listAllInternApplications();
    const now = Date.now();

    const metrics = {
      total: all.length,
      applied: all.filter((c) => c.status === 'applied').length,
      dueForInvite: all.filter(
        (c) => c.status === 'applied' && c.inviteScheduledAt && new Date(c.inviteScheduledAt).getTime() <= now
      ).length,
      invited: all.filter((c) => c.status === 'invited').length,
      completed: all.filter((c) => c.status === 'interview_completed').length,
      selected: all.filter((c) => c.status === 'selected' || (c.interviewScore !== undefined && c.interviewScore >= 70)).length,
      offerSent: all.filter((c) => c.status === 'offer_sent').length,
      offerAccepted: all.filter((c) => c.status === 'offer_accepted').length,
      enrolled: all.filter((c) => c.status === 'enrolled' || c.status === 'deposit_paid' || c.status === 'onboarded').length,
      rejected: all.filter((c) => c.status === 'rejected').length,
      dbertHigh: all.filter((c) => c.dbertProfile?.leadPropensity === 'HIGH').length,
      dbertModerate: all.filter((c) => c.dbertProfile?.leadPropensity === 'MODERATE').length,
      dbertLow: all.filter((c) => c.dbertProfile?.leadPropensity === 'LOW').length
    };

    return apiSuccess({
      metrics,
      candidates,
      totalReturned: candidates.length
    });
  } catch (err: any) {
    return apiError(`Failed to fetch intern applications: ${err.message}`, 'FETCH_FAILED', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateId, action, note } = body;

    if (!candidateId) {
      return apiError('candidateId is required.', 'MISSING_CANDIDATE_ID', 400);
    }

    if (action === 'reject') {
      const updated = rejectCandidate(candidateId, note);
      return apiSuccess({
        message: `Candidate ${updated.userName} marked as rejected.`,
        application: updated
      });
    }

    return apiError(`Unsupported action: ${action}`, 'UNSUPPORTED_ACTION', 400);
  } catch (err: any) {
    return apiError(`Failed to update candidate: ${err.message}`, 'UPDATE_FAILED', 500);
  }
}
