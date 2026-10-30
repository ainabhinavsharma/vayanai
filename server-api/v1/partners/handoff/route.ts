import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { evaluatePartnerHandoff, PartnerOfferDetail, HandoffRequest } from '@/lib/partners/handoff-model';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const handoffReq = body as HandoffRequest;

    if (!handoffReq.offerId || !handoffReq.tripId) {
      return apiError('Missing offerId or tripId in handoff request', 'INVALID_HANDOFF_PAYLOAD', 400);
    }

    // Mock partner offer with 15-min expiry
    const mockOffer: PartnerOfferDetail = {
      offerId: handoffReq.offerId,
      partnerId: 'partner-khasi-homestays',
      partnerName: 'Sohra Indigenous Stays Collective',
      category: 'accommodation',
      priceINR: 14500,
      inclusions: ['4 Nights Cottage Stay', 'Breakfast & Local Dinner', 'Village Eco-Cess'],
      cancellationPolicy: 'Free cancellation up to 72 hours before arrival; 50% thereafter.',
      quotedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 mins
    };

    const evaluation = evaluatePartnerHandoff(mockOffer, handoffReq);

    if (!evaluation.success) {
      return apiError(evaluation.error || 'Handoff rejected', 'HANDOFF_REJECTED', 422);
    }

    return apiSuccess({
      ...evaluation.result,
      offerSummary: {
        partner: mockOffer.partnerName,
        priceINR: mockOffer.priceINR,
        cancellationPolicy: mockOffer.cancellationPolicy
      }
    });
  } catch (err) {
    return apiError('Failed to process partner handoff', 'HANDOFF_ERROR', 500, String(err));
  }
}
