import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/sqlite';
import { getInternApplicationByEmail } from '@/lib/db/intern-repo';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getBaseAppUrl } from '@/lib/services/email-dispatcher';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get('email');

    if (!raw || !raw.trim()) {
      return apiError('Please enter your email address.', 'MISSING_EMAIL', 400);
    }

    const email = raw.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError('Please enter a valid email address format (e.g. name@example.com).', 'INVALID_EMAIL', 400);
    }

    let application = getInternApplicationByEmail(email);

    if (!application) {
      return apiError(
        'No registration found for this email address. Please make sure you are entering the exact email address you submitted in your application.',
        'NOT_FOUND',
        404
      );
    }

    if (application.status === 'rejected') {
      return apiError(
        'We are unable to extend an offer at this time for this application. Please contact admissions@vayanai.in.net.',
        'OFFER_NOT_AVAILABLE',
        403
      );
    }

    // Auto-generate offerLetterId if missing so every selected applicant has a valid formal document
    if (!application.offerLetterId) {
      const db = getDb();
      const trackCode = (application.trackName || '').toLowerCase().includes('data')
        ? 'DA'
        : (application.trackName || '').toLowerCase().includes('ai')
        ? 'AI'
        : (application.trackName || '').toLowerCase().includes('python')
        ? 'PA'
        : (application.trackName || '').toLowerCase().includes('stack')
        ? 'FS'
        : 'OPS';
      const offerId = `VY-2026-${trackCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE intern_applications
        SET offer_letter_id = ?,
            offer_sent_at = COALESCE(offer_sent_at, ?),
            updated_at = ?
        WHERE id = ?
      `).run(offerId, now, now, application.id);

      application = getInternApplicationByEmail(email)!;
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
        interviewScore: application.interviewScore ?? 100,
        offerLetterId: application.offerLetterId || `VY-OFFER-2026-${application.id.slice(-4).toUpperCase()}`,
        batchStartDate: application.batchStartDate || '2026-11-02',
        tenureMonths: 3,
        signatureName: application.signatureName,
        offerAcceptedAt: application.offerAcceptedAt,
        depositReceipt: application.depositReceipt,
        depositPaidAt: application.depositPaidAt,
        qrPayloadUrl: qrUrl,
        emailKey: application.userEmail,
      },
    });
  } catch (err: any) {
    return apiError(`Failed to load offer: ${err.message}`, 'OFFER_LOAD_ERROR', 500);
  }
}

/**
 * POST — digital signature acceptance or UTR deposit submission by candidate email.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, action, signatureName, paymentMethod, utrNumber } = body;

    if (!email || !email.trim()) {
      return apiError('Email address is required.', 'MISSING_EMAIL', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const application = getInternApplicationByEmail(cleanEmail);

    if (!application) {
      return apiError('No application found for this email address.', 'NOT_FOUND', 404);
    }

    if (application.status === 'rejected') {
      return apiError('This application is not eligible for enrollment.', 'REJECTED', 403);
    }

    if (action === 'accept_signature') {
      if (!signatureName || !signatureName.trim()) {
        return apiError('Full legal name is required to digitally sign the offer letter.', 'MISSING_SIGNATURE', 400);
      }

      const { acceptOfferByEmail } = await import('@/lib/db/intern-repo');
      const updated = acceptOfferByEmail(cleanEmail, signatureName.trim());

      return apiSuccess({
        message: `Offer accepted by ${updated.signatureName}. Proceed to Step 2 to confirm your batch slot.`,
        application: updated,
      });
    }

    if (action === 'pay_deposit') {
      const method = paymentMethod || 'upi_qr';
      const { processInternDepositByEmail, acceptOfferByEmail } = await import('@/lib/db/intern-repo');

      // Auto-accept digital signature if candidate paid before signing Step 1
      if (!application.signatureName || application.status === 'applied' || application.status === 'invited') {
        const legalName = (signatureName && String(signatureName).trim()) || application.userName;
        try {
          acceptOfferByEmail(cleanEmail, legalName);
        } catch (sigErr) {
          console.warn('Auto signature notice:', sigErr);
        }
      }

      const payment = processInternDepositByEmail(cleanEmail, method, utrNumber);
      const updated = getInternApplicationByEmail(cleanEmail)!;

      return apiSuccess({
        message: 'Deposit proof submitted. Admissions Council verification is in progress.',
        payment,
        application: updated,
      });
    }

    return apiError(`Unsupported action: ${action}`, 'UNSUPPORTED_ACTION', 400);
  } catch (err: any) {
    return apiError(`Offer action failed: ${err.message}`, 'ACTION_FAILED', 500);
  }
}
