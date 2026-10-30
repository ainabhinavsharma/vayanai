import { NextRequest } from 'next/server';
import {
  getInternApplicationByToken,
  acceptOfferWithSignature,
  processInternDeposit
} from '@/lib/db/intern-repo';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getBaseAppUrl } from '@/lib/services/email-dispatcher';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return apiError('Missing offer access token.', 'MISSING_TOKEN', 400);
    }

    const application = getInternApplicationByToken(token);
    if (!application) {
      return apiError('Invalid or expired offer link. Please contact operations@vayanai.in.net.', 'INVALID_TOKEN', 404);
    }

    const baseUrl = getBaseAppUrl();
    const qrUrl = `${baseUrl}/verify?offerid=${encodeURIComponent(application.offerLetterId || application.id)}`;

    return apiSuccess({
      candidate: {
        id: application.id,
        name: application.userName,
        email: application.userEmail,
        phone: application.phone,
        college: application.collegeName,
        track: application.trackName,
        status: application.status,
        interviewScore: application.interviewScore,
        offerLetterId: application.offerLetterId || `VY-OFFER-${new Date().getFullYear()}-4891`,
        batchStartDate: application.batchStartDate || '2026-11-02',
        tenureMonths: 3,
        signatureName: application.signatureName,
        offerAcceptedAt: application.offerAcceptedAt,
        depositReceipt: application.depositReceipt,
        depositPaidAt: application.depositPaidAt,
        qrPayloadUrl: qrUrl
      }
    });
  } catch (err: any) {
    return apiError(`Failed to load offer: ${err.message}`, 'OFFER_LOAD_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, action, signatureName, paymentMethod, utrNumber } = body;

    if (!token) {
      return apiError('Missing offer token.', 'MISSING_TOKEN', 400);
    }

    const app = getInternApplicationByToken(token);
    if (!app) {
      return apiError('Invalid or expired token.', 'INVALID_TOKEN', 404);
    }

    if (action === 'accept_signature') {
      if (!signatureName || !signatureName.trim()) {
        return apiError('Full name is required to digitally sign the offer letter.', 'MISSING_SIGNATURE', 400);
      }

      const updated = acceptOfferWithSignature(token, signatureName.trim());
      return apiSuccess({
        message: `Offer accepted by ${updated.signatureName}. You may now proceed to Step 2 to confirm your batch slot and student verification.`,
        application: updated
      });
    }

    if (action === 'pay_deposit') {
      const method = paymentMethod || 'student_verification';
      const payment = processInternDeposit(token, method, utrNumber);
      const updated = getInternApplicationByToken(token)!;

      return apiSuccess({
        message: 'Student verification submitted! Admissions Council review is in progress.',
        payment,
        application: updated
      });
    }

    return apiError(`Unsupported action: ${action}`, 'UNSUPPORTED_ACTION', 400);
  } catch (err: any) {
    return apiError(`Offer action failed: ${err.message}`, 'ACTION_FAILED', 500);
  }
}
