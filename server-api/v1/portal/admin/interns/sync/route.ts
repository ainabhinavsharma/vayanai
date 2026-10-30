import { NextRequest, NextResponse } from 'next/server';
import { fetchAndSyncGoogleSheet } from '@/lib/services/intern-sync';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
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
