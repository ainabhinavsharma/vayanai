import { apiSuccess } from '@/lib/api-response';
import { getAuthToken, removeAuthCookie } from '@/lib/auth/cookie';
import { destroySession } from '@/lib/auth/session';

export async function POST() {
  const token = await getAuthToken();
  if (token) {
    destroySession(token);
  }

  const res = apiSuccess({
    message: 'Signed out successfully'
  });

  removeAuthCookie(res);
  return res;
}
