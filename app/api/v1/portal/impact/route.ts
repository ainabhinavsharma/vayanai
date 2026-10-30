import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { getLocalImpactLedger } from '@/lib/portal/portal-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const routeKey = searchParams.get('routeKey') || 'meghalaya';

  const ledger = getLocalImpactLedger(routeKey);
  return apiSuccess({
    ledger
  });
}
