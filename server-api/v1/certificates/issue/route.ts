import { NextRequest, NextResponse } from 'next/server';
import { createCertificate, generateQRCodeDataUrl } from '@/lib/db/certificates-repo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      certificateId,
      internId,
      userId,
      internName,
      internEmail,
      domain,
      topicsCovered,
      projectName,
      projectDescription,
      projectDeliverables,
      mentorName,
      mentorRole,
      mentorEmail,
      joiningDate,
      completionDate,
      issueDate,
      qrPayloadUrl,
      udyamRegNumber,
      issuingAuthority
    } = body;

    if (!certificateId || !internId || !internName || !internEmail || !domain || !projectName || !mentorName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: certificateId, internId, internName, internEmail, domain, projectName, mentorName'
        },
        { status: 400 }
      );
    }

    const finalQrUrl = qrPayloadUrl || `https://vayanai.in.net/verify?certid=${certificateId.trim().toUpperCase()}`;

    const newCert = createCertificate({
      certificateId,
      internId,
      userId,
      internName,
      internEmail,
      domain,
      topicsCovered: topicsCovered || 'Operational Pacing, Regional Verification, Integrity Standards',
      projectName,
      projectDescription,
      projectDeliverables: Array.isArray(projectDeliverables) ? projectDeliverables : [projectDeliverables || 'Completed project milestone'],
      mentorName,
      mentorRole: mentorRole || 'Program Head & Operations Lead',
      mentorEmail,
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      completionDate: completionDate || new Date().toISOString().split('T')[0],
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      qrPayloadUrl: finalQrUrl,
      status: 'active',
      udyamRegNumber: udyamRegNumber || 'UDYAM-UP-29-0109046',
      issuingAuthority: issuingAuthority || 'DBERT Technical Council & Vayanai Operations Platform'
    });

    const qrDataUrl = await generateQRCodeDataUrl(finalQrUrl);

    return NextResponse.json({
      success: true,
      data: {
        certificate: newCert,
        qrDataUrl
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error issuing certificate:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { success: false, error: 'Certificate ID already exists. Please provide a unique ID.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to issue certificate' },
      { status: 500 }
    );
  }
}
