import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { addMessageToConversation } from '@/lib/portal/portal-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { convId, text, sender = 'traveler' } = body;

    if (!convId || !text) {
      return apiError('Missing convId or text in message payload', 'MISSING_FIELDS', 400);
    }

    const updated = addMessageToConversation(convId, text, sender);
    if (!updated) {
      return apiError(`Conversation '${convId}' not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess({
      message: 'Message sent successfully',
      conversation: updated
    });
  } catch (err) {
    return apiError('Failed to send message', 'SEND_FAILED', 500, String(err));
  }
}
