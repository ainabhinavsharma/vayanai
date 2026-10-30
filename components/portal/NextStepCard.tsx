'use client';

import React from 'react';
import { NextStepAction } from '@/types/portal';

interface NextStepCardProps {
  action: NextStepAction;
  onActionClick?: (actionId: string) => void;
}

export function NextStepCard({ action, onActionClick }: NextStepCardProps) {
  const urgencyClass =
    action.urgency === 'high' ? 'badge-amber' : action.urgency === 'medium' ? 'badge-gold' : 'badge-blue';

  return (
    <div className="nextstep-card">
      <div className="ns-top">
        <div className="ns-icon">{action.icon}</div>
        <span className={`badge ${urgencyClass}`}>{action.badge}</span>
      </div>
      <h2 className="ns-title">{action.title}</h2>
      <p className="ns-msg">{action.description}</p>
      {action.ctaText && (
        <div id="nsAction" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="button button-gold"
            style={{ minHeight: '36px', fontSize: '9px', padding: '0 14px' }}
            onClick={() => onActionClick?.(action.ctaAction || action.id)}
          >
            {action.ctaText}
          </button>
        </div>
      )}
    </div>
  );
}
