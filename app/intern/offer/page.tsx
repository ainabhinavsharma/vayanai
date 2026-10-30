'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { OfficialOfferLetter } from '@/components/intern/OfficialOfferLetter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

interface OfferCandidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  track: string;
  status: string;
  interviewScore?: number;
  offerLetterId: string;
  batchStartDate: string;
  tenureMonths: number;
  signatureName?: string;
  offerAcceptedAt?: string;
  depositReceipt?: string;
  depositPaidAt?: string;
  qrPayloadUrl: string;
}

function OfferContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<OfferCandidate | null>(null);

  // Digital Signature state
  const [signatureInput, setSignatureInput] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  // Deposit & QR state
  const [utrInput, setUtrInput] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showUtrForm, setShowUtrForm] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [deviceType, setDeviceType] = useState<'desktop' | 'android' | 'ios'>('desktop');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/android/i.test(ua)) {
        setDeviceType('android');
      } else if (/iphone|ipad|ipod/i.test(ua)) {
        setDeviceType('ios');
      } else {
        setDeviceType('desktop');
      }
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setError('No offer token provided. Please use the secure link sent to your email.');
      setLoading(false);
      return;
    }

    async function loadOffer() {
      try {
        const res = await fetch(`/api/v1/intern/offer?token=${encodeURIComponent(token || '')}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error?.message || 'Offer link invalid or expired.');
          setLoading(false);
          return;
        }

        setCandidate(data.data.candidate);
        if (data.data.candidate.signatureName) {
          setSignatureInput(data.data.candidate.signatureName);
          setAgreed(true);
        }
      } catch (err: any) {
        setError(`Connection error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadOffer();
  }, [token]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const scrollToSection = (sectionId: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('pulse-highlight');
      setTimeout(() => {
        el.classList.remove('pulse-highlight');
      }, 2000);
    }
  };



  const handleSignOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureInput.trim()) {
      showToast('Please type your full legal name to digitally sign.');
      return;
    }
    if (!agreed) {
      showToast('Please check the agreement box to confirm acceptance.');
      return;
    }

    setSigning(true);
    try {
      const res = await fetch('/api/v1/intern/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'accept_signature',
          signatureName: signatureInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setCandidate((prev) =>
          prev
            ? {
                ...prev,
                status: 'offer_accepted',
                signatureName: signatureInput.trim(),
                offerAcceptedAt: new Date().toISOString()
              }
            : null
        );
        showToast('✓ Offer letter digitally signed! Proceed to Step 2 to submit student verification.');
      } else {
        showToast(data.error?.message || 'Signing failed.');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadQr = async () => {
    setIsDownloadingQr(true);
    try {
      const res = await fetch('/qrcode.jpeg');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vayanai-499-deposit-qr-${candidate?.offerLetterId || 'deposit'}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('✓ Payment QR Code downloaded! Open your UPI app and select "Scan from Gallery".');
    } catch {
      const link = document.createElement('a');
      link.href = '/qrcode.jpeg';
      link.download = 'vayanai-499-deposit-qr.jpeg';
      link.target = '_blank';
      link.click();
      showToast('✓ Opening QR code for download...');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handlePayDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrInput.trim() || utrInput.trim().length < 6) {
      showToast('Please enter your 12-digit UPI UTR Number or Transaction Reference.');
      return;
    }
    setProcessingPayment(true);
    try {
      const res = await fetch('/api/v1/intern/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'pay_deposit',
          paymentMethod: 'upi_qr',
          utrNumber: utrInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setCandidate((prev) =>
          prev
            ? {
                ...prev,
                status: 'deposit_pending_verification',
                depositReceipt: data.data.payment?.receiptNumber || `VP-VER-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                depositPaidAt: new Date().toISOString()
              }
            : null
        );
        showToast('⏳ ₹499 Deposit Proof Submitted! Admissions Council verification in progress.');
      } else {
        showToast(data.error?.message || 'Deposit submission failed.');
      }
    } catch (err: any) {
      showToast(`Payment error: ${err.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f4ede0' }}>
        <p>Loading your formal offer letter...</p>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '520px', width: '100%', background: '#131c16', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#f4ede0' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: '#ef4444', margin: '0 0 12px' }}>Offer Link Unavailable</h2>
          <p style={{ fontSize: '13px', color: '#c9d6ce', lineHeight: 1.6, marginBottom: '20px' }}>{error}</p>
          <Link href="/" style={{ color: '#e8a34c', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            &larr; Return to Vayanai Home
          </Link>
        </div>
      </div>
    );
  }

  const isSigned = Boolean(candidate.signatureName || candidate.status === 'offer_accepted' || candidate.status === 'deposit_pending_verification' || candidate.status === 'enrolled' || candidate.status === 'completed');
  const isPendingVerification = candidate.status === 'deposit_pending_verification';
  const isEnrolled = candidate.status === 'enrolled' || candidate.status === 'completed' || candidate.status === 'onboarded';

  // Authentic Merchant Deep-Linking Parameters
  const merchantVpa = 'Q652429146@ybl';
  const merchantName = 'Vayanai Admissions';
  const offerCode = candidate?.offerLetterId || 'VY-OFFER';
  const upiQuery = `pa=${merchantVpa}&pn=${encodeURIComponent(merchantName)}&am=499&cu=INR&tn=${encodeURIComponent(offerCode)}`;

  const upiPayload = `upi://pay?${upiQuery}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiPayload)}`;

  // Android Intent URIs
  const androidDefaultIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;end`;
  const androidPhonePeIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.phonepe.app;end`;
  const androidGPayIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
  const androidPaytmIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=net.one97.paytm;end`;
  const androidBhimIntent = `intent://pay?${upiQuery}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;

  // iOS URI Schemes
  const iosUniversalUri = `upi://pay?${upiQuery}`;
  const iosPhonePeUri = `phonepe://pay?${upiQuery}`;
  const iosGPayUri = `gpay://upi/pay?${upiQuery}`;
  const iosPaytmUri = `paytmmp://pay?${upiQuery}`;

  return (
    <div className="offer-page-container" style={{ maxWidth: '880px', margin: '20px auto', padding: '0 16px', color: '#f4ede0' }}>
      {toastMessage && (
        <div className="no-print" style={{ position: 'fixed', top: '24px', right: '24px', background: '#e8a34c', color: '#0d1410', padding: '12px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', zIndex: 9999, boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}>
          {toastMessage}
        </div>
      )}

      {/* Top Banner (Screen Only) */}
      <div className="no-print" style={{ background: '#131c16', border: '1px solid rgba(76, 175, 80, 0.4)', borderRadius: '12px', padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#4caf50', fontWeight: 700 }}>
            ✓ OFFICIAL SELECTION & ONBOARDING PORTAL
          </span>
          <h2 style={{ margin: '4px 0 2px', fontSize: '20px', color: '#fff8ee' }}>
            Congratulations, {candidate.name}!
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#889990' }}>
            Track: <strong>{candidate.track}</strong> &bull; Upcoming Batch: <strong>Monday, 2 November 2026</strong> &bull; Offer Ref: <code>{candidate.offerLetterId}</code>
          </p>
        </div>

        {/* Dynamic State-Driven Action Trigger */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {isEnrolled ? (
            <>
              <button
                type="button"
                className="button button-gold"
                onClick={() => window.print()}
                style={{ fontSize: '11px', minHeight: '38px', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                📥 Download / Print Official PDF ↗
              </button>
              <span style={{ fontSize: '10px', color: '#4caf50', fontWeight: 600 }}>
                ✓ 100% Verified & Cohort Admitted
              </span>
            </>
          ) : isPendingVerification ? (
            <>
              <button
                type="button"
                onClick={() => scrollToSection('step-2-deposit-card')}
                className="button"
                style={{
                  fontSize: '11px',
                  minHeight: '38px',
                  padding: '0 16px',
                  background: 'rgba(232, 163, 76, 0.15)',
                  border: '1px solid #e8a34c',
                  color: '#e8a34c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Click to view ₹499 verification tracking"
              >
                ⏳ Deposit Verification Underway ↓
              </button>
              <span style={{ fontSize: '10px', color: '#889990', fontWeight: 600 }}>
                Ref: <code>{candidate.depositReceipt || 'Queued'}</code> &bull; PDF unlocks on approval
              </span>
            </>
          ) : isSigned ? (
            <>
              <button
                type="button"
                className="button button-gold"
                onClick={() => scrollToSection('step-2-deposit-card')}
                style={{ fontSize: '12px', minHeight: '38px', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, boxShadow: '0 4px 14px rgba(232, 163, 76, 0.3)' }}
              >
                💳 Pay ₹499 Deposit & Confirm Slot ↓
              </button>
              <span style={{ fontSize: '10px', color: '#e8a34c', fontWeight: 600 }}>
                ✓ Step 1 Signed &bull; Step 2: ₹499 Deposit Pending
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                className="button button-gold"
                onClick={() => scrollToSection('step-1-signature-card')}
                style={{ fontSize: '12px', minHeight: '38px', padding: '0 18px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, boxShadow: '0 4px 14px rgba(232, 163, 76, 0.3)' }}
              >
                ✍️ Accept & Sign Offer Letter ↓
              </button>
              <span style={{ fontSize: '10px', color: '#e8a34c', fontWeight: 600 }}>
                Step 1 of 2 &bull; Digital signature required to secure seat
              </span>
            </>
          )}
        </div>
      </div>

      {/* Official Offer Letter Render */}
      <OfficialOfferLetter
        candidateName={candidate.name}
        candidateEmail={candidate.email}
        collegeName={candidate.college}
        trackName={candidate.track}
        offerLetterId={candidate.offerLetterId}
        batchStartDate={candidate.batchStartDate || '2 November 2026'}
        signatureName={candidate.signatureName}
        offerAcceptedAt={candidate.offerAcceptedAt}
        qrPayloadUrl={candidate.qrPayloadUrl}
      />

      {/* Step 1 & Step 2 Enrollment Action Cards (Screen Only) */}
      <div className="no-print offer-steps-grid">
        {/* Step 1: Digital Acceptance */}
        <div id="step-1-signature-card" style={{ background: '#131c16', border: isSigned ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid rgba(232, 163, 76, 0.4)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ background: isSigned ? '#4caf50' : '#e8a34c', color: '#0d1410', fontWeight: 800, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
              STEP 1
            </span>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#fff8ee' }}>Digital Acceptance</h3>
          </div>

          {isSigned ? (
            <div style={{ background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '8px', padding: '16px', marginTop: '14px' }}>
              <div style={{ fontSize: '12px', color: '#4caf50', fontWeight: 600 }}>✓ Offer Digitally Accepted</div>
              <div style={{ fontSize: '18px', fontFamily: "'Brush Script MT', cursive, serif", color: '#fff8ee', margin: '8px 0' }}>
                {candidate.signatureName}
              </div>
              <div style={{ fontSize: '10px', color: '#889990' }}>
                Recorded on: {candidate.offerAcceptedAt ? new Date(candidate.offerAcceptedAt).toLocaleString() : 'Confirmed'}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSignOffer} style={{ marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: '#c9d6ce', lineHeight: 1.5, margin: '0 0 14px' }}>
                Type your full legal name to execute your digital signature and validate your appointment letter:
              </p>
              <input
                type="text"
                placeholder="Type your full legal name..."
                value={signatureInput}
                onChange={(e) => setSignatureInput(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '10px 12px', color: '#f4ede0', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box' }}
              />
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11px', color: '#c9d6ce', cursor: 'pointer', marginBottom: '16px' }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ marginTop: '2px', accentColor: '#e8a34c' }}
                />
                <span>I accept the terms and declare my availability for the 3-month cohort starting 2 Nov 2026.</span>
              </label>
              <button
                type="submit"
                disabled={signing}
                className="button button-gold"
                style={{ width: '100%', minHeight: '38px', fontSize: '12px' }}
              >
                {signing ? 'Signing...' : '✓ Sign & Accept Offer Letter'}
              </button>
            </form>
          )}
        </div>

        {/* Step 2: Refundable Security Deposit & Batch Slot Confirmation */}
        <div id="step-2-deposit-card" style={{ background: '#131c16', border: isEnrolled ? '1px solid rgba(76, 175, 80, 0.5)' : isSigned ? '1px solid rgba(232, 163, 76, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ background: isEnrolled ? '#4caf50' : '#e8a34c', color: '#0d1410', fontWeight: 800, fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
              STEP 2
            </span>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#fff8ee' }}>Refundable Security Deposit (₹499)</h3>
          </div>

          {isEnrolled ? (
            <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.4)', borderRadius: '8px', padding: '16px', marginTop: '14px' }}>
              <div style={{ fontSize: '13px', color: '#4caf50', fontWeight: 700 }}>
                🎉 Cohort Slot Confirmed & ₹499 Deposit Verified!
              </div>
              <div style={{ fontSize: '11px', color: '#c9d6ce', marginTop: '6px', lineHeight: 1.6 }}>
                Verification ID: <code style={{ color: '#e8a34c' }}>{candidate.depositReceipt}</code><br />
                Security Deposit: <strong style={{ color: '#4caf50' }}>₹499 Verified (100% Refundable at Day 90)</strong><br />
                Institution: <strong>{candidate.college || 'Verified University'}</strong><br />
                Status: <strong style={{ color: '#4caf50' }}>Admitted & Ready for Monday 2 Nov 2026</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="button button-gold"
                  onClick={() => window.print()}
                  style={{ fontSize: '11px', minHeight: '40px', padding: '0 14px' }}
                >
                  📥 Download Official Signed PDF ↗
                </button>
                <Link
                  href="/portal"
                  style={{ display: 'inline-flex', alignItems: 'center', background: '#e8a34c', color: '#0d1410', fontWeight: 700, fontSize: '11px', padding: '8px 14px', borderRadius: '4px', textDecoration: 'none' }}
                >
                  💼 Open Intern Workspace &rarr;
                </Link>
                <a
                  href="https://chat.whatsapp.com"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', background: '#25d366', color: '#0d1410', fontWeight: 700, fontSize: '11px', padding: '8px 14px', borderRadius: '4px', textDecoration: 'none' }}
                >
                  💬 Join Cohort WhatsApp Hub &rarr;
                </a>
              </div>
            </div>
          ) : (isPendingVerification && !showUtrForm) ? (
            <div style={{ background: 'rgba(232, 163, 76, 0.08)', border: '1px solid rgba(232, 163, 76, 0.4)', borderRadius: '8px', padding: '18px', marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>⏳</span>
                <div style={{ fontSize: '14px', color: '#e8a34c', fontWeight: 700 }}>
                  ₹499 Deposit Verification Underway
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#c9d6ce', lineHeight: 1.6, margin: '0 0 12px' }}>
                Your digitally signed offer letter and ₹499 security deposit proof have been submitted. The Admissions Council is verifying your transaction reference with bank settlement logs.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '6px', fontSize: '11px', color: '#889990', marginBottom: '14px' }}>
                <div><strong>Deposit Reference:</strong> {candidate.depositReceipt || 'Queued'}</div>
                <div><strong>Official Signed PDF:</strong> Unlocks immediately upon Admin verification</div>
                <div><strong>Estimated Approval Window:</strong> Within 2 to 4 business hours</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link
                  href="/portal"
                  className="button button-gold"
                  style={{ fontSize: '11px', minHeight: '40px', padding: '0 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Go to Candidate Portal &rarr;
                </Link>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setShowUtrForm(true)}
                  style={{ fontSize: '11px', minHeight: '40px', padding: '0 14px' }}
                >
                  ✏️ View QR Code / Re-submit UTR
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePayDeposit} style={{ marginTop: '14px' }}>
              {isPendingVerification && (
                <div style={{ marginBottom: '12px' }}>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setShowUtrForm(false)}
                    style={{ fontSize: '11px', minHeight: '28px', padding: '0 12px' }}
                  >
                    &larr; Back to Verification Status
                  </button>
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#c9d6ce', lineHeight: 1.5, margin: '0 0 14px' }}>
                To secure your seat and allocate mentor bandwidth for Batch 2 Nov 2026, place the nominal <strong>₹499 Refundable Security Deposit</strong> (100% refundable upon 90-day milestone completion):
              </p>

              {/* Center-Aligned QR Code & UPI Container */}
              <div style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(232, 163, 76, 0.35)',
                borderRadius: '12px',
                padding: '24px 20px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                {/* White QR Badge Container */}
                <div style={{
                  background: '#ffffff',
                  padding: '12px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  margin: '0 auto'
                }}>
                  <img
                    src="/qrcode.jpeg"
                    alt="Vayanai UPI Payment QR"
                    style={{
                      maxWidth: '260px',
                      width: '100%',
                      height: 'auto',
                      maxHeight: '340px',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: '4px'
                    }}
                    onError={(e: any) => {
                      e.currentTarget.src = upiQrUrl;
                    }}
                  />
                  <div style={{
                    color: '#0d1410',
                    fontSize: '10px',
                    fontWeight: 800,
                    marginTop: '8px',
                    letterSpacing: '0.5px'
                  }}>
                    SCAN VIA ANY UPI APP
                  </div>
                  <div style={{ color: '#4a5550', fontSize: '9px', fontWeight: 600, marginTop: '2px' }}>
                    Google Pay • PhonePe • Paytm • BHIM • CRED
                  </div>
                </div>

                {/* 1-Click Download QR Button */}
                <div style={{ marginTop: '14px' }}>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    disabled={isDownloadingQr}
                    className="button button-gold"
                    style={{
                      minHeight: '36px',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '0 18px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isDownloadingQr ? '⏳ Downloading...' : '⬇️ Download QR Code to Gallery / Photos'}
                  </button>
                  <small style={{ display: 'block', color: '#889990', fontSize: '10px', marginTop: '6px' }}>
                    Save QR code image &bull; Open any UPI app &bull; Select &quot;Upload from Gallery&quot; to pay
                  </small>
                </div>

                {/* Centered Amount & Policy (NO visible text UPI ID) */}
                <div style={{ marginTop: '18px', maxWidth: '420px', width: '100%' }}>
                  <div style={{ fontSize: '11px', color: '#889990', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Refundable Security Deposit
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#e8a34c', margin: '4px 0' }}>
                    ₹499.00
                  </div>
                  <div style={{ fontSize: '11px', color: '#4caf50', fontWeight: 600, marginBottom: '14px' }}>
                    ✓ 100% Refundable at Day 90 Milestone Completion
                  </div>

                  {/* Device-Specific Payment Trigger Section */}
                  {deviceType === 'desktop' ? (
                    /* Desktop Guide */
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '11px',
                      color: '#c9d6ce',
                      lineHeight: 1.5
                    }}>
                      🖥️ <strong>Desktop Detected:</strong> Open your mobile phone, open <strong>Google Pay</strong>, <strong>PhonePe</strong>, or <strong>Paytm</strong>, and scan the QR code displayed above to complete the ₹499 payment.
                    </div>
                  ) : (
                    /* Mobile 1-Tap Trigger Section */
                    <div style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(232, 163, 76, 0.25)',
                      borderRadius: '8px',
                      padding: '14px',
                      marginTop: '8px'
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#e8a34c', marginBottom: '8px' }}>
                        ⚡ 1-Tap Mobile UPI Launcher (Amount ₹499 Pre-filled)
                      </div>
                      <p style={{ margin: '0 0 10px', fontSize: '10px', color: '#889990' }}>
                        Tap an app below to auto-open with ₹499 pre-loaded:
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {deviceType === 'android' ? (
                          <>
                            <a
                              href={androidPhonePeIntent}
                              className="button button-outline"
                              style={{ fontSize: '11px', minHeight: '40px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              🟣 PhonePe
                            </a>
                            <a
                              href={androidGPayIntent}
                              className="button button-outline"
                              style={{ fontSize: '11px', minHeight: '40px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              🔵 Google Pay
                            </a>
                            <a
                              href={androidPaytmIntent}
                              className="button button-outline"
                              style={{ fontSize: '11px', minHeight: '40px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              🔷 Paytm
                            </a>
                            <a
                              href={androidBhimIntent}
                              className="button button-outline"
                              style={{ fontSize: '11px', minHeight: '40px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              🟢 BHIM UPI
                            </a>
                          </>
                        ) : (
                          <>
                            <a
                              href={iosPhonePeUri}
                              className="button button-outline"
                              style={{ fontSize: '11px', minHeight: '40px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              🟣 PhonePe
                            </a>
                            <a
                              href={iosGPayUri}
                              className="button button-outline"
                              style={{ fontSize: '11px', minHeight: '40px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              🔵 Google Pay
                            </a>
                            <a
                              href={iosPaytmUri}
                              className="button button-outline"
                              style={{ fontSize: '11px', minHeight: '40px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              🔷 Paytm
                            </a>
                            <a
                              href={iosUniversalUri}
                              className="button button-outline"
                              style={{ fontSize: '11px', minHeight: '40px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              ⚡ Any UPI App
                            </a>
                          </>
                        )}
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <a
                          href={deviceType === 'android' ? androidDefaultIntent : iosUniversalUri}
                          style={{ fontSize: '11px', color: '#e8a34c', textDecoration: 'underline', fontWeight: 600 }}
                        >
                          📱 Open System Default UPI App &rarr;
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* UTR Input Field */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#c9d6ce', marginBottom: '6px', fontWeight: 600 }}>
                  Enter 12-Digit UPI Transaction Reference / UTR Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 439281902847 or Ref No."
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '9px 12px', color: '#f4ede0', fontSize: '12px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', color: '#889990', marginBottom: '16px', lineHeight: 1.4 }}>
                🛡️ <strong>Deposit Verification:</strong> Submitting your 12-digit UTR notifies the accounts team to verify against ICICI bank settlement logs. Once confirmed, your official signed PDF download unlocks immediately.
              </div>

              <button
                type="submit"
                disabled={processingPayment || !isSigned}
                className="button button-gold"
                style={{ width: '100%', minHeight: '38px', fontSize: '12px', background: isSigned ? '#e8a34c' : '#333', opacity: isSigned ? 1 : 0.5, cursor: isSigned ? 'pointer' : 'not-allowed' }}
              >
                {processingPayment ? 'Submitting Details...' : isSigned ? '✓ Submit ₹499 Deposit Proof (UTR)' : 'Complete Step 1 Digital Signature First'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InternOfferPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0d1410', display: 'flex', flexDirection: 'column' }}>
      <div className="no-print">
        <SiteHeader ctaText="Candidate Portal" ctaHref="/portal" />
      </div>
      <main style={{ flex: 1, padding: '20px 0' }}>
        <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', padding: '60px' }}>Loading offer letter...</div>}>
          <OfferContent />
        </Suspense>
      </main>
      <div className="no-print">
        <SiteFooter />
      </div>
    </div>
  );
}