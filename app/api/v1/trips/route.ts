import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { routeData } from '@/lib/mock-routes';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const routeKey = searchParams.get('routeKey') || 'meghalaya';

  const route = routeData[routeKey];
  if (!route) {
    return apiError(
      `Route '${routeKey}' not found. Supported routes: ${Object.keys(routeData).join(', ')}`,
      'ROUTE_NOT_FOUND',
      404
    );
  }

  return apiSuccess({
    trip: {
      ...route,
      version: 1,
      sourceStatus: {
        isLive: false,
        lastChecked: new Date().toISOString(),
        disclaimer: 'Illustrative preview data. Live route availability and rates must be confirmed with local operators.'
      }
    }
  });
}
