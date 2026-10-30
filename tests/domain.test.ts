import { describe, it, expect } from 'vitest';
import { TripBriefSchema, TripSchema, PartnerOfferSchema } from '@/lib/domain/schemas';
import { inferRoute, routeData } from '@/lib/mock-routes';
import { sanitizeLog } from '@/lib/api-response';

describe('Domain Schemas & Validation', () => {
  it('validates a correct TripBrief payload', () => {
    const validBrief = {
      prompt: 'A quiet break from Mumbai in October',
      origin: 'Mumbai',
      when: 'October 2026',
      party: 'Two of us',
      duration: 'About 5 days',
      budget: '₹45–75k',
      interests: ['Nature', 'Easy outdoors'],
      accessibility: ['Keep road journeys shorter'],
      routeKey: 'meghalaya'
    };

    const result = TripBriefSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.origin).toBe('Mumbai');
      expect(result.data.routeKey).toBe('meghalaya');
    }
  });

  it('rejects TripBrief with invalid/missing origin', () => {
    const invalidBrief = {
      origin: 'M', // min length 2
      when: 'October 2026',
      party: 'Two of us',
      duration: 'About 5 days',
      budget: '₹45–75k',
      interests: [],
      routeKey: 'meghalaya'
    };

    const result = TripBriefSchema.safeParse(invalidBrief);
    expect(result.success).toBe(false);
  });

  it('validates structured Trip data matching the prototype routes', () => {
    const sampleTrip = {
      id: 'meghalaya',
      version: 1,
      routeKey: 'meghalaya',
      name: 'Meghalaya',
      title: 'Meghalaya, with room to breathe.',
      stops: 'Shillong & Sohra',
      image: '/images/destinations/meghalaya.jpg',
      match: 'EASY PACE · NATURE · FIVE DAYS',
      summary: 'A gentle loop from Guwahati to Shillong and Sohra',
      days: routeData.meghalaya.days,
      fitReasons: routeData.meghalaya.fitReasons,
      budget: {
        currency: 'INR' as const,
        stayAndTaxes: '₹18k–32k',
        transfers: '₹8k–15k',
        foodAndSpends: '₹5k–9k',
        totalRange: '₹31k–56k',
        isEstimate: true as const,
        disclaimer: 'Illustrative preview'
      },
      sources: []
    };

    const result = TripSchema.safeParse(sampleTrip);
    expect(result.success).toBe(true);
  });

  it('enforces unverified badge restriction on PartnerOffer', () => {
    // Fabricating a verified badge must fail the schema rule
    const fakeVerifiedPartner = {
      partnerId: 'partner-123',
      category: 'food',
      name: 'Local Food Expert',
      specialty: 'Khasi traditional cuisine',
      offerState: 'suggestion',
      isVerified: true, // Should fail!
      disclaimer: 'Illustrative host'
    };

    const result = PartnerOfferSchema.safeParse(fakeVerifiedPartner);
    expect(result.success).toBe(false);
  });
});

describe('Route Inference & Keyword Parsing', () => {
  it('infers rajasthan for heritage and fort queries', () => {
    expect(inferRoute('Trip to see forts and palaces', ['Culture'])).toBe('rajasthan');
    expect(inferRoute('Visiting Jaipur with family', [])).toBe('rajasthan');
  });

  it('infers kerala for backwaters and coastal queries', () => {
    expect(inferRoute('Relaxing near backwaters with food', ['Food'])).toBe('kerala');
    expect(inferRoute('Konkan and beach getaway', [])).toBe('kerala');
  });

  it('infers ladakh for mountains and altitude queries', () => {
    expect(inferRoute('Leh mountain road trip', ['Easy outdoors'])).toBe('ladakh');
    expect(inferRoute('Himalaya break in high altitude', [])).toBe('ladakh');
  });

  it('defaults to meghalaya for nature/green queries', () => {
    expect(inferRoute('Quiet green break with waterfalls', ['Nature'])).toBe('meghalaya');
  });
});

describe('PII Minimization & Logging Security', () => {
  it('redacts sensitive customer fields', () => {
    const rawPayload = {
      userName: 'Aarav Sharma',
      email: 'aarav@example.com',
      phone: '+919876543210',
      cardNumber: '4111222233334444',
      budget: '₹45–75k',
      preferences: {
        food: 'Vegetarian',
        secretCode: '12345'
      }
    };

    const sanitized = sanitizeLog(rawPayload) as Record<string, unknown>;
    expect(sanitized.email).toBe('[REDACTED]');
    expect(sanitized.phone).toBe('[REDACTED]');
    expect(sanitized.cardNumber).toBe('[REDACTED]');
    expect((sanitized.preferences as Record<string, unknown>).secretCode).toBe('[REDACTED]');
    expect(sanitized.budget).toBe('₹45–75k');
  });
});
