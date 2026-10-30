import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/sqlite';
import { verifyAndAdmitIntern, rejectInternDeposit, getInternApplicationById, getInternApplicationByEmail } from '@/lib/db/intern-repo';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get('status') || '';
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    const db = getDb();

    // Query all applicants with payment submissions or enrolled status
    const rows = db.prepare(`
      SELECT 
        id, user_id, user_name, user_email, phone, college_name, track_name,
        status, utr_number, deposit_receipt, deposit_paid_at, signature_name,
        offer_accepted_at, offer_letter_id, batch_start_date, feedback_note,
        applied_at, updated_at
      FROM intern_applications
      WHERE status IN ('deposit_pending_verification', 'enrolled', 'deposit_paid', 'onboarded')
         OR utr_number IS NOT NULL
         OR deposit_receipt IS NOT NULL
      ORDER BY 
        CASE WHEN status = 'deposit_pending_verification' THEN 0 ELSE 1 END,
        COALESCE(deposit_paid_at, updated_at) DESC
    `).all() as any[];

    // Also get corresponding payment records
    const payments = db.prepare(`
      SELECT id, user_id, user_email, amount_inr, payment_status, payment_method,
             transaction_ref, receipt_number, created_at
      FROM payments
      ORDER BY created_at DESC
    `).all() as any[];

    const paymentMap = new Map<string, any>();
    for (const p of payments) {
      if (p.receipt_number) paymentMap.set(p.receipt_number, p);
      if (p.transaction_ref) paymentMap.set(p.transaction_ref, p);
      if (p.user_email) paymentMap.set(p.user_email.toLowerCase(), p);
    }

    let records = rows.map((r) => {
      const p = paymentMap.get(r.deposit_receipt) || 
                paymentMap.get(r.utr_number) || 
                paymentMap.get((r.user_email || '').toLowerCase());
      return {
        id: r.id,
        name: r.user_name,
        email: r.user_email,
        phone: r.phone,
        college: r.college_name,
        track: r.track_name,
        status: r.status,
        utrNumber: r.utr_number || p?.transaction_ref || 'N/A',
        receiptNumber: r.deposit_receipt || p?.receipt_number || 'N/A',
        depositPaidAt: r.deposit_paid_at || p?.created_at,
        amountINR: p?.amount_inr || 499,
        paymentStatus: p?.payment_status || (r.status === 'enrolled' ? 'completed' : 'pending_verification'),
        signatureName: r.signature_name,
        offerAcceptedAt: r.offer_accepted_at,
        offerLetterId: r.offer_letter_id,
        batchStartDate: r.batch_start_date || '2026-11-02',
        feedbackNote: r.feedback_note,
        updatedAt: r.updated_at,
      };
    });

    if (filterStatus) {
      records = records.filter((r) => r.status === filterStatus);
    }

    if (searchQuery) {
      records = records.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery) ||
          r.email.toLowerCase().includes(searchQuery) ||
          (r.phone && r.phone.includes(searchQuery)) ||
          r.utrNumber.toLowerCase().includes(searchQuery) ||
          r.receiptNumber.toLowerCase().includes(searchQuery)
      );
    }

    const pendingCount = rows.filter((r) => r.status === 'deposit_pending_verification').length;
    const enrolledCount = rows.filter((r) => r.status === 'enrolled' || r.status === 'onboarded').length;
    const totalCollectedINR = (pendingCount + enrolledCount) * 499;

    return apiSuccess({
      metrics: {
        totalSubmissions: rows.length,
        pendingVerification: pendingCount,
        enrolled: enrolledCount,
        totalCollectedINR,
      },
      records,
    });
  } catch (err: any) {
    return apiError(`Failed to fetch payments: ${err.message}`, 'FETCH_FAILED', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const candidateId = body.candidateId || body.id;
    const email = body.email;
    const action = body.action || 'approve'; // 'approve' | 'reject'
    const reason = body.reason;

    if (!candidateId && !email) {
      return apiError('candidateId or email is required', 'MISSING_PARAM', 400);
    }

    let app = candidateId ? getInternApplicationById(candidateId) : getInternApplicationByEmail(email);
    if (!app) {
      return apiError('Candidate not found', 'NOT_FOUND', 404);
    }

    if (action === 'approve') {
      const updated = verifyAndAdmitIntern(app.id);
      return apiSuccess({
        message: `Candidate ${updated.userName} successfully verified and admitted to cohort!`,
        candidate: updated,
      });
    }

    if (action === 'reject') {
      const updated = rejectInternDeposit(app.id, reason || 'UTR verification failed. Please check your bank transaction.');
      return apiSuccess({
        message: `Deposit rejected for ${updated.userName}. Status reverted to offer accepted.`,
        candidate: updated,
      });
    }

    return apiError(`Invalid action: ${action}`, 'INVALID_ACTION', 400);
  } catch (err: any) {
    return apiError(`Verification action failed: ${err.message}`, 'ACTION_ERROR', 500);
  }
}
