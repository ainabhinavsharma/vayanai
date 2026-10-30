import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken } from '@/lib/db/users-repo';
import { sendPasswordResetEmail, getBaseAppUrl } from '@/lib/services/email-dispatcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    let tokenData;
    try {
      tokenData = createPasswordResetToken(email);
    } catch (err: any) {
      if (err.message && err.message.includes('No account found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'No account found with this email. Please verify your spelling or create a new account.'
          },
          { status: 404 }
        );
      }
      throw err;
    }

    // Validate base URL to prevent Host header injection attacks
    const ALLOWED_HOSTS = [
      'vayanai.in.net',
      'www.vayanai.in.net',
      'localhost:3000',
      '127.0.0.1:3000'
    ];
    const rawHost = (req.headers.get('host') || '').trim().toLowerCase();
    const isAllowedHost = ALLOWED_HOSTS.includes(rawHost);

    let baseUrl = getBaseAppUrl();
    if (isAllowedHost) {
      const protoHeader = req.headers.get('x-forwarded-proto') || (rawHost.includes('localhost') || rawHost.includes('127.0.0.1') ? 'http' : 'https');
      baseUrl = `${protoHeader}://${rawHost}`;
    }

    const resetUrl = `${baseUrl}/auth/reset-password?token=${tokenData.token}`;

    const dispatchResult = await sendPasswordResetEmail(
      tokenData.user.email,
      tokenData.user.name,
      resetUrl
    );

    return NextResponse.json({
      success: true,
      message: `Password reset instructions have been dispatched to ${tokenData.user.email}.`,
      data: {
        email: tokenData.user.email,
        mode: dispatchResult.mode,
        expiresAt: tokenData.expiresAt,
        // In local development or testing, expose the direct URL for convenience
        debugResetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined
      }
    });
  } catch (error: any) {
    console.error('Error processing forgot-password request:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
