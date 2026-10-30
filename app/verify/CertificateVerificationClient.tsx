'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { CertificateVerificationView } from '@/components/verify/CertificateVerificationView';

export function CertificateVerificationClient() {
  const searchParams = useSearchParams();
  const rawParam = (searchParams.get('certid') || searchParams.get('certId') || searchParams.get('id') || '').trim();
  const certIdParam = (rawParam && rawParam.toLowerCase() !== 'undefined' && rawParam.toLowerCase() !== 'null')
    ? rawParam
    : 'CERT-VAY-2026-SO-001';

  const isSpecimenParam = searchParams.get('specimen') === 'true' ||
    searchParams.get('isSpecimen') === 'true' ||
    rawParam.toUpperCase().startsWith('SPECIMEN');
  const candidateNameParam = searchParams.get('candidate') || '';
  const trackParam = searchParams.get('track') || '';
  const daysRemainingParam = searchParams.get('daysRemaining') || '';

  return (
    <CertificateVerificationView
      initialCertId={certIdParam}
      isSpecimenMode={isSpecimenParam}
      candidateNameParam={candidateNameParam}
      trackParam={trackParam}
      daysRemainingParam={daysRemainingParam}
    />
  );
}
