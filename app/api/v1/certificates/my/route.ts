import { NextRequest, NextResponse } from 'next/server';
import { getCertificatesByEmail, getCertificatesByUserId } from '@/lib/db/certificates-repo';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';

import { Certificate } from '@/types/certificates';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryEmail = searchParams.get('email');

    // First check session from cookie
    const token = await getAuthToken();
    const sessionUser = token ? getSessionUser(token) : null;

    const userEmail = queryEmail || sessionUser?.email;
    const userId = sessionUser?.id;

    if (!userEmail && !userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required or email query parameter required.' },
        { status: 401 }
      );
    }

    let certs: Certificate[] = [];
    if (userEmail) {
      certs = getCertificatesByEmail(userEmail);
    } else if (userId) {
      certs = getCertificatesByUserId(userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        certificates: certs,
        count: certs.length
      }
    });
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch certificates.' },
      { status: 500 }
    );
  }
}
