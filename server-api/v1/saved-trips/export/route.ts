import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getOrCreateGuestSession } from '@/lib/persistence/sessions';

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get('x-vayanai-session') || req.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return apiError('Missing x-vayanai-session header', 'MISSING_SESSION', 400);
  }

  const session = getOrCreateGuestSession(sessionId);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    generator: 'Vayanai Travel Companion v1.0',
    sessionId: session.sessionId,
    tripCount: session.savedTrips.length,
    trips: session.savedTrips,
    disclaimer: 'Personal trip export. Planning ideas only; not confirmed reservations.'
  };

  return apiSuccess(exportPayload);
}
