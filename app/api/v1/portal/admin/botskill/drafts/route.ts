import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function GET(req: NextRequest) {
  try {
    const drafts = await botskillClient.listDrafts();
    return apiSuccess({
      drafts,
      count: drafts.length,
      mode: 'DRAFT_ONLY'
    });
  } catch (err) {
    return apiError('Failed to fetch BOTSKILL draft queue', 'DRAFTS_FETCH_FAILED', 500, String(err));
  }
}
