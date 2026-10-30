import React, { Suspense } from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { CertificateVerificationClient } from './CertificateVerificationClient';

export const metadata = {
  title: 'Official Credential Verification — Vayanai & DBERT',
  description: 'Verify intern credentials, project deliverables, and mentor endorsements with tamper-evident QR verification.'
};

export default function VerifyPage() {
  return (
    <div className="verify-page-shell">
      <SiteHeader />
      <main className="verify-main-content">
        <Suspense fallback={
          <div className="verify-loading-card">
            <div className="verify-spinner"></div>
            <p>Loading credential verification engine...</p>
          </div>
        }>
          <CertificateVerificationClient />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
