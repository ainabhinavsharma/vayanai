'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { useToast } from '@/components/ui/Toast';
import { storage } from '@/lib/storage';
import { partnerCategories } from '@/lib/mock-routes';

export default function PeoplePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const handleAddInterest = (interest: string) => {
    const brief = storage.getLastBrief();
    brief.interests = Array.from(new Set([...(brief.interests || []), interest]));
    storage.saveBrief(brief);
    showToast(`${interest} added to your planning idea.`);
    setTimeout(() => {
      router.push('/plan');
    }, 450);
  };

  return (
    <div className="people-page">
      <SiteHeader ctaText="Plan with Vayu" ctaHref="/plan" />

      <main className="inner-page">
        <section className="people-hero">
          <div className="people-hero-image" />
          <div className="eyebrow">
            <i /> THE GOOD KIND OF CONNECTED
          </div>
          <h1>
            Places are made<br />
            by <em>people.</em>
          </h1>
          <p>
            Local knowledge brings a trip closer to the place. Explore the kinds of independent voices Vayanai is designed to connect you with.
          </p>
        </section>

        <section className="people-intro reveal">
          <div>
            <div className="eyebrow eyebrow-muted">
              <i /> NOT JUST ANOTHER DIRECTORY
            </div>
            <h2>
              Good advice comes<br />
              with a <em>point of view.</em>
            </h2>
          </div>
          <p>
            From a food walk that follows the neighbourhood’s own rhythm to a guide who knows when to pause, local expertise can make the difference between seeing a place and feeling welcome in it.
            <br />
            <br />
            Vayanai is being designed to bring that knowledge into the planning process—with clear partner details and room for you to choose.
          </p>
        </section>

        <section className="expertise-section reveal">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow-muted">
                <i /> WHAT A LOCAL PERSPECTIVE CAN ADD
              </div>
              <h2>
                Find your way <em>in.</em>
              </h2>
            </div>
            <p>These are sample partner categories, not live listings.</p>
          </div>

          <div className="expertise-grid" id="expertiseGrid">
            {partnerCategories.map((cat) => (
              <article key={cat.id} className="expertise-card" data-category={cat.id}>
                <div
                  className="expertise-photo"
                  style={{ backgroundImage: `url('${cat.image}')` }}
                />
                <div className="expertise-body">
                  <span>{cat.label}</span>
                  <h3>{cat.title}</h3>
                  <p>{cat.description}</p>
                  <button
                    type="button"
                    className="interest-link"
                    onClick={() => handleAddInterest(cat.interest)}
                  >
                    Add {cat.interest.toLowerCase()} to my trip <i>↗</i>
                  </button>
                </div>
              </article>
            ))}
          </div>

          <p className="sample-disclaimer">
            Concept cards only · no real hosts, credentials, prices, availability or reviews shown.
          </p>
        </section>

        <section className="partner-note reveal">
          <div className="partner-note-mark">व</div>
          <div>
            <div className="eyebrow eyebrow-muted">
              <i /> A NETWORK BUILT WITH CARE
            </div>
            <h2>
              Local partners should be <em>known, not guessed.</em>
            </h2>
            <p>
              Before a partner goes live, the real product needs a clear onboarding and review process, transparent terms, and accurate descriptions of what they offer. AI may help match a trip to a partner’s expertise; it must never invent a person or claim a relationship that does not exist.
            </p>
          </div>
          <Link href="/plan" className="button button-outline">
            Start with your trip <span>↗</span>
          </Link>
        </section>

        <section className="local-cta">
          <div className="eyebrow">
            <i /> THE BEST WAY IN IS YOUR WAY
          </div>
          <h2>
            Start with the kind<br />
            of day you want.
          </h2>
          <Link href="/plan" className="button button-gold">
            Build a trip brief <span>↗</span>
          </Link>
        </section>
      </main>

      <SiteFooter tagline="LOCAL KNOW-HOW, WITH CLEAR PROVENANCE" />
    </div>
  );
}
