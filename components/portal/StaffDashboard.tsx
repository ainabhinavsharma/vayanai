'use client';

import React, { useState } from 'react';
import { StaffLead, InternApplication } from '@/types/auth';
import { Certificate } from '@/types/certificates';
import { useToast } from '@/components/ui/Toast';

interface StaffDashboardProps {
  initialLeads?: StaffLead[];
  initialInterns?: InternApplication[];
  initialCertificates?: Certificate[];
  initialMetrics?: {
    activeLeads: number;
    verifiedOnboardedPartners: number;
    totalInternCandidates: number;
    depositsCollected: number;
    totalDepositRevenueINR: number;
  };
}

export function StaffDashboard({
  initialLeads = [],
  initialInterns = [],
  initialCertificates = [],
  initialMetrics
}: StaffDashboardProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'interns' | 'credentials'>('pipeline');
  const [leads, setLeads] = useState<StaffLead[]>(
    initialLeads.length > 0
      ? initialLeads
      : [
          {
            id: 'lead-01',
            bdaUserId: 'usr-staff-04',
            leadName: 'Cherrapunji Forest Village Collective',
            leadType: 'homestay_partner',
            region: 'Meghalaya',
            contactInfo: 'Kong Mary · +91 94361 XXXXX',
            pipelineStage: 'discovery',
            estimatedValueINR: 180000,
            notes: 'Auditing 4 step-free cottages with natural rainwater filtration.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'lead-02',
            bdaUserId: 'usr-staff-04',
            leadName: 'Munro Island Canoe Guild',
            leadType: 'tour_collective',
            region: 'Kerala',
            contactInfo: 'Sunil Kumar · +91 94470 XXXXX',
            pipelineStage: 'outreach',
            estimatedValueINR: 125000,
            notes: 'Electric/manual country boats without diesel engine noise.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
  );

  const [interns, setInterns] = useState<InternApplication[]>(
    initialInterns.length > 0
      ? initialInterns
      : [
          {
            id: 'app-01',
            userId: 'usr-intern-05',
            userName: 'Ananya Ghosh',
            userEmail: 'ananya.intern@example.com',
            trackName: 'Sustainable Regional Operations & Growth Intern',
            status: 'selected',
            interviewScore: 100,
            depositReceipt: 'VP-VER-2026-8821',
            appliedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
  );

  const [certificates] = useState<Certificate[]>(
    initialCertificates.length > 0
      ? initialCertificates
      : [
          {
            id: 'cert-seed-01',
            certificateId: 'CERT-VAY-2026-SO-001',
            internId: 'VAY-INT-AG-2345-001',
            internName: 'Ananya Ghosh',
            internEmail: 'ananya.intern@example.com',
            domain: 'Sustainable Regional Operations & Growth',
            topicsCovered: 'Homestay Auditing, Pacing Protocols, Partner Integrity',
            projectName: 'Northeast Meghalaya Community Homestays Audit',
            mentorName: 'Rohit Sen',
            mentorRole: 'Senior BDA Lead & Regional Supervisor',
            joiningDate: '10 January 2026',
            completionDate: '10 March 2026',
            issueDate: '12 March 2026',
            qrPayloadUrl: 'https://vayanai.in.net/verify?certid=CERT-VAY-2026-SO-001',
            status: 'active',
            issuingAuthority: 'DBERT Technical Council & Vayanai Operations Platform',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'cert-seed-02',
            certificateId: 'CERT-DBERT-2025-AI-014',
            internId: 'DBERT-INT-RK-4501-014',
            internName: 'Rahul Kulkarni',
            internEmail: 'rahul.kulkarni@example.com',
            domain: 'AI Agent Development',
            topicsCovered: 'Prompt Engineering, Autonomous Agents, RAG Pipelines',
            projectName: 'Alkame — AI Market Intelligence Engine',
            mentorName: 'Sarita Bansal',
            mentorRole: 'Program Head, DBERT Technical Council',
            joiningDate: '01 November 2025',
            completionDate: '01 January 2026',
            issueDate: '05 January 2026',
            qrPayloadUrl: 'https://vayanai.in.net/verify?certid=CERT-DBERT-2025-AI-014',
            status: 'active',
            issuingAuthority: 'DBERT Technical Council & Vayanai Operations Platform',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
  );

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newRegion, setNewRegion] = useState('Meghalaya');
  const [newContactInfo, setNewContactInfo] = useState('');
  const [newEstimatedValue, setNewEstimatedValue] = useState('150000');
  const [newNotes, setNewNotes] = useState('');

  const metrics = initialMetrics || {
    activeLeads: leads.length,
    verifiedOnboardedPartners: leads.filter((l) => l.pipelineStage === 'verified_onboard').length,
    totalInternCandidates: interns.length,
    depositsCollected: interns.filter((i) => i.depositReceipt || i.status === 'onboarded' || i.status === 'deposit_paid').length,
    totalDepositRevenueINR: interns.filter((i) => i.depositReceipt || i.status === 'onboarded' || i.status === 'deposit_paid').length * 499
  };

  const handleAdvanceStage = async (leadId: string, currentStage: StaffLead['pipelineStage']) => {
    const nextStage = currentStage === 'outreach' ? 'discovery' : 'verified_onboard';

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, pipelineStage: nextStage } : l))
    );

    try {
      await fetch('/api/v1/staff/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_stage', leadId, stage: nextStage })
      });
    } catch {
      // offline fallback
    }

    showToast(`Lead advanced to ${nextStage.replace('_', ' ').toUpperCase()}`);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newContactInfo) return;

    const newLead: StaffLead = {
      id: `lead-${Date.now()}`,
      bdaUserId: 'usr-staff-04',
      leadName: newLeadName,
      leadType: 'homestay_partner',
      region: newRegion,
      contactInfo: newContactInfo,
      pipelineStage: 'outreach',
      estimatedValueINR: Number(newEstimatedValue) || 0,
      notes: newNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLeads([newLead, ...leads]);
    setShowAddLeadModal(false);
    setNewLeadName('');
    setNewContactInfo('');
    setNewNotes('');

    try {
      await fetch('/api/v1/staff/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
    } catch {
      // offline fallback
    }

    showToast('New partner lead registered in BDA pipeline.');
  };

  return (
    <div className="staff-dashboard-panel">
      {/* Top Banner */}
      <div className="panel-heading">
        <div>
          <div className="eyebrow eyebrow-muted">
            <i></i> BUSINESS DEVELOPMENT & PARTNERSHIPS
          </div>
          <h2>Staff Operations <em>Command</em></h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowAddLeadModal(true)}
          >
            + Register Partner Lead
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="bda-metrics-grid">
        <div className="bda-metric-card">
          <span className="metric-tag">ACTIVE LEADS</span>
          <b>{metrics.activeLeads}</b>
          <small>Partner Outreach Pipeline</small>
        </div>
        <div className="bda-metric-card">
          <span className="metric-tag">VERIFIED HOMESTAYS</span>
          <b>{metrics.verifiedOnboardedPartners}</b>
          <small>Onboarded to Platform</small>
        </div>
        <div className="bda-metric-card">
          <span className="metric-tag">INTERN CANDIDATES</span>
          <b>{metrics.totalInternCandidates}</b>
          <small>Assessment Applications</small>
        </div>
        <div className="bda-metric-card">
          <span className="metric-tag">COHORT ENROLLMENTS</span>
          <b>{metrics.depositsCollected}</b>
          <small>Verified Cohort Seats</small>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="notif-filter-bar" style={{ marginTop: '24px' }}>
        <button
          type="button"
          className={`notif-filter-pill ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          🏡 Partner Outreach Pipeline ({leads.length})
        </button>
        <button
          type="button"
          className={`notif-filter-pill ${activeTab === 'interns' ? 'active' : ''}`}
          onClick={() => setActiveTab('interns')}
        >
          🎓 Intern Candidate Reviews ({interns.length})
        </button>
        <button
          type="button"
          className={`notif-filter-pill ${activeTab === 'credentials' ? 'active' : ''}`}
          onClick={() => setActiveTab('credentials')}
        >
          📜 Issued Credentials Registry ({certificates.length})
        </button>
      </div>

      {/* TAB 1: Partner Pipeline */}
      {activeTab === 'pipeline' && (
        <div className="bda-pipeline-table-card">
          <div className="leads-list">
            {leads.map((lead) => (
              <div key={lead.id} className="lead-row-card">
                <div className="lead-info-col">
                  <div className="lead-topline">
                    <b>{lead.leadName}</b>
                    <span className="lead-region-tag">{lead.region}</span>
                    <span className={`lead-stage-badge stage-${lead.pipelineStage}`}>
                      {lead.pipelineStage.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="lead-contact">📞 {lead.contactInfo}</p>
                  {lead.notes && <p className="lead-note">📝 {lead.notes}</p>}
                </div>

                <div className="lead-action-col">
                  {lead.estimatedValueINR && (
                    <span className="lead-val">₹{lead.estimatedValueINR.toLocaleString('en-IN')}</span>
                  )}
                  {lead.pipelineStage !== 'verified_onboard' ? (
                    <button
                      type="button"
                      className="small-action"
                      onClick={() => handleAdvanceStage(lead.id, lead.pipelineStage)}
                    >
                      {lead.pipelineStage === 'outreach' ? 'Mark Discovery →' : 'Complete Vetting ✓'}
                    </button>
                  ) : (
                    <span className="verified-check">✓ Fully Onboarded</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Intern Review Queue */}
      {activeTab === 'interns' && (
        <div className="intern-reviews-card">
          <div className="leads-list">
            {interns.map((intern) => (
              <div key={intern.id} className="lead-row-card">
                <div className="lead-info-col">
                  <div className="lead-topline">
                    <b>{intern.userName}</b>
                    <span className="lead-region-tag">{intern.trackName}</span>
                    <span className={`lead-stage-badge stage-${intern.status}`}>
                      {intern.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="lead-contact">✉️ {intern.userEmail}</p>
                  <p className="lead-note">
                    Assessment Score: <b>{intern.interviewScore ? `${intern.interviewScore} / 100` : 'Pending'}</b> |
                    Enrollment Ref: <b>{intern.depositReceipt || 'Pending Verification'}</b>
                  </p>
                </div>

                <div className="lead-action-col">
                  <span className={`intern-deposit-tag ${intern.depositReceipt ? 'paid' : 'pending'}`}>
                    {intern.depositReceipt ? '✓ Enrollment Verified' : 'Awaiting Verification'}
                  </span>
                  <button
                    type="button"
                    className="small-action"
                    onClick={() => showToast(`Candidate ${intern.userName} profile inspected.`)}
                  >
                    View Assessment Details ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Issued Credentials Registry */}
      {activeTab === 'credentials' && (
        <div className="bda-pipeline-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h4 style={{ margin: 0, font: '500 18px var(--serif)', color: 'var(--paper)' }}>
                Official Verified Credentials Registry
              </h4>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: 'var(--muted)' }}>
                Tamper-evident scannable certificates issued across past and active cohorts.
              </p>
            </div>
            <a
              href="/verify"
              target="_blank"
              rel="noreferrer"
              className="secondary-btn"
              style={{ fontSize: '9px', textDecoration: 'none' }}
            >
              Open Public Verification Engine ↗
            </a>
          </div>

          <div className="leads-list">
            {certificates.map((cert) => (
              <div key={cert.id} className="lead-row-card">
                <div className="lead-info-col">
                  <div className="lead-topline">
                    <b>{cert.internName}</b>
                    <span className="lead-region-tag" style={{ background: 'rgba(35, 134, 54, 0.2)', color: '#7ee787', borderColor: '#238636' }}>
                      {cert.certificateId}
                    </span>
                  </div>
                  <small style={{ color: 'var(--gold-lite)', display: 'block', margin: '4px 0' }}>
                    Track: {cert.domain} • Project: {cert.projectName}
                  </small>
                  <p style={{ margin: 0, fontSize: '9px', color: 'var(--muted)' }}>
                    Intern ID: {cert.internId} • Supervisor: {cert.mentorName} ({cert.mentorRole})
                  </p>
                  <small style={{ color: '#88998b', display: 'block', marginTop: '2px' }}>
                    Tenure: {cert.joiningDate} to {cert.completionDate} • Issued: {cert.issueDate}
                  </small>
                </div>

                <div className="lead-actions-col">
                  <span className="intern-deposit-tag paid">
                    ✓ Verified Active
                  </span>
                  <a
                    href={`/verify?certid=${cert.certificateId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="small-action"
                    style={{ textAlign: 'center', textDecoration: 'none' }}
                  >
                    View QR Verification ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register Lead Modal */}
      {showAddLeadModal && (
        <div className="portal-modal-backdrop" onClick={() => setShowAddLeadModal(false)}>
          <div className="portal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>Register Partner Lead</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddLeadModal(false)}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 16px' }}>
              Add a regional homestay, eco-guide collective, or travel community lead to your outreach pipeline.
            </p>

            <form onSubmit={handleCreateLead} className="journal-form">
              <div className="field-group">
                <label>Host / Property / Collective Name</label>
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="e.g. Nongriat River Living Stays"
                  required
                  className="journal-input"
                />
              </div>

              <div className="form-row-2">
                <div className="field-group">
                  <label>Region</label>
                  <select
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    className="journal-input"
                  >
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Rajasthan">Rajasthan</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>Estimated Booking Volume (INR)</label>
                  <input
                    type="number"
                    value={newEstimatedValue}
                    onChange={(e) => setNewEstimatedValue(e.target.value)}
                    className="journal-input"
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Contact Person & Phone / WhatsApp</label>
                <input
                  type="text"
                  value={newContactInfo}
                  onChange={(e) => setNewContactInfo(e.target.value)}
                  placeholder="e.g. Bah John · +91 98620 XXXXX"
                  required
                  className="journal-input"
                />
              </div>

              <div className="field-group">
                <label>Discovery Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Verified organic farm breakfast, step-free valley overlook, natural spring water..."
                  className="journal-input"
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddLeadModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Add to BDA Pipeline ↗
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
