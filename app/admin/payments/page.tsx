'use client';

import React, { useState, useEffect, useTransition } from 'react';

interface PaymentRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  track: string;
  status: string;
  utrNumber: string;
  receiptNumber: string;
  depositPaidAt: string;
  amountINR: number;
  paymentStatus: string;
  signatureName?: string;
  offerAcceptedAt?: string;
  offerLetterId?: string;
  batchStartDate?: string;
  feedbackNote?: string;
  updatedAt?: string;
}

interface Metrics {
  totalSubmissions: number;
  pendingVerification: number;
  enrolled: number;
  totalCollectedINR: number;
}

const DEFAULT_ADMIN_PIN = 'vayanai2026';

export default function AdminPaymentsPage() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState('');

  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalSubmissions: 0,
    pendingVerification: 0,
    enrolled: 0,
    totalCollectedINR: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'enrolled'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Fast WhatsApp Screenshot Ingestion State
  const [manualQuery, setManualQuery] = useState('');
  const [manualSearching, setManualSearching] = useState(false);
  const [applicantMatches, setApplicantMatches] = useState<any[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);
  const [manualUtrInput, setManualUtrInput] = useState('');
  const [manualRecording, setManualRecording] = useState(false);
  const [justEnrolledWaUrl, setJustEnrolledWaUrl] = useState<string | null>(null);

  // Check saved authentication on mount
  useEffect(() => {
    const savedPin = sessionStorage.getItem('vayanai_admin_auth');
    if (savedPin === DEFAULT_ADMIN_PIN) {
      setIsAuthenticated(true);
      fetchPayments();
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === DEFAULT_ADMIN_PIN) {
      sessionStorage.setItem('vayanai_admin_auth', DEFAULT_ADMIN_PIN);
      setIsAuthenticated(true);
      setPinError('');
      fetchPayments();
    } else {
      setPinError('Incorrect Admin PIN. Please try again.');
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/admin/payments');
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setMetrics(data.data.metrics);
      } else {
        setError(data.error || 'Failed to load payments');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (candidateId: string, action: 'approve' | 'reject') => {
    setActionLoadingId(candidateId);
    setNotification(null);
    try {
      const res = await fetch('/api/v1/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: data.data.message || `Successfully processed candidate!`,
        });
        await fetchPayments();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Action failed',
        });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Action failed' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUtr(id);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const searchApplicantsForManual = async (query: string) => {
    if (!query.trim()) {
      setApplicantMatches([]);
      return;
    }
    setManualSearching(true);
    try {
      const res = await fetch(`/api/v1/admin/payments?searchAll=true&search=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success) {
        setApplicantMatches(data.data.applicants || []);
      }
    } catch {
      // silent
    } finally {
      setManualSearching(false);
    }
  };

  const handleRecordManualPayment = async () => {
    if (!selectedApplicant) return;
    setManualRecording(true);
    setJustEnrolledWaUrl(null);
    try {
      const res = await fetch('/api/v1/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedApplicant.id,
          action: 'record_manual_payment',
          utrNumber: manualUtrInput.trim() || undefined,
          autoApprove: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const cand = data.data.candidate;
        setNotification({
          type: 'success',
          message: `✓ Confirmed ${cand.userName}! Payment recorded & batch slot confirmed.`,
        });

        const cleanPhone = (cand.phone || selectedApplicant.phone || '').replace(/\D/g, '');
        const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
        const firstName = cand.userName.split(' ')[0];
        const waMsg = `🎉 *Batch Slot Confirmed — VayanAI Internship Program*

Dear *${firstName}*,

Congratulations! Your ₹499 refundable caution deposit (UTR: *${cand.utrNumber}*) has been verified and approved by the Admissions Council.

✅ *Your Enrollment Status:* Confirmed & Admitted
📅 *Batch Commencement:* 2026-11-02
📄 *Official Receipt #:* ${cand.depositReceipt}

📌 *Download Your Verified Offer Letter:*
👉 https://vayanai.onrender.com/enroll

Enter your registered email address (*${cand.userEmail}*) to view your confirmed batch slot and download your digitally signed offer letter.

👥 *Official Cohort Community:*
https://chat.whatsapp.com/Kn6o6hMoFfc7rIVx0wgZt3

Welcome to the team!
— Admissions Council, VayanAI`;

        setJustEnrolledWaUrl(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(waMsg)}`);
        setSelectedApplicant(null);
        setManualUtrInput('');
        setManualQuery('');
        setApplicantMatches([]);
        await fetchPayments();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to record payment' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error recording payment' });
    } finally {
      setManualRecording(false);
    }
  };

  const buildWhatsAppConfirmationUrl = (cand: PaymentRecord) => {
    const cleanPhone = cand.phone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const firstName = cand.name.split(' ')[0];

    const message = `🎉 *Batch Slot Confirmed — VayanAI Internship Program*

Dear *${firstName}*,

Congratulations! Your ₹499 refundable caution deposit (UTR: *${cand.utrNumber}*) has been verified and approved by the Admissions Council.

✅ *Your Enrollment Status:* Confirmed & Admitted
📅 *Batch Commencement:* ${cand.batchStartDate || '2026-11-02'}
📄 *Official Receipt #:* ${cand.receiptNumber}

📌 *Download Your Verified Offer Letter:*
👉 https://vayanai.onrender.com/enroll

Enter your registered email address (*${cand.email}*) to view your confirmed batch slot and download your digitally signed offer letter.

Welcome to the VayanAI Cohort! 🎊
— Admissions & Operations Council, VayanAI`;

    return `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
  };

  const filteredRecords = records.filter((r) => {
    if (activeTab === 'pending' && r.status !== 'deposit_pending_verification') return false;
    if (activeTab === 'enrolled' && r.status !== 'enrolled' && r.status !== 'onboarded') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q)) ||
        r.utrNumber.toLowerCase().includes(q) ||
        r.receiptNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Render: Admin PIN Gate ───────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0f0d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          color: '#fff8ee',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '400px',
            width: '100%',
            background: '#131c16',
            border: '1px solid rgba(232, 163, 76, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#fff8ee' }}>
            Admissions Council Admin
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#a0aab0' }}>
            Enter your admin PIN to access the payment and UTR verification desk.
          </p>

          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              placeholder="Enter Admin PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#0a0f0d',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#fff8ee',
                fontSize: '15px',
                textAlign: 'center',
                letterSpacing: '3px',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
              autoFocus
            />

            {pinError && (
              <div style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '16px' }}>
                {pinError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: '#e8a34c',
                color: '#0d1410',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Render: Admin Payments Dashboard ─────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0f0d',
        color: '#fff8ee',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px 20px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '28px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: '#e8a34c',
                  color: '#0d1410',
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                }}
              >
                ADMIN DESK
              </span>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#fff8ee' }}>
                Payment & Deposit Verification
              </h1>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#a0aab0' }}>
              Review candidate UTR submissions, approve batch confirmations, and dispatch instant confirmations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={fetchPayments}
              disabled={loading}
              style={{
                background: '#131c16',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff8ee',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {loading ? 'Refreshing...' : '🔄 Refresh Live Data'}
            </button>
            <a
              href="/enroll"
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'rgba(232, 163, 76, 0.1)',
                border: '1px solid rgba(232, 163, 76, 0.4)',
                color: '#e8a34c',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              ↗ View Candidate Portal
            </a>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: notification.type === 'success' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
              border: notification.type === 'success' ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(244, 67, 54, 0.4)',
              color: notification.type === 'success' ? '#4caf50' : '#ff6b6b',
            }}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Metrics Overview Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              background: '#131c16',
              border: '1px solid rgba(232, 163, 76, 0.4)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#e8a34c', fontWeight: 700, textTransform: 'uppercase' }}>
              Pending Verification
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff8ee', marginTop: '6px' }}>
              {metrics.pendingVerification}
            </div>
            <div style={{ fontSize: '11px', color: '#a0aab0', marginTop: '4px' }}>
              Requires UTR check against bank
            </div>
          </div>

          <div
            style={{
              background: '#131c16',
              border: '1px solid rgba(76, 175, 80, 0.4)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#4caf50', fontWeight: 700, textTransform: 'uppercase' }}>
              Enrolled & Confirmed
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff8ee', marginTop: '6px' }}>
              {metrics.enrolled}
            </div>
            <div style={{ fontSize: '11px', color: '#a0aab0', marginTop: '4px' }}>
              Batch slot verified & admitted
            </div>
          </div>

          <div
            style={{
              background: '#131c16',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#a0aab0', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Submissions
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#fff8ee', marginTop: '6px' }}>
              {metrics.totalSubmissions}
            </div>
            <div style={{ fontSize: '11px', color: '#a0aab0', marginTop: '4px' }}>
              All UTR proofs recorded
            </div>
          </div>

          <div
            style={{
              background: '#131c16',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#a0aab0', fontWeight: 700, textTransform: 'uppercase' }}>
              Deposit Value Tracked
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#e8a34c', marginTop: '6px' }}>
              ₹{metrics.totalCollectedINR.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '11px', color: '#a0aab0', marginTop: '4px' }}>
              ₹499 refundable deposit pool
            </div>
          </div>
        </div>

        {/* ── FAST RECORD WHATSAPP SCREENSHOT / DIRECT PAYMENT ── */}
        <div
          style={{
            background: '#131c16',
            border: '1px solid rgba(232, 163, 76, 0.4)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📱</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff8ee' }}>
                  Fast-Record WhatsApp Screenshot Payment
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#a0aab0' }}>
                  Search any candidate by Name, Phone, or Email to instantly verify their ₹499 UPI screenshot and unlock their signed offer letter.
                </p>
              </div>
            </div>
            <span
              style={{
                background: 'rgba(232, 163, 76, 0.15)',
                color: '#e8a34c',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(232, 163, 76, 0.3)',
              }}
            >
              1-Click Instant Enrollment
            </span>
          </div>

          {/* Just Enrolled WhatsApp Dispatch Banner */}
          {justEnrolledWaUrl && (
            <div
              style={{
                background: 'rgba(76, 175, 80, 0.15)',
                border: '1px solid #4caf50',
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ color: '#4caf50', fontSize: '13px', fontWeight: 700 }}>
                🎉 Candidate successfully enrolled and offer letter signed!
              </div>
              <a
                href={justEnrolledWaUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '12px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                💬 Dispatch WhatsApp Confirmation →
              </a>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <input
              type="text"
              placeholder="Search candidate by name, phone (e.g. 9876543210), or email from WhatsApp..."
              value={manualQuery}
              onChange={(e) => {
                setManualQuery(e.target.value);
                searchApplicantsForManual(e.target.value);
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: '#0a0f0d',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff8ee',
                fontSize: '13px',
              }}
            />
            <button
              onClick={() => searchApplicantsForManual(manualQuery)}
              disabled={manualSearching}
              style={{
                background: '#e8a34c',
                color: '#0d1410',
                border: 'none',
                borderRadius: '8px',
                padding: '0 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {manualSearching ? 'Searching...' : '🔍 Find'}
            </button>
          </div>

          {/* Search Results Dropdown/Cards */}
          {applicantMatches.length > 0 && !selectedApplicant && (
            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                background: '#0a0f0d',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '8px',
                marginBottom: '14px',
              }}
            >
              {applicantMatches.map((app) => (
                <div
                  key={app.id}
                  onClick={() => setSelectedApplicant(app)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1a241e')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff8ee' }}>
                      {app.name}{' '}
                      <span style={{ fontSize: '11px', color: '#a0aab0', fontWeight: 400 }}>
                        ({app.email} • {app.phone || 'No phone'})
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#889990', marginTop: '2px' }}>
                      {app.track} • {app.college || 'College N/A'}
                    </div>
                  </div>
                  <button
                    style={{
                      background: 'rgba(232, 163, 76, 0.15)',
                      border: '1px solid #e8a34c',
                      color: '#e8a34c',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Select Candidate →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Selected Applicant Card & UTR Entry */}
          {selectedApplicant && (
            <div
              style={{
                background: '#1a241e',
                border: '1px solid rgba(76, 175, 80, 0.4)',
                borderRadius: '8px',
                padding: '16px 20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#4caf50', fontWeight: 800, textTransform: 'uppercase' }}>
                    SELECTED APPLICANT
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff8ee', marginTop: '2px' }}>
                    {selectedApplicant.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0aab0' }}>
                    Email: <strong>{selectedApplicant.email}</strong> • Phone: <strong>{selectedApplicant.phone || 'N/A'}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#889990', marginTop: '2px' }}>
                    Track: {selectedApplicant.track} • Status: <code>{selectedApplicant.status}</code>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedApplicant(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#a0aab0',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Cancel
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#c9d6ce', marginBottom: '6px', fontWeight: 600 }}>
                    12-Digit UPI UTR Reference Number (from WhatsApp Screenshot):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 439281902847 (or leave blank to auto-create reference)"
                    value={manualUtrInput}
                    onChange={(e) => setManualUtrInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: '#0a0f0d',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      color: '#fff8ee',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  onClick={handleRecordManualPayment}
                  disabled={manualRecording}
                  style={{
                    background: '#4caf50',
                    color: '#0d1410',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: manualRecording ? 'wait' : 'pointer',
                    boxShadow: '0 4px 14px rgba(76, 175, 80, 0.4)',
                  }}
                >
                  {manualRecording ? 'Processing & Enrolling…' : '✓ Record Payment & Confirm Enrollment'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '20px',
            background: '#131c16',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'all' ? '#e8a34c' : 'transparent',
                color: activeTab === 'all' ? '#0d1410' : '#a0aab0',
              }}
            >
              All ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'pending' ? '#e8a34c' : 'transparent',
                color: activeTab === 'pending' ? '#0d1410' : '#a0aab0',
              }}
            >
              Pending ({metrics.pendingVerification})
            </button>
            <button
              onClick={() => setActiveTab('enrolled')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: activeTab === 'enrolled' ? '#4caf50' : 'transparent',
                color: activeTab === 'enrolled' ? '#0d1410' : '#a0aab0',
              }}
            >
              Enrolled ({metrics.enrolled})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ flex: '1', maxWidth: '320px' }}>
            <input
              type="text"
              placeholder="Search by Name, Email, UTR, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                background: '#0a0f0d',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#fff8ee',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Table of Submissions */}
        {filteredRecords.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              background: '#131c16',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#a0aab0',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📋</div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              No submissions match the current filter or search criteria.
            </p>
          </div>
        ) : (
          <div
            style={{
              overflowX: 'auto',
              background: '#131c16',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '12px',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    background: '#0e1511',
                    color: '#a0aab0',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <th style={{ padding: '14px 18px' }}>Candidate Details</th>
                  <th style={{ padding: '14px 18px' }}>Track & College</th>
                  <th style={{ padding: '14px 18px' }}>UTR / Reference</th>
                  <th style={{ padding: '14px 18px' }}>Submission Time</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, idx) => {
                  const isPending = r.status === 'deposit_pending_verification';
                  const isEnrolled = r.status === 'enrolled' || r.status === 'onboarded';

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      }}
                    >
                      {/* Candidate */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#fff8ee', fontSize: '13px' }}>{r.name}</div>
                        <div style={{ color: '#a0aab0', marginTop: '2px' }}>{r.email}</div>
                        <div style={{ color: '#a0aab0', marginTop: '1px' }}>+{r.phone}</div>
                        {r.signatureName && (
                          <div style={{ fontSize: '10px', color: '#e8a34c', marginTop: '4px' }}>
                            Signed by: {r.signatureName}
                          </div>
                        )}
                      </td>

                      {/* Track & College */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ color: '#e8a34c', fontWeight: 600 }}>{r.track}</div>
                        <div style={{ color: '#a0aab0', marginTop: '2px' }}>{r.college}</div>
                        <div style={{ color: '#687780', fontSize: '10px', marginTop: '3px' }}>
                          ID: {r.offerLetterId || r.id}
                        </div>
                      </td>

                      {/* UTR */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '13px',
                              background: '#0a0f0d',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid rgba(232, 163, 76, 0.3)',
                              color: '#e8a34c',
                            }}
                          >
                            {r.utrNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(r.utrNumber, r.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: copiedUtr === r.id ? '#4caf50' : '#a0aab0',
                            }}
                            title="Copy UTR"
                          >
                            {copiedUtr === r.id ? '✓' : '📋'}
                          </button>
                        </div>
                        <div style={{ color: '#687780', fontSize: '10px', marginTop: '3px' }}>
                          Receipt: {r.receiptNumber}
                        </div>
                      </td>

                      {/* Time */}
                      <td style={{ padding: '14px 18px', color: '#a0aab0' }}>
                        <div>{r.depositPaidAt ? new Date(r.depositPaidAt).toLocaleDateString('en-IN') : 'N/A'}</div>
                        <div style={{ fontSize: '10px', color: '#687780' }}>
                          {r.depositPaidAt ? new Date(r.depositPaidAt).toLocaleTimeString('en-IN') : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        {isPending ? (
                          <span
                            style={{
                              background: 'rgba(232, 163, 76, 0.15)',
                              color: '#e8a34c',
                              border: '1px solid rgba(232, 163, 76, 0.4)',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            Pending Review
                          </span>
                        ) : isEnrolled ? (
                          <span
                            style={{
                              background: 'rgba(76, 175, 80, 0.15)',
                              color: '#4caf50',
                              border: '1px solid rgba(76, 175, 80, 0.4)',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            ✓ Enrolled
                          </span>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              color: '#a0aab0',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '11px',
                            }}
                          >
                            {r.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleAction(r.id, 'approve')}
                              disabled={actionLoadingId === r.id}
                              style={{
                                background: '#4caf50',
                                color: '#0d1410',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {actionLoadingId === r.id ? 'Approving...' : '✓ Approve & Confirm'}
                            </button>
                          )}

                          {isEnrolled && (
                            <a
                              href={buildWhatsAppConfirmationUrl(r)}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                background: '#25D366',
                                color: '#0d1410',
                                textDecoration: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Send WhatsApp confirmation message"
                            >
                              💬 WhatsApp Confirm
                            </a>
                          )}

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => {
                                const reason = prompt('Reason for rejecting UTR (e.g. UTR not matching bank record):');
                                if (reason) handleAction(r.id, 'reject');
                              }}
                              disabled={actionLoadingId === r.id}
                              style={{
                                background: 'transparent',
                                color: '#ff6b6b',
                                border: '1px solid rgba(255, 107, 107, 0.4)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              ✕ Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
