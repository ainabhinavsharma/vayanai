import { NextRequest, NextResponse } from 'next/server';
import { verifyAndAdmitIntern, rejectInternDeposit } from '@/lib/db/intern-repo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const candidateId = body.candidateId || body.id || body.applicationId;
    const action = body.action === 'verify' ? 'approve' : (body.action || 'approve');

    if (!candidateId) {
      return NextResponse.json({ success: false, error: 'Candidate ID is required' }, { status: 400 });
    }

    if (action === 'approve') {
      const updated = verifyAndAdmitIntern(candidateId);
      return NextResponse.json({
        success: true,
        data: {
          message: `Candidate ${updated.userName} verified and admitted to cohort!`,
          candidate: updated
        }
      });
    } else if (action === 'reject') {
      const reason = body.reason || 'Verification details could not be validated.';
      const updated = rejectInternDeposit(candidateId, reason);
      return NextResponse.json({
        success: true,
        data: {
          message: `Verification rejected for ${updated.userName}. Status reverted to offer accepted.`,
          candidate: updated
        }
      });
    } else {
      return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Error in verify-deposit:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
