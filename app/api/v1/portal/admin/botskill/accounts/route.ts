import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { botskillClient } from '@/lib/adapters/botskill-client';

const REQUIRED_DOMAIN = 'vayanai.in.net';

export async function GET(req: NextRequest) {
  try {
    const data = await botskillClient.listAccounts();
    return apiSuccess(data);
  } catch (err) {
    return apiError('Failed to fetch monitored accounts', 'ACCOUNTS_FETCH_FAILED', 500, String(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, displayName } = body;

    if (!email || typeof email !== 'string') {
      return apiError('Email address is required', 'INVALID_EMAIL', 400);
    }

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith(`@${REQUIRED_DOMAIN}`)) {
      return apiError(
        `Project Isolation Violation: Only '@${REQUIRED_DOMAIN}' email addresses are permitted for this project.`,
        'INVALID_DOMAIN',
        400
      );
    }

    const result = await botskillClient.addAccount(trimmed, displayName);
    return apiSuccess(result);
  } catch (err) {
    return apiError('Failed to register email account for monitoring', 'ACCOUNT_ADD_FAILED', 500, String(err));
  }
}
