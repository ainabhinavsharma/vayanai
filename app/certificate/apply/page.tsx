import React from 'react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { CertificateApplyWizard } from '@/components/certificate/CertificateApplyWizard';

export const metadata = {
  title: 'Apply for Internship Certificate & LOR — Vayanai & DBERT',
  description: 'Complete project milestone clearance and verify your credentials to receive an official QR-verifiable certificate and Letter of Recommendation.'
};

export default function CertificateApplyPage() {
  return (
    <div className="verify-page-shell">
      <SiteHeader />
      <main className="verify-main-content">
        <CertificateApplyWizard />
      </main>
      <SiteFooter />
    </div>
  );
}
