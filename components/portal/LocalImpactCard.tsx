'use client';

import React from 'react';
import { LocalImpactLedger } from '@/types/portal';

interface LocalImpactCardProps {
  ledger: LocalImpactLedger;
}

export function LocalImpactCard({ ledger }: LocalImpactCardProps) {
  return (
    <div className="local-impact-card">
      <div className="impact-top-header">
        <div>
          <span className="impact-eyebrow">COMMUNITY & GREEN MILES LEDGER</span>
          <h3>Local Economic Retention & <em>Ecology</em></h3>
        </div>
        <div className="impact-badge-retention">
          <b>{ledger.localSpendRetentionPercent}%</b>
          <small>DIRECT COMMUNITY SHARE</small>
        </div>
      </div>

      <p className="impact-pledge">{ledger.communityPledge}</p>

      <div className="impact-stats-row">
        <div className="impact-stat-item">
          <span className="impact-stat-icon">🌱</span>
          <div className="impact-stat-text">
            <b>{ledger.treesOffsetEstimated} Trees</b>
            <small>Local Agroforestry Partner</small>
          </div>
        </div>

        <div className="impact-stat-item">
          <span className="impact-stat-icon">🚯</span>
          <div className="impact-stat-text">
            <b>{ledger.plasticAvoidedKg} kg Plastic</b>
            <small>Zero Single-Use Bottles Pledge</small>
          </div>
        </div>

        <div className="impact-stat-item">
          <span className="impact-stat-icon">🏘️</span>
          <div className="impact-stat-text">
            <b>{ledger.partnerVillagesSupported.length} Villages</b>
            <small>{ledger.partnerVillagesSupported.join(', ')}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
