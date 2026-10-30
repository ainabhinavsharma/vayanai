import { NextRequest } from 'next/server';
import { fetchAndSyncGoogleSheet } from '@/lib/services/intern-sync';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';

async function isAuthorizedCronOrAdmin(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const incomingSecret = req.headers.get('x-cron-secret');
  if (cronSecret && incomingSecret && incomingSecret.trim() === cronSecret.trim()) {
    return true;
  }

  let token: string | null = req.cookies.get('vayanai_session')?.value || null;
  if (!token) {
    try {
      token = await getAuthToken();
    } catch {
      token = null;
    }
  }

  const sessionUser = token ? getSessionUser(token) : null;
  if (sessionUser && (sessionUser.role === 'admin' || sessionUser.role === 'staff')) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorizedCronOrAdmin(req))) {
      return apiError(
        'Unauthorized: Invalid or missing cron secret or admin session credentials.',
        'UNAUTHORIZED',
        401
      );
    }

    let customUrl: string | undefined;
    let fallbackCsv: string | undefined;

    try {
      const body = await req.json();
      customUrl = body.sheetUrl;
      fallbackCsv = body.csvData;
    } catch {
      // Empty body is allowed, will use default sheet URL
    }

    const result = await fetchAndSyncGoogleSheet(customUrl, fallbackCsv);

    if (!result.success) {
      return apiError(
        result.error || 'Failed to synchronize with Google Sheet.',
        'SYNC_FAILED',
        500
      );
    }

    return apiSuccess({
      message: `Google Sheet synchronized: ${result.newInserted} new candidates inserted, ${result.updatedExisting} existing updated.`,
      totalFetched: result.totalFetched,
      newInserted: result.newInserted,
      updatedExisting: result.updatedExisting,
      dueForInviteCount: result.dueForInviteCount,
      totalMonitored: result.candidates.length,
      candidates: result.candidates
    });
  } catch (err: any) {
    return apiError(
      `Internal sync error: ${err.message}`,
      'INTERNAL_SYNC_ERROR',
      500
    );
  }
}
