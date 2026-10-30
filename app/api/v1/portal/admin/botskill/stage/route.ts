import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const draftId = body.draftId;

    if (!draftId) {
      return apiError('Missing required field: draftId', 'MISSING_DRAFT_ID', 400);
    }

    const result = await botskillClient.stageDraft(draftId);
    return apiSuccess({
      success: true,
      draftId,
      stagedToProvider: true,
      result
    });
  } catch (err) {
    return apiError('Failed to stage draft to Outlook provider', 'DRAFT_STAGING_FAILED', 500, String(err));
  }
}
