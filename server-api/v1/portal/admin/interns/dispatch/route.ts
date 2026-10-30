import { NextRequest } from 'next/server';
import {
  runScheduledInviteDispatcher,
  dispatchSingleCandidateInvite,
  dispatchSingleCandidateOffer
} from '@/lib/services/email-dispatcher';
import { listAllInternApplications } from '@/lib/db/intern-repo';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, candidateId, customOfferId } = body;

    if (!action) {
      return apiError('Missing action parameter.', 'INVALID_ACTION', 400);
    }

    if (action === 'dispatch_due') {
      const result = await runScheduledInviteDispatcher();
      return apiSuccess({
        message: `Dispatched ${result.dispatchedCount} scheduled invitation email(s).`,
        dispatchedCount: result.dispatchedCount,
        candidateIds: result.candidateIds,
        mode: result.mode
      });
    }

    if (action === 'invite_single') {
      if (!candidateId) {
        return apiError('candidateId is required for invite_single.', 'MISSING_CANDIDATE_ID', 400);
      }
      const result = await dispatchSingleCandidateInvite(candidateId);
      return apiSuccess({
        message: `Assessment invitation sent to ${result.application.userEmail}.`,
        application: result.application,
        mode: result.mode
      });
    }

    if (action === 'send_offer') {
      if (!candidateId) {
        return apiError('candidateId is required for send_offer.', 'MISSING_CANDIDATE_ID', 400);
      }
      const result = await dispatchSingleCandidateOffer(candidateId, customOfferId);
      return apiSuccess({
        message: `Offer letter ${result.offerId} issued and sent to ${result.application.userEmail}.`,
        application: result.application,
        offerId: result.offerId,
        mode: result.mode
      });
    }

    if (action === 'bulk_approve_and_offer') {
      const all = listAllInternApplications();
      const qualified = all.filter(
        (c) =>
          (c.status === 'selected' || (c.interviewScore !== undefined && c.interviewScore >= 70)) &&
          c.status !== 'offer_sent' &&
          c.status !== 'offer_accepted' &&
          c.status !== 'enrolled'
      );

      const dispatched: string[] = [];
      const errors: string[] = [];

      for (const cand of qualified) {
        try {
          await dispatchSingleCandidateOffer(cand.id);
          dispatched.push(cand.id);
        } catch (err: any) {
          errors.push(`Failed for ${cand.userEmail}: ${err.message}`);
        }
      }

      return apiSuccess({
        message: `Bulk offer letters dispatched to ${dispatched.length} qualified candidate(s).`,
        dispatchedCount: dispatched.length,
        candidateIds: dispatched,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    return apiError(`Unknown action: ${action}`, 'UNSUPPORTED_ACTION', 400);
  } catch (err: any) {
    return apiError(
      `Dispatch execution failed: ${err.message}`,
      'DISPATCH_FAILED',
      500
    );
  }
}
