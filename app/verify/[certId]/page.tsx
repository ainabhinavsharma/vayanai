import React from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { CertificateVerificationView } from '@/components/verify/CertificateVerificationView';
import { getCertificateByCertId, generateQRCodeDataUrl, getAllCertificates } from '@/lib/db/certificates-repo';

interface VerifySlugPageProps {
  params: Promise<{ certId: string }>;
}

export function generateStaticParams() {
  const certs = getAllCertificates(200);
  return certs.map((c) => ({
    certId: c.certificateId
  }));
}

export async function generateMetadata({ params }: VerifySlugPageProps) {
  const { certId } = await params;
  const cert = getCertificateByCertId(certId);

  if (!cert) {
    return {
      title: `Verify Certificate ${certId} — Vayanai & DBERT`,
      description: 'Public credential verification system.'
    };
  }

  return {
    title: `Verified Credential: ${cert.internName} (${cert.domain}) — Vayanai & DBERT`,
    description: `Official verification for ${cert.internName}, awarded for ${cert.projectName}. Endorsed by ${cert.mentorName}.`
  };
}

export default async function VerifySlugPage({ params }: VerifySlugPageProps) {
  const { certId } = await params;
  const cert = getCertificateByCertId(certId);
  let qrDataUrl = '';

  if (cert) {
    qrDataUrl = await generateQRCodeDataUrl(cert.qrPayloadUrl);
  }

  return (
    <div className="verify-page-shell">
      <SiteHeader />
      <main className="verify-main-content">
        <CertificateVerificationView
          initialCertId={certId}
          initialCertificate={cert}
          initialQrDataUrl={qrDataUrl}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
