import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { sourceRegister } from '@/lib/adapters/source-register';
import { getDestinationWeather } from '@/lib/adapters/weather';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const routeKey = searchParams.get('routeKey') || 'meghalaya';

  const weather = await getDestinationWeather(routeKey);

  return apiSuccess({
    activeSources: Object.values(sourceRegister),
    currentWeather: weather,
    environment: {
      offlineFallbackReady: true,
      lastAuditDate: '2026-10-18'
    }
  });
}
