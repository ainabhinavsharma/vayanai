import React from 'react';
import Link from 'next/link';
import { SavedTrip } from '@/types';

interface SavedTripCardProps {
  trip: SavedTrip;
  onRemove: (id: string) => void;
  onOpen: (trip: SavedTrip) => void;
}

export function SavedTripCard({ trip, onRemove, onOpen }: SavedTripCardProps) {
  return (
    <article className="saved-card" data-id={trip.id}>
      <div
        className="saved-card-image"
        style={{ backgroundImage: `url('${trip.image}')` }}
      />
      <div className="saved-card-content">
        <span>TRIP IDEA · {trip.origin.toUpperCase()}</span>
        <h3>{trip.title}</h3>
        <p>
          {trip.duration} · {trip.budget}
        </p>
        <span className="saved-status">NOT BOOKED · IDEA ONLY</span>
        <div className="saved-card-actions">
          <Link
            href="/trip"
            onClick={() => onOpen(trip)}
          >
            Open the route ↗
          </Link>
          <button
            type="button"
            onClick={() => onRemove(trip.id)}
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
