import { apiSuccess } from '@/lib/api-response';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';

export async function GET() {
  const token = await getAuthToken();
  if (!token) {
    return apiSuccess({ user: null });
  }

  const user = getSessionUser(token);
  return apiSuccess({ user });
}
