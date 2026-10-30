'use client';

import React from 'react';
import { NextStepAction, LocalImpactLedger } from '@/types/portal';
import { NextStepCard } from './NextStepCard';
import { LocalImpactCard } from './LocalImpactCard';
import { RouteDetail } from '@/types';

interface TravelerOverviewProps {
  route: RouteDetail;
  nextStep: NextStepAction;
  impactLedger?: LocalImpactLedger;
  onNavigateTab: (tab: string) => void;
  weatherSummary?: string;
}

export function TravelerOverview({
  route,
  nextStep,
  impactLedger,
  onNavigateTab,
  weatherSummary = '18°C – 24°C · Clearing Mountain Showers'
}: TravelerOverviewProps) {
  const defaultLedger: LocalImpactLedger = impactLedger || {
    routeKey: 'meghalaya',
    destinationName: 'Meghalaya Cloud Valleys',
    localSpendRetentionPercent: 88,
    treesOffsetEstimated: 14,
    plasticAvoidedKg: 18,
    partnerVillagesSupported: ['Sohra', 'Tyrna', 'Mawlynnong', 'Nongriat'],
    communityPledge: 'Community forest restoration levy included in homestay fee; 88% of travel expenditure is paid directly to Khasi homestay owners and village guides.'
  };

  return (
    <div className="traveler-overview">
      <div className="portal-hero-banner">
        <div className="portal-hero-left">
          <div className="portal-avatar-circle">AS</div>
          <div className="portal-hero-info">
            <h1>Welcome back, Traveler! 🌿</h1>
            <p>Your journey to {route.name} is scheduled. Monitor road pacing and local host notes below.</p>
          </div>
        </div>
        <div className="portal-hero-right">
          <div className="portal-hero-tags">
            <span className="hero-tag tag-gold">24 Days to Trip</span>
            <span className="hero-tag tag-blue">{route.name}</span>
            <span className="hero-tag tag-green">Pacing: 5 Days</span>
            <span className="hero-tag tag-amber">{weatherSummary}</span>
          </div>
        </div>
      </div>

      <div className="portal-dashboard-grid">
        <div className="portal-main-col">
          <NextStepCard action={nextStep} onActionClick={(action) => {
            if (action === 'open_trips') onNavigateTab('trips');
            else if (action === 'open_messages') onNavigateTab('messages');
            else if (action === 'vayu_advice') onNavigateTab('vayu');
          }} />

          <div className="portal-summary-card">
            <div className="summary-card-header">
              <h3>Active Itinerary Highlights</h3>
              <button
                type="button"
                className="quiet-link"
                onClick={() => onNavigateTab('trips')}
              >
                Full Day-by-Day Plan <span>→</span>
              </button>
            </div>
            <div className="highlights-row">
              {route.days.slice(0, 3).map((day) => (
                <div key={day.dayNumber} className="highlight-pill">
                  <b>Day {day.dayNumber}</b>
                  <span>{day.title}</span>
                  <small>{day.phase}</small>
                </div>
              ))}
            </div>
          </div>

          {/* Local Impact Card */}
          <LocalImpactCard ledger={defaultLedger} />
        </div>

        <div className="portal-side-col">
          <div className="quick-access-card">
            <h4>Traveler Tools & Studio</h4>
            <div className="tool-links">
              <button type="button" onClick={() => onNavigateTab('alignment')}>
                <span>✳️</span> Pacing Alignment Studio
              </button>
              <button type="button" onClick={() => onNavigateTab('notifications')}>
                <span>🔔</span> Route Dispatch & Alerts
              </button>
              <button type="button" onClick={() => onNavigateTab('journal')}>
                <span>📓</span> Field Journal & Memories
              </button>
              <button type="button" onClick={() => onNavigateTab('cohorts')}>
                <span>👥</span> Small-Group Cohorts
              </button>
              <button type="button" onClick={() => onNavigateTab('documents')}>
                <span>📄</span> Offline Travel Pass & Checklist
              </button>
              <button type="button" onClick={() => onNavigateTab('messages')}>
                <span>💬</span> Local Host Messages
              </button>
            </div>
          </div>

          <div className="source-freshness-card">
            <div className="source-status-badge">
              <span className="live-dot"></span> LIVE PROVENANCE
            </div>
            <p>Weather data verified via Open-Meteo. Mountain transit buffers calculated deterministically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

