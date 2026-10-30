'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { storage } from '@/lib/storage';

export default function HomePage() {
  useEffect(() => {
    // Intersection observer for gentle reveals
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const setRegionAndPlan = (routeKey: string) => {
    const brief = storage.getLastBrief();
    brief.routeKey = routeKey;
    storage.saveBrief(brief);
  };

  return (
    <div className="home-page">
      <SiteHeader />

      <main>
        <section className="home-hero">
          <div className="hero-photo" />
          <div className="hero-inner">
            <div className="eyebrow">
              <i /> A more personal way to travel
            </div>
            <h1>
              India, your way.<br />
              <em>And at your pace.</em>
            </h1>
            <p>
              Tell us what a good break looks like. Find places, people and the little details worth going for.
            </p>
            <div className="button-row">
              <Link className="button button-gold" href="/plan">
                Plan with Vayu <span>↗</span>
              </Link>
              <a className="quiet-link" href="#how-it-works">
                See how it works <span>↓</span>
              </a>
            </div>
            <div className="hero-caption">
              <span>TRAVEL, SHAPED AROUND YOU</span>
              <span>FROM THE FIRST “WHAT IF?”</span>
            </div>
          </div>
          <div className="hero-index">A DIFFERENT KIND OF TRAVEL NETWORK &nbsp;/&nbsp; 01</div>
        </section>

        <section className="intro-section section-pad reveal" id="how-it-works">
          <div>
            <div className="eyebrow eyebrow-muted">
              <i /> Less searching, more sensing
            </div>
            <h2>
              The destination is only<br />
              half the <em>story.</em>
            </h2>
          </div>
          <div className="intro-aside">
            <p>
              Start with the trip you have in mind—or just the feeling you’re after. Vayu helps shape a plan around your time, comfort and pace.
            </p>
            <p className="aside-note">
              AI can bring the pieces together. You stay in the driver’s seat.
            </p>
            <Link className="text-arrow" href="/plan">
              Meet your trip-planning companion <span>↗</span>
            </Link>
          </div>
        </section>

        <section className="feature-section section-pad reveal">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow-muted">
                <i /> A better starting point
              </div>
              <h2>Tell Vayu what matters.</h2>
            </div>
            <p>One thoughtful brief. A plan you can question, edit and make your own.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-brief">
              <div className="mini-orb">
                <span>V</span>
                <i />
              </div>
              <div className="brief-label">YOUR TRAVEL THOUGHT</div>
              <blockquote>
                “A quiet five days in October. Lots of green, easy walks, and no packed schedule.”
              </blockquote>
              <div className="brief-divider" />
              <div className="brief-label">
                WHAT VAYU HEARD <span className="editable-tag">EDITABLE</span>
              </div>
              <div className="preference-pills">
                <span>From Mumbai</span>
                <span>5 days</span>
                <span>Nature</span>
                <span>Easy pace</span>
                <span>Mid-range</span>
              </div>
              <Link href="/plan" className="feature-next">
                Try your own brief <span>↗</span>
              </Link>
            </article>

            <article className="feature-explain">
              <div className="explain-image" />
              <div className="explain-overlay">
                <div className="match-label">A FIRST ROUTE TO CONSIDER</div>
                <h3>
                  Meghalaya,<br />
                  with room to breathe.
                </h3>
                <p>
                  Green hills, a gentle first day, and a choice of easy walks or a more active trail.
                </p>
                <div className="match-reasons">
                  <span><i>✓</i> Fits your pace</span>
                  <span><i>✓</i> Strong nature match</span>
                  <Link href="/trip"><i>↗</i> See why it fits</Link>
                </div>
              </div>
              <span className="sample-flag">SAMPLE PLANNING PREVIEW</span>
            </article>
          </div>
        </section>

        <section className="region-section section-pad reveal">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow-muted">
                <i /> India, with different things in mind
              </div>
              <h2>Which way feels <em>right?</em></h2>
            </div>
            <Link className="text-arrow" href="/plan">
              Build a route around you <span>↗</span>
            </Link>
          </div>
          <div className="region-grid">
            <Link
              className="region-card region-mountains"
              href="/trip"
              onClick={() => setRegionAndPlan('ladakh')}
            >
              <span>01 &nbsp; HIGHER & QUIETER</span>
              <div>
                <h3>Mountain air</h3>
                <p>Ladakh · Himachal · Uttarakhand</p>
              </div>
              <b>↗</b>
            </Link>
            <Link
              className="region-card region-green"
              href="/trip"
              onClick={() => setRegionAndPlan('meghalaya')}
            >
              <span>02 &nbsp; GREEN & SLOW</span>
              <div>
                <h3>Rain country</h3>
                <p>Meghalaya · Assam · Sikkim</p>
              </div>
              <b>↗</b>
            </Link>
            <Link
              className="region-card region-water"
              href="/trip"
              onClick={() => setRegionAndPlan('kerala')}
            >
              <span>03 &nbsp; BY THE WATER</span>
              <div>
                <h3>Time to drift</h3>
                <p>Kerala · Konkan · Goa</p>
              </div>
              <b>↗</b>
            </Link>
          </div>
        </section>

        <section className="human-section reveal">
          <div className="human-photo" />
          <div className="human-copy">
            <div className="eyebrow">
              <i /> People make a place
            </div>
            <h2>
              A little local<br />
              <em>know-how goes far.</em>
            </h2>
            <p>
              The quieter café. The right walking path. Someone who knows when the rain usually clears. Discover local perspectives alongside your plan.
            </p>
            <Link className="button button-outline" href="/people">
              Explore local expertise <span>↗</span>
            </Link>
          </div>
        </section>

        <section className="closing-section section-pad">
          <div className="eyebrow eyebrow-muted">
            <i /> Your next story starts somewhere
          </div>
          <h2>
            Let’s find a place<br />
            that feels like <em>yours.</em>
          </h2>
          <Link className="button button-gold" href="/plan">
            Start planning with Vayu <span>↗</span>
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
