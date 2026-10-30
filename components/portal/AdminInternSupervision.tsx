'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InternApplication } from '@/types/auth';
import { useToast } from '@/components/ui/Toast';

interface AdminInternSupervisionProps {
  isReadOnly?: boolean;
}

type FunnelStage =
  | 'ALL'
  | 'applied'
  | 'invited'
  | 'interview_completed'
  | 'selected'
  | 'offer_accepted'
  | 'enrolled'
  | 'completed'
  | 'flagged'
  | 'rejected';

export function AdminInternSupervision({ isReadOnly = false }: AdminInternSupervisionProps) {
  const { showToast } = useToast();

  // Core Data State
  const [candidates, setCandidates] = useState<InternApplication[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    applied: 0,
    dueForInvite: 0,
    invited: 0,
    completed: 0,
    selected: 0,
    offerSent: 0,
    offerAccepted: 0,
    enrolled: 0,
    rejected: 0,
    flagged: 0,
    dbertHigh: 0,
    dbertModerate: 0,
    dbertLow: 0
  });

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Funnel & Filtering State
  const [activeStage, setActiveStage] = useState<FunnelStage>('ALL');
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('ALL');
  const [scoreFilter, setScoreFilter] = useState('ALL');
  const [integrityFilter, setIntegrityFilter] = useState('ALL');
  const [dbertFilter, setDbertFilter] = useState('ALL');

  // Sorting & Pagination State
  const [sortBy, setSortBy] = useState<string>('applied_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  // Multi-Row Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Slide-over Drawer State
  const [drawerCandidate, setDrawerCandidate] = useState<InternApplication | null>(null);
  const [drawerTab, setDrawerTab] = useState<'assessment' | 'telemetry' | 'deposit' | 'dbert'>('assessment');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Debounced search timer
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Candidates from API with Pagination & Filters
  const fetchCandidates = async (pageToFetch = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (trackFilter !== 'ALL') params.set('track', trackFilter);
      if (dbertFilter !== 'ALL') params.set('dbertLead', dbertFilter);
      if (scoreFilter !== 'ALL') params.set('scoreBracket', scoreFilter);
      if (integrityFilter !== 'ALL') params.set('integrityLevel', integrityFilter);
      if (activeStage !== 'ALL') params.set('status', activeStage);

      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(pageToFetch));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/v1/portal/admin/interns?${params.toString()}`);
      const data = await res.json();

      if (data && data.success && data.data) {
        const rawCandidates = Array.isArray(data.data.candidates) ? data.data.candidates : [];

        // Safe Normalization for CamelCase
        const mappedCandidates: InternApplication[] = rawCandidates.map((cand: any) => {
          let dbert = cand.dbertProfile;
          if (!dbert && cand.dbert_profile_json) {
            try { dbert = typeof cand.dbert_profile_json === 'string' ? JSON.parse(cand.dbert_profile_json) : cand.dbert_profile_json; } catch {}
          }
          let telemetry = cand.proctoringTelemetry;
          if (!telemetry && cand.proctoring_telemetry_json) {
            try { telemetry = typeof cand.proctoring_telemetry_json === 'string' ? JSON.parse(cand.proctoring_telemetry_json) : cand.proctoring_telemetry_json; } catch {}
          }
          let answers = cand.interviewAnswers;
          if (!answers && cand.interview_answers_json) {
            try { answers = typeof cand.interview_answers_json === 'string' ? JSON.parse(cand.interview_answers_json) : cand.interview_answers_json; } catch {}
          }

          return {
            id: String(cand.id || ''),
            userId: String(cand.userId || cand.user_id || ''),
            userName: String(cand.userName || cand.user_name || 'Candidate'),
            userEmail: String(cand.userEmail || cand.user_email || ''),
            phone: cand.phone ? String(cand.phone) : undefined,
            collegeName: cand.collegeName || cand.college_name || undefined,
            semester: cand.semester || undefined,
            trackName: String(cand.trackName || cand.track_name || 'Data Analyst'),
            cvUrl: cand.cvUrl || cand.cv_url || undefined,
            status: (cand.status || 'applied') as InternApplication['status'],
            magicToken: cand.magicToken || cand.magic_token || undefined,
            magicTokenExpiresAt: cand.magicTokenExpiresAt || cand.magic_token_expires_at || undefined,
            inviteScheduledAt: cand.inviteScheduledAt || cand.invite_scheduled_at || undefined,
            inviteSentAt: cand.inviteSentAt || cand.invite_sent_at || undefined,
            interviewScore: cand.interviewScore !== undefined ? cand.interviewScore : cand.interview_score,
            interviewAnswers: answers,
            dbertProfile: dbert,
            proctoringTelemetry: telemetry,
            feedbackNote: cand.feedbackNote || cand.feedback_note || undefined,
            offerLetterId: cand.offerLetterId || cand.offer_letter_id || undefined,
            offerSentAt: cand.offerSentAt || cand.offer_sent_at || undefined,
            offerAcceptedAt: cand.offerAcceptedAt || cand.offer_accepted_at || undefined,
            signatureName: cand.signatureName || cand.signature_name || undefined,
            batchStartDate: cand.batchStartDate || cand.batch_start_date || '2026-11-02',
            available3Months: cand.available3Months || cand.available_3_months || undefined,
            laptopInternet: cand.laptopInternet || cand.laptop_internet || undefined,
            placementNeeded: cand.placementNeeded || cand.placement_needed || undefined,
            sourceReferral: cand.sourceReferral || cand.source_referral || undefined,
            depositReceipt: cand.depositReceipt || cand.deposit_receipt || undefined,
            depositPaidAt: cand.depositPaidAt || cand.deposit_paid_at || undefined,
            utrNumber: cand.utrNumber || cand.utr_number || undefined,
            appliedAt: cand.appliedAt || cand.applied_at || new Date().toISOString(),
            updatedAt: cand.updatedAt || cand.updated_at || new Date().toISOString()
          };
        });

        setCandidates(mappedCandidates);

        // Update Pagination metadata
        if (data.data.pagination) {
          setTotalRecords(data.data.pagination.total || mappedCandidates.length);
          setCurrentPage(data.data.pagination.page || pageToFetch);
        } else {
          setTotalRecords(mappedCandidates.length);
        }

        // Update KPIs
        if (data.data.metrics) {
          setMetrics(data.data.metrics);
        }
      }
    } catch (err: any) {
      showToast(`Failed to load candidates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch on filter / page / sort changes
  useEffect(() => {
    fetchCandidates(1);
  }, [activeStage, trackFilter, scoreFilter, integrityFilter, dbertFilter, sortBy, sortOrder, pageSize]);

  // Debounced search handler
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchCandidates(1);
    }, 350);
  };

  // Sorting Toggle
  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder('desc');
    }
  };

  // Checkbox Selection
  const allCurrentPageSelected = useMemo(() => {
    if (candidates.length === 0) return false;
    return candidates.every((c) => selectedIds.has(c.id));
  }, [candidates, selectedIds]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allCurrentPageSelected) {
      candidates.forEach((c) => next.delete(c.id));
    } else {
      candidates.forEach((c) => next.add(c.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk Action Execution
  const executeBulkAction = async (action: 'approve_assessment' | 'verify_deposit' | 'dispatch_invites' | 'reject') => {
    if (selectedIds.size === 0) {
      showToast('Please select at least one candidate.');
      return;
    }

    const candidateIds = Array.from(selectedIds);
    setBulkLoading(true);

    try {
      const res = await fetch('/api/v1/portal/admin/interns/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, candidateIds, reason: rejectionReason })
      });
      const data = await res.json();

      if (data.success) {
        showToast(`Bulk Action Completed: ${data.message || 'Operation successful'}`);
        setSelectedIds(new Set());
        fetchCandidates(currentPage);
      } else {
        showToast(data.error || 'Failed to execute bulk action.');
      }
    } catch (e: any) {
      showToast(`Bulk action failed: ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Google Sheet Ingestion Sync
  const handleSyncGoogleSheet = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/v1/portal/admin/interns/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.data.message);
        await fetchCandidates(1);
      } else {
        showToast(data.error?.message || 'Google Sheet sync failed.');
      }
    } catch (err: any) {
      showToast(`Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Dispatch Scheduled 2h Due Invites
  const handleDispatchDueInvites = async () => {
    setDispatching(true);
    try {
      const res = await fetch('/api/v1/portal/admin/interns/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_due' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.data.message);
        await fetchCandidates(currentPage);
      } else {
        showToast(data.error?.message || 'Dispatch failed.');
      }
    } catch (err: any) {
      showToast(`Dispatch error: ${err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (trackFilter !== 'ALL') params.set('track', trackFilter);
    if (dbertFilter !== 'ALL') params.set('dbertLead', dbertFilter);
    if (scoreFilter !== 'ALL') params.set('scoreBracket', scoreFilter);
    if (integrityFilter !== 'ALL') params.set('integrityLevel', integrityFilter);
    if (activeStage !== 'ALL') params.set('status', activeStage);

    window.open(`/api/v1/portal/admin/interns/export?${params.toString()}`, '_blank');
  };

  // Reset all filters
  const handleResetFilters = () => {
    setActiveStage('ALL');
    setSearch('');
    setTrackFilter('ALL');
    setScoreFilter('ALL');
    setIntegrityFilter('ALL');
    setDbertFilter('ALL');
    setSortBy('applied_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Total pages
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  return (
    <div className="admin-intern-supervision" style={{ position: 'relative' }}>
      {/* ── 1. EXECUTIVE COCKPIT COMMAND HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-gold" style={{ fontSize: '9px', fontWeight: 800 }}>
              ENTERPRISE ADMISSIONS ENGINE · DBERT
            </span>
            <span style={{ fontSize: '11px', color: '#889990' }}>
              Database Record: <b>{metrics?.total ?? 0} Ingested Applications</b>
            </span>
          </div>
          <h2 style={{ margin: '6px 0 2px', fontSize: '20px', color: '#fff8ee' }}>
            Candidate Admissions & Proctoring Supervision Cockpit
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#a8b8b0' }}>
            Industrial queue supervision, AI evaluation sign-offs, ₹499 security deposit reconciliation, and tamper-evident QR credential issuance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button button-outline"
            onClick={handleSyncGoogleSheet}
            disabled={syncing}
            style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px' }}
          >
            {syncing ? '🔄 Syncing Ingestion...' : '🔄 Sync Google Ingestion Form'}
          </button>

          <button
            type="button"
            className="button button-outline"
            onClick={handleDispatchDueInvites}
            disabled={dispatching || (metrics?.dueForInvite ?? 0) === 0}
            style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px', borderColor: '#e8a34c', color: '#e8a34c' }}
          >
            {dispatching ? '📨 Dispatching...' : `📨 Dispatch 2h Due Invites (${metrics?.dueForInvite ?? 0})`}
          </button>

          <button
            type="button"
            className="button button-outline"
            onClick={handleExportCsv}
            style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px' }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* ── 2. INTERACTIVE METRIC COMMAND CARDS (CLICK TO FILTER) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '22px' }}>
        <div
          onClick={() => { setActiveStage('ALL'); setCurrentPage(1); }}
          style={{
            background: activeStage === 'ALL' ? 'rgba(232, 163, 76, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            border: activeStage === 'ALL' ? '1px solid #e8a34c' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '12px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '10px', color: '#889990', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Ingested</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff8ee', marginTop: '4px' }}>{metrics?.total ?? 0}</div>
        </div>

        <div
          onClick={() => { setActiveStage('applied'); setCurrentPage(1); }}
          style={{
            background: activeStage === 'applied' ? 'rgba(232, 163, 76, 0.2)' : 'rgba(232, 163, 76, 0.06)',
            border: activeStage === 'applied' ? '1px solid #e8a34c' : '1px solid rgba(232, 163, 76, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '10px', color: '#e8a34c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending 2h Queue</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8a34c', marginTop: '4px' }}>{metrics?.applied ?? 0}</div>
        </div>

        <div
          onClick={() => { setActiveStage('interview_completed'); setCurrentPage(1); }}
          style={{
            background: activeStage === 'interview_completed' ? 'rgba(56, 139, 253, 0.2)' : 'rgba(56, 139, 253, 0.06)',
            border: activeStage === 'interview_completed' ? '1px solid #388bfd' : '1px solid rgba(56, 139, 253, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '10px', color: '#a5d6ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review Needed</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#a5d6ff', marginTop: '4px' }}>{metrics?.completed ?? 0}</div>
        </div>

        <div
          onClick={() => { setActiveStage('selected'); setCurrentPage(1); }}
          style={{
            background: activeStage === 'selected' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.08)',
            border: activeStage === 'selected' ? '1px solid #4caf50' : '1px solid rgba(76, 175, 80, 0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '10px', color: '#4caf50', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tech Qualified (≥70%)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#4caf50', marginTop: '4px' }}>{metrics?.selected ?? 0}</div>
        </div>

        <div
          onClick={() => { setActiveStage('offer_accepted'); setCurrentPage(1); }}
          style={{
            background: activeStage === 'offer_accepted' ? 'rgba(232, 163, 76, 0.2)' : 'rgba(232, 163, 76, 0.08)',
            border: activeStage === 'offer_accepted' ? '1px solid #e8a34c' : '1px solid rgba(232, 163, 76, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '10px', color: '#e8a34c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>₹499 Deposit Queue</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#e8a34c', marginTop: '4px' }}>{metrics?.offerAccepted ?? 0}</div>
        </div>

        <div
          onClick={() => { setActiveStage('enrolled'); setCurrentPage(1); }}
          style={{
            background: activeStage === 'enrolled' ? 'rgba(76, 175, 80, 0.25)' : 'rgba(76, 175, 80, 0.12)',
            border: activeStage === 'enrolled' ? '1px solid #4caf50' : '1px solid rgba(76, 175, 80, 0.4)',
            borderRadius: '8px',
            padding: '12px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '10px', color: '#4caf50', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admitted Sprint</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#4caf50', marginTop: '4px' }}>{metrics?.enrolled ?? 0}</div>
        </div>

        <div
          onClick={() => { setActiveStage('flagged'); setCurrentPage(1); }}
          style={{
            background: activeStage === 'flagged' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.08)',
            border: activeStage === 'flagged' ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '10px', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Integrity Flagged</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{metrics?.flagged ?? 0}</div>
        </div>
      </div>

      {/* ── 3. LIFECYCLE STAGE FUNNEL BAR ── */}
      <div className="admin-stage-funnel-bar">
        <button
          type="button"
          className={`funnel-tab ${activeStage === 'ALL' ? 'active' : ''}`}
          onClick={() => { setActiveStage('ALL'); setCurrentPage(1); }}
        >
          <span>All Applications</span>
          <span className="funnel-pill">{metrics?.total ?? 0}</span>
        </button>

        <button
          type="button"
          className={`funnel-tab ${activeStage === 'applied' ? 'active' : ''}`}
          onClick={() => { setActiveStage('applied'); setCurrentPage(1); }}
        >
          <span>Stage 1: Pending 2h Invite</span>
          <span className="funnel-pill">{metrics?.applied ?? 0}</span>
        </button>

        <button
          type="button"
          className={`funnel-tab ${activeStage === 'invited' ? 'active' : ''}`}
          onClick={() => { setActiveStage('invited'); setCurrentPage(1); }}
        >
          <span>Stage 2: Invite Sent</span>
          <span className="funnel-pill">{metrics?.invited ?? 0}</span>
        </button>

        <button
          type="button"
          className={`funnel-tab ${activeStage === 'interview_completed' ? 'active' : ''}`}
          onClick={() => { setActiveStage('interview_completed'); setCurrentPage(1); }}
        >
          <span>Stage 3: Assessment Review</span>
          <span className="funnel-pill">{metrics?.completed ?? 0}</span>
        </button>

        <button
          type="button"
          className={`funnel-tab ${activeStage === 'selected' ? 'active' : ''}`}
          onClick={() => { setActiveStage('selected'); setCurrentPage(1); }}
        >
          <span>Stage 4: Qualified (≥70%)</span>
          <span className="funnel-pill">{metrics?.selected ?? 0}</span>
        </button>

        <button
          type="button"
          className={`funnel-tab ${activeStage === 'offer_accepted' ? 'active' : ''}`}
          onClick={() => { setActiveStage('offer_accepted'); setCurrentPage(1); }}
        >
          <span>Stage 5: ₹499 Deposit Verification</span>
          <span className="funnel-pill">{metrics?.offerAccepted ?? 0}</span>
        </button>

        <button
          type="button"
          className={`funnel-tab ${activeStage === 'enrolled' ? 'active' : ''}`}
          onClick={() => { setActiveStage('enrolled'); setCurrentPage(1); }}
        >
          <span>Stage 6: Admitted Cohort</span>
          <span className="funnel-pill">{metrics?.enrolled ?? 0}</span>
        </button>

        <button
          type="button"
          className={`funnel-tab ${activeStage === 'flagged' ? 'active' : ''}`}
          onClick={() => { setActiveStage('flagged'); setCurrentPage(1); }}
        >
          <span>🚨 Integrity Flagged</span>
          <span className="funnel-pill">{metrics?.flagged ?? 0}</span>
        </button>

        <button
          type="button"
          className={`funnel-tab ${activeStage === 'rejected' ? 'active' : ''}`}
          onClick={() => { setActiveStage('rejected'); setCurrentPage(1); }}
        >
          <span>Declined</span>
          <span className="funnel-pill">{metrics?.rejected ?? 0}</span>
        </button>
      </div>

      {/* ── 4. MULTI-FACETED LIVE FILTER BAR ── */}
      <div style={{ background: '#131c16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Instant search by candidate name, email, phone, college, roll or offer code..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ flex: 1, minWidth: '240px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '8px 14px', color: '#f4ede0', fontSize: '12px' }}
        />

        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          style={{ background: '#131c16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '8px 12px', color: '#f4ede0', fontSize: '12px' }}
        >
          <option value="ALL">All Tracks</option>
          <option value="Data Analyst">Data Analyst</option>
          <option value="Artificial Intelligence">AI & Machine Learning</option>
          <option value="Full Stack Development">Full Stack Development</option>
          <option value="Python Automation">Python Automation</option>
          <option value="Operations">Operations & Growth</option>
        </select>

        <select
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value)}
          style={{ background: '#131c16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '8px 12px', color: '#f4ede0', fontSize: '12px' }}
        >
          <option value="ALL">All Scores</option>
          <option value="distinction">Distinction (≥85%)</option>
          <option value="qualified">Qualified (≥70%)</option>
          <option value="marginal">Marginal (50–69%)</option>
          <option value="disqualified">Disqualified (&lt;50%)</option>
        </select>

        <select
          value={integrityFilter}
          onChange={(e) => setIntegrityFilter(e.target.value)}
          style={{ background: '#131c16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '8px 12px', color: '#f4ede0', fontSize: '12px' }}
        >
          <option value="ALL">All Telemetry</option>
          <option value="clean">🛡️ Clean Sessions</option>
          <option value="tab_switches">⚠️ Tab Switches Detected</option>
          <option value="copy_paste">🚫 Clipboard Violations</option>
          <option value="flagged">🚨 Flagged Audits</option>
        </select>

        <select
          value={dbertFilter}
          onChange={(e) => setDbertFilter(e.target.value)}
          style={{ background: '#131c16', border: '1px solid rgba(232,163,76,0.3)', borderRadius: '6px', padding: '8px 12px', color: '#e8a34c', fontSize: '12px', fontWeight: 600 }}
        >
          <option value="ALL">All DBERT Leads</option>
          <option value="HIGH">🟢 High Propensity Lead</option>
          <option value="MODERATE">🟡 Moderate Lead</option>
          <option value="LOW">⚪ Low / Free Track</option>
        </select>

        <button
          type="button"
          className="button button-outline"
          onClick={handleResetFilters}
          style={{ fontSize: '11px', minHeight: '34px', padding: '0 12px' }}
          title="Reset all filters to defaults"
        >
          Reset Filters
        </button>
      </div>

      {/* ── 5. INDUSTRIAL CANDIDATE DATA TABLE ── */}
      <div style={{ background: '#131c16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#889990', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              <th style={{ padding: '12px 14px', width: '36px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={handleToggleSelectAll}
                  style={{ cursor: 'pointer', accentColor: '#e8a34c' }}
                  title="Select / Deselect all on current page"
                />
              </th>
              <th className={`sortable-th ${sortBy === 'user_name' ? 'active-sort' : ''}`} onClick={() => handleSort('user_name')} style={{ padding: '12px 16px' }}>
                Candidate Profile <span className="sort-icon">{sortBy === 'user_name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
              </th>
              <th className={`sortable-th ${sortBy === 'track_name' ? 'active-sort' : ''}`} onClick={() => handleSort('track_name')} style={{ padding: '12px 16px' }}>
                Track & Institution <span className="sort-icon">{sortBy === 'track_name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
              </th>
              <th className={`sortable-th ${sortBy === 'interview_score' ? 'active-sort' : ''}`} onClick={() => handleSort('interview_score')} style={{ padding: '12px 16px' }}>
                Assessment Score <span className="sort-icon">{sortBy === 'interview_score' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
              </th>
              <th style={{ padding: '12px 16px' }}>Anti-Cheat Proctoring</th>
              <th style={{ padding: '12px 16px' }}>DBERT Readiness</th>
              <th className={`sortable-th ${sortBy === 'status' ? 'active-sort' : ''}`} onClick={() => handleSort('status')} style={{ padding: '12px 16px' }}>
                Status <span className="sort-icon">{sortBy === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}</span>
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#889990' }}>
                  <div className="verify-spinner" style={{ margin: '0 auto 12px' }}></div>
                  Querying enterprise candidate registry...
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '54px', color: '#889990' }}>
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📂</span>
                  No candidates match the active filters or stage.
                  <div style={{ marginTop: '10px' }}>
                    <button type="button" className="button button-outline" onClick={handleResetFilters} style={{ fontSize: '10px' }}>
                      Clear Active Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              candidates.map((cand) => {
                const isSelected = selectedIds.has(cand.id);
                const score = cand.interviewScore;
                const telemetry = cand.proctoringTelemetry;
                const flags = telemetry?.flags || [];
                const tabSwitches = telemetry?.tabSwitchCount || 0;
                const copyAttempts = telemetry?.copyPasteAttempts || 0;
                const dbert = cand.dbertProfile;

                return (
                  <tr
                    key={cand.id}
                    style={{
                      background: isSelected ? 'rgba(232, 163, 76, 0.08)' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(cand.id)}
                        style={{ cursor: 'pointer', accentColor: '#e8a34c' }}
                      />
                    </td>

                    {/* Candidate Profile */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#fff8ee', fontSize: '13px' }}>{cand.userName}</div>
                      <div style={{ fontSize: '11px', color: '#889990', marginTop: '2px' }}>{cand.userEmail}</div>
                      {cand.phone && (
                        <div style={{ fontSize: '11px', color: 'var(--gold-lite)', marginTop: '2px' }}>
                          <a
                            href={`https://wa.me/91${cand.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#4caf50', textDecoration: 'none' }}
                          >
                            💬 +91 {cand.phone}
                          </a>
                        </div>
                      )}
                    </td>

                    {/* Track & Institution */}
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-amber" style={{ fontSize: '9px', display: 'inline-block', marginBottom: '4px' }}>
                        {cand.trackName}
                      </span>
                      <div style={{ fontSize: '11px', color: '#c9d6ce' }}>{cand.collegeName || 'Verified Institute'}</div>
                      <small style={{ color: '#889990' }}>Applied: {new Date(cand.appliedAt).toLocaleDateString()}</small>
                    </td>

                    {/* Score Bar */}
                    <td style={{ padding: '12px 16px' }}>
                      {score !== undefined && score !== null ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px', color: score >= 70 ? '#4caf50' : score >= 50 ? '#e8a34c' : '#ef4444' }}>
                              {score}/100
                            </strong>
                            <span style={{ fontSize: '9px', color: '#889990' }}>
                              {score >= 85 ? 'Distinction' : score >= 70 ? 'Qualified' : 'Unqualified'}
                            </span>
                          </div>
                          <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${score}%`, height: '100%', background: score >= 70 ? '#4caf50' : '#ef4444' }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#889990' }}>Not Taken</span>
                      )}
                    </td>

                    {/* Anti-Cheat Telemetry */}
                    <td style={{ padding: '12px 16px' }}>
                      {telemetry ? (
                        <div>
                          {tabSwitches === 0 && copyAttempts === 0 && flags.length === 0 ? (
                            <span className="badge badge-green" style={{ fontSize: '9px' }}>🛡️ Clean Session</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="badge badge-red" style={{ fontSize: '9px' }}>
                                🚨 {flags.length > 0 ? flags[0] : `${tabSwitches} Tab Switch(es)`}
                              </span>
                              {(tabSwitches > 0 || copyAttempts > 0) && (
                                <small style={{ color: '#ef4444', fontSize: '10px' }}>
                                  {tabSwitches > 0 && `Tabs: ${tabSwitches} `}
                                  {copyAttempts > 0 && `Copy/Paste: ${copyAttempts}`}
                                </small>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#889990' }}>Pending Session</span>
                      )}
                    </td>

                    {/* DBERT Readiness */}
                    <td style={{ padding: '12px 16px' }}>
                      {dbert ? (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            background: dbert.leadPropensity === 'HIGH' ? 'rgba(76, 175, 80, 0.15)' : dbert.leadPropensity === 'MODERATE' ? 'rgba(232, 163, 76, 0.15)' : 'rgba(255,255,255,0.06)',
                            color: dbert.leadPropensity === 'HIGH' ? '#4caf50' : dbert.leadPropensity === 'MODERATE' ? '#e8a34c' : '#889990',
                            border: '1px solid currentColor'
                          }}
                        >
                          {dbert.leadPropensity} LEAD
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#889990' }}>—</span>
                      )}
                    </td>

                    {/* Status & Offer Code */}
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className={`badge ${
                          cand.status === 'enrolled'
                            ? 'badge-green'
                            : cand.status === 'selected' || cand.status === 'offer_accepted'
                            ? 'badge-amber'
                            : cand.status === 'rejected'
                            ? 'badge-red'
                            : 'badge-outline'
                        }`}
                        style={{ fontSize: '9px', textTransform: 'uppercase' }}
                      >
                        {cand.status.replace('_', ' ')}
                      </span>
                      {cand.offerLetterId && (
                        <div style={{ fontSize: '10px', color: 'var(--gold-lite)', marginTop: '3px' }}>
                          <code>{cand.offerLetterId}</code>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => { setDrawerCandidate(cand); setDrawerTab('assessment'); }}
                        style={{ fontSize: '10px', minHeight: '30px', padding: '0 10px' }}
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── 6. INDUSTRIAL PAGINATION CONTROLS ── */}
        <div className="admin-pagination-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>
              Showing <b>{totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalRecords)}</b> of <b>{totalRecords}</b> candidates
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label htmlFor="admin-page-size-select" style={{ fontSize: '11px' }}>Per page:</label>
              <select
                id="admin-page-size-select"
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}
                style={{ background: '#111a14', border: '1px solid rgba(255,255,255,0.15)', color: '#f4ede0', borderRadius: '4px', padding: '4px 8px', fontSize: '11px' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="page-btn"
              onClick={() => fetchCandidates(1)}
              disabled={currentPage <= 1 || loading}
            >
              ⏮ First
            </button>
            <button
              type="button"
              className="page-btn"
              onClick={() => fetchCandidates(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
            >
              ◀ Prev
            </button>

            <span style={{ margin: '0 8px', color: '#fff8ee', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              className="page-btn"
              onClick={() => fetchCandidates(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              Next ▶
            </button>
            <button
              type="button"
              className="page-btn"
              onClick={() => fetchCandidates(totalPages)}
              disabled={currentPage >= totalPages || loading}
            >
              Last ⏭
            </button>
          </div>
        </div>
      </div>

      {/* ── 7. FLOATING STICKY BULK ACTION BAR ── */}
      {selectedIds.size > 0 && (
        <div className="admin-bulk-floating-bar">
          <span className="bulk-count-badge">
            ✓ {selectedIds.size} Candidate(s) Selected
          </span>

          <button
            type="button"
            className="button button-gold"
            onClick={() => executeBulkAction('approve_assessment')}
            disabled={bulkLoading}
            style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px' }}
          >
            🎓 Bulk Approve Assessment & Send Offer
          </button>

          <button
            type="button"
            className="button button-outline"
            onClick={() => executeBulkAction('verify_deposit')}
            disabled={bulkLoading}
            style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px', borderColor: '#4caf50', color: '#4caf50' }}
          >
            💳 Bulk Verify ₹499 Deposit & Admit
          </button>

          <button
            type="button"
            className="button button-outline"
            onClick={() => executeBulkAction('dispatch_invites')}
            disabled={bulkLoading}
            style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px' }}
          >
            📨 Bulk Dispatch Invites
          </button>

          <button
            type="button"
            className="button button-outline"
            onClick={() => {
              if (confirm(`Are you sure you want to decline ${selectedIds.size} candidate(s)?`)) {
                executeBulkAction('reject');
              }
            }}
            disabled={bulkLoading}
            style={{ fontSize: '11px', minHeight: '34px', padding: '0 14px', borderColor: '#ef4444', color: '#ef4444' }}
          >
            ❌ Bulk Reject
          </button>

          <button
            type="button"
            className="button button-outline"
            onClick={handleClearSelection}
            style={{ fontSize: '10px', minHeight: '32px', padding: '0 10px', color: '#889990' }}
          >
            Deselect All
          </button>
        </div>
      )}

      {/* ── 8. SLIDE-OVER CANDIDATE INSPECTION DRAWER ── */}
      {drawerCandidate && (
        <div className="admin-drawer-overlay" onClick={() => setDrawerCandidate(null)}>
          <div className="admin-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="drawer-header">
              <div>
                <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                  {drawerCandidate.trackName} · STAGE: {drawerCandidate.status.toUpperCase()}
                </span>
                <h3 style={{ margin: '6px 0 2px', fontSize: '18px', color: '#fff8ee' }}>
                  {drawerCandidate.userName}
                </h3>
                <div style={{ fontSize: '11px', color: '#889990' }}>
                  {drawerCandidate.userEmail} &bull; 🏛️ {drawerCandidate.collegeName || 'Verified Institute'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerCandidate(null)}
                style={{ background: 'none', border: 'none', color: '#889990', fontSize: '22px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
              <button
                type="button"
                className={`funnel-tab ${drawerTab === 'assessment' ? 'active' : ''}`}
                onClick={() => setDrawerTab('assessment')}
                style={{ flex: 1, borderRadius: 0, justifyContent: 'center' }}
              >
                1. Assessment & Answers
              </button>
              <button
                type="button"
                className={`funnel-tab ${drawerTab === 'telemetry' ? 'active' : ''}`}
                onClick={() => setDrawerTab('telemetry')}
                style={{ flex: 1, borderRadius: 0, justifyContent: 'center' }}
              >
                2. Anti-Cheat Audit
              </button>
              <button
                type="button"
                className={`funnel-tab ${drawerTab === 'deposit' ? 'active' : ''}`}
                onClick={() => setDrawerTab('deposit')}
                style={{ flex: 1, borderRadius: 0, justifyContent: 'center' }}
              >
                3. ₹499 Deposit UTR
              </button>
              <button
                type="button"
                className={`funnel-tab ${drawerTab === 'dbert' ? 'active' : ''}`}
                onClick={() => setDrawerTab('dbert')}
                style={{ flex: 1, borderRadius: 0, justifyContent: 'center' }}
              >
                4. DBERT Commercial
              </button>
            </div>

            {/* Drawer Body */}
            <div className="drawer-body">
              {drawerTab === 'assessment' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', marginBottom: '18px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#889990' }}>Assessment Score</span>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: (drawerCandidate.interviewScore || 0) >= 70 ? '#4caf50' : '#ef4444' }}>
                        {drawerCandidate.interviewScore !== undefined ? `${drawerCandidate.interviewScore}/100 Pts` : 'Not Completed'}
                      </div>
                    </div>
                    <div>
                      <span className={`badge ${(drawerCandidate.interviewScore || 0) >= 70 ? 'badge-green' : 'badge-amber'}`}>
                        {(drawerCandidate.interviewScore || 0) >= 70 ? 'Qualified for Selection' : 'Under Review'}
                      </span>
                    </div>
                  </div>

                  <h4 style={{ color: '#fff8ee', margin: '0 0 12px', fontSize: '13px' }}>Candidate Response Scenarios</h4>
                  {drawerCandidate.interviewAnswers ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {Object.entries(drawerCandidate.interviewAnswers).map(([qId, ansId], idx) => (
                        <div key={qId} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '12px' }}>
                          <span style={{ fontSize: '10px', color: '#889990' }}>Scenario {idx + 1} ({qId})</span>
                          <div style={{ fontWeight: 600, color: '#fff8ee', marginTop: '3px' }}>Selected Answer: <code>{String(ansId)}</code></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#889990', fontSize: '12px' }}>Candidate has not completed assessment scenarios yet.</p>
                  )}
                </div>
              )}

              {drawerTab === 'telemetry' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#889990' }}>Tab Switches Detected</span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: (drawerCandidate.proctoringTelemetry?.tabSwitchCount || 0) > 0 ? '#ef4444' : '#4caf50' }}>
                        {drawerCandidate.proctoringTelemetry?.tabSwitchCount || 0}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#889990' }}>Clipboard / Paste Attempts</span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: (drawerCandidate.proctoringTelemetry?.copyPasteAttempts || 0) > 0 ? '#ef4444' : '#4caf50' }}>
                        {drawerCandidate.proctoringTelemetry?.copyPasteAttempts || 0}
                      </div>
                    </div>
                  </div>

                  <h4 style={{ color: '#fff8ee', margin: '0 0 8px', fontSize: '13px' }}>Proctoring Telemetry Audit Log</h4>
                  {drawerCandidate.proctoringTelemetry?.flags && drawerCandidate.proctoringTelemetry.flags.length > 0 ? (
                    <ul style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '14px 20px', borderRadius: '6px', color: '#f4ede0', fontSize: '12px' }}>
                      {drawerCandidate.proctoringTelemetry.flags.map((flag, i) => (
                        <li key={i} style={{ marginBottom: '4px' }}>{flag}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.3)', padding: '14px', borderRadius: '6px', color: '#4caf50', fontSize: '12px' }}>
                      ✓ Clean session audit. Zero proctoring anomalies or clipboard violations detected.
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'deposit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* UTR / Transaction Card */}
                  <div style={{ background: 'rgba(232, 163, 76, 0.08)', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#e8a34c', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                        {drawerCandidate.utrNumber ? '✓ 12-Digit UPI Transaction UTR' : '⏳ Security Deposit Status'}
                      </span>
                      {drawerCandidate.utrNumber ? (
                        <span className="badge badge-amber" style={{ fontSize: '9px' }}>PENDING RECONCILIATION</span>
                      ) : (
                        <span className="badge badge-outline" style={{ fontSize: '9px', color: '#889990' }}>AWAITING CANDIDATE UTR</span>
                      )}
                    </div>

                    {drawerCandidate.utrNumber ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(232, 163, 76, 0.2)' }}>
                        <code style={{ fontSize: '18px', fontWeight: 800, color: '#e8a34c', letterSpacing: '1px' }}>
                          {drawerCandidate.utrNumber}
                        </code>
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={() => {
                            if (drawerCandidate.utrNumber) {
                              navigator.clipboard.writeText(drawerCandidate.utrNumber);
                              showToast(`Copied UTR: ${drawerCandidate.utrNumber}`);
                            }
                          }}
                          style={{ minHeight: '26px', fontSize: '9px', padding: '0 8px' }}
                        >
                          📋 Copy UTR
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.15)' }}>
                        <div style={{ fontSize: '13px', color: '#c9d6ce', fontWeight: 600 }}>No reference submitted yet</div>
                        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#889990', lineHeight: 1.4 }}>
                          The candidate has completed Step 1 (Signed the Offer Letter), but has not yet scanned the UPI QR code or entered their 12-digit transaction UTR on the offer portal.
                        </p>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', fontSize: '11px', color: '#c9d6ce' }}>
                      <div>
                        <span style={{ color: '#889990', fontSize: '10px', display: 'block' }}>Deposit Receipt ID</span>
                        <code style={{ color: '#fff8ee' }}>{drawerCandidate.depositReceipt || 'VP-VER-PENDING'}</code>
                      </div>
                      <div>
                        <span style={{ color: '#889990', fontSize: '10px', display: 'block' }}>Deposit Amount</span>
                        <strong style={{ color: '#4caf50' }}>₹499 INR (100% Refundable)</strong>
                      </div>
                      <div>
                        <span style={{ color: '#889990', fontSize: '10px', display: 'block' }}>Payment Method</span>
                        <span>UPI QR Code (vayanai@icici)</span>
                      </div>
                      <div>
                        <span style={{ color: '#889990', fontSize: '10px', display: 'block' }}>Submission Timestamp</span>
                        <span>{drawerCandidate.depositPaidAt ? new Date(drawerCandidate.depositPaidAt).toLocaleString() : 'Not Yet Submitted'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Offer Acceptance Details Card */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f4ede0', marginBottom: '8px' }}>
                      📜 Step 1 Digital Offer Letter Acceptance
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#c9d6ce' }}>
                      <div>
                        <span style={{ color: '#889990', fontSize: '10px', display: 'block' }}>Offer Letter ID</span>
                        <code style={{ color: '#e8a34c' }}>{drawerCandidate.offerLetterId || 'Unissued'}</code>
                      </div>
                      <div>
                        <span style={{ color: '#889990', fontSize: '10px', display: 'block' }}>Digitally Signed As</span>
                        <strong style={{ color: '#fff8ee' }}>{drawerCandidate.signatureName || drawerCandidate.userName}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#889990', fontSize: '10px', display: 'block' }}>Signature Timestamp</span>
                        <span>{drawerCandidate.offerAcceptedAt ? new Date(drawerCandidate.offerAcceptedAt).toLocaleString() : 'Pending Signature'}</span>
                      </div>
                      <div>
                        <span style={{ color: '#889990', fontSize: '10px', display: 'block' }}>Offer Preview</span>
                        {drawerCandidate.magicToken ? (
                          <a
                            href={`/intern/offer?token=${drawerCandidate.magicToken}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#e8a34c', textDecoration: 'none', fontSize: '11px', fontWeight: 600 }}
                          >
                            🔗 View Offer Page ↗
                          </a>
                        ) : (
                          <span style={{ color: '#889990' }}>Token not generated</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bank Statement Verification Guide */}
                  <div style={{ background: 'rgba(20, 30, 24, 0.5)', border: '1px solid rgba(76, 175, 80, 0.25)', borderRadius: '8px', padding: '12px', fontSize: '11px', color: '#c9d6ce' }}>
                    <strong style={{ color: '#4caf50', display: 'block', marginBottom: '4px' }}>🛡️ Reconciliation Verification Guide:</strong>
                    Check your ICICI / DBERT banking statement or UPI merchant settlement feed for a credit of <b>₹499.00</b> matching UTR reference <code>{drawerCandidate.utrNumber || '12-digit number'}</code> or account of <b>{drawerCandidate.userName}</b>.
                  </div>

                  {/* Action Controls for Admin */}
                  {drawerCandidate.status === 'enrolled' || drawerCandidate.status === 'completed' ? (
                    <div style={{ background: 'rgba(76, 175, 80, 0.15)', border: '1px solid rgba(76, 175, 80, 0.4)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                      <span style={{ color: '#4caf50', fontWeight: 700, fontSize: '13px' }}>
                        ✓ Deposit Reconciled & Admitted to Cohort
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#c9d6ce' }}>
                        The candidate is active in the 90-day internship sprint. Official signed PDF download is unlocked.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="button button-gold"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/v1/portal/admin/interns/verify-deposit', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                candidateId: drawerCandidate.id,
                                id: drawerCandidate.id,
                                applicationId: drawerCandidate.id,
                                action: 'approve'
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              showToast(`✓ Deposit reconciled! ${drawerCandidate.userName} is now enrolled.`);
                              setDrawerCandidate(null);
                              fetchCandidates(currentPage);
                            } else {
                              showToast(data.error || 'Failed to verify deposit.');
                            }
                          } catch (e: any) {
                            showToast(e.message);
                          }
                        }}
                        style={{ width: '100%', minHeight: '38px', fontSize: '11px', fontWeight: 700 }}
                      >
                        ✓ Verify Bank Match & Unlock Stage 5 Workspace
                      </button>

                      {drawerCandidate.utrNumber && (
                        <button
                          type="button"
                          className="button button-outline"
                          onClick={async () => {
                            const reason = window.prompt('Enter reason for rejecting this UTR (candidate will be asked to re-submit):', 'Transaction reference does not match bank settlement records.');
                            if (reason === null) return;
                            try {
                              const res = await fetch('/api/v1/portal/admin/interns/verify-deposit', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  candidateId: drawerCandidate.id,
                                  id: drawerCandidate.id,
                                  applicationId: drawerCandidate.id,
                                  action: 'reject',
                                  reason
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                showToast(`Rejected UTR for ${drawerCandidate.userName}. Status reverted.`);
                                setDrawerCandidate(null);
                                fetchCandidates(currentPage);
                              } else {
                                showToast(data.error || 'Failed to reject deposit.');
                              }
                            } catch (e: any) {
                              showToast(e.message);
                            }
                          }}
                          style={{ width: '100%', minHeight: '30px', fontSize: '10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                        >
                          ✕ Reject Unmatched / Invalid UTR
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'dbert' && (
                <div>
                  {drawerCandidate.dbertProfile ? (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span className="badge badge-gold">{drawerCandidate.dbertProfile.leadPropensity} LEAD PROPENSITY</span>
                        <span style={{ fontSize: '11px', color: '#889990' }}>Urgency: {drawerCandidate.dbertProfile.urgencyLevel}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#fff8ee', lineHeight: 1.5 }}>
                        <b>Counselor Strategy:</b> {drawerCandidate.dbertProfile.counselorPitchGuide}
                      </p>
                    </div>
                  ) : (
                    <p style={{ color: '#889990', fontSize: '12px' }}>DBERT commercial lead intelligence profile not available.</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="drawer-footer">
              {drawerCandidate.status === 'interview_completed' && (
                <button
                  type="button"
                  className="button button-gold"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/v1/portal/admin/interns/approve-assessment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ applicationId: drawerCandidate.id, action: 'approve' })
                      });
                      const data = await res.json();
                      if (data.success) {
                        showToast('Candidate approved & offer letter dispatched!');
                        setDrawerCandidate(null);
                        fetchCandidates(currentPage);
                      } else {
                        showToast(data.error || 'Failed to approve.');
                      }
                    } catch (e: any) {
                      showToast(e.message);
                    }
                  }}
                  style={{ fontSize: '11px' }}
                >
                  🎓 Approve Assessment & Dispatch Offer Email
                </button>
              )}

              <button
                type="button"
                className="button button-outline"
                onClick={() => setDrawerCandidate(null)}
                style={{ fontSize: '11px' }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
