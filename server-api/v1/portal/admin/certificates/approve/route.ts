import { NextRequest, NextResponse } from 'next/server';
import { approveCertificate, rejectCertificate, getCertificateByCertId } from '@/lib/db/certificates-repo';

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

      // Simulated Email Dispatch
      const verifyLink = `https://vayanai.in.net/verify?certid=${cert.certificateId}`;
      const emailPayload = {
        to: cert.internEmail,
        candidateName: cert.internName,
        certificateId: cert.certificateId,
        internId: cert.internId,
        domain: cert.domain,
        projectName: cert.projectName,
        verificationUrl: verifyLink,
        downloadUrl: `/verify?certid=${cert.certificateId}`,
        portalLoginUrl: 'https://vayanai.in.net/portal',
        subject: `Your Verified Certificate of Completion & LOR is Ready (${cert.certificateId})`,
        dispatchedAt: new Date().toISOString()
      };

      console.info(`[CERTIFICATE EMAIL DISPATCH] Sent to ${cert.internEmail}:`, JSON.stringify(emailPayload));

      return NextResponse.json({
        success: true,
        data: {
          certificate: updated,
          emailDispatched: true,
          emailPayload,
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
