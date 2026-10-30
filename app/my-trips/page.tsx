'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SavedTripCard } from '@/components/saved/SavedTripCard';
import { useToast } from '@/components/ui/Toast';
import { storage } from '@/lib/storage';
import { SavedTrip } from '@/types';

export default function MyTripsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTrips(storage.getSavedTrips());
    setLoaded(true);
  }, []);

  const handleRemove = (id: string) => {
    const updated = storage.removeTrip(id);
    setTrips(updated);
    showToast('Trip idea removed.');
  };

  const handleOpenTrip = (trip: SavedTrip) => {
    const brief = storage.getLastBrief();
    brief.routeKey = trip.id;
    brief.origin = trip.origin;
    brief.duration = trip.duration;
    brief.budget = trip.budget;
    storage.saveBrief(brief);
    router.push('/trip');
  };

  return (
    <div className="saved-page">
      <SiteHeader ctaText="New trip idea" ctaHref="/plan" />

      <main className="inner-page saved-main">
        <section className="saved-heading">
          <div>
            <div className="eyebrow">
              <i /> YOUR LITTLE SHELF OF SOMEWHERE
            </div>
            <h1>
              Trips to <em>come back to.</em>
            </h1>
            <p>Save an idea now. Sort out the details when you’re ready.</p>
          </div>
          <Link className="button button-gold" href="/plan">
            Make a new plan <span>↗</span>
          </Link>
        </section>

        <div className="storage-note">
          <span>ⓘ</span>
          <p>
            <b>Design preview:</b> saved trips are stored only in this browser on this device. They are not synced to an account or server.
          </p>
        </div>

        {loaded && trips.length > 0 ? (
          <section className="saved-list" aria-live="polite">
            {trips.map((trip) => (
              <SavedTripCard
                key={trip.id}
                trip={trip}
                onRemove={handleRemove}
                onOpen={handleOpenTrip}
              />
            ))}
          </section>
        ) : (
          loaded && (
            <section className="saved-empty" id="savedEmpty">
              <div className="empty-orbit">
                <span>व</span>
                <i />
              </div>
              <div className="eyebrow eyebrow-muted">
                <i /> A GOOD PLACE TO BEGIN
              </div>
              <h2>
                Every trip starts<br />
                as a <em>little idea.</em>
              </h2>
              <p>
                Tell Vayu what you’ve been thinking about. Your saved routes will find a home here.
              </p>
              <Link className="button button-gold" href="/plan">
                Start with a feeling <span>↗</span>
              </Link>
            </section>
          )
        )}
      </main>

      <SiteFooter tagline="YOUR TRAVEL IDEAS, KEPT TOGETHER" />
    </div>
  );
}
