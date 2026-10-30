import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-response';
import { getConversations } from '@/lib/portal/portal-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const convId = searchParams.get('convId');
  const conversations = getConversations();

  if (convId) {
    const thread = conversations.find((c) => c.id === convId);
    return apiSuccess({ conversation: thread || null });
  }

  return apiSuccess({
    conversations,
    totalUnread: conversations.reduce((acc, c) => acc + c.unreadCount, 0)
  });
}
