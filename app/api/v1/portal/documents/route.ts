import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { getTravelPass } from '@/lib/portal/portal-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const routeKey = searchParams.get('routeKey') || 'meghalaya';
  const origin = searchParams.get('origin') || 'Mumbai';

  const pass = getTravelPass(routeKey, origin);

  return apiSuccess({
    pass,
    generatedAt: new Date().toISOString(),
    isOfflineReady: true
  });
}
