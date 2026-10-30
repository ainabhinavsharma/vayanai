import { NextRequest, NextResponse } from 'next/server';
import {
  getCertificateByCertId,
  getCertificateByInternId,
  getCertificatesByEmail,
  getAllCertificates,
  searchCertificates,
  generateQRCodeDataUrl
} from '@/lib/db/certificates-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const certId = searchParams.get('certid') || searchParams.get('certId');
    const internId = searchParams.get('internid') || searchParams.get('internId');
    const email = searchParams.get('email');
    const q = searchParams.get('q');

    if (certId) {
      const cert = getCertificateByCertId(certId);
      if (!cert) {
        return NextResponse.json(
          { success: false, error: 'Certificate not found', certId },
          { status: 404 }
        );
      }
      const qrDataUrl = await generateQRCodeDataUrl(cert.qrPayloadUrl);
      return NextResponse.json({
        success: true,
        data: { certificate: cert, qrDataUrl }
      });
    }

    if (internId) {
      const cert = getCertificateByInternId(internId);
      if (!cert) {
        return NextResponse.json(
          { success: false, error: 'Certificate for intern ID not found', internId },
          { status: 404 }
        );
      }
      const qrDataUrl = await generateQRCodeDataUrl(cert.qrPayloadUrl);
      return NextResponse.json({
        success: true,
        data: { certificate: cert, qrDataUrl }
      });
    }

    if (email) {
      const certs = getCertificatesByEmail(email);
      return NextResponse.json({
        success: true,
        data: { certificates: certs }
      });
    }

    if (q) {
      const results = searchCertificates(q);
      return NextResponse.json({
        success: true,
        data: { certificates: results }
      });
    }

    // Default: return recent certificates
    const all = getAllCertificates(50);
    return NextResponse.json({
      success: true,
      data: { certificates: all }
    });
  } catch (error) {
    console.error('Error querying certificates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to query certificates' },
      { status: 500 }
    );
  }
}
