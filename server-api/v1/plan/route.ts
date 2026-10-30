import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { TripBriefSchema } from '@/lib/domain/schemas';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = TripBriefSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        'Invalid trip brief for planning',
        'VALIDATION_FAILED',
        422,
        parseResult.error.flatten()
      );
    }

    const result = await botskillClient.planTrip(parseResult.data);
    return apiSuccess(result);
  } catch (err) {
    return apiError('Failed to generate Vayu plan', 'PLANNING_FAILED', 500, String(err));
  }
}
