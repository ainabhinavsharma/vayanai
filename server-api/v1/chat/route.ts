import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message;
    const routeKey = body.routeKey || 'meghalaya';

    if (!message || typeof message !== 'string') {
      return apiError('Field "message" is required and must be a string', 'MISSING_MESSAGE', 400);
    }

    const response = await botskillClient.chatVayu(message, routeKey, body.context);
    return apiSuccess({
      ...response,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return apiError('Failed to process assistant message', 'CHAT_FAILED', 500, String(err));
  }
}
