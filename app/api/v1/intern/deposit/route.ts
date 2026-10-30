import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import { processInternDeposit, getInternApplicationByUserId } from '@/lib/db/intern-repo';

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const user = token ? getSessionUser(token) : null;

    if (!user) {
      return apiError('Authentication required to submit deposit', 'UNAUTHORIZED', 401);
    }

    const app = getInternApplicationByUserId(user.id);
    if (!app) {
      return apiError('No active intern application found for this account', 'NOT_FOUND', 404);
    }

    if (app.status !== 'selected' && app.status !== 'onboarded') {
      return apiError('You must be selected in the virtual interview before paying the deposit', 'INVALID_STATUS', 400);
    }

    const body = await req.json().catch(() => ({}));
    const paymentMethod = body.paymentMethod === 'card_mock' ? 'card_mock' : 'upi_mock';

    const payment = processInternDeposit(user.id, paymentMethod);

    return apiSuccess({
      payment,
      message: 'Enrollment verification recorded. Your intern workspace is now active!'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Deposit payment failed';
    return apiError(message, 'PAYMENT_ERROR', 400);
  }
}
