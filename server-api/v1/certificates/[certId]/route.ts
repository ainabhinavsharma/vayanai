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

    // Generate scannable QR code data URL on the fly
    const qrDataUrl = await generateQRCodeDataUrl(cert.qrPayloadUrl);

    return NextResponse.json({
      success: true,
      data: {
        certificate: cert,
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
