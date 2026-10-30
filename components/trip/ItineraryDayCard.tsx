'use client';

import React, { useState } from 'react';
import { DayActivity } from '@/types';

interface ItineraryDayCardProps {
  day: DayActivity;
  isGentlerPace: boolean;
  onAskVayu: (prompt: string) => void;
}

export function ItineraryDayCard({ day, isGentlerPace, onAskVayu }: ItineraryDayCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Compute pacing tags based on gentle toggle
  let displayTags = day.tags;
  if (isGentlerPace) {
    if (day.dayNumber === 1) displayTags = ['Transfer only', 'Rest first'];
    else if (day.dayNumber === 4) displayTags = ['Optional activity', 'Easy alternative'];
    else if (day.dayNumber === 5) displayTags = ['Transfer buffer', 'No extra stops'];
  }

  return (
    <article className="itinerary-day">
      <div className="day-number">{String(day.dayNumber).padStart(2, '0')}</div>
      <div className="day-info">
        <div className="day-top">
          <span>{day.phase}</span>
          <button
            type="button"
            className="day-more"
            aria-label={`Toggle day ${day.dayNumber} details`}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>

        <h3>{day.title}</h3>
        <p>{day.description}</p>

        <div className="day-tags">
          {displayTags.map((tag, idx) => (
            <span key={idx}>{tag}</span>
          ))}
        </div>

        {expanded && day.extraOption && (
          <div className="day-extra">
            <b>{day.extraOption.heading}</b>
            <p>{day.extraOption.description}</p>
            <button
              type="button"
              className="ask-day"
              onClick={() => onAskVayu(day.extraOption!.suggestedPrompt)}
            >
              Ask Vayu about this day ↗
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
