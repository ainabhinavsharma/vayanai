import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import {
  getOrCreateGuestSession,
  saveTripToSession,
  removeTripFromSession,
  deleteGuestSession
} from '@/lib/persistence/sessions';

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get('x-vayanai-session') || req.nextUrl.searchParams.get('sessionId') || undefined;
  const session = getOrCreateGuestSession(sessionId);

  return apiSuccess({
    sessionId: session.sessionId,
    trips: session.savedTrips,
    storageType: 'guest_session',
    disclaimer: 'Stored on this guest session. No password or personal data required.'
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = req.headers.get('x-vayanai-session') || body.sessionId;

    if (!body.trip || !body.trip.id || !body.trip.title) {
      return apiError('Missing trip details in payload', 'INVALID_TRIP', 400);
    }

    const session = getOrCreateGuestSession(sessionId);
    const updatedTrips = saveTripToSession(session.sessionId, body.trip);

    return apiSuccess({
      sessionId: session.sessionId,
      trips: updatedTrips,
      message: 'Trip saved successfully'
    });
  } catch (err) {
    return apiError('Failed to save trip', 'SAVE_FAILED', 500, String(err));
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.headers.get('x-vayanai-session') || req.nextUrl.searchParams.get('sessionId');
  const tripId = req.nextUrl.searchParams.get('tripId');
  const clearAll = req.nextUrl.searchParams.get('clearAll') === 'true';

  if (!sessionId) {
    return apiError('Missing x-vayanai-session header', 'MISSING_SESSION', 400);
  }

  if (clearAll) {
    deleteGuestSession(sessionId);
    return apiSuccess({
      sessionId,
      trips: [],
      message: 'Guest session data completely erased'
    });
  }

  if (tripId) {
    const updatedTrips = removeTripFromSession(sessionId, tripId);
    return apiSuccess({
      sessionId,
      trips: updatedTrips,
      message: `Trip '${tripId}' removed`
    });
  }

  return apiError('Specify tripId or clearAll=true', 'INVALID_DELETE_PARAM', 400);
}
