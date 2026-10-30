import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import {
  verifyAndAdmitIntern,
  getInternApplicationById
} from '@/lib/db/intern-repo';
import {
  dispatchSingleCandidateOffer,
  dispatchSingleCandidateInvite,
  dispatchRejectionEmail
} from '@/lib/services/email-dispatcher';

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const sessionUser = token ? getSessionUser(token) : null;

    if (!sessionUser || (sessionUser.role !== 'admin' && sessionUser.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin or Staff privileges required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = String(body.action || '').trim();
    const candidateIds = Array.isArray(body.candidateIds) ? body.candidateIds : [];
    const reason = String(body.reason || '').trim();

    if (!action || candidateIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Action and at least one candidate ID are required.' },
        { status: 400 }
      );
    }

    const results: { id: string; success: boolean; message?: string }[] = [];

    for (const candId of candidateIds) {
      try {
        const app = getInternApplicationById(candId);
        if (!app) {
          results.push({ id: candId, success: false, message: 'Candidate record not found' });
          continue;
        }

        if (action === 'approve_assessment') {
          const offerResult = await dispatchSingleCandidateOffer(candId);
          results.push({
            id: candId,
            success: true,
            message: `Offer letter ${offerResult.offerId} generated & dispatched`
          });
        } else if (action === 'verify_deposit') {
          verifyAndAdmitIntern(candId);
          results.push({
            id: candId,
            success: true,
            message: 'Deposit verified & workspace unlocked (candidate enrolled)'
          });
        } else if (action === 'dispatch_invites') {
          await dispatchSingleCandidateInvite(candId);
          results.push({
            id: candId,
            success: true,
            message: 'Interview invite dispatched'
          });
        } else if (action === 'reject') {
          await dispatchRejectionEmail(
            candId,
            reason || 'Application evaluated and declined by Admissions Council.'
          );
          results.push({
            id: candId,
            success: true,
            message: 'Candidate rejected & notice dispatched'
          });
        } else {
          results.push({ id: candId, success: false, message: `Unknown action: ${action}` });
        }
      } catch (err: any) {
        results.push({ id: candId, success: false, message: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        action,
        totalRequested: candidateIds.length,
        successCount,
        failureCount,
        results
      },
      message: `Successfully processed ${successCount} of ${candidateIds.length} candidate(s).`
    });
  } catch (error: any) {
    console.error('Error executing bulk action:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while executing bulk action.' },
      { status: 500 }
    );
  }
}
