import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function POST(req: NextRequest) {
  try {
    const result = await botskillClient.discoverOutlookAccounts();
    return apiSuccess(result);
  } catch (err) {
    return apiError('Failed to discover accounts from Outlook', 'DISCOVER_FAILED', 500, String(err));
  }
}
