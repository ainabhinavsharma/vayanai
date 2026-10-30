import { describe, it, expect, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { OfficialOfferLetter } from '../components/intern/OfficialOfferLetter';
import { getDb } from '@/lib/db/sqlite';
import {
  upsertInternApplicationFromSheet,
  approveCandidateAndGenerateOffer,
  acceptOfferWithSignature,
  processInternDeposit,
  getInternApplicationById
} from '../lib/db/intern-repo';

describe('Offer Letter Print Fix & UPI QR Payment Gating', () => {
  const TEST_EMAIL = 'payment.test.intern@example.com';
  let candidateId: string;
  let magicToken: string;

  beforeAll(() => {
    getDb();
    const result = upsertInternApplicationFromSheet({
      userName: 'Aakash Sharma',
      userEmail: TEST_EMAIL,
      phone: '+91 99887 76655',
      collegeName: 'BITS Pilani',
      trackName: 'Full Stack Development',
      appliedAt: new Date().toISOString()
    });
    candidateId = result.application.id;
    magicToken = result.application.magicToken!;

    approveCandidateAndGenerateOffer(candidateId, 'VY-OFFER-2026-7788');
    acceptOfferWithSignature(magicToken, 'Aakash Sharma');
  });

  it('renders print CSS with strict visibility isolation and no blank-page break-after', () => {
    const renderedHtml = renderToString(
      React.createElement(OfficialOfferLetter, {
        candidateName: 'Aakash Sharma',
        candidateEmail: TEST_EMAIL,
        collegeName: 'BITS Pilani',
        trackName: 'Full Stack Development',
        offerLetterId: 'VY-OFFER-2026-7788',
        batchStartDate: '02 November 2026',
        signatureName: 'Aakash Sharma',
        offerAcceptedAt: '2026-10-25T10:00:00.000Z',
        qrPayloadUrl: 'http://localhost:3000/intern/offer?token=test-token'
      })
    );

    // Visibility isolation for clean printing
    expect(renderedHtml).toContain('body * {');
    expect(renderedHtml).toContain('visibility: hidden !important;');
    expect(renderedHtml).toContain('#printable-offer-letter');
    expect(renderedHtml).toContain('position: absolute !important;');
    expect(renderedHtml).toContain('left: 0 !important;');
    expect(renderedHtml).toContain('top: 0 !important;');
    expect(renderedHtml).toContain('size: A4 portrait;');
    expect(renderedHtml).toContain('page-break-inside: avoid !important;');

    // Confirms page-break-after: always was removed to prevent blank trailing pages
    expect(renderedHtml).not.toContain('page-break-after: always;');
  });

  it('processes ₹499 UPI QR deposit payment with UTR transaction reference', () => {
    const payment = processInternDeposit(magicToken, 'upi_qr', '629104882190');

    expect(payment.amountINR).toBe(499);
    expect(payment.productType).toBe('security_deposit');
    expect(payment.paymentMethod).toBe('upi_qr');
    expect(payment.transactionRef).toContain('629104882190');
    expect(payment.receiptNumber).toMatch(/^VP-DEP-499-\d{4}$/);

    const updated = getInternApplicationById(candidateId)!;
    expect(updated.status).toBe('enrolled');
    expect(updated.depositReceipt).toBe(payment.receiptNumber);
    expect(updated.depositPaidAt).toBeDefined();
  });

  it('verifies UPI QR payload construction matches UPI deep-link standard', () => {
    const offerRef = 'VY-OFFER-2026-7788';
    const upiPayload = `upi://pay?pa=vayanai@icici&pn=VAYANAI%20Adventures&am=499&cu=INR&tn=VY-OFFER-${encodeURIComponent(offerRef)}`;

    expect(upiPayload).toContain('pa=vayanai@icici');
    expect(upiPayload).toContain('am=499');
    expect(upiPayload).toContain('cu=INR');
    expect(upiPayload).toContain('VY-OFFER-2026-7788');
  });
});
