import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import { updateUserProfile } from '@/lib/db/users-repo';
import { dispatchProfileUpdatedEmail } from '@/lib/services/email-dispatcher';

export async function GET(req: NextRequest) {
  const token = await getAuthToken(req);
  if (!token) {
    return apiSuccess({ user: null });
  }

  const user = getSessionUser(token);
  return apiSuccess({ user });
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getAuthToken(req);
    if (!token) {
      return apiError('Authentication required to update profile', 'UNAUTHORIZED', 401);
    }

    const user = getSessionUser(token);
    if (!user) {
      return apiError('Invalid or expired session', 'UNAUTHORIZED', 401);
    }

    const body = await req.json();
    const { name, phone, avatarUrl } = body;

    const changes: { name?: string; phone?: string } = {};
    if (name !== undefined && name.trim() !== user.name) changes.name = name.trim();
    if (phone !== undefined && phone.trim() !== (user.phone || '')) changes.phone = phone.trim();

    const updated = updateUserProfile(user.id, { name, phone, avatarUrl });

    // If material profile fields changed, dispatch confirmation email
    if (Object.keys(changes).length > 0) {
      try {
        await dispatchProfileUpdatedEmail(updated, changes);
      } catch (mailErr: any) {
        console.warn('[Profile Update Mail Notice] Could not dispatch notification email:', mailErr?.message);
      }
    }

    return apiSuccess({
      user: updated,
      message: 'Profile updated successfully'
    });
  } catch (err: any) {
    return apiError(err?.message || 'Failed to update profile', 'PROFILE_UPDATE_ERROR', 400);
  }
}
