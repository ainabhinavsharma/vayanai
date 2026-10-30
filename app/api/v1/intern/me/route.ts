import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import { getInternApplicationByEmail } from '@/lib/db/intern-repo';

export async function GET(req: NextRequest) {
  try {
    let email = req.nextUrl.searchParams.get('email');
    if (!email) {
      const token = await getAuthToken();
      if (token) {
        const user = getSessionUser(token);
        if (user) {
          email = user.email;
        }
      }
    }

    if (!email) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const application = getInternApplicationByEmail(email);
    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { application }
    });
  } catch (error) {
    console.error('Error fetching intern application:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
