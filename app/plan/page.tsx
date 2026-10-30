'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { VayuOrbit } from '@/components/planner/VayuOrbit';
import { storage } from '@/lib/storage';
import { inferRoute } from '@/lib/mock-routes';
import { TripBrief } from '@/types';

export default function PlanPage() {
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [origin, setOrigin] = useState('Mumbai');
  const [when, setWhen] = useState('Flexible for now');
  const [party, setParty] = useState('Two of us');
  const [duration, setDuration] = useState('About 5 days');
  const [budget, setBudget] = useState('₹45–75k');
  const [interests, setInterests] = useState<string[]>(['Nature']);
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);

  // Load any previously saved brief from storage
  useEffect(() => {
    const saved = storage.getLastBrief();
    if (saved) {
      if (saved.prompt) setPrompt(saved.prompt);
      if (saved.origin) setOrigin(saved.origin);
      if (saved.when) setWhen(saved.when);
      if (saved.party) setParty(saved.party);
      if (saved.duration) setDuration(saved.duration);
      if (saved.budget) setBudget(saved.budget);
      if (saved.interests?.length) setInterests(saved.interests);
      if (saved.accessibility?.length) setAccessibility(saved.accessibility);
    }
  }, []);

  const budgetOptions = ['₹25–45k', '₹45–75k', '₹75k–1.2L', 'Keep it flexible'];
  const interestOptions = ['Nature', 'Food', 'Culture', 'Easy outdoors', 'Quiet', 'Family-friendly'];
  const constraintOptions = [
    'Limited walking / step-free options',
    'Keep road journeys shorter',
    'Vegetarian food options matter'
  ];

  const toggleInterest = (item: string) => {
    if (interests.includes(item)) {
      setInterests(interests.filter((i) => i !== item));
    } else {
      setInterests([...interests, item]);
    }
  };

  const toggleConstraint = (item: string) => {
    if (accessibility.includes(item)) {
      setAccessibility(accessibility.filter((a) => a !== item));
    } else {
      setAccessibility([...accessibility, item]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const routeKey = inferRoute(prompt, interests);
    const brief: TripBrief = {
      prompt,
      origin,
      when,
      party,
      duration,
      budget,
      interests,
      accessibility,
      routeKey
    };
    storage.saveBrief(brief);
    setIsPlanning(true);

    setTimeout(() => {
      router.push('/trip');
    }, 1350);
  };

  return (
    <div className="plan-page">
      <SiteHeader ctaText="My trips" ctaHref="/my-trips" />

      <main className="inner-page">
        <section className="page-title">
          <div className="eyebrow">
            <i /> YOUR FIRST LITTLE TRAVEL BRIEF
          </div>
          <h1>
            Start with a <em>feeling.</em>
          </h1>
          <p>
            You don’t need every detail figured out. Tell us a little, then shape the plan together.
          </p>
          <div className="step-track">
            <span className="step-active">
              <b>01</b> Your brief
            </span>
            <i />
            <span>
              <b>02</b> A route idea
            </span>
            <i />
            <span>
              <b>03</b> Make it yours
            </span>
          </div>
        </section>

        <section className="planner-layout">
          <form className="trip-form" onSubmit={handleSubmit}>
            <div className="form-top">
              <div className="eyebrow eyebrow-muted">
                <i /> THE HUMAN PART FIRST
              </div>
              <span className="demo-note">DESIGN PREVIEW</span>
            </div>

            <label className="field-label" htmlFor="tripPrompt">
              What kind of trip has been on your mind?
            </label>
            <textarea
              id="tripPrompt"
              rows={3}
              placeholder="A few quiet days somewhere green. Easy walks, good food, and time to do nothing..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="prompt-ideas">
              <span>Try:</span>
              <button
                type="button"
                className="prompt-suggestion"
                onClick={() =>
                  setPrompt(
                    'A five-day nature break from Mumbai in October. Easy walks, no packed schedule, mid-range comfort.'
                  )
                }
              >
                A gentle nature break
              </button>
              <button
                type="button"
                className="prompt-suggestion"
                onClick={() =>
                  setPrompt(
                    'A long weekend in Rajasthan with my parents. Comfortable stays, short walks, and history.'
                  )
                }
              >
                A family long weekend
              </button>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label" htmlFor="origin">
                  Where are you starting?
                </label>
                <select id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                  <option>Mumbai</option>
                  <option>Delhi</option>
                  <option>Bengaluru</option>
                  <option>Hyderabad</option>
                  <option>Chennai</option>
                  <option>Kolkata</option>
                  <option>Somewhere else</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="when">
                  When are you thinking?
                </label>
                <select id="when" value={when} onChange={(e) => setWhen(e.target.value)}>
                  <option>Flexible for now</option>
                  <option>October 2026</option>
                  <option>November 2026</option>
                  <option>December 2026</option>
                  <option>January 2027</option>
                  <option>I have exact dates</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="field-label" htmlFor="party">
                  Who’s coming along?
                </label>
                <select id="party" value={party} onChange={(e) => setParty(e.target.value)}>
                  <option>Just me</option>
                  <option>Two of us</option>
                  <option>Friends</option>
                  <option>Family with children</option>
                  <option>Family with elders</option>
                  <option>A group</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label" htmlFor="duration">
                  How much time?
                </label>
                <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option>Long weekend · 3 nights</option>
                  <option>About 5 days</option>
                  <option>A week</option>
                  <option>More than a week</option>
                  <option>Flexible</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <div className="field-label">
                Your comfort range <small>per person · before flights</small>
              </div>
              <div className="radio-row" id="budgetOptions">
                {budgetOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`select-chip ${budget === opt ? 'is-selected' : ''}`}
                    aria-pressed={budget === opt}
                    onClick={() => setBudget(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <div className="field-label">What would make it feel like a good trip?</div>
              <div className="check-row" id="interestOptions">
                {interestOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`select-chip ${interests.includes(opt) ? 'is-selected' : ''}`}
                    aria-pressed={interests.includes(opt)}
                    onClick={() => toggleInterest(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <details className="more-options">
              <summary>Anything Vayu should keep in mind?</summary>
              <div className="more-fields">
                {constraintOptions.map((opt) => (
                  <label key={opt}>
                    <input
                      type="checkbox"
                      checked={accessibility.includes(opt)}
                      onChange={() => toggleConstraint(opt)}
                    />{' '}
                    {opt}
                  </label>
                ))}
              </div>
            </details>

            <div className="form-actions">
              <button className="button button-gold" type="submit">
                Shape a route with Vayu <span>↗</span>
              </button>
              <span>No account or booking needed.</span>
            </div>
            <p className="form-disclosure">
              In this design preview, Vayu uses sample planning data. Live recommendations will show their sources and freshness.
            </p>
          </form>

          <VayuOrbit />
        </section>

        <section className="thought-strip">
          <span className="eyebrow eyebrow-muted">
            <i /> HOW THE PLANNING ASSIST WILL WORK
          </span>
          <div className="thought-grid">
            <article>
              <b>01</b>
              <h3>Understand the brief</h3>
              <p>Vayu turns the things you share into editable preferences.</p>
            </article>
            <article>
              <b>02</b>
              <h3>Find fitting routes</h3>
              <p>Hard constraints are checked before softer preferences are ranked.</p>
            </article>
            <article>
              <b>03</b>
              <h3>Show its reasoning</h3>
              <p>See why an option fits, and what information still needs checking.</p>
            </article>
          </div>
        </section>
      </main>

      {isPlanning && (
        <div className="planning-overlay show">
          <div className="planning-card">
            <div className="planning-symbol">व</div>
            <span>VAYU IS SHAPING A SAMPLE ROUTE</span>
            <h2>
              Putting your priorities<br />
              in the right order.
            </h2>
            <div className="planning-progress">
              <i />
            </div>
            <p>Separating must-haves from nice-to-haves…</p>
            <small>Preview mode · no live travel data checked</small>
          </div>
        </div>
      )}

      <SiteFooter tagline="IDEAS FIRST. DETAILS WHEN YOU’RE READY." />
    </div>
  );
}
