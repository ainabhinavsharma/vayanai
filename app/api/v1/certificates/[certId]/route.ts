import { NextRequest, NextResponse } from 'next/server';
import { getCertificateByCertId, generateQRCodeDataUrl } from '@/lib/db/certificates-repo';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ certId: string }> }
) {
  try {
    const { certId } = await context.params;
    if (!certId) {
      return NextResponse.json(
        { success: false, error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    const cert = getCertificateByCertId(certId);
    if (!cert) {
      return NextResponse.json(
        {
          success: false,
          error: `Certificate with ID '${certId}' was not found or has been revoked.`,
          certId
        },
        { status: 404 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const isSpecimen = searchParams.get('specimen') === 'true' || certId.toUpperCase().startsWith('SPECIMEN');
    const candidateName = searchParams.get('candidate');

    const safeCert = { ...cert };
    if (isSpecimen) {
      safeCert.isSpecimen = true;
      if (candidateName) {
        safeCert.internName = candidateName;
      }
      safeCert.internEmail = candidateName ? 'candidate.preview@vayanai.in.net' : 'specimen.registry@dbert.online';
      safeCert.phone = '98******00';
    } else if (safeCert.phone && safeCert.phone.length >= 4) {
      safeCert.phone = `${safeCert.phone.slice(0, 2)}******${safeCert.phone.slice(-2)}`;
    }

    // Generate scannable QR code data URL on the fly
    const qrDataUrl = await generateQRCodeDataUrl(safeCert.qrPayloadUrl);

    return NextResponse.json({
      success: true,
      data: {
        certificate: safeCert,
        qrDataUrl,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify certificate' },
      { status: 500 }
    );
  }
}
