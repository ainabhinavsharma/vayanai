'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminPartnerReview } from '@/types/portal';
import { Certificate } from '@/types/certificates';
import { useToast } from '@/components/ui/Toast';
import { AdminInternSupervision } from '@/components/portal/AdminInternSupervision';

interface AdminDashboardProps {
  partners?: AdminPartnerReview[];
  onReviewPartner: (partnerId: string, status: 'verified' | 'rejected', reason?: string) => void;
}

export function AdminDashboard({ partners = [], onReviewPartner }: AdminDashboardProps) {
  const { showToast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'certificates' | 'partners' | 'botskill' | 'intern_applications'>('intern_applications');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // BOTSKILL AI & Operations Queue State
  const [botskillDrafts, setBotskillDrafts] = useState<any[]>([]);
  const [botskillStatus, setBotskillStatus] = useState<any>(null);
  const [isLoadingBotskill, setIsLoadingBotskill] = useState(false);
  const [stagingDraftId, setStagingDraftId] = useState<string | null>(null);

  // Monitored Accounts State
  const [botskillAccounts, setBotskillAccounts] = useState<any[]>([]);
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isDiscoveringAccounts, setIsDiscoveringAccounts] = useState(false);

  // Policy & Guidelines Rules State
  const [botskillRules, setBotskillRules] = useState<any[]>([]);
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleCondition, setNewRuleCondition] = useState('');
  const [newRuleAction, setNewRuleAction] = useState('');
  const [newRuleProhibited, setNewRuleProhibited] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState('HIGH');
  const [isAddingRule, setIsAddingRule] = useState(false);

  // Certificate approval queue state
  const [pendingCerts, setPendingCerts] = useState<Certificate[]>([]);
  const [allCerts, setAllCerts] = useState<Certificate[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [processingCertId, setProcessingCertId] = useState<string | null>(null);
  const [rejectingCertId, setRejectingCertId] = useState<string | null>(null);
  const [certRejectReason, setCertRejectReason] = useState<string>('');

  const safePartners = Array.isArray(partners) ? partners : [];
  const safeAllCerts = Array.isArray(allCerts) ? allCerts : [];
  const safePendingCerts = Array.isArray(pendingCerts) ? pendingCerts : [];
  const safeDrafts = Array.isArray(botskillDrafts) ? botskillDrafts : [];

  const pendingList = safePartners.filter((p) => p && p.verificationStatus === 'pending');
  const verifiedList = safePartners.filter((p) => p && p.verificationStatus === 'verified');

  const fetchCertificatesQueue = async () => {
    setIsLoadingCerts(true);
    // 1. Try server API
    try {
      const res = await fetch('/api/v1/portal/admin/certificates');
      const data = await res.json();
      if (data.success && data.data) {
        setPendingCerts(data.data.pending || []);
        setAllCerts(data.data.all || []);
        setIsLoadingCerts(false);
        return;
      }
    } catch {
      // Server API unreachable - static fallback
    }

    // 2. Static / Local fallback
    try {
      let localPending: Certificate[] = [];
      let localAll: Certificate[] = [];

      // Check localStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('vayanai_certificates');
        if (stored) {
          const list: Certificate[] = JSON.parse(stored);
          localPending = list.filter((c) => c.status === 'pending_approval');
          localAll = [...list];
        }
      }

      // Check static JSON
      const staticRes = await fetch('/data/certificates.json');
      if (staticRes.ok) {
        const staticList: Certificate[] = await staticRes.json();
        for (const item of staticList) {
          if (!localAll.some((c) => c.certificateId === item.certificateId)) {
            localAll.push(item);
          }
        }
      }

      setPendingCerts(localPending);
      setAllCerts(localAll);
    } catch (err) {
      console.warn('Queue fallback error:', err);
    } finally {
      setIsLoadingCerts(false);
    }
  };

  const fetchBotskillData = async () => {
    setIsLoadingBotskill(true);
    try {
      const [draftsRes, statusRes, accountsRes, rulesRes] = await Promise.all([
        fetch('/api/v1/portal/admin/botskill/drafts'),
        fetch('/api/v1/portal/admin/botskill/status'),
        fetch('/api/v1/portal/admin/botskill/accounts'),
        fetch('/api/v1/portal/admin/botskill/policies')
      ]);

      if (draftsRes.ok) {
        const dData = await draftsRes.json();
        if (dData.success && dData.data?.drafts) {
          setBotskillDrafts(dData.data.drafts);
        }
      }

      if (statusRes.ok) {
        const sData = await statusRes.json();
        if (sData.success && sData.data) {
          setBotskillStatus(sData.data);
        }
      }

      if (accountsRes.ok) {
        const aData = await accountsRes.json();
        if (aData.success && aData.data?.accounts) {
          setBotskillAccounts(aData.data.accounts);
        }
      }

      if (rulesRes.ok) {
        const rData = await rulesRes.json();
        if (rData.success && rData.data?.rules) {
          setBotskillRules(rData.data.rules);
        }
      }
    } catch (err) {
      console.warn('BOTSKILL fetch error:', err);
    } finally {
      setIsLoadingBotskill(false);
    }
  };

  const handleDiscoverOutlook = async () => {
    setIsDiscoveringAccounts(true);
    try {
      const res = await fetch('/api/v1/portal/admin/botskill/accounts/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        const count = data.data?.newly_picked_count ?? 0;
        if (count > 0) {
          showToast(`Discovered & auto-picked ${count} new email account(s) from Outlook!`);
        } else {
          showToast(`Outlook scan complete. All accounts are up-to-date.`);
        }
        fetchBotskillData();
      } else {
        showToast(`Outlook discovery failed: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`Discovery error: ${String(err)}`);
    } finally {
      setIsDiscoveringAccounts(false);
    }
  };

  const handleAddAccount = async (emailToAdd?: string) => {
    let targetEmail = (emailToAdd || newAccountEmail).trim().toLowerCase();
    if (!targetEmail) {
      showToast('Please enter an email address.');
      return;
    }
    // Auto-append domain if user entered prefix only
    if (!targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@vayanai.in.net`;
    }
    if (!targetEmail.endsWith('@vayanai.in.net')) {
      showToast("Strict Project Isolation: Only '@vayanai.in.net' email addresses are permitted.");
      return;
    }
    setIsAddingAccount(true);
    try {
      const res = await fetch('/api/v1/portal/admin/botskill/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail.trim(),
          displayName: newAccountName.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Registered '${targetEmail}' for active mailbox monitoring.`);
        setNewAccountEmail('');
        setNewAccountName('');
        fetchBotskillData();
      } else {
        showToast(`Failed to register account: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`Account registration error: ${String(err)}`);
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle || !newRuleCondition || !newRuleAction) {
      showToast('Please provide a title, condition, and required action for the policy.');
      return;
    }
    setIsAddingRule(true);
    try {
      const res = await fetch('/api/v1/portal/admin/botskill/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRuleTitle.trim(),
          condition: newRuleCondition.trim(),
          required_action: newRuleAction.trim(),
          prohibited_actions: newRuleProhibited
            ? newRuleProhibited.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          severity: newRuleSeverity,
          rule_type: 'MANDATORY_POLICY'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Registered company policy rule: ${newRuleTitle}`);
        setNewRuleTitle('');
        setNewRuleCondition('');
        setNewRuleAction('');
        setNewRuleProhibited('');
        setShowAddRuleForm(false);
        fetchBotskillData();
      } else {
        showToast(`Failed to add policy: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`Policy creation error: ${String(err)}`);
    } finally {
      setIsAddingRule(false);
    }
  };

  useEffect(() => {
    fetchCertificatesQueue();
    fetchBotskillData();
  }, []);

  const handleStageDraft = async (draftId: string) => {
    setStagingDraftId(draftId);
    try {
      const res = await fetch('/api/v1/portal/admin/botskill/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Draft staged into Outlook Drafts folder (DRAFT_ONLY invariant enforced).`);
        setBotskillDrafts((prev) =>
          prev.map((d) => (d.draft_id === draftId ? { ...d, staged_to_provider: true, is_approved: true } : d))
        );
      } else {
        showToast(`Staging failed: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`Staging error: ${String(err)}`);
    } finally {
      setStagingDraftId(null);
    }
  };

  const handleApproveCert = async (certId: string) => {
    setProcessingCertId(certId);
    try {
      const res = await fetch('/api/v1/portal/admin/certificates/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId: certId,
          action: 'approve',
          adminName: 'Operations Admin'
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.data?.message || `Certificate ${certId} approved & activated!`);
        setPendingCerts((prev) => prev.filter((c) => c.certificateId !== certId));
        fetchCertificatesQueue();
        return;
      }
    } catch {
      // LocalStorage approval fallback (static hosting)
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('vayanai_certificates');
          if (stored) {
            const list: Certificate[] = JSON.parse(stored);
            const updated = list.map((c) =>
              c.certificateId === certId
                ? { ...c, status: 'active' as const, approvedBy: 'Operations Admin', approvedAt: new Date().toISOString() }
                : c
            );
            localStorage.setItem('vayanai_certificates', JSON.stringify(updated));
            showToast(`Certificate ${certId} approved & activated! Verification updated.`);
            setPendingCerts((prev) => prev.filter((c) => c.certificateId !== certId));
            fetchCertificatesQueue();
            return;
          }
        } catch {}
      }
      showToast(`Certificate ${certId} approved in session.`);
    } finally {
      setProcessingCertId(null);
    }
  };

  const handleRejectCert = async (certId: string) => {
    setProcessingCertId(certId);
    try {
      const res = await fetch('/api/v1/portal/admin/certificates/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId: certId,
          action: 'reject',
          reason: certRejectReason || 'UPI UTR transaction could not be reconciled with bank statement.'
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Certificate ${certId} rejected.`);
        setPendingCerts((prev) => prev.filter((c) => c.certificateId !== certId));
        setRejectingCertId(null);
        setCertRejectReason('');
        fetchCertificatesQueue();
        return;
      }
    } catch {
      // LocalStorage rejection fallback (static hosting)
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('vayanai_certificates');
          if (stored) {
            const list: Certificate[] = JSON.parse(stored);
            const updated = list.map((c) =>
              c.certificateId === certId
                ? { ...c, status: 'rejected' as const, adminNotes: certRejectReason || 'Invalid UTR' }
                : c
            );
            localStorage.setItem('vayanai_certificates', JSON.stringify(updated));
            showToast(`Certificate ${certId} rejected.`);
            setPendingCerts((prev) => prev.filter((c) => c.certificateId !== certId));
            setRejectingCertId(null);
            setCertRejectReason('');
            fetchCertificatesQueue();
            return;
          }
        } catch {}
      }
      showToast(`Certificate ${certId} marked as rejected.`);
    } finally {
      setProcessingCertId(null);
    }
  };

  const handleConfirmReject = (partnerId: string) => {
    onReviewPartner(partnerId, 'rejected', rejectReason || 'Documentation incomplete');
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header-card">
        <span className="badge badge-amber">OPERATIONS & INTEGRITY CONSOLE</span>
        <h2>Administration & Manual Review Center</h2>
        <p>
          Enforce strict human verification for local hosts, audit regional travel compliance, and manually reconcile UPI payments for intern certificates.
        </p>
      </div>

      {/* Primary Metrics Row */}
      <div className="portal-metrics-row">
        <div className="metric-box">
          <span className="metric-val" style={{ color: pendingCerts.length > 0 ? 'var(--gold)' : undefined }}>
            {safePendingCerts.length}
          </span>
          <span className="metric-lbl">Pending Certificate Approvals</span>
        </div>
        <div className="metric-box">
          <span className="metric-val">{safeAllCerts.filter((c) => c && c.status === 'active').length}</span>
          <span className="metric-lbl">Active Issued Certs</span>
        </div>
        <div className="metric-box">
          <span className="metric-val">{pendingList.length}</span>
          <span className="metric-lbl">Pending Host Audits</span>
        </div>
        <div className="metric-box">
          <span className="metric-val">{verifiedList.length}</span>
          <span className="metric-lbl">Verified Genuine Hosts</span>
        </div>
      </div>

      {/* Subtab Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`button ${activeSubTab === 'intern_applications' ? 'button-gold' : 'button-outline'}`}
          onClick={() => setActiveSubTab('intern_applications')}
          style={{ minHeight: '38px', fontSize: '10px' }}
        >
          📋 Intern Applications & 2h Queue Supervision
        </button>
        <button
          type="button"
          className={`button ${activeSubTab === 'certificates' ? 'button-gold' : 'button-outline'}`}
          onClick={() => setActiveSubTab('certificates')}
          style={{ minHeight: '38px', fontSize: '10px' }}
        >
          🎓 Intern Certificate & UPI Approvals {pendingCerts.length > 0 && `(${safePendingCerts.length})`}
        </button>
        <button
          type="button"
          className={`button ${activeSubTab === 'partners' ? 'button-gold' : 'button-outline'}`}
          onClick={() => setActiveSubTab('partners')}
          style={{ minHeight: '38px', fontSize: '10px' }}
        >
          🏡 Local Partner Verification Queue ({pendingList.length})
        </button>
        <button
          type="button"
          className={`button ${activeSubTab === 'botskill' ? 'button-gold' : 'button-outline'}`}
          onClick={() => setActiveSubTab('botskill')}
          style={{ minHeight: '38px', fontSize: '10px' }}
        >
          ⚡ BOTSKILL AI & Partner Supervision Desk {safeDrafts.filter((d) => d && !d.is_approved).length > 0 && `(${safeDrafts.filter((d) => d && !d.is_approved).length})`}
        </button>
      </div>

      {/* SUBTAB 0: INTERN APPLICATIONS & ASSESSMENT SUPERVISION */}
      {activeSubTab === 'intern_applications' && (
        <section className="admin-section">
          <AdminInternSupervision />
        </section>
      )}

      {/* SUBTAB 1: CERTIFICATES & UPI RECONCILIATION */}
      {activeSubTab === 'certificates' && (
        <section className="admin-section">
          <div className="section-title-row">
            <div>
              <h3>UPI Payment & Clearance Approval Queue</h3>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: 'var(--muted)' }}>
                Verify incoming 12-digit UPI UTR numbers against your ICICI / DBERT banking statement before issuing certificates.
              </p>
            </div>
            <button
              type="button"
              className="button button-outline"
              onClick={fetchCertificatesQueue}
              style={{ minHeight: '30px', fontSize: '9px' }}
            >
              🔄 Refresh Queue
            </button>
          </div>

          {isLoadingCerts ? (
            <div className="empty-message-state">
              <p>Loading pending certificate submissions...</p>
            </div>
          ) : pendingCerts.length === 0 ? (
            <div className="empty-message-state" style={{ background: 'rgba(20, 30, 24, 0.5)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '30px', textAlign: 'center' }}>
              <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>✓</span>
              <p style={{ margin: 0, color: 'var(--paper)', fontSize: '12px' }}>
                All UPI payments have been reconciled! There are no pending certificates in the queue.
              </p>
              <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                New clearance submissions from <Link href="/certificate/apply" style={{ color: 'var(--gold-lite)' }}>/certificate/apply</Link> will automatically appear here.
              </small>
            </div>
          ) : (
            <div className="admin-partners-table" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingCerts.map((cert) => (
                <div
                  key={cert.id}
                  className="admin-partner-row"
                  style={{
                    background: 'rgba(20, 30, 24, 0.85)',
                    border: '1px solid rgba(232, 163, 76, 0.35)',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div className="admin-partner-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge badge-amber" style={{ fontSize: '8px' }}>
                        PENDING CREDENTIAL VERIFICATION
                      </span>
                      <code style={{ fontSize: '11px', color: 'var(--gold-lite)' }}>{cert.certificateId}</code>
                    </div>

                    <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--paper)' }}>
                      {cert.internName}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--muted)', margin: '8px 0' }}>
                      <div>
                        <b>Email:</b> {cert.internEmail}<br />
                        <b>WhatsApp:</b> +91 {cert.phone || 'N/A'}<br />
                        <b>College:</b> {cert.collegeName || 'Verified Institute'}
                      </div>
                      <div>
                        <b>Domain:</b> {cert.domain}<br />
                        <b>Project:</b> {cert.projectName}<br />
                        <b>Tenure:</b> {cert.joiningDate} to {cert.completionDate}
                      </div>
                    </div>

                    {/* Highlighted UPI UTR Box */}
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(232, 163, 76, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginTop: '8px'
                    }}>
                      <div>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--gold-lite)', display: 'block' }}>
                          Candidate Submitted UPI UTR / Reference:
                        </span>
                        <code style={{ fontSize: '14px', color: '#FFF', fontWeight: 'bold', letterSpacing: '0.8px' }}>
                          {cert.utrNumber || cert.paymentProofUrl || 'N/A'}
                        </code>
                      </div>
                      {cert.paymentProofUrl && cert.paymentProofUrl.startsWith('http') && (
                        <a
                          href={cert.paymentProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '10px', color: 'var(--gold)', textDecoration: 'underline' }}
                        >
                          View Drive Screenshot ↗
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="admin-partner-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="button button-gold"
                      style={{ minHeight: '36px', fontSize: '10px', whiteSpace: 'nowrap' }}
                      disabled={processingCertId === cert.certificateId}
                      onClick={() => handleApproveCert(cert.certificateId)}
                    >
                      {processingCertId === cert.certificateId ? 'Approving...' : 'Approve & Issue Certificate ✓'}
                    </button>
                    <button
                      type="button"
                      className="button button-outline"
                      style={{ minHeight: '32px', fontSize: '9px' }}
                      disabled={processingCertId === cert.certificateId}
                      onClick={() => setRejectingCertId(cert.certificateId)}
                    >
                      Reject ✗
                    </button>
                    <Link
                      href={`/verify?certid=${cert.certificateId}`}
                      target="_blank"
                      className="button button-outline"
                      style={{ minHeight: '28px', fontSize: '8px', textAlign: 'center', textDecoration: 'none' }}
                    >
                      Inspect Record ↗
                    </Link>
                  </div>

                  {rejectingCertId === cert.certificateId && (
                    <div className="reject-reason-box" style={{ width: '100%', marginTop: '12px' }}>
                      <input
                        type="text"
                        className="portal-input"
                        placeholder="Reason (e.g. UTR not found on statement, incorrect fee amount)..."
                        value={certRejectReason}
                        onChange={(e) => setCertRejectReason(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="button button-gold"
                          style={{ minHeight: '30px', fontSize: '8px' }}
                          onClick={() => handleRejectCert(cert.certificateId)}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          style={{ minHeight: '30px', fontSize: '8px' }}
                          onClick={() => setRejectingCertId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Active Recently Issued Section */}
          <div style={{ marginTop: '36px' }}>
            <div className="section-title-row">
              <h3>Recently Issued & Approved Certificates</h3>
              <span>{safeAllCerts.filter((c) => c && c.status === 'active').length} Active</span>
            </div>
            <div className="admin-partners-table">
              {allCerts.filter((c) => c.status === 'active').slice(0, 8).map((c) => (
                <div key={c.id} className="admin-partner-row verified-row">
                  <div className="admin-partner-info">
                    <h4>{c.internName} <span className="verified-check">✓ Active</span></h4>
                    <p><b>Domain:</b> {c.domain} · <b>College:</b> {c.collegeName || 'Verified Institute'}</p>
                    <p><small>Cert ID: <code>{c.certificateId}</code> · Intern ID: <code>{c.internId}</code></small></p>
                  </div>
                  <Link
                    href={`/verify?certid=${c.certificateId}`}
                    target="_blank"
                    className="badge badge-green"
                    style={{ textDecoration: 'none' }}
                  >
                    VIEW IN REGISTRY ↗
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SUBTAB 3: BOTSKILL AI & PARTNER SUPERVISION DESK */}
      {activeSubTab === 'botskill' && (
        <section className="admin-section">
          <div className="section-title-row">
            <div>
              <h3>BOTSKILL v3.0 Intelligence & Supervision Desk</h3>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: 'var(--muted)' }}>
                Inspect AI-generated partner drafts, verify exact policy citations, and approve staged messages with strict DRAFT_ONLY invariants.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="button button-outline"
                style={{ minHeight: '32px', fontSize: '9px' }}
                onClick={fetchBotskillData}
                disabled={isLoadingBotskill}
              >
                {isLoadingBotskill ? 'Refreshing...' : '🔄 Refresh Queue'}
              </button>
              <a
                href="http://127.0.0.1:8765"
                target="_blank"
                rel="noreferrer"
                className="button button-gold"
                style={{ minHeight: '32px', fontSize: '9px', display: 'inline-flex', alignItems: 'center' }}
              >
                Open BOTSKILL HUD (Port 8765) ↗
              </a>
            </div>
          </div>

          {/* AI Runtime Diagnostics HUD */}
          <div className="portal-metrics-row" style={{ marginTop: '16px', marginBottom: '24px' }}>
            <div className="metric-box">
              <span className="metric-val" style={{ fontSize: '13px', color: 'var(--soft-green)' }}>
                {botskillStatus?.slmRuntime?.status === 'READY' ? '● READY (CPU)' : '○ STANDBY / LOCAL'}
              </span>
              <span className="metric-lbl">Qwen 2.5 0.5B Instruct GGUF</span>
            </div>
            <div className="metric-box">
              <span className="metric-val" style={{ fontSize: '13px', color: 'var(--gold)' }}>
                DRAFT_ONLY
              </span>
              <span className="metric-lbl">Transmission Barrier Active</span>
            </div>
            <div className="metric-box">
              <span className="metric-val" style={{ fontSize: '13px' }}>
                4 Active Docs
              </span>
              <span className="metric-lbl">Grounded Policy Knowledge</span>
            </div>
            <div className="metric-box">
              <span className="metric-val" style={{ fontSize: '13px' }}>
                {safeDrafts.filter((d) => d && !d.is_approved).length} Pending
              </span>
              <span className="metric-lbl">Drafts Requiring Approval</span>
            </div>
          </div>

          {/* Staged Drafts Review Queue */}
          <div style={{ marginBottom: '32px' }}>
            <div className="section-title-row" style={{ marginBottom: '12px' }}>
              <h4>Partner Outreach & Booking Inquiries Review Queue</h4>
              <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                Live dispatch via Outlook .Send() is physically blocked until authorized
              </span>
            </div>

            {botskillDrafts.length === 0 ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed var(--border)',
                  borderRadius: '6px'
                }}
              >
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '11px' }}>
                  No pending partner inquiries in the queue. Inquiries initiated by travellers on trip pages are staged here.
                </p>
                <p style={{ margin: '8px 0 0', fontSize: '10px', color: 'var(--muted)' }}>
                  Sample partner draft for Sohra Homestays Collective can be generated via traveler brief handoff.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {botskillDrafts.map((draft) => (
                  <div
                    key={draft.draft_id}
                    style={{
                      background: 'var(--ink-lift)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '18px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <span
                          className={`badge ${draft.is_approved ? 'badge-green' : 'badge-amber'}`}
                          style={{ marginBottom: '6px', display: 'inline-block' }}
                        >
                          {draft.is_approved ? '✓ APPROVED & STAGED' : '⏳ PENDING HUMAN SIGN-OFF'}
                        </span>
                        <h4 style={{ margin: '4px 0 2px', fontSize: '13px' }}>{draft.subject}</h4>
                        <p style={{ margin: 0, fontSize: '10px', color: 'var(--muted)' }}>
                          Account: {draft.account_id} · Model: {draft.model_provenance} · Created: {new Date(draft.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      {!draft.is_approved && (
                        <button
                          type="button"
                          className="button button-gold"
                          style={{ minHeight: '34px', fontSize: '10px' }}
                          onClick={() => handleStageDraft(draft.draft_id)}
                          disabled={stagingDraftId === draft.draft_id}
                        >
                          {stagingDraftId === draft.draft_id ? 'Staging...' : '✓ Approve & Stage to Outlook'}
                        </button>
                      )}
                    </div>

                    <div
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '4px',
                        padding: '12px',
                        fontSize: '11px',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        color: 'var(--paper)'
                      }}
                    >
                      {draft.body_text}
                    </div>

                    {/* Grounded Citations Badges */}
                    {draft.citations && draft.citations.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                          Grounded Citations:
                        </span>
                        {draft.citations.map((c: any, idx: number) => (
                          <span
                            key={idx}
                            className="badge badge-green"
                            style={{ fontSize: '9px', padding: '2px 8px' }}
                            title={`Quote: "${c.source_quote}"`}
                          >
                            📄 {c.document_title} · {c.source_location}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Dual Knowledge Base */}
          {/* Monitored Mailboxes & Local Outlook Discovery */}
          <div style={{ marginBottom: '32px' }}>
            <div className="section-title-row" style={{ marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0 }}>Connected & Monitored Mailboxes</h4>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--soft-green)' }}>
                  ● Continuous Auto-Pick Active: Any new email address configured on Microsoft Outlook is automatically detected and added to this queue.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="button button-gold"
                  style={{ minHeight: '30px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={handleDiscoverOutlook}
                  disabled={isDiscoveringAccounts}
                >
                  {isDiscoveringAccounts ? 'Scanning Outlook...' : '🔍 Scan & Auto-Pick Outlook'}
                </button>
                <span className="badge badge-green" style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                  Auto-Pick Enabled
                </span>
              </div>
            </div>

            {/* Quick Add Form */}
            <div
              style={{
                background: 'var(--ink-lift)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="email"
                  placeholder="e.g. partner.desk@vayanai.in.net"
                  value={newAccountEmail}
                  onChange={(e) => setNewAccountEmail(e.target.value)}
                  style={{
                    flex: '1 1 240px',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'var(--paper)',
                    fontSize: '11px'
                  }}
                />
                <input
                  type="text"
                  placeholder="Display Name (optional)"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  style={{
                    flex: '1 1 180px',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'var(--paper)',
                    fontSize: '11px'
                  }}
                />
                <button
                  type="button"
                  className="button button-gold"
                  style={{ minHeight: '34px', fontSize: '10px' }}
                  onClick={() => handleAddAccount()}
                  disabled={isAddingAccount || !newAccountEmail}
                >
                  {isAddingAccount ? 'Registering...' : '+ Monitor Mailbox'}
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase' }}>Quick Add:</span>
                {['partners@vayanai.in.net', 'bookings@vayanai.in.net', 'support@vayanai.in.net'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="badge badge-cyan"
                    style={{ cursor: 'pointer', border: 'none', background: 'rgba(34,211,238,0.1)' }}
                    onClick={() => handleAddAccount(preset)}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* List of active monitored accounts */}
            <div className="admin-partners-table">
              {botskillAccounts.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '11px' }}>
                  No mailboxes registered yet. Add an email address above to begin monitoring.
                </div>
              ) : (
                botskillAccounts.map((acc: any) => (
                  <div key={acc.account_id} className="admin-partner-row verified-row" style={{ alignItems: 'center' }}>
                    <div className="admin-partner-info">
                      <h4 style={{ margin: 0, fontSize: '12px' }}>
                        {acc.display_name} <span className="verified-check">● Monitored</span>
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--muted)' }}>
                        <code>{acc.account_id}</code> · Provider: {acc.provider} · Mode: <code>{acc.autonomy_level}</code>
                      </p>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: '9px' }}>
                      {acc.domain === 'vayanai.in.net' ? '★ Official Domain' : 'Monitored'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Dual Knowledge Base & Company Policies */}
          <div style={{ marginBottom: '32px' }}>
            <div className="section-title-row" style={{ marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0 }}>Company Operational Policies & Safety Grounding Rules</h4>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--muted)' }}>
                  Deterministic SLM guardrails enforcing SLAs, cancellation windows, and altitude safety protocols
                </p>
              </div>
              <button
                type="button"
                className="button button-outline"
                style={{ minHeight: '30px', fontSize: '9px' }}
                onClick={() => setShowAddRuleForm(!showAddRuleForm)}
              >
                {showAddRuleForm ? '✕ Close Form' : '+ Add New Company Policy'}
              </button>
            </div>

            {/* Add Rule Form */}
            {showAddRuleForm && (
              <form
                onSubmit={handleCreateRule}
                style={{
                  background: 'var(--ink-lift)',
                  border: '1px solid var(--gold)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      Policy / Rule Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 24-Hour Partner Inquiry Response SLA"
                      value={newRuleTitle}
                      onChange={(e) => setNewRuleTitle(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'rgba(0,0,0,0.3)',
                        color: 'var(--paper)',
                        fontSize: '11px'
                      }}
                    />
                  </div>
                  <div style={{ flex: '0 0 140px' }}>
                    <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      Severity
                    </label>
                    <select
                      value={newRuleSeverity}
                      onChange={(e) => setNewRuleSeverity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'rgba(0,0,0,0.3)',
                        color: 'var(--paper)',
                        fontSize: '11px'
                      }}
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Trigger Condition *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Partner, homestay host, or driver inquiry received"
                    value={newRuleCondition}
                    onChange={(e) => setNewRuleCondition(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'rgba(0,0,0,0.3)',
                      color: 'var(--paper)',
                      fontSize: '11px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Required Action / Instruction *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Draft and review response within 24 hours acknowledging terms and dates"
                    value={newRuleAction}
                    onChange={(e) => setNewRuleAction(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'rgba(0,0,0,0.3)',
                      color: 'var(--paper)',
                      fontSize: '11px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Prohibited Actions (comma separated, optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. leave_inquiry_unanswered_24h, promise_unauthorized_full_refund"
                    value={newRuleProhibited}
                    onChange={(e) => setNewRuleProhibited(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'rgba(0,0,0,0.3)',
                      color: 'var(--paper)',
                      fontSize: '11px'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="button button-outline"
                    style={{ minHeight: '30px', fontSize: '9px' }}
                    onClick={() => setShowAddRuleForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-gold"
                    style={{ minHeight: '30px', fontSize: '9px' }}
                    disabled={isAddingRule}
                  >
                    {isAddingRule ? 'Registering...' : '✓ Ingest Policy Rule'}
                  </button>
                </div>
              </form>
            )}

            {/* List of Dynamic Policy Rules */}
            {botskillRules.length > 0 && (
              <div className="admin-partners-table" style={{ marginBottom: '16px' }}>
                {botskillRules.map((rule: any) => (
                  <div key={rule.rule_id} className="admin-partner-row verified-row">
                    <div className="admin-partner-info">
                      <h4 style={{ margin: 0, fontSize: '12px' }}>
                        {rule.title} <span className="verified-check">✓ Active Grounding</span>
                      </h4>
                      <p style={{ margin: '4px 0 2px', fontSize: '11px', color: 'var(--paper)' }}>
                        <b>Trigger:</b> {rule.condition}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'var(--muted)' }}>
                        <b>Required:</b> {rule.required_action}
                      </p>
                    </div>
                    <span className={`badge ${rule.severity === 'CRITICAL' ? 'badge-amber' : 'badge-green'}`}>
                      [{rule.rule_id}]
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Base Knowledge Corpus */}
            <div className="section-title-row" style={{ margin: '24px 0 12px' }}>
              <h4>Base Travel Knowledge Documents</h4>
              <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Deterministic Rule Grounding</span>
            </div>
            <div className="admin-partners-table">
              <div className="admin-partner-row verified-row">
                <div className="admin-partner-info">
                  <h4>Meghalaya Safety Advisory & Permits <span className="verified-check">✓ Active Grounding</span></h4>
                  <p>Living root bridge ~3,500 step warning, cave exploration guide, monsoon transfer protocols.</p>
                </div>
                <span className="badge badge-green">[DOC:meghalaya_safety_and_permits.txt]</span>
              </div>
              <div className="admin-partner-row verified-row">
                <div className="admin-partner-info">
                  <h4>Ladakh High Altitude Acclimatization Protocol <span className="verified-check">✓ Active Grounding</span></h4>
                  <p>Mandatory 36-48h rest in Leh (3,500m), HAPE prevention, elder oximeter monitoring.</p>
                </div>
                <span className="badge badge-green">[DOC:ladakh_altitude_protocol.txt]</span>
              </div>
              <div className="admin-partner-row verified-row">
                <div className="admin-partner-info">
                  <h4>Kerala Backwaters & Coastal Tourism Regulations <span className="verified-check">✓ Active Grounding</span></h4>
                  <p>Night cruising curfew (6 PM - 6 AM), Vembanad lake bio-toilet standards, heritage food walks.</p>
                </div>
                <span className="badge badge-green">[DOC:kerala_backwaters_rules.txt]</span>
              </div>
              <div className="admin-partner-row verified-row">
                <div className="admin-partner-info">
                  <h4>Sohra Indigenous Stays Collective — Partner Terms <span className="verified-check">✓ Active Grounding</span></h4>
                  <p>Step-free deluxe cottage accessibility, 72h cancellation terms, 48h quote validity.</p>
                </div>
                <span className="badge badge-green">[DOC:sohra_homestay_partner_terms.txt]</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SUBTAB 2: LOCAL PARTNER AUDITS */}
      {activeSubTab === 'partners' && (
        <section className="admin-section">
          <div className="section-title-row">
            <h3>Partner Verification Queue</h3>
            <span>{pendingList.length} Pending Review</span>
          </div>

          {pendingList.length === 0 ? (
            <div className="empty-message-state">
              <p>✓ All local partner applications have been reviewed and verified.</p>
            </div>
          ) : (
            <div className="admin-partners-table">
              {pendingList.map((p) => (
                <div key={p.id} className="admin-partner-row">
                  <div className="admin-partner-info">
                    <h4>{p.name}</h4>
                    <p><b>Region:</b> {p.region} · <b>Category:</b> {p.category.toUpperCase()}</p>
                    <p><small>Contact: {p.contactPerson} ({p.phone}) · License: <code>{p.licenseNumber}</code></small></p>
                  </div>

                  <div className="admin-partner-actions">
                    <button
                      type="button"
                      className="button button-gold"
                      style={{ minHeight: '34px', fontSize: '9px' }}
                      onClick={() => onReviewPartner(p.id, 'verified')}
                    >
                      Approve & Verify ✓
                    </button>
                    <button
                      type="button"
                      className="button button-outline"
                      style={{ minHeight: '34px', fontSize: '9px' }}
                      onClick={() => setRejectingId(p.id)}
                    >
                      Reject ✗
                    </button>
                  </div>

                  {rejectingId === p.id && (
                    <div className="reject-reason-box">
                      <input
                        type="text"
                        className="portal-input"
                        placeholder="Specify reason (e.g. License expired, unreachable phone)..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="button button-gold"
                          style={{ minHeight: '30px', fontSize: '8px' }}
                          onClick={() => handleConfirmReject(p.id)}
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          className="button button-outline"
                          style={{ minHeight: '30px', fontSize: '8px' }}
                          onClick={() => setRejectingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '30px' }}>
            <div className="section-title-row">
              <h3>Active Verified Hosts Directory</h3>
              <span>{verifiedList.length} Verified</span>
            </div>
            <div className="admin-partners-table">
              {verifiedList.map((p) => (
                <div key={p.id} className="admin-partner-row verified-row">
                  <div className="admin-partner-info">
                    <h4>{p.name} <span className="verified-check">✓ Verified</span></h4>
                    <p><b>Region:</b> {p.region} · <b>License:</b> {p.licenseNumber}</p>
                  </div>
                  <span className="badge badge-green">ACTIVE IN TRAVEL NETWORK</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
