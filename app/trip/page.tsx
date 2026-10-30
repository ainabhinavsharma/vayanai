'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { MiniMap } from '@/components/trip/MiniMap';
import { ItineraryDayCard } from '@/components/trip/ItineraryDayCard';
import { VayuDrawer } from '@/components/trip/VayuDrawer';
import { useToast } from '@/components/ui/Toast';
import { storage } from '@/lib/storage';
import { routeData } from '@/lib/mock-routes';
import { RouteDetail } from '@/types';

export default function TripPage() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'itinerary' | 'fit' | 'budget'>('itinerary');
  const [isGentlerPace, setIsGentlerPace] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [origin, setOrigin] = useState('Mumbai');
  const [route, setRoute] = useState<RouteDetail>(routeData.meghalaya);

  useEffect(() => {
    const brief = storage.getLastBrief();
    if (brief.origin) setOrigin(brief.origin);
    const key = routeData[brief.routeKey] ? brief.routeKey : 'meghalaya';
    setRoute(routeData[key]);

    const saved = storage.getSavedTrips();
    setIsSaved(saved.some((t) => t.id === key));
  }, []);

  const handleToggleSave = () => {
    const brief = storage.getLastBrief();
    const result = storage.toggleSaveTrip({
      id: route.id,
      title: route.title,
      origin: origin || 'Mumbai',
      duration: brief.duration || 'About five days',
      budget: brief.budget || '₹45–75k',
      image: route.image
    });
    setIsSaved(result.saved);
    showToast(result.saved ? 'Saved to your trip shelf.' : 'Removed from your saved trips.');
  };

  const handleAskVayu = (question: string) => {
    setPendingQuestion(question);
    setDrawerOpen(true);
  };

  const togglePacing = () => {
    const nextPace = !isGentlerPace;
    setIsGentlerPace(nextPace);
    showToast(nextPace ? 'Gentler options highlighted.' : 'Original pacing restored.');
  };

  return (
    <div className="trip-page">
      <SiteHeader ctaText="Edit your brief" ctaHref="/plan" />

      <main className="inner-page trip-content">
        <div className="breadcrumbs">
          <Link href="/">Discover</Link>
          <span>›</span>
          <Link href="/plan">Your brief</Link>
          <span>›</span>
          <b>Route idea</b>
        </div>

        <section className="trip-hero">
          <div
            className="trip-hero-image"
            style={{
              backgroundImage: `linear-gradient(90deg, #09120ff1 0%, #101a19ab 48%, #101a1932 100%), linear-gradient(0deg, #101a19e0, transparent 72%), url('${route.image}')`
            }}
          />
          <div className="trip-hero-copy">
            <div className="eyebrow">
              <i /> A ROUTE SHAPED AROUND YOUR BRIEF
            </div>
            <div className="route-match">
              MATCH NOTES &nbsp; <span>✳</span> {route.match}
            </div>
            <h1>
              {route.name},<br />
              <em>{route.title.includes(',') ? route.title.split(', ').slice(1).join(', ') : route.title}</em>
            </h1>
            <p>{route.summary}</p>
            <div className="trip-meta">
              <span>↗ &nbsp; Starting in <b>{origin}</b></span>
              <span>◷ &nbsp; About five days</span>
              <span>⌖ &nbsp; {route.stops}</span>
            </div>
            <div className="trip-actions">
              <button
                type="button"
                className={`button button-gold ${isSaved ? 'is-saved' : ''}`}
                onClick={handleToggleSave}
              >
                {isSaved ? 'Saved to shelf' : 'Save this trip'} <span>{isSaved ? '♥' : '♡'}</span>
              </button>
              <button
                type="button"
                className="button button-glass"
                onClick={() => setDrawerOpen(true)}
              >
                Ask Vayu about this route <span>✳</span>
              </button>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div className="trust-cell">
            <span className="trust-mark">✳</span>
            <div>
              <b>Why this could fit</b>
              <small>Green landscapes, a soft start, and activity you can scale up or down.</small>
            </div>
          </div>
          <div className="trust-cell">
            <span className="trust-mark">◷</span>
            <div>
              <b>Journey effort</b>
              <small>Allow time for road transfers; this is not a “quick hop” itinerary.</small>
            </div>
          </div>
          <div className="trust-cell">
            <span className="trust-mark">◎</span>
            <div>
              <b>Source status</b>
              <small>Planning sample. Live routes and conditions still need checking.</small>
            </div>
          </div>
        </section>

        <section className="result-layout">
          <div className="result-main">
            <div className="result-tabs" role="tablist">
              <button
                type="button"
                className={`result-tab ${activeTab === 'itinerary' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'itinerary'}
                onClick={() => setActiveTab('itinerary')}
              >
                Day by day
              </button>
              <button
                type="button"
                className={`result-tab ${activeTab === 'fit' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'fit'}
                onClick={() => setActiveTab('fit')}
              >
                Why this fits
              </button>
              <button
                type="button"
                className={`result-tab ${activeTab === 'budget' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeTab === 'budget'}
                onClick={() => setActiveTab('budget')}
              >
                Cost shape
              </button>
            </div>

            {activeTab === 'itinerary' && (
              <div className="tab-panel active" id="panel-itinerary">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow eyebrow-muted">
                      <i /> A FLEXIBLE FIRST DRAFT
                    </div>
                    <h2>
                      Five days, <em>at your pace.</em>
                    </h2>
                  </div>
                  <button type="button" className="small-action" onClick={togglePacing}>
                    {isGentlerPace ? 'Keep original pace ↑' : 'Make days gentler ↓'}
                  </button>
                </div>

                <div className="itinerary-days">
                  {route.days.map((day) => (
                    <ItineraryDayCard
                      key={day.dayNumber}
                      day={day}
                      isGentlerPace={isGentlerPace}
                      onAskVayu={handleAskVayu}
                    />
                  ))}
                </div>

                <p className="estimate-disclaimer">
                  This is a planning concept, not a confirmed itinerary. Timings, route access, weather and provider availability need current verification.
                </p>
              </div>
            )}

            {activeTab === 'fit' && (
              <div className="tab-panel active" id="panel-fit">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow eyebrow-muted">
                      <i /> THE REASONING, IN PLAIN WORDS
                    </div>
                    <h2>
                      Here’s why it <em>might fit.</em>
                    </h2>
                  </div>
                </div>
                <div className="reason-list">
                  {route.fitReasons.map((reason) => (
                    <article key={reason.number}>
                      <b>{reason.number}</b>
                      <div>
                        <h3>{reason.title}</h3>
                        <p>{reason.description}</p>
                        <span className="evidence-label">{reason.evidenceLabel}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'budget' && (
              <div className="tab-panel active" id="panel-budget">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow eyebrow-muted">
                      <i /> A SHAPE, NOT A QUOTE
                    </div>
                    <h2>
                      Think in <em>comfort bands.</em>
                    </h2>
                  </div>
                </div>
                <p className="budget-intro">
                  Sample planning ranges only. They are not live prices and should not be used to book. Your dates, group, transport, stays and selected activities will change the total.
                </p>
                <div className="budget-lines">
                  <div>
                    <span>Stay & local taxes</span>
                    <b>{route.budget.stayAndTaxes}</b>
                    <small>Illustrative, per person</small>
                  </div>
                  <div>
                    <span>Local transfers</span>
                    <b>{route.budget.transfers}</b>
                    <small>Road plan needs a live quote</small>
                  </div>
                  <div>
                    <span>Food & small spends</span>
                    <b>{route.budget.foodAndSpends}</b>
                    <small>Depends on your choices</small>
                  </div>
                  <div className="budget-total">
                    <span>Planning shape</span>
                    <b>{route.budget.totalRange}</b>
                    <small>Flights / trains not included</small>
                  </div>
                </div>
                <div className="source-note">
                  <span>ⓘ</span>
                  <p>
                    Prototype numbers are fictional placeholders. A real plan must show provider, last-checked time, inclusions, and expiry before presenting a quote.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="result-aside">
            <MiniMap routeName={route.name} pins={route.pins} />

            <div className="aside-card">
              <div className="aside-card-head">
                <span className="vayu-mini">V</span>
                <span>ASK VAYU</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open Vayu assistant"
                >
                  ↗
                </button>
              </div>
              <h3>Make a small change.</h3>
              <p>Try asking for an easier walk, a food-led day, or a different first stop.</p>
              <div className="quick-questions">
                <button
                  type="button"
                  className="ask-prompt"
                  onClick={() => handleAskVayu('Can we make this trip more food-focused?')}
                >
                  More food, please <span>↗</span>
                </button>
                <button
                  type="button"
                  className="ask-prompt"
                  onClick={() => handleAskVayu('Can we keep road journeys shorter?')}
                >
                  Shorter drives <span>↗</span>
                </button>
              </div>
            </div>

            <div className="alt-card">
              <div className="eyebrow eyebrow-muted">
                <i /> ANOTHER DIRECTION
              </div>
              <h3>Try another direction?</h3>
              <p>If your priority changes, Vayu can shape a different brief.</p>
              <Link href="/plan" className="text-arrow">
                Adjust your preferences <span>↗</span>
              </Link>
            </div>

            <div className="partner-handoff">
              <span>WHEN YOU’RE READY</span>
              <b>Booking partners can come later.</b>
              <p>This preview does not check availability or place bookings.</p>
            </div>
          </aside>
        </section>
      </main>

      <VayuDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pendingQuestion={pendingQuestion}
        onQuestionConsumed={() => setPendingQuestion(null)}
      />

      <SiteFooter tagline="PLANNING IDEA · NOT A LIVE OFFER" />
    </div>
  );
}
