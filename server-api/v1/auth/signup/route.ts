import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createUser } from '@/lib/db/users-repo';
import { createSession } from '@/lib/auth/session';
import { attachAuthCookie } from '@/lib/auth/cookie';
import { PortalRole } from '@/types/portal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role = 'traveler', phone, organization, licenseNumber } = body;

    if (!email || !password || !name) {
      return apiError('Email, password, and name are required', 'MISSING_FIELDS', 400);
    }

    if (password.length < 8) {
      return apiError('Password must be at least 8 characters long', 'WEAK_PASSWORD', 400);
    }

    const validRoles: PortalRole[] = ['traveler', 'partner', 'admin', 'staff', 'intern'];
    if (!validRoles.includes(role)) {
      return apiError('Invalid user role specified', 'INVALID_ROLE', 400);
    }

    const user = createUser({
      email,
      password,
      name,
      role,
      phone,
      organization,
      licenseNumber
    });

    // Create session
    const session = createSession(user.id);

    const res = apiSuccess({
      user,
      message: 'Account created successfully'
    }, 201);

    attachAuthCookie(res, session.token);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return apiError(message, 'SIGNUP_ERROR', 400);
  }
}
