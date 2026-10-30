import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount
} from '@/lib/portal/portal-service';

export async function GET() {
  const notifications = getNotifications();
  const unreadCount = getUnreadNotificationCount();
  return apiSuccess({
    notifications,
    unreadCount
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.markAll) {
      markAllNotificationsAsRead();
      return apiSuccess({ message: 'All notifications marked as read', unreadCount: 0 });
    }

    if (!body.id) {
      return apiError('Notification ID is required', 'MISSING_ID', 400);
    }

    const updated = markNotificationAsRead(body.id);
    if (!updated) {
      return apiError('Notification not found', 'NOT_FOUND', 404);
    }

    return apiSuccess({
      notification: updated,
      unreadCount: getUnreadNotificationCount()
    });
  } catch (err) {
    return apiError('Invalid request body', 'INVALID_JSON', 400);
  }
}
