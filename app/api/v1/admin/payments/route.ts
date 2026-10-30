import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/sqlite';
import {
  verifyAndAdmitIntern,
  rejectInternDeposit,
  getInternApplicationById,
  getInternApplicationByEmail,
} from '@/lib/db/intern-repo';
import { saveToPaymentsLedger, readPaymentsLedger } from '@/lib/db/payments-ledger';
import { apiSuccess, apiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get('status') || '';
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();
    const searchAll = searchParams.get('searchAll') === 'true';

    const db = getDb();

    // 1. If searching all applicants (e.g. for manual WhatsApp screenshot recording)
    if (searchAll && searchQuery) {
      const q = `%${searchQuery}%`;
      const matches = db.prepare(`
        SELECT id, user_name, user_email, phone, college_name, track_name, status, utr_number, offer_letter_id
        FROM intern_applications
        WHERE LOWER(user_name) LIKE ? OR LOWER(user_email) LIKE ? OR phone LIKE ?
        LIMIT 15
      `).all(q, q, q) as any[];

      return apiSuccess({
        applicants: matches.map((m) => ({
          id: m.id,
          name: m.user_name,
          email: m.user_email,
          phone: m.phone,
          college: m.college_name,
          track: m.track_name,
          status: m.status,
          utrNumber: m.utr_number,
          offerLetterId: m.offer_letter_id,
        })),
      });
    }

    // 2. Query all applicants with payment submissions or enrolled status
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
      const p =
        paymentMap.get(r.deposit_receipt) ||
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
        paymentStatus:
          p?.payment_status || (r.status === 'enrolled' ? 'completed' : 'pending_verification'),
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
    const phone = body.phone;
    const action = body.action || 'approve'; // 'approve' | 'reject' | 'record_manual_payment'
    const reason = body.reason;

    const db = getDb();

    // Find applicant
    let app: any = null;
    if (candidateId) {
      app = getInternApplicationById(candidateId);
    } else if (email) {
      app = getInternApplicationByEmail(email);
    } else if (phone) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      app = db.prepare('SELECT * FROM intern_applications WHERE phone LIKE ? LIMIT 1').get(`%${cleanPhone}`) as any;
    }

    if (!app) {
      return apiError('Candidate not found. Please verify email or phone number.', 'NOT_FOUND', 404);
    }

    // ── ACTION 1: Record Manual Payment (e.g. from WhatsApp Screenshot) ─────────
    if (action === 'record_manual_payment') {
      const rawUtr = (body.utrNumber || body.utr || '').trim();
      const utrNumber = rawUtr.length >= 4 ? rawUtr : `WA_PROOF_${Date.now().toString(36).toUpperCase()}`;
      const signatureName = (body.signatureName || app.userName || app.user_name).trim();
      const now = new Date().toISOString();
      const receiptNumber = `VP-VER-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const autoApprove = body.autoApprove !== false;

      // Ensure offer_letter_id exists
      let offerId = app.offerLetterId || app.offer_letter_id;
      if (!offerId) {
        const track = (app.trackName || app.track_name || '').toLowerCase();
        const trackCode = track.includes('data') ? 'DA' : track.includes('ai') ? 'AI' : track.includes('python') ? 'PA' : 'FS';
        offerId = `VY-2026-${trackCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const newStatus = autoApprove ? 'enrolled' : 'deposit_pending_verification';

      // Update intern_applications in SQLite
      db.prepare(`
        UPDATE intern_applications
        SET status = ?,
            utr_number = ?,
            deposit_receipt = ?,
            deposit_paid_at = ?,
            signature_name = ?,
            offer_accepted_at = COALESCE(offer_accepted_at, ?),
            offer_letter_id = ?,
            updated_at = ?
        WHERE id = ?
      `).run(newStatus, utrNumber, receiptNumber, now, signatureName, now, offerId, now, app.id);

      // Upsert payment record
      const paymentId = `pay-wa-${Date.now()}`;
      db.prepare(`
        INSERT OR REPLACE INTO payments (
          id, user_id, user_email, user_name, product_type, amount_inr,
          currency, payment_status, payment_method, transaction_ref,
          receipt_number, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        app.userId || app.user_id,
        app.userEmail || app.user_email,
        app.userName || app.user_name,
        'security_deposit',
        499,
        'INR',
        autoApprove ? 'completed' : 'pending_verification',
        'whatsapp_screenshot',
        utrNumber,
        receiptNumber,
        now
      );

      // Save to permanent payments_ledger.json
      saveToPaymentsLedger({
        applicationId: app.id,
        userName: app.userName || app.user_name,
        userEmail: app.userEmail || app.user_email,
        phone: app.phone,
        collegeName: app.collegeName || app.college_name,
        trackName: app.trackName || app.track_name,
        status: newStatus,
        utrNumber,
        receiptNumber,
        depositPaidAt: now,
        signatureName,
        offerAcceptedAt: now,
        offerLetterId: offerId,
        batchStartDate: app.batchStartDate || app.batch_start_date || '2026-11-02',
        paymentId,
        amountINR: 499,
        paymentStatus: autoApprove ? 'completed' : 'pending_verification',
        createdAt: now,
      });

      const updated = getInternApplicationById(app.id)!;
      return apiSuccess({
        message: `Successfully recorded payment for ${updated.userName}! Status: ${updated.status}.`,
        candidate: updated,
      });
    }

    // ── ACTION 2: Approve existing deposit proof ─────────────────────────────
    if (action === 'approve') {
      const updated = verifyAndAdmitIntern(app.id);

      // Update ledger
      saveToPaymentsLedger({
        applicationId: updated.id,
        userName: updated.userName,
        userEmail: updated.userEmail,
        phone: updated.phone,
        collegeName: updated.collegeName,
        trackName: updated.trackName,
        status: 'enrolled',
        utrNumber: updated.utrNumber || 'VERIFIED_BY_ADMIN',
        receiptNumber: updated.depositReceipt || `VP-VER-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        depositPaidAt: updated.depositPaidAt || new Date().toISOString(),
        signatureName: updated.signatureName,
        offerAcceptedAt: updated.offerAcceptedAt,
        offerLetterId: updated.offerLetterId,
        batchStartDate: updated.batchStartDate || '2026-11-02',
        amountINR: 499,
        paymentStatus: 'completed',
        createdAt: new Date().toISOString(),
      });

      return apiSuccess({
        message: `Candidate ${updated.userName} successfully verified and admitted to cohort!`,
        candidate: updated,
      });
    }

    // ── ACTION 3: Reject deposit proof ───────────────────────────────────────
    if (action === 'reject') {
      const updated = rejectInternDeposit(
        app.id,
        reason || 'UTR verification failed. Please check your bank transaction.'
      );
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
