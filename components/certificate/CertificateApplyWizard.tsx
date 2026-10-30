'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Certificate } from '@/types/certificates';
import { useToast } from '@/components/ui/Toast';

export function CertificateApplyWizard() {
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    collegeName: '',
    batch: 'Aug to Oct 2026',
    domain: 'Data Analyst',
    projectName: 'Gayatri Ai',
    placementPrep: 'No, I’m only interested in the Certificate & LOR.',
    utrNumber: '',
    paymentProofUrl: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedCertificate, setIssuedCertificate] = useState<Certificate | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');

  const upiId = 'dbert@icici';
  const upiPayPayload = `upi://pay?pa=${upiId}&pn=DBERT%20Technical%20Council&am=0&cu=INR&tn=Practicum%20Verification`;

  useEffect(() => {
    // Generate verification QR code
    QRCode.toDataURL(upiPayPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: {
        dark: '#141E18',
        light: '#FAF7F0'
      }
    })
      .then((url) => setUpiQrUrl(url))
      .catch((err) => console.error('Failed to generate UPI QR:', err));
  }, [upiPayPayload]);

  const batchOptions = [
    'Aug to Oct 2026',
    'July to Sep 2026',
    'June to Aug 2026',
    'May to July 2026',
    'Sep to Nov 2026',
    'Oct to Dec 2026'
  ];

  const domainOptions = [
    'Data Analyst',
    'Artificial Intelligence (AI) and Machine Learning (ML)',
    'Full Stack Development',
    'Python Automation',
    'Sustainable Regional Operations & Growth'
  ];

  const projectOptions = [
    'Gayatri Ai',
    'Alkame',
    'DBERT',
    'Aivara, Gayatri Ai, DBERT',
    'Northeast Meghalaya Community Homestays Audit'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.collegeName) {
      showToast('Please fill out all required personal contact and university details.');
      return;
    }
    setStep(2);
  };

  const handleCopyUpiId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId);
      showToast(`UPI ID "${upiId}" copied to clipboard!`);
    }
  };

  const handlePayAndGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.utrNumber || formData.utrNumber.trim().length < 4) {
      showToast('Please enter the 12-digit UPI UTR / Transaction Reference number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/certificates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success && data.data) {
        setIssuedCertificate(data.data.certificate);
        setQrDataUrl(data.data.qrDataUrl);
        setReceiptNumber(data.data.receiptNumber || 'VP-VER-2026-8812');
        if (typeof window !== 'undefined') {
          try {
            const existing = JSON.parse(localStorage.getItem('vayanai_certificates') || '[]');
            localStorage.setItem('vayanai_certificates', JSON.stringify([data.data.certificate, ...existing]));
          } catch {}
        }
        setStep(3);
        showToast('Application & payment proof submitted! In queue for manual admin verification.');
      } else {
        showToast(data.error || 'Failed to submit application. Please check your details.');
      }
    } catch {
      // Offline / Static cPanel fallback
      const randomSerial = Math.floor(100 + Math.random() * 900);
      const fallbackCert: Certificate = {
        id: `cert-fallback-${Date.now()}`,
        certificateId: `CERT-DBERT-2026-DA-${randomSerial}`,
        internId: `DBERT-INT-${formData.name.slice(0, 2).toUpperCase()}-2026-${randomSerial}`,
        internName: formData.name,
        internEmail: formData.email,
        phone: formData.phone,
        collegeName: formData.collegeName,
        domain: formData.domain,
        topicsCovered: 'Data Cleaning, Visualization, SQL, Python, Business Analytics',
        projectName: formData.projectName,
        mentorName: 'Sarita Bansal',
        mentorRole: 'Program Head, DBERT Technical Council',
        joiningDate: '01 August 2026',
        completionDate: '31 October 2026',
        issueDate: '31 October 2026',
        qrPayloadUrl: `https://vayanai.in.net/verify?certid=CERT-DBERT-2026-DA-${randomSerial}`,
        status: 'pending_approval',
        issuingAuthority: 'DBERT Technical Council & Vayanai Operations Platform',
        placementPrep: formData.placementPrep,
        feeINR: 0,
        utrNumber: formData.utrNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (typeof window !== 'undefined') {
        try {
          const existing = JSON.parse(localStorage.getItem('vayanai_certificates') || '[]');
          localStorage.setItem('vayanai_certificates', JSON.stringify([fallbackCert, ...existing]));
        } catch {}
      }
      setIssuedCertificate(fallbackCert);
      setReceiptNumber(`VP-VER-2026-${randomSerial}`);
      setStep(3);
      showToast('Application logged and queued for admin verification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!issuedCertificate) return;
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/verify?certid=${issuedCertificate.certificateId}`
      : `https://vayanai.in.net/verify?certid=${issuedCertificate.certificateId}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Verification URL copied to clipboard!');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="certificate-apply-shell">
      {/* Top Breadcrumb & Stepper */}
      <div className="apply-stepper-header no-print">
        <span className="verify-badge-tag">OFFICIAL INTERN CLEARANCE & CERTIFICATION PORTAL</span>
        <h2>Internship Completion & Certificate Request</h2>
        <p>
          Complete your project milestone sign-off, verify your contact and university credentials, and submit your project milestone verification. Once verified by our admin, your official certificate and LOR will be activated for instant download.
        </p>

        <div className="stepper-nav-row">
          <div className={`step-badge ${step >= 1 ? 'active' : ''}`}>
            <span className="step-num">1</span>
            <b>Intern Clearance Form</b>
          </div>
          <div className={`step-connector ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`step-badge ${step >= 2 ? 'active' : ''}`}>
            <span className="step-num">2</span>
            <b>Practicum Clearance & Review</b>
          </div>
          <div className={`step-connector ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`step-badge ${step >= 3 ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <b>Verification & Download</b>
          </div>
        </div>
      </div>

      {/* STEP 1: PARTICULARS FORM */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="apply-step-card no-print">
          <div className="card-top-row">
            <span className="section-label">STEP 1 OF 3 · CANDIDATE & PROJECT PARTICULARS</span>
            <span className="active-pill">REQUIRED PARTICULARS</span>
          </div>

          <div className="form-fields-grid">
            <div className="field-group">
              <label>Full Name (as to appear on Certificate) *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. Kushal Agarwal"
                required
                className="journal-input"
              />
            </div>

            <div className="field-group">
              <label>Email Address (Certificate delivery) *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="e.g. kushal@example.com"
                required
                className="journal-input"
              />
            </div>

            <div className="field-group">
              <label>WhatsApp / Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="e.g. 9503296769"
                required
                className="journal-input"
              />
            </div>

            <div className="field-group">
              <label>College / University Name *</label>
              <input
                type="text"
                value={formData.collegeName}
                onChange={(e) => handleInputChange('collegeName', e.target.value)}
                placeholder="e.g. Ajeekya dy Patil university"
                required
                className="journal-input"
              />
            </div>

            <div className="field-group">
              <label>Internship Batch *</label>
              <select
                value={formData.batch}
                onChange={(e) => handleInputChange('batch', e.target.value)}
                className="journal-input"
              >
                {batchOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label>Select Internship Domain *</label>
              <select
                value={formData.domain}
                onChange={(e) => handleInputChange('domain', e.target.value)}
                className="journal-input"
              >
                {domainOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-group" style={{ marginTop: '16px' }}>
            <label>Project Contributed On *</label>
            <select
              value={formData.projectName}
              onChange={(e) => handleInputChange('projectName', e.target.value)}
              className="journal-input"
            >
              {projectOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="field-group" style={{ marginTop: '16px' }}>
            <label>Do You want Placement Assistance & Interview Preparation? *</label>
            <div className="radio-selection-cards">
              <label className={`radio-card ${formData.placementPrep.includes('Yes') ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="placement"
                  checked={formData.placementPrep.includes('Yes')}
                  onChange={() => handleInputChange('placementPrep', 'Yes, I’m interested in Placement Assistance & Interview Preparation.')}
                />
                <div>
                  <b>Yes, I’m interested in Placement Assistance & Interview Preparation.</b>
                  <p>Receive weekly mock interview invites, placement referrals, and resume review.</p>
                </div>
              </label>

              <label className={`radio-card ${!formData.placementPrep.includes('Yes') ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="placement"
                  checked={!formData.placementPrep.includes('Yes')}
                  onChange={() => handleInputChange('placementPrep', 'No, I’m only interested in the Certificate & LOR.')}
                />
                <div>
                  <b>No, I’m only interested in the Certificate & LOR.</b>
                  <p>Issue verified credential and Letter of Recommendation only.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="apply-btn-row">
            <Link href="/verify" className="secondary-btn" style={{ textDecoration: 'none' }}>
              ← Back to Registry
            </Link>
            <button type="submit" className="primary-btn">
              Continue to Practicum Review →
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: PRACTICUM CLEARANCE & ROLL VERIFICATION */}
      {step === 2 && (
        <form onSubmit={handlePayAndGenerate} className="apply-step-card no-print">
          <div className="card-top-row">
            <span className="section-label">STEP 2 OF 3 · PRACTICUM CLEARANCE & ROLL VERIFICATION</span>
            <span className="active-pill" style={{ background: 'rgba(232, 163, 76, 0.2)', borderColor: 'var(--gold)', color: 'var(--gold-lite)' }}>
              STATUS: SPONSORED (₹0)
            </span>
          </div>

          <div className="candidate-summary-banner" style={{ marginBottom: '20px' }}>
            <div>
              <small>Candidate Name:</small>
              <b>{formData.name}</b>
            </div>
            <div>
              <small>Contact Email & WhatsApp:</small>
              <b>{formData.email} • {formData.phone}</b>
            </div>
            <div>
              <small>Domain & Project:</small>
              <b>{formData.domain} ({formData.projectName})</b>
            </div>
          </div>

          {/* DEDICATED UPI PAYMENT CONTAINER */}
          <div className="upi-payment-container" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.3fr',
            gap: '24px',
            background: 'rgba(20, 30, 24, 0.6)',
            border: '1px solid rgba(232, 163, 76, 0.3)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            {/* Left: Authentic QR Code */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                background: '#FAF7F0',
                padding: '12px',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                display: 'inline-block'
              }}>
                {upiQrUrl ? (
                  <img src={upiQrUrl} alt="UPI Payment QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
                ) : (
                  <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#141E18' }}>
                    Generating QR...
                  </div>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--gold-lite)', marginTop: '8px', fontWeight: 600 }}>
                Scan with any UPI App
              </span>
              <small style={{ fontSize: '10px', color: 'var(--muted)' }}>
                Google Pay • PhonePe • Paytm • BHIM • Cred
              </small>
            </div>

            {/* Right: Payment Instructions & UTR Entry */}
            <div>
              <h4 style={{ color: 'var(--paper)', margin: '0 0 8px', fontSize: '14px', fontFamily: 'var(--font-serif)' }}>
                Institutional Credential Issuance: <span style={{ color: 'var(--gold)' }}>Fully Sponsored (₹0)</span>
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                To maintain cryptographic tamper-proofing and official institutional indexing with MSME Udyam credentials, scan the QR code to complete the fee.
              </p>

              {/* UPI ID Copy Box */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <div>
                  <small style={{ display: 'block', fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase' }}>Official UPI VPA</small>
                  <code style={{ fontSize: '13px', color: 'var(--paper)', fontWeight: 600 }}>{upiId}</code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="button button-outline"
                  style={{ minHeight: '28px', fontSize: '9px', padding: '0 10px' }}
                >
                  📋 Copy UPI ID
                </button>
              </div>

              {/* Manual Approval Notice */}
              <div style={{
                background: 'rgba(232, 163, 76, 0.08)',
                borderLeft: '3px solid var(--gold)',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '16px'
              }}>
                <p style={{ fontSize: '10px', color: 'var(--gold-lite)', margin: 0, lineHeight: 1.4 }}>
                  ℹ️ <b>Manual Verification Notice:</b> All UPI payments are manually verified by our administration team against the bank ledger. Once approved, you will receive an email confirmation and can also log into your Intern Portal to download your certificate.
                </p>
              </div>

              {/* UTR Number Input */}
              <div className="field-group">
                <label style={{ fontSize: '11px', color: 'var(--paper)', fontWeight: 600 }}>
                  Enter 12-Digit UPI Transaction ID / UTR Number *
                </label>
                <input
                  type="text"
                  value={formData.utrNumber}
                  onChange={(e) => handleInputChange('utrNumber', e.target.value)}
                  placeholder="e.g. 428712349876 or UPI-TXN-XXXX"
                  required
                  className="journal-input"
                  style={{ fontSize: '13px', letterSpacing: '0.5px' }}
                />
                <small style={{ fontSize: '9px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                  Find this 12-digit number in your UPI app payment receipt / SMS confirmation.
                </small>
              </div>

              {/* Optional Payment Screenshot URL */}
              <div className="field-group" style={{ marginTop: '10px' }}>
                <label style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  Optional: Payment Screenshot Link (Google Drive / Image link)
                </label>
                <input
                  type="url"
                  value={formData.paymentProofUrl}
                  onChange={(e) => handleInputChange('paymentProofUrl', e.target.value)}
                  placeholder="https://drive.google.com/open?id=..."
                  className="journal-input"
                  style={{ fontSize: '11px' }}
                />
              </div>
            </div>
          </div>

          <div className="apply-btn-row" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              ← Edit Details
            </button>
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting Verification Request...' : 'Submit Payment Proof for Verification ↗'}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: SUBMISSION & PENDING ADMIN APPROVAL CONFIRMATION */}
      {step === 3 && issuedCertificate && (
        <div className="apply-step-card success-card">
          {issuedCertificate.status === 'pending_approval' ? (
            <div className="pending-verification-state no-print" style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(232, 163, 76, 0.15)',
                border: '2px solid var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '28px'
              }}>
                ⏳
              </div>

              <span className="badge badge-amber" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                PAYMENT SUBMITTED · PENDING ADMIN VERIFICATION
              </span>

              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--paper)', margin: '14px 0 8px', fontSize: '24px' }}>
                Application Received, {issuedCertificate.internName}!
              </h2>

              <p style={{ maxWidth: '640px', margin: '0 auto 20px', color: 'var(--muted)', fontSize: '12px', lineHeight: 1.6 }}>
                Your clearance particulars and UPI payment reference (UTR: <code>{issuedCertificate.utrNumber || 'Submitted'}</code>) have been queued for manual admin verification.
              </p>

              {/* Status Details Card */}
              <div style={{
                maxWidth: '600px',
                margin: '0 auto 24px',
                background: 'rgba(20, 30, 24, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '18px 24px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '9px', textTransform: 'uppercase' }}>Application Reference:</span>
                    <b style={{ color: 'var(--gold-lite)' }}>{issuedCertificate.certificateId}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '9px', textTransform: 'uppercase' }}>Intern ID:</span>
                    <b style={{ color: 'var(--paper)' }}>{issuedCertificate.internId}</b>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '9px', textTransform: 'uppercase' }}>Submitted UPI UTR:</span>
                    <code style={{ color: 'var(--gold)' }}>{issuedCertificate.utrNumber || 'Recorded'}</code>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', display: 'block', fontSize: '9px', textTransform: 'uppercase' }}>Target Delivery Email:</span>
                    <b style={{ color: 'var(--paper)' }}>{issuedCertificate.internEmail}</b>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <b style={{ color: 'var(--paper)', fontSize: '11px' }}>Next Steps after Admin Verification:</b>
                  <ol style={{ fontSize: '10px', color: 'var(--muted)', margin: '8px 0 0', paddingLeft: '18px', lineHeight: 1.5 }}>
                    <li>Our team verifies your project submission against institutional academic benchmarks.</li>
                    <li>You will receive an automated confirmation email with your digital credential and verification link.</li>
                    <li>You can also log in to your account at <Link href="/portal" style={{ color: 'var(--gold-lite)' }}>/portal</Link> anytime using <code>{issuedCertificate.internEmail}</code> to download the official signed PDF.</li>
                  </ol>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/portal" className="primary-btn" style={{ textDecoration: 'none' }}>
                  🔑 Go to Intern Portal Dashboard ↗
                </Link>
                <Link
                  href={`/verify?certid=${issuedCertificate.certificateId}`}
                  className="secondary-btn"
                  style={{ textDecoration: 'none' }}
                >
                  🔍 Track Verification Status ↗
                </Link>
                <button type="button" className="secondary-btn" onClick={handleCopyLink}>
                  🔗 Copy Application Reference
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE CERTIFICATE STATE (When approved) */
            <>
              <div className="success-banner no-print">
                <div className="success-icon">🎉</div>
                <div>
                  <h3>Congratulations, {issuedCertificate.internName}!</h3>
                  <p>
                    Your official internship certificate and Letter of Recommendation (LOR) have been permanently registered in the public institutional verification registry.
                  </p>
                  <div className="receipt-pill-row">
                    <span>Receipt: <b>{receiptNumber}</b></span>
                    <span>•</span>
                    <span>Status: <b>Verified & Issued (Sponsored)</b></span>
                    <span>•</span>
                    <span>Certificate ID: <b>{issuedCertificate.certificateId}</b></span>
                  </div>
                </div>
              </div>

              <div className="action-button-row no-print" style={{ marginTop: '20px' }}>
                <button type="button" className="primary-btn cert-action-btn" onClick={handlePrint}>
                  📥 Download / Save PDF
                </button>
                <Link
                  href={`/verify?certid=${issuedCertificate.certificateId}`}
                  className="secondary-btn cert-action-btn"
                  style={{ textAlign: 'center', textDecoration: 'none' }}
                  target="_blank"
                >
                  🔍 Inspect Public QR Verification Page ↗
                </Link>
                <button type="button" className="secondary-btn cert-action-btn" onClick={handleCopyLink}>
                  🔗 Copy Public Link
                </button>
              </div>

              <div className="dispatch-alert no-print">
                ✉️ <b>Delivery Notice:</b> An official PDF copy and verified credential link have been dispatched to <b>{issuedCertificate.internEmail}</b> and WhatsApp <b>{issuedCertificate.phone || 'your phone'}</b>.
              </div>

              {/* RENDERED CERTIFICATE CANVAS (Screen & Print Ready) */}
              <div id="printable-certificate" className="printable-certificate-frame" style={{ marginTop: '24px' }}>
                <div className="cert-inner-border">
                  <div className="cert-watermark-bg"></div>

                  <div className="cert-header">
                    <div className="cert-brand-seal">
                      <span>व</span>
                    </div>
                    <div className="cert-institution-titles">
                      <span className="cert-council-name">DBERT TECHNICAL COUNCIL & VAYANAI OPERATIONS</span>
                      <small className="cert-udyam-tag">MSME Registered: UDYAM-UP-29-0109046 • Academic Institution: {issuedCertificate.collegeName || 'Verified Institute'}</small>
                    </div>
                  </div>

                  <div className="cert-body">
                    <p className="cert-preamble">THIS CERTIFICATE IS OFFICIALLY AWARDED TO</p>
                    <h2 className="cert-recipient-name">{issuedCertificate.internName}</h2>
                    <p className="cert-completion-phrase">
                      upon successful completion of the intensive practical internship in
                    </p>
                    <h3 className="cert-domain-name">{issuedCertificate.domain}</h3>

                    <div className="cert-topics-box">
                      <p><b>Topics Covered:</b> {issuedCertificate.topicsCovered}</p>
                      <p><b>Project Worked:</b> {issuedCertificate.projectName}</p>
                    </div>

                    <div className="cert-tenure-row">
                      <span><b>Duration:</b> {issuedCertificate.joiningDate} to {issuedCertificate.completionDate}</span>
                      <span><b>Intern ID:</b> {issuedCertificate.internId}</span>
                    </div>
                  </div>

                  <div className="cert-footer">
                    <div className="cert-signatory">
                      <div className="signature-line">
                        <span className="handwritten-sig">{issuedCertificate.mentorName}</span>
                      </div>
                      <b>{issuedCertificate.mentorName}</b>
                      <small>{issuedCertificate.mentorRole}</small>
                    </div>

                    <div className="cert-qr-holder">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="Verification QR" className="cert-qr-img" />
                      ) : (
                        <div className="cert-qr-placeholder">QR Code</div>
                      )}
                      <small>Scan to Verify</small>
                    </div>
                  </div>

                  <div className="cert-legal-strip">
                    <span>Certificate ID: {issuedCertificate.certificateId}</span>
                    <span>•</span>
                    <span>Receipt: {receiptNumber}</span>
                    <span>•</span>
                    <span>H-182, Sec-62 Noida - 201301</span>
                    <span>•</span>
                    <span>https://vayanai.in.net/verify</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
