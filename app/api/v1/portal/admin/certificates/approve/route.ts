import { NextRequest, NextResponse } from 'next/server';
import { approveCertificate, rejectCertificate, getCertificateByCertId } from '@/lib/db/certificates-repo';
import { dispatchCertificateApprovedEmail } from '@/lib/services/email-dispatcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { certificateId, action, reason, adminName } = body;

    if (!certificateId || !action) {
      return NextResponse.json(
        { success: false, error: 'certificateId and action (approve/reject) are required.' },
        { status: 400 }
      );
    }

    const cert = getCertificateByCertId(certificateId);
    if (!cert) {
      return NextResponse.json(
        { success: false, error: `Certificate with ID ${certificateId} not found.` },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      const reviewer = adminName || 'Admin (DBERT & Vayanai Technical Operations)';
      const updated = approveCertificate(certificateId, reviewer, reason || 'Payment verified via UPI UTR check');

      // Dispatch Certificate Approval & LOR Email to candidate
      let emailDispatched = false;
      let emailMode = 'simulated_local';
      try {
        const mailResult = await dispatchCertificateApprovedEmail({
          internName: cert.internName,
          internEmail: cert.internEmail,
          certificateId: cert.certificateId,
          internId: cert.internId,
          domain: cert.domain,
          projectName: cert.projectName
        });
        emailDispatched = mailResult.success;
        emailMode = mailResult.mode;
      } catch (err: any) {
        console.warn(`[CERTIFICATE EMAIL ERROR] Failed to dispatch email to ${cert.internEmail}:`, err?.message);
      }

      return NextResponse.json({
        success: true,
        data: {
          certificate: updated,
          emailDispatched,
          emailMode,
          message: `Certificate ${cert.certificateId} for ${cert.internName} approved and activated. Verification email sent to ${cert.internEmail}.`
        }
      });
    } else if (action === 'reject') {
      const rejectNote = reason || 'Payment verification failed or invalid UPI transaction reference.';
      const updated = rejectCertificate(certificateId, rejectNote);

      return NextResponse.json({
        success: true,
        data: {
          certificate: updated,
          emailDispatched: false,
          message: `Certificate ${cert.certificateId} rejected. Reason: ${rejectNote}`
        }
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Action must be either 'approve' or 'reject'." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in certificate approval route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process certificate approval.' },
      { status: 500 }
    );
  }
}
