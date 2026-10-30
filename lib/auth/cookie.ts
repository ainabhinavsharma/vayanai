import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'vayanai_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function getAuthToken(req?: any): Promise<string | null> {
  // 1. Try reading from request if supplied
  if (req) {
    if (typeof req.cookies?.get === 'function') {
      const c = req.cookies.get(AUTH_COOKIE_NAME);
      if (c) return typeof c === 'string' ? c : c.value;
    }
    const cookieHeader = req.headers?.get?.('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
      if (match) return decodeURIComponent(match[1]);
    }
  }

  // 2. Next.js server runtime cookies()
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(AUTH_COOKIE_NAME);
    return cookie ? cookie.value : null;
  } catch {
    // Called outside request scope (e.g. in test suites)
    return null;
  }
}

export function attachAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Ensures session cookies work on http://localhost:3000
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });
}

export function removeAuthCookie(res: NextResponse): void {
  res.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}
