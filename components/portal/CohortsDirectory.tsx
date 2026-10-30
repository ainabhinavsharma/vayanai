'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { TravelCohort } from '@/types/portal';
import { useToast } from '@/components/ui/Toast';

interface CohortsDirectoryProps {
  initialCohorts: TravelCohort[];
  onRequestJoin: (cohortId: string, travelerName: string, travelerEmail: string, note?: string) => void;
}

export function CohortsDirectory({ initialCohorts, onRequestJoin }: CohortsDirectoryProps) {
  const [cohorts, setCohorts] = useState<TravelCohort[]>(initialCohorts);
  const [selectedCohort, setSelectedCohort] = useState<TravelCohort | null>(null);
  const [travelerName, setTravelerName] = useState('Aarav Sharma');
  const [travelerEmail, setTravelerEmail] = useState('aarav.traveler@example.com');
  const [note, setNote] = useState('');
  const { showToast } = useToast();

  const handleOpenJoin = (cohort: TravelCohort) => {
    setSelectedCohort(cohort);
  };

  const handleSubmitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort) return;

    if (!travelerName || !travelerEmail) {
      showToast('Please provide your name and email address.');
      return;
    }

    onRequestJoin(selectedCohort.id, travelerName, travelerEmail, note);

    // Update local state seat count
    setCohorts((prev) =>
      prev.map((c) => {
        if (c.id === selectedCohort.id) {
          const newSeats = Math.max(0, c.availableSeats - 1);
          return {
            ...c,
            availableSeats: newSeats,
            status: newSeats === 0 ? 'waitlist' : c.status
          };
        }
        return c;
      })
    );

    setSelectedCohort(null);
    setNote('');
    showToast(`Seat inquiry registered for ${selectedCohort.title}!`);
  };

  return (
    <div className="cohorts-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow eyebrow-muted">
            <i></i> CURATED SMALL DEPARTURES
          </div>
          <h2>Small-Group <em>Travel Cohorts</em></h2>
        </div>
      </div>

      <p className="cohorts-intro">
        Join vetted small-group departures (4 to 8 travellers max) guided by verified indigenous hosts.
        Ideal for solo travellers and couples looking for shared vehicle logistics, slow pacing, and local expertise.
      </p>

      <div className="cohorts-grid">
        {cohorts.map((cohort) => (
          <div key={cohort.id} className="cohort-card">
            <div className="cohort-image-wrap">
              <Image
                src={cohort.hostImage}
                alt={cohort.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                style={{ objectFit: 'cover' }}
              />
              <span className={`cohort-status-tag status-${cohort.status}`}>
                {cohort.status === 'almost_full' ? 'ALMOST FULL' : cohort.status === 'open' ? 'SEATS AVAILABLE' : 'WAITLIST ONLY'}
              </span>
              <div className="cohort-seats-badge">
                {cohort.availableSeats > 0 ? `${cohort.availableSeats} of ${cohort.totalSeats} seats open` : 'Fully Booked'}
              </div>
            </div>

            <div className="cohort-content">
              <div className="cohort-header-line">
                <span className="cohort-region">{cohort.destination.toUpperCase()}</span>
                <span className="cohort-dates">{cohort.dates}</span>
              </div>

              <h3 className="cohort-title">{cohort.title}</h3>
              <p className="cohort-focus">{cohort.focus}</p>

              <div className="cohort-host-box">
                <span className="host-icon">🏡</span>
                <div>
                  <b>{cohort.hostName}</b>
                  <small>{cohort.hostCategory}</small>
                </div>
              </div>

              <div className="cohort-highlights">
                <b>Cohort Inclusions:</b>
                <ul>
                  {cohort.highlights.map((h, idx) => (
                    <li key={idx}>
                      <span className="cohort-bullet">✦</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="cohort-footer-strip">
                <div className="cohort-cost">
                  <small>Estimated per person</small>
                  <b>₹{cohort.estimatedCostINR.toLocaleString('en-IN')}</b>
                </div>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleOpenJoin(cohort)}
                  disabled={cohort.availableSeats <= 0}
                  style={{ opacity: cohort.availableSeats <= 0 ? 0.5 : 1 }}
                >
                  {cohort.availableSeats > 0 ? 'Request to Join ↗' : 'Join Waitlist'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Join Request Modal */}
      {selectedCohort && (
        <div className="portal-modal-backdrop" onClick={() => setSelectedCohort(null)}>
          <div className="portal-modal-card cohort-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <h3>Request Seat in Cohort</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedCohort(null)}
              >
                ✕
              </button>
            </div>

            <p style={{ marginBottom: '16px' }}>
              You are requesting a seat for <b>{selectedCohort.title}</b> ({selectedCohort.dates}).
            </p>

            <form onSubmit={handleSubmitJoin} className="journal-form">
              <div className="field-group">
                <label>Your Name</label>
                <input
                  type="text"
                  value={travelerName}
                  onChange={(e) => setTravelerName(e.target.value)}
                  required
                  className="journal-input"
                />
              </div>

              <div className="field-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  value={travelerEmail}
                  onChange={(e) => setTravelerEmail(e.target.value)}
                  required
                  className="journal-input"
                />
              </div>

              <div className="field-group">
                <label>Special Requests or Dietary Notes (Optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Vegetarian diet, step-free vehicle preference, solo traveller..."
                  className="journal-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSelectedCohort(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Submit Seat Request ↗
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
