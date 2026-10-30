import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getUserByEmail } from '@/lib/db/users-repo';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { attachAuthCookie } from '@/lib/auth/cookie';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError('Email and password are required', 'MISSING_CREDENTIALS', 400);
    }

    const userWithCreds = getUserByEmail(email);
    if (!userWithCreds) {
      return apiError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    const isValid = verifyPassword(password, userWithCreds.passwordHash, userWithCreds.salt);
    if (!isValid) {
      return apiError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    // Safe user profile without credentials
    const { passwordHash: _ph, salt: _s, ...safeUser } = userWithCreds;

    // Create session
    const session = createSession(safeUser.id);

    const res = apiSuccess({
      user: safeUser,
      message: 'Signed in successfully'
    });

    attachAuthCookie(res, session.token);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign-in failed';
    return apiError(message, 'SIGNIN_ERROR', 400);
  }
}
