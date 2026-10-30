'use client';

import React, { useState } from 'react';
import { TravelPassData } from '@/types/portal';

interface TravelPassProps {
  pass: TravelPassData;
}

export function TravelPassDocument({ pass }: TravelPassProps) {
  const [items, setItems] = useState(pass.packingList);

  const toggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="travel-pass-container">
      <div className="travel-pass-header">
        <div>
          <span className="eyebrow">
            <i></i> OFFICIAL VAYANAI TRAVEL PASS
          </span>
          <h2>{pass.destination}</h2>
          <p className="pass-meta">
            <span>Pass ID: <b>{pass.passId}</b></span> · <span>Origin: <b>{pass.origin}</b></span> · <span>Pacing: <b>{pass.pacing}</b></span>
          </p>
        </div>
        <button type="button" className="button button-gold" onClick={handlePrint}>
          Print / Save PDF <span>↓</span>
        </button>
      </div>

      <div className="pass-sections-grid">
        <section className="pass-card">
          <div className="pass-card-title">
            <span className="trust-mark">◷</span>
            <h3>Day-by-Day Buffer Notes</h3>
          </div>
          <div className="pass-itinerary-list">
            {pass.itinerarySummary.map((item) => (
              <div key={item.day} className="pass-itinerary-item">
                <span className="pass-day-badge">Day {item.day}</span>
                <div>
                  <h4>{item.title} <small>({item.focus})</small></h4>
                  <p>{item.bufferAdvice}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pass-card">
          <div className="pass-card-title">
            <span className="trust-mark">✓</span>
            <h3>Interactive Packing Checklist</h3>
          </div>
          <div className="pass-packing-list">
            {items.map((item, idx) => (
              <label key={idx} className={`packing-item ${item.checked ? 'is-checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(idx)}
                />
                <span>{item.item}</span>
                <span className="packing-cat-tag">{item.category}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="pass-emergency-strip">
        <div className="pass-card-title">
          <span className="trust-mark">✳</span>
          <h3>Verified Emergency & Support Directory</h3>
        </div>
        <div className="emergency-grid">
          {pass.emergencyContacts.map((contact, i) => (
            <div key={i} className="emergency-cell">
              <b>{contact.title}</b>
              <span className="emergency-phone">{contact.contact}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
