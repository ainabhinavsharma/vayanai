import { describe, it, expect } from 'vitest';
import { evaluatePartnerHandoff, PartnerOfferDetail, HandoffRequest } from '@/lib/partners/handoff-model';

describe('Partner Handoff & Booking State Machine', () => {
  const activeOffer: PartnerOfferDetail = {
    offerId: 'offer-101',
    partnerId: 'partner-sohra',
    partnerName: 'Cherra Indigenous Homestays',
    category: 'accommodation',
    priceINR: 12000,
    inclusions: ['Cottage stay', 'Breakfast'],
    cancellationPolicy: 'Full refund 72h prior',
    quotedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins ahead
  };

  it('rejects handoff if user has not explicitly consented to supplier terms', () => {
    const unconsentedReq: HandoffRequest = {
      tripId: 'meghalaya',
      offerId: 'offer-101',
      userConsentedToTerms: false,
      travellerCount: 2
    };

    const result = evaluatePartnerHandoff(activeOffer, unconsentedReq);
    expect(result.success).toBe(false);
    expect(result.error).toContain('explicitly review and consent');
  });

  it('rejects handoff if partner quote has expired', () => {
    const expiredOffer: PartnerOfferDetail = {
      ...activeOffer,
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString() // 1 min ago
    };

    const req: HandoffRequest = {
      tripId: 'meghalaya',
      offerId: 'offer-101',
      userConsentedToTerms: true,
      travellerCount: 2
    };

    const result = evaluatePartnerHandoff(expiredOffer, req);
    expect(result.success).toBe(false);
    expect(result.error).toContain('offer has expired');
  });

  it('generates confirmed handoff record with supplier disclaimers when valid', () => {
    const validReq: HandoffRequest = {
      tripId: 'meghalaya',
      offerId: 'offer-101',
      userConsentedToTerms: true,
      travellerCount: 2
    };

    const result = evaluatePartnerHandoff(activeOffer, validReq);
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result!.state).toBe('HANDOFF_CONFIRMED');
    expect(result.result!.partnerName).toBe('Cherra Indigenous Homestays');
    expect(result.result!.disclaimer).toContain('Vayanai does not take payment');
    expect(result.result!.expiresInMinutes).toBeGreaterThan(0);
  });
});
