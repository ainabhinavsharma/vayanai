export type HandoffState = 'SUGGESTION' | 'PARTNER_OFFER' | 'HANDOFF_CONFIRMED' | 'SUPPLIER_CONFIRMED';

export interface PartnerOfferDetail {
  offerId: string;
  partnerId: string;
  partnerName: string;
  category: 'accommodation' | 'transfer' | 'experience' | 'guide';
  priceINR: number;
  inclusions: string[];
  cancellationPolicy: string;
  quotedAt: string;
  expiresAt: string;
}

export interface HandoffRequest {
  tripId: string;
  offerId: string;
  userConsentedToTerms: boolean;
  travellerCount: number;
}

export interface HandoffResult {
  handoffId: string;
  state: HandoffState;
  partnerName: string;
  redirectUrl?: string;
  termsAcknowledged: boolean;
  disclaimer: string;
  expiresInMinutes: number;
}

export function evaluatePartnerHandoff(
  offer: PartnerOfferDetail,
  request: HandoffRequest
): { success: boolean; result?: HandoffResult; error?: string } {
  // 1. Consent invariant
  if (!request.userConsentedToTerms) {
    return {
      success: false,
      error: 'User must explicitly review and consent to partner terms before handoff.'
    };
  }

  // 2. Expiration check
  const now = Date.now();
  const expiry = new Date(offer.expiresAt).getTime();
  if (now > expiry) {
    return {
      success: false,
      error: 'This partner offer has expired. Live quotes must be refreshed before handoff.'
    };
  }

  // 3. Generate handoff record
  const handoffId = `hnd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const expiresInMinutes = Math.max(0, Math.round((expiry - now) / 60000));

  return {
    success: true,
    result: {
      handoffId,
      state: 'HANDOFF_CONFIRMED',
      partnerName: offer.partnerName,
      redirectUrl: `https://partner.vayanai.com/reserve?ref=${handoffId}`,
      termsAcknowledged: true,
      disclaimer: `You are being transferred directly to ${offer.partnerName}. Vayanai does not take payment or finalize the reservation on this screen.`,
      expiresInMinutes
    }
  };
}
