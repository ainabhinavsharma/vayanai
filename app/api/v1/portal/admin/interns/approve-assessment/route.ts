import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import { adminApproveAssessment, adminRejectAssessment, getInternApplicationById } from '@/lib/db/intern-repo';
import { buildOfferLetterEmail, sendCandidateEmail } from '@/lib/services/email-dispatcher';

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
    const applicationId = (body.applicationId || '').trim();
    const action = body.action || 'approve';

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required.' },
        { status: 400 }
      );
    }

    const existingApp = getInternApplicationById(applicationId);
    if (!existingApp) {
      return NextResponse.json(
        { success: false, error: 'Intern application not found.' },
        { status: 404 }
      );
    }

    if (action === 'reject') {
      const reason = body.rejectionReason || 'Assessment evaluated and rejected by Admissions Council.';
      const rejectedApp = adminRejectAssessment(applicationId, reason);
      return NextResponse.json({
        success: true,
        message: 'Assessment rejected.',
        data: { application: rejectedApp }
      });
    }

    // Default: Approve assessment and dispatch formal selection offer
    const { application, offerLetterId } = adminApproveAssessment(applicationId);

    // Send selection offer email
    let emailStatus = 'pending';
    try {
      const emailContent = buildOfferLetterEmail(application);
      const emailRes = await sendCandidateEmail({
        to: application.userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        emailType: 'offer',
        candidateId: application.id
      });
      emailStatus = emailRes.mode;
    } catch (err: any) {
      console.warn('Failed to send offer letter email (non-fatal):', err.message);
    }

    return NextResponse.json({
      success: true,
      message: `Candidate approved! Offer letter ${offerLetterId} generated and email dispatched (${emailStatus}).`,
      data: {
        application,
        offerLetterId,
        emailStatus
      }
    });
  } catch (error: any) {
    console.error('Error in approve-assessment endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve assessment.' },
      { status: 500 }
    );
  }
}
