'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Certificate } from '@/types/certificates';
import { useToast } from '@/components/ui/Toast';

async function generateClientQr(text: string): Promise<string> {
  try {
    const qrcodeMod = await import('qrcode');
    const toDataURL = qrcodeMod.toDataURL || (qrcodeMod as unknown as { default?: { toDataURL: (t: string) => Promise<string> } }).default?.toDataURL;
    if (typeof toDataURL === 'function') {
      return await toDataURL(text);
    }
  } catch (err) {
    console.warn('Failed to generate QR data URL:', err);
  }
  return '';
}

interface CertificateVerificationViewProps {
  initialCertId?: string;
  initialCertificate?: Certificate | null;
  initialQrDataUrl?: string;
  isSpecimenMode?: boolean;
  candidateNameParam?: string;
  trackParam?: string;
  daysRemainingParam?: string;
}

export function CertificateVerificationView({
  initialCertId = '',
  initialCertificate = null,
  initialQrDataUrl = '',
  isSpecimenMode: initialIsSpecimen = false,
  candidateNameParam = '',
  trackParam = '',
  daysRemainingParam = ''
}: CertificateVerificationViewProps) {
  const { showToast } = useToast();
  const [certIdInput, setCertIdInput] = useState(initialCertId);
  const [activeCertId, setActiveCertId] = useState(initialCertId);
  const [certificate, setCertificate] = useState<Certificate | null>(initialCertificate);
  const [qrDataUrl, setQrDataUrl] = useState<string>(initialQrDataUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether we are in specimen preview mode
  const [isSpecimenMode, setIsSpecimenMode] = useState<boolean>(
    initialIsSpecimen ||
    initialCertId.toUpperCase().startsWith('SPECIMEN') ||
    !!initialCertificate?.isSpecimen
  );

  const fetchCertificate = async (idToFetch: string) => {
    if (!idToFetch || !idToFetch.trim() || idToFetch.toLowerCase() === 'undefined' || idToFetch.toLowerCase() === 'null') {
      return;
    }
    setIsLoading(true);
    setError(null);
    const query = idToFetch.trim().toUpperCase();

    // Determine specimen mode for this fetch
    const isExplicitSpecimen = initialIsSpecimen || query.startsWith('SPECIMEN');

    // 1. Check local storage for newly applied / approved certificates
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('vayanai_certificates');
        if (stored) {
          const list: Certificate[] = JSON.parse(stored);
          const match = list.find((c) =>
            c.certificateId.toUpperCase() === query ||
            c.internId.toUpperCase() === query
          );
          if (match) {
            const qrUrl = await generateClientQr(match.qrPayloadUrl || `https://vayanai.in.net/verify?certid=${match.certificateId}`);
            setCertificate(match);
            setQrDataUrl(qrUrl);
            setActiveCertId(match.certificateId);
            setIsSpecimenMode(isExplicitSpecimen || !!match.isSpecimen);
            setIsLoading(false);
            return;
          }
        }
      }
    } catch {
      // LocalStorage access non-fatal
    }

    // 2. Query static certificates.json file (works on any static cPanel host)
    try {
      const staticRes = await fetch('/data/certificates.json');
      if (staticRes.ok) {
        const list: Certificate[] = await staticRes.json();
        const match = list.find((c) =>
          c.certificateId.toUpperCase() === query ||
          c.internId.toUpperCase() === query
        );
        if (match) {
          const qrUrl = await generateClientQr(match.qrPayloadUrl || `https://vayanai.in.net/verify?certid=${match.certificateId}`);
          setCertificate(match);
          setQrDataUrl(qrUrl);
          setActiveCertId(match.certificateId);
          setIsSpecimenMode(isExplicitSpecimen || !!match.isSpecimen);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Static file fetch non-fatal
    }

    // 3. Fallback to server API if available
    try {
      const res = await fetch(`/api/v1/certificates/${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success && data.data.certificate) {
        setCertificate(data.data.certificate);
        setQrDataUrl(data.data.qrDataUrl || '');
        setActiveCertId(data.data.certificate.certificateId);
        setIsSpecimenMode(isExplicitSpecimen || !!data.data.certificate.isSpecimen);
      } else {
        setCertificate(null);
        setError(data.error || `Certificate ID '${idToFetch}' was not found in the verified registry.`);
      }
    } catch {
      setCertificate(null);
      setError(`Certificate ID '${idToFetch}' was not found in the verified registry.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialCertId && !initialCertificate) {
      fetchCertificate(initialCertId);
    }
  }, [initialCertId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (certIdInput.trim()) {
      fetchCertificate(certIdInput.trim());
    }
  };

  const handleCopyLink = () => {
    const certId = certificate?.certificateId || activeCertId;
    let url = typeof window !== 'undefined'
      ? `${window.location.origin}/verify?certid=${encodeURIComponent(certId)}`
      : `https://vayanai.in.net/verify?certid=${encodeURIComponent(certId)}`;

    if (isSpecimenMode) {
      url += `&specimen=true${candidateNameParam ? `&candidate=${encodeURIComponent(candidateNameParam)}` : ''}${trackParam ? `&track=${encodeURIComponent(trackParam)}` : ''}${daysRemainingParam ? `&daysRemaining=${encodeURIComponent(daysRemainingParam)}` : ''}`;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast(isSpecimenMode ? 'Specimen preview link copied!' : 'Verification link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Safe Display Values with Privacy Protection
  const displayDomain = (isSpecimenMode && trackParam) ? trackParam : (certificate?.domain || 'Technical Practicum');

  const displayCandidateName = isSpecimenMode
    ? (candidateNameParam ? `${candidateNameParam} (Specimen Preview)` : `${certificate?.internName || 'Candidate Specimen'} (Curriculum Specimen)`)
    : (certificate?.internName || '');

  const certRecipientName = isSpecimenMode
    ? (candidateNameParam || certificate?.internName || 'Candidate Specimen')
    : (certificate?.internName || '');

  const displayInternId = isSpecimenMode
    ? (certificate?.internId?.startsWith('SPECIMEN-') ? certificate.internId : `SPECIMEN-${certificate?.internId || 'INT-2026'}`)
    : (certificate?.internId || '');

  const displayCertId = isSpecimenMode
    ? `${certificate?.certificateId || 'CERT-DBERT-SPECIMEN'} (Specimen Record)`
    : (certificate?.certificateId || '');

  // Privacy Protection: Never expose real personal email/phone in specimen mode
  const displayEmail = isSpecimenMode
    ? (candidateNameParam ? 'candidate.preview@vayanai.in.net' : 'specimen.registry@dbert.online')
    : (certificate?.internEmail || '');

  const displayPhone = isSpecimenMode
    ? '+91 98******00 (Specimen Protected)'
    : (certificate?.phone ? `+91 ${certificate.phone.slice(0, 2)}******${certificate.phone.slice(-2)}` : null);

  const displayTenure = isSpecimenMode
    ? `90-Day Cohort Milestone (${daysRemainingParam ? `${daysRemainingParam} days remaining` : 'In Progress'})`
    : `${certificate?.joiningDate || ''} to ${certificate?.completionDate || ''}`;

  const displayIssueDate = isSpecimenMode
    ? `Unlocks upon Day 90 Completion (${certificate?.completionDate || 'Expected Graduation'})`
    : (certificate?.issueDate || '');

  return (
    <div className="verify-page-container">
      {/* Search Bar & Switcher */}
      <div className="verify-search-section no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <span className="verify-badge-tag">
              {isSpecimenMode ? '🔬 CURRICULUM SPECIMEN INSPECTOR · SAMPLE PREVIEW' : 'OFFICIAL CREDENTIAL VERIFICATION SYSTEM'}
            </span>
            <h2 style={{ margin: '4px 0 8px' }}>
              {isSpecimenMode ? 'Curriculum Specimen & Tamper-Evident Verification Preview' : 'Verify Intern Credentials & Projects'}
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', maxWidth: '640px', lineHeight: 1.5 }}>
              {isSpecimenMode
                ? 'Review the official cryptographic credential format, learning competencies, and MSME certification layout for your internship track.'
                : 'Scan a certificate QR code or enter the Certificate ID below to inspect verified candidate skills, project deliverables, and mentor endorsements.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {isSpecimenMode && (
              <Link
                href="/portal"
                className="secondary-btn"
                style={{ fontSize: '10px', padding: '10px 16px', textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                ← Return to Intern Portal
              </Link>
            )}
            <Link
              href="/certificate/apply"
              className="primary-btn"
              style={{ fontSize: '10px', padding: '10px 18px', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              🎓 Apply for Certificate & LOR ↗
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="verify-search-form">
          <input
            type="text"
            value={certIdInput}
            onChange={(e) => setCertIdInput(e.target.value)}
            placeholder="Enter Certificate ID e.g. CERT-VAY-2026-SO-001 or CERT-DBERT-2025-AI-014"
            className="verify-search-input"
          />
          <button type="submit" className="primary-btn verify-search-btn" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify Credential ↗'}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="verify-loading-card">
          <div className="verify-spinner"></div>
          <p>Cryptographically querying verification registry for <b>{certIdInput}</b>...</p>
        </div>
      )}

      {/* Error / Not Found State */}
      {error && !isLoading && (
        <div className="verify-error-card">
          <div className="error-icon">⚠️</div>
          <div>
            <h3>Verification Record Not Found</h3>
            <p>{error}</p>
            <small>Please verify that the ID matches the format printed on the bottom of the certificate.</small>
          </div>
        </div>
      )}

      {/* Verified Certificate Result */}
      {certificate && !isLoading && (
        <div className="verify-result-wrapper">
          {/* Top Verification Status Banner */}
          <div className="official-status-banner" style={{
            borderColor: isSpecimenMode ? 'var(--gold)' : certificate.status === 'pending_approval' ? 'var(--gold)' : certificate.status === 'active' ? '#4CAF50' : '#E57373',
            background: isSpecimenMode ? 'rgba(232, 163, 76, 0.12)' : certificate.status === 'pending_approval' ? 'rgba(232, 163, 76, 0.08)' : undefined
          }}>
            <div className="status-badge-left">
              <span className="verified-shield">
                {isSpecimenMode ? '🔬' : certificate.status === 'active' ? '🛡️' : certificate.status === 'pending_approval' ? '⏳' : '⚠️'}
              </span>
              <div>
                <span className="verified-title" style={{
                  color: isSpecimenMode || certificate.status === 'pending_approval' ? 'var(--gold-lite)' : undefined
                }}>
                  {isSpecimenMode
                    ? 'OFFICIAL CURRICULUM SPECIMEN · SAMPLE PREVIEW'
                    : certificate.status === 'active'
                    ? '100% VERIFIED AUTHENTIC CREDENTIAL'
                    : certificate.status === 'pending_approval'
                    ? 'APPLICATION IN QUEUE · PENDING MANUAL ADMIN VERIFICATION'
                    : 'CREDENTIAL STATUS: REVOKED / UNDER REVIEW'}
                </span>
                <p>
                  {isSpecimenMode
                    ? `This is an institutional specimen preview for the ${displayDomain} track. It demonstrates the live cryptographic verification record, mentor sign-offs, and MSME endorsement layout. Official personalized credentials unlock automatically for enrolled candidates upon completing their 90-day internship tenure${daysRemainingParam ? ` (${daysRemainingParam} days remaining)` : ''}.`
                    : certificate.status === 'active'
                    ? 'This certificate is officially issued and recorded in the institutional registry.'
                    : certificate.status === 'pending_approval'
                    ? 'The clearance particulars and UPI payment proof have been submitted and are undergoing manual banking verification.'
                    : 'This credential is not active or has been marked for review.'}
                </p>
              </div>
            </div>
            <div className="status-badge-right">
              <span className="auth-seal-text">{certificate.issuingAuthority}</span>
              <small>{isSpecimenMode ? 'Registry Specimen: SPECIMEN-VERIFY-MODE' : `Udyam Registration: ${certificate.udyamRegNumber || 'UDYAM-UP-29-0109046'}`}</small>
            </div>
          </div>

          <div className="verify-grid-layout">
            {/* Left Column: Full Details */}
            <div className="verify-details-column">
              {/* Intern Profile Card */}
              <div className="verify-card intern-hero-card">
                <div className="card-top-row">
                  <span className="section-label">
                    {isSpecimenMode ? 'INTERN CANDIDATE SPECIMEN PROFILE' : 'INTERN CANDIDATE PROFILE'}
                  </span>
                  <span className="active-pill" style={{
                    background: isSpecimenMode ? 'rgba(232, 163, 76, 0.15)' : undefined,
                    color: isSpecimenMode ? 'var(--gold-lite)' : undefined,
                    borderColor: isSpecimenMode ? 'var(--gold)' : undefined
                  }}>
                    STATUS: {isSpecimenMode ? 'SPECIMEN PREVIEW (NOT AN ISSUED CREDENTIAL)' : certificate.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="intern-name-heading">{displayCandidateName}</h3>
                <div className="meta-pills-row">
                  <span className="meta-pill"><b>Intern ID:</b> {displayInternId}</span>
                  <span className="meta-pill"><b>Certificate ID:</b> {displayCertId}</span>
                  <span className="meta-pill"><b>Email:</b> {displayEmail}</span>
                  {displayPhone && (
                    <span className="meta-pill"><b>WhatsApp:</b> {displayPhone}</span>
                  )}
                </div>

                {certificate.collegeName && (
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '8px 12px', margin: '0 0 14px', fontSize: '11px', color: '#d1ddd3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      🏛️ <b>Academic Institution:</b> {certificate.collegeName}
                    </div>
                    {certificate.placementPrep && (
                      <span style={{ fontSize: '8.5px', color: 'var(--gold-lite)', background: 'rgba(232, 163, 76, 0.12)', padding: '2px 6px', border: '1px solid rgba(232, 163, 76, 0.25)' }}>
                        {certificate.placementPrep.includes('Yes') ? '✓ Placement & Interview Enrolled' : 'Certificate & LOR Track'}
                      </span>
                    )}
                  </div>
                )}

                <div className="tenure-box">
                  <div className="tenure-item">
                    <small>Domain Track</small>
                    <b>{displayDomain}</b>
                  </div>
                  <div className="tenure-item">
                    <small>Internship Period</small>
                    <b>{displayTenure}</b>
                  </div>
                  <div className="tenure-item">
                    <small>Issue Date</small>
                    <b>{displayIssueDate}</b>
                  </div>
                </div>
              </div>

              {/* Project & Deliverables Card */}
              <div className="verify-card project-deepdive-card">
                <span className="section-label">PROJECT WORK & KEY DELIVERABLES</span>
                <h4 className="project-title">{certificate.projectName}</h4>

                {certificate.projectDescription && (
                  <p className="project-desc">{certificate.projectDescription}</p>
                )}

                <div className="topics-pill-section">
                  <small>TOPICS & COMPETENCIES COVERED:</small>
                  <p className="topics-text">{certificate.topicsCovered}</p>
                </div>

                {certificate.projectDeliverables && certificate.projectDeliverables.length > 0 && (
                  <div className="deliverables-section">
                    <small>VERIFIED OUTPUTS & METRICS:</small>
                    <ul className="deliverables-list">
                      {certificate.projectDeliverables.map((item, idx) => (
                        <li key={idx}>
                          <span className="check-bullet">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Mentor Endorsement Card */}
              <div className="verify-card mentor-endorsement-card">
                <span className="section-label">PROJECT SUPERVISOR & MENTOR SIGN-OFF</span>
                <div className="mentor-row">
                  <div className="mentor-avatar-badge">
                    {certificate.mentorName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="mentor-info">
                    <b>{certificate.mentorName}</b>
                    <p className="mentor-role">{certificate.mentorRole}</p>
                    {certificate.mentorEmail && (
                      <small className="mentor-email">{certificate.mentorEmail}</small>
                    )}
                  </div>
                  <div className="sign-off-stamp">
                    <span>{isSpecimenMode ? 'SPECIMEN SIGN-OFF' : 'OFFICIALLY ENDORSED'}</span>
                    <small>{isSpecimenMode ? 'Curriculum Endorsement' : 'DBERT / Vayanai Council'}</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Printable Digital Certificate & Scannable QR Card */}
            <div className="verify-certificate-column">
              <div className="action-button-row no-print" style={{ gap: '8px', flexWrap: 'wrap' }}>
                {isSpecimenMode ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="secondary-btn cert-action-btn"
                      style={{
                        opacity: 0.65,
                        cursor: 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--muted)',
                        padding: '10px 14px'
                      }}
                      title="Official verified PDF unlocks automatically upon completing the 90-day internship tenure"
                    >
                      🔒 Official PDF Locked (Unlocks Day 90)
                    </button>
                    <button
                      type="button"
                      className="secondary-btn cert-action-btn"
                      onClick={handlePrint}
                      title="Print a specimen copy with watermark"
                    >
                      🖨️ Print Specimen Copy
                    </button>
                    <button type="button" className="secondary-btn cert-action-btn" onClick={handleCopyLink}>
                      🔗 Copy Specimen Link
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="primary-btn cert-action-btn" onClick={handlePrint}>
                      🖨️ Print / Save PDF
                    </button>
                    <button type="button" className="secondary-btn cert-action-btn" onClick={handleCopyLink}>
                      🔗 Copy Verify Link
                    </button>
                  </>
                )}
              </div>

              {/* RENDERED CERTIFICATE CANVAS / CONTAINER (Optimized for Screen & Print) */}
              <div id="printable-certificate" className="printable-certificate-frame">
                <div className="cert-inner-border">
                  <div className="cert-watermark-bg"></div>

                  {/* High-visibility Diagonal Watermark for Specimen Mode */}
                  {isSpecimenMode && (
                    <div className="cert-specimen-watermark-overlay" aria-hidden="true">
                      SAMPLE SPECIMEN &bull; NOT ISSUED
                    </div>
                  )}

                  <div className="cert-header">
                    <div className="cert-brand-seal">
                      <span>व</span>
                    </div>
                    <div className="cert-institution-titles">
                      <span className="cert-council-name">DBERT TECHNICAL COUNCIL & VAYANAI OPERATIONS</span>
                      <small className="cert-udyam-tag">
                        {isSpecimenMode
                          ? 'Specimen Endorsement • MSME Registered: UDYAM-UP-29-0109046'
                          : `MSME Registered: ${certificate.udyamRegNumber || 'UDYAM-UP-29-0109046'}`}
                      </small>
                    </div>
                  </div>

                  <div className="cert-body">
                    <p className="cert-preamble">
                      {isSpecimenMode ? 'CURRICULUM SPECIMEN PREVIEW FOR' : 'THIS CERTIFICATE IS OFFICIALLY AWARDED TO'}
                    </p>
                    <h2 className="cert-recipient-name">{certRecipientName}</h2>
                    {isSpecimenMode && (
                      <div style={{ textAlign: 'center', marginTop: '-10px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '11px', color: '#b8863b', fontWeight: 600, letterSpacing: '0.5px' }}>
                          [Official 90-Day Cohort Specimen Preview]
                        </span>
                      </div>
                    )}
                    <p className="cert-completion-phrase">
                      {isSpecimenMode
                        ? 'upon completion of the intensive practical internship in'
                        : 'upon successful completion of the intensive practical internship in'}
                    </p>
                    <h3 className="cert-domain-name">{displayDomain}</h3>

                    <div className="cert-topics-box">
                      <p><b>Topics Covered:</b> {certificate.topicsCovered}</p>
                      <p><b>Project Worked:</b> {certificate.projectName}</p>
                    </div>

                    <div className="cert-tenure-row">
                      <span><b>Duration:</b> {displayTenure}</span>
                      <span><b>Intern ID:</b> {displayInternId}</span>
                    </div>
                  </div>

                  <div className="cert-footer">
                    <div className="cert-signatory">
                      <div className="signature-line">
                        <span className="handwritten-sig">{certificate.mentorName}</span>
                      </div>
                      <b>{certificate.mentorName}</b>
                      <small>{certificate.mentorRole}</small>
                    </div>

                    <div className="cert-qr-holder">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Verification QR Code"
                          className="cert-qr-img"
                        />
                      ) : (
                        <div className="cert-qr-placeholder">QR Code</div>
                      )}
                      <small>{isSpecimenMode ? 'Specimen QR' : 'Scan to Verify'}</small>
                    </div>
                  </div>

                  <div className="cert-legal-strip">
                    <span>Certificate ID: {displayCertId}</span>
                    <span>•</span>
                    <span>H-182, Sec-62 Noida - 201301</span>
                    <span>•</span>
                    <span>https://vayanai.in.net/verify</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
