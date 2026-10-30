import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.travelerName || !body.travelerEmail || !body.partnerId) {
      return apiError(
        'Missing required fields: travelerName, travelerEmail, partnerId are mandatory.',
        'MISSING_REQUIRED_FIELDS',
        400
      );
    }

    const payload = {
      travelerName: String(body.travelerName),
      travelerEmail: String(body.travelerEmail),
      partnerId: String(body.partnerId),
      partnerName: String(body.partnerName || 'Local Travel Partner'),
      routeKey: String(body.routeKey || 'meghalaya'),
      dates: body.dates ? String(body.dates) : undefined,
      partySize: body.partySize ? Number(body.partySize) : 2,
      mobilityNotes: body.mobilityNotes ? String(body.mobilityNotes) : undefined,
      message: body.message ? String(body.message) : undefined
    };

    const result = await botskillClient.createPartnerInquiry(payload);
    return apiSuccess(result);
  } catch (err) {
    return apiError('Failed to stage partner inquiry', 'INQUIRY_STAGING_FAILED', 500, String(err));
  }
}
