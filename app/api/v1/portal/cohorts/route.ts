import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import {
  getCohorts,
  requestJoinCohort
} from '@/lib/portal/portal-service';

export async function GET() {
  const cohorts = getCohorts();
  return apiSuccess({
    cohorts
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.cohortId || !body.travelerName || !body.travelerEmail) {
      return apiError('Cohort ID, traveler name, and email are required', 'MISSING_FIELDS', 400);
    }

    const success = requestJoinCohort(
      body.cohortId,
      body.travelerName,
      body.travelerEmail,
      body.note
    );

    if (!success) {
      return apiError('Cohort is fully booked or does not exist', 'BOOKING_FAILED', 400);
    }

    return apiSuccess({
      success: true,
      message: 'Join inquiry registered. Local host and collective coordinator have been notified.'
    });
  } catch (err) {
    return apiError('Invalid request body', 'INVALID_JSON', 400);
  }
}
