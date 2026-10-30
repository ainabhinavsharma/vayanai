'use client';

import React, { useState } from 'react';
import { PartnerInquiry } from '@/types/portal';

interface PartnerDashboardProps {
  inquiries: PartnerInquiry[];
  onSubmitQuote: (inquiryId: string, quoteINR: number, quoteNotes: string) => void;
  onOpenChat: (travelerName: string) => void;
}

export function PartnerDashboard({ inquiries, onSubmitQuote, onOpenChat }: PartnerDashboardProps) {
  const [selectedInquiry, setSelectedInquiry] = useState<PartnerInquiry | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<string>('28000');
  const [quoteNotes, setQuoteNotes] = useState<string>('');

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !quoteAmount) return;
    onSubmitQuote(selectedInquiry.id, Number(quoteAmount), quoteNotes);
    setSelectedInquiry(null);
    setQuoteNotes('');
  };

  const newCount = inquiries.filter((i) => i.status === 'new').length;
  const quotedCount = inquiries.filter((i) => i.status === 'quoted').length;

  return (
    <div className="partner-dashboard">
      <div className="partner-header-card">
        <div className="partner-badge-row">
          <span className="badge badge-green">✓ VERIFIED LOCAL HOST</span>
          <span className="partner-region-tag">Meghalaya · East Khasi Hills</span>
        </div>
        <h2>Sohra Indigenous Stays Collective</h2>
        <p>Manage incoming traveler planning briefs, submit transparent quotes, and message travelers.</p>
      </div>

      <div className="portal-metrics-row">
        <div className="metric-box">
          <span className="metric-val">{newCount}</span>
          <span className="metric-lbl">New Traveler Briefs</span>
        </div>
        <div className="metric-box">
          <span className="metric-val">{quotedCount}</span>
          <span className="metric-lbl">Active Quotes</span>
        </div>
        <div className="metric-box">
          <span className="metric-val">100%</span>
          <span className="metric-lbl">Verified Authenticity</span>
        </div>
      </div>

      <div className="inquiries-section">
        <div className="section-title-row">
          <h3>Incoming Traveler Planning Briefs</h3>
          <span>Direct Match from Vayu Engine</span>
        </div>

        <div className="inquiries-grid">
          {inquiries.map((inq) => (
            <div key={inq.id} className="inquiry-card">
              <div className="inquiry-header">
                <div>
                  <h4>{inq.travelerName}</h4>
                  <small>From {inq.origin} · {inq.party}</small>
                </div>
                <span className={`status-pill ${inq.status === 'new' ? 'status-new' : 'status-quoted'}`}>
                  {inq.status.toUpperCase()}
                </span>
              </div>

              <div className="inquiry-details">
                <p><b>Target Dates:</b> {inq.dates}</p>
                <div className="tags-wrap">
                  {inq.specialRequests.map((req, i) => (
                    <span key={i} className="pref-tag">{req}</span>
                  ))}
                </div>
              </div>

              {inq.status === 'quoted' && inq.quoteINR && (
                <div className="quoted-box">
                  <span>Current Quote: <b>₹{inq.quoteINR.toLocaleString('en-IN')}</b></span>
                  <small>{inq.quoteNotes}</small>
                </div>
              )}

              <div className="inquiry-actions">
                <button
                  type="button"
                  className="button button-gold"
                  style={{ minHeight: '34px', fontSize: '9px' }}
                  onClick={() => {
                    setSelectedInquiry(inq);
                    setQuoteAmount(inq.quoteINR ? String(inq.quoteINR) : '28000');
                    setQuoteNotes(inq.quoteNotes || 'Includes cottage stay, morning farm breakfast & verified transfers.');
                  }}
                >
                  {inq.status === 'quoted' ? 'Update Quote ↗' : 'Send Transparent Quote ↗'}
                </button>
                <button
                  type="button"
                  className="button button-outline"
                  style={{ minHeight: '34px', fontSize: '9px' }}
                  onClick={() => onOpenChat(inq.travelerName)}
                >
                  Open Chat 💬
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedInquiry && (
        <div className="portal-modal-backdrop">
          <div className="portal-modal-card">
            <h3>Submit Custom Quote for {selectedInquiry.travelerName}</h3>
            <p>Enter the complete, transparent quote in INR with all inclusions disclosed.</p>
            <form onSubmit={handleQuoteSubmit}>
              <div className="form-field" style={{ margin: '14px 0' }}>
                <label className="field-label">Total Quote (₹ INR)</label>
                <input
                  type="number"
                  className="portal-input"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-field" style={{ margin: '14px 0' }}>
                <label className="field-label">Inclusions & Stay Notes</label>
                <textarea
                  rows={3}
                  className="portal-textarea"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="e.g. 5 nights in ground floor cottage, breakfast included, step-free access verified."
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="button button-gold">Submit Quote ↗</button>
                <button type="button" className="button button-outline" onClick={() => setSelectedInquiry(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
