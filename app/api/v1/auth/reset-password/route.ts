import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetToken, resetPasswordWithToken } from '@/lib/db/users-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = (searchParams.get('token') || '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Password reset token is required.' },
        { status: 400 }
      );
    }

    const verification = verifyPasswordResetToken(token);
    if (!verification.valid || !verification.tokenRecord) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid or expired token.' },
        { status: 400 }
      );
    }

    const email = verification.tokenRecord.email;
    const [namePart, domainPart] = email.split('@');
    const maskedEmail = namePart.length > 2
      ? `${namePart.slice(0, 2)}***@${domainPart}`
      : `${namePart}***@${domainPart}`;

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        email: maskedEmail,
        expiresAt: verification.tokenRecord.expiresAt
      }
    });
  } catch (error: any) {
    console.error('Error validating reset token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate reset token.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = (body.token || '').trim();
    const password = (body.password || '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Password reset token is required.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const result = resetPasswordWithToken(token, password);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reset password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated! You can now sign in with your new credentials.'
    });
  } catch (error: any) {
    console.error('Error executing password reset:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred while resetting your password.' },
      { status: 500 }
    );
  }
}
