import { getDb } from './sqlite';
import { InternApplication, InterviewQuestion, PaymentRecord, DbertLeadProfile, ProctoringTelemetry } from '@/types/auth';
import {
  INTERVIEW_QUESTIONS,
  getInterviewQuestions,
  getInterviewQuestionsForTrack,
  getTechnicalQuestionsForTrack,
  computeDbertProfile
} from '@/lib/data/intern-questions';
import crypto from 'crypto';

export { getInterviewQuestions, getInterviewQuestionsForTrack, getTechnicalQuestionsForTrack, computeDbertProfile };

function mapRowToInternApplication(row: Record<string, unknown>): InternApplication {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    userEmail: String(row.user_email),
    phone: row.phone ? String(row.phone) : undefined,
    collegeName: row.college_name ? String(row.college_name) : undefined,
    semester: row.semester ? String(row.semester) : undefined,
    trackName: String(row.track_name),
    cvUrl: row.cv_url ? String(row.cv_url) : undefined,
    status: row.status as InternApplication['status'],
    magicToken: row.magic_token ? String(row.magic_token) : undefined,
    magicTokenExpiresAt: row.magic_token_expires_at ? String(row.magic_token_expires_at) : undefined,
    inviteScheduledAt: row.invite_scheduled_at ? String(row.invite_scheduled_at) : undefined,
    inviteSentAt: row.invite_sent_at ? String(row.invite_sent_at) : undefined,
    interviewScore: row.interview_score !== null && row.interview_score !== undefined ? Number(row.interview_score) : undefined,
    interviewAnswers: row.interview_answers_json ? JSON.parse(String(row.interview_answers_json)) : undefined,
    dbertProfile: row.dbert_profile_json ? JSON.parse(String(row.dbert_profile_json)) : undefined,
    proctoringTelemetry: row.proctoring_telemetry_json ? JSON.parse(String(row.proctoring_telemetry_json)) : undefined,
    feedbackNote: row.feedback_note ? String(row.feedback_note) : undefined,
    offerLetterId: row.offer_letter_id ? String(row.offer_letter_id) : undefined,
    offerSentAt: row.offer_sent_at ? String(row.offer_sent_at) : undefined,
    offerAcceptedAt: row.offer_accepted_at ? String(row.offer_accepted_at) : undefined,
    signatureName: row.signature_name ? String(row.signature_name) : undefined,
    batchStartDate: row.batch_start_date ? String(row.batch_start_date) : '2026-11-02',
    available3Months: row.available_3_months ? String(row.available_3_months) : undefined,
    laptopInternet: row.laptop_internet ? String(row.laptop_internet) : undefined,
    placementNeeded: row.placement_needed ? String(row.placement_needed) : undefined,
    sourceReferral: row.source_referral ? String(row.source_referral) : undefined,
    depositReceipt: row.deposit_receipt ? String(row.deposit_receipt) : undefined,
    depositPaidAt: row.deposit_paid_at ? String(row.deposit_paid_at) : undefined,
    utrNumber: row.utr_number ? String(row.utr_number) : undefined,
    appliedAt: String(row.applied_at),
    updatedAt: String(row.updated_at)
  };
}

export function getInternApplicationByUserId(userId: string): InternApplication | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM intern_applications WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(userId) as Record<string, unknown> | undefined;
  return row ? mapRowToInternApplication(row) : null;
}

export function getInternApplicationById(id: string): InternApplication | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM intern_applications WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapRowToInternApplication(row) : null;
}

export function getInternApplicationByEmail(email: string): InternApplication | null {
  const db = getDb();
  const cleanEmail = email.trim().toLowerCase();
  const row = db.prepare('SELECT * FROM intern_applications WHERE LOWER(user_email) = ? ORDER BY updated_at DESC LIMIT 1').get(cleanEmail) as Record<string, unknown> | undefined;
  return row ? mapRowToInternApplication(row) : null;
}

export function getInternApplicationByToken(token: string): InternApplication | null {
  const db = getDb();
  const cleanToken = token.trim();
  const row = db.prepare('SELECT * FROM intern_applications WHERE magic_token = ? ORDER BY updated_at DESC LIMIT 1').get(cleanToken) as Record<string, unknown> | undefined;
  return row ? mapRowToInternApplication(row) : null;
}

export function ensureCandidateMagicToken(candidateId: string): InternApplication {
  const db = getDb();
  let candidate = getInternApplicationById(candidateId);
  if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);
  if (!candidate.magicToken || candidate.magicToken.trim() === '' || candidate.magicToken === 'undefined') {
    const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE intern_applications SET magic_token = ?, updated_at = ? WHERE id = ?')
      .run(token, new Date().toISOString(), candidateId);
    candidate = getInternApplicationById(candidateId)!;
  }
  return candidate;
}

export function upsertInternApplicationFromSheet(data: {
  userName: string;
  userEmail: string;
  phone?: string;
  collegeName?: string;
  semester?: string;
  trackName: string;
  cvUrl?: string;
  available3Months?: string;
  laptopInternet?: string;
  placementNeeded?: string;
  sourceReferral?: string;
  appliedAt?: string;
}): { application: InternApplication; isNew: boolean } {
  const db = getDb();
  const cleanEmail = data.userEmail.trim().toLowerCase();
  const existing = getInternApplicationByEmail(cleanEmail);
  const now = new Date().toISOString();

  if (existing) {
    // Update metadata if needed without resetting active progress
    db.prepare(`
      UPDATE intern_applications
      SET phone = COALESCE(?, phone),
          college_name = COALESCE(?, college_name),
          semester = COALESCE(?, semester),
          track_name = COALESCE(?, track_name),
          cv_url = COALESCE(?, cv_url),
          available_3_months = COALESCE(?, available_3_months),
          laptop_internet = COALESCE(?, laptop_internet),
          placement_needed = COALESCE(?, placement_needed),
          source_referral = COALESCE(?, source_referral),
          updated_at = ?
      WHERE id = ?
    `).run(
      data.phone || null,
      data.collegeName || null,
      data.semester || null,
      data.trackName || null,
      data.cvUrl || null,
      data.available3Months || null,
      data.laptopInternet || null,
      data.placementNeeded || null,
      data.sourceReferral || null,
      now,
      existing.id
    );

    return {
      application: getInternApplicationById(existing.id)!,
      isNew: false
    };
  }

  // Create new application
  const id = `app-int-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail) as { id: string } | undefined;
  let finalUserId = existingUser?.id;

  if (!finalUserId) {
    finalUserId = `usr-int-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
      VALUES (?, ?, 'N/A', 'N/A', ?, 'intern', ?, 'pending', ?, ?)
    `).run(
      finalUserId,
      cleanEmail,
      data.userName.trim(),
      data.phone || null,
      now,
      now
    );
  }

  // Ensure a corresponding user record exists in users table before inserting into intern_applications to uphold FK integrity
  const userCheck = db.prepare('SELECT id FROM users WHERE id = ?').get(finalUserId) as { id: string } | undefined;
  if (!userCheck) {
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
      VALUES (?, ?, 'N/A', 'N/A', ?, 'intern', ?, 'pending', ?, ?)
    `).run(
      finalUserId,
      cleanEmail,
      data.userName.trim(),
      data.phone || null,
      now,
      now
    );
  }

  const magicToken = crypto.randomBytes(24).toString('hex');

  // Compute 2-hour delay window: appliedAt + 2 hours
  const appliedDate = data.appliedAt ? new Date(data.appliedAt) : new Date(now);
  const inviteScheduledDate = isNaN(appliedDate.getTime())
    ? new Date(Date.now() + 2 * 60 * 60 * 1000)
    : new Date(appliedDate.getTime() + 2 * 60 * 60 * 1000);
  const inviteScheduledAt = inviteScheduledDate.toISOString();

  db.prepare(`
    INSERT INTO intern_applications (
      id, user_id, user_name, user_email, phone, college_name, semester,
      track_name, cv_url, status, magic_token, magic_token_expires_at,
      invite_scheduled_at, batch_start_date, available_3_months, laptop_internet,
      placement_needed, source_referral, applied_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, ?, ?, '2026-11-02', ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    finalUserId,
    data.userName.trim(),
    cleanEmail,
    data.phone || null,
    data.collegeName || null,
    data.semester || null,
    data.trackName || 'Sustainable Regional Operations & Growth',
    data.cvUrl || null,
    magicToken,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day validity
    inviteScheduledAt,
    data.available3Months || 'Yes',
    data.laptopInternet || 'Yes',
    data.placementNeeded || 'No',
    data.sourceReferral || 'Direct',
    data.appliedAt || now,
    now
  );

  return {
    application: getInternApplicationById(id)!,
    isNew: true
  };
}

export function evaluateInterviewAssessment(
  answers: Record<string, string>,
  trackName?: string
): {
  score: number;
  selected: boolean;
  feedback: string;
  dbertProfile: DbertLeadProfile;
} {
  const isOriginal = Object.keys(answers).some((k) =>
    k.startsWith('q-pacing') || k.startsWith('q-partner') || k.startsWith('q-altitude') || k.startsWith('q-community') || k.startsWith('q-ops')
  );
  const questions = (isOriginal || !trackName)
    ? getTechnicalQuestionsForTrack('Operations')
    : getTechnicalQuestionsForTrack(trackName);

  let totalScore = 0;

  questions.forEach((q) => {
    const selectedOptionId = answers[q.id];
    const option = q.options.find((o) => o.id === selectedOptionId);
    if (option) {
      totalScore += option.points;
    }
  });

  const selected = totalScore >= 70;
  const feedback = selected
    ? `Congratulations! You scored ${totalScore}/100 and demonstrated strong competency and alignment with Vayanai principles. You are officially selected.`
    : `Your score was ${totalScore}/100, which is below our recommendation threshold (70%). Application retained for review.`;

  const dbertProfile = computeDbertProfile(answers);

  return { score: totalScore, selected, feedback, dbertProfile };
}

export function submitInternInterview(
  userId: string,
  answers: Record<string, string>,
  telemetry?: Partial<ProctoringTelemetry>
): { application: InternApplication; score: number; selected: boolean } {
  const db = getDb();
  let app = getInternApplicationByUserId(userId);
  if (!app) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (user) {
      const appId = `app-int-${Date.now()}`;
      db.prepare(`
        INSERT INTO intern_applications (id, user_id, user_name, user_email, track_name, status, applied_at, updated_at)
        VALUES (?, ?, ?, ?, 'Sustainable Regional Operations & Growth', 'applied', datetime('now'), datetime('now'))
      `).run(appId, userId, user.name, user.email);
      app = getInternApplicationByUserId(userId);
    }
  }
  if (!app) {
    throw new Error('Intern application not found for user.');
  }

  const { score: totalScore, selected, feedback, dbertProfile } = evaluateInterviewAssessment(answers, app.trackName);
  const newStatus = selected ? 'selected' : 'interview_completed';
  const now = new Date().toISOString();

  // Telemetry calculation
  const tabSwitches = Number(telemetry?.tabSwitchCount || 0);
  const copyAttempts = Number(telemetry?.copyPasteAttempts || 0);
  const flags: string[] = [];
  if (tabSwitches > 0) flags.push(`${tabSwitches} tab switch(es) detected`);
  if (copyAttempts > 0) flags.push(`${copyAttempts} clipboard copy/paste attempt(s) blocked`);

  let integrityScore: 'CLEAN' | 'FLAGGED_MODERATE' | 'FLAGGED_HIGH' = 'CLEAN';
  if (tabSwitches >= 3 || copyAttempts >= 2) {
    integrityScore = 'FLAGGED_HIGH';
  } else if (tabSwitches > 0 || copyAttempts > 0) {
    integrityScore = 'FLAGGED_MODERATE';
  }

  const fullTelemetry: ProctoringTelemetry = {
    tabSwitchCount: tabSwitches,
    copyPasteAttempts: copyAttempts,
    totalDurationSeconds: Number(telemetry?.totalDurationSeconds || 0),
    webcamVerified: false,
    integrityScore,
    flags,
    submittedAt: now
  };

  db.prepare(`
    UPDATE intern_applications
    SET status = ?, interview_score = ?, interview_answers_json = ?, dbert_profile_json = ?, proctoring_telemetry_json = ?, feedback_note = ?, updated_at = ?
    WHERE user_id = ?
  `).run(
    newStatus,
    totalScore,
    JSON.stringify(answers),
    JSON.stringify(dbertProfile),
    JSON.stringify(fullTelemetry),
    feedback,
    now,
    userId
  );

  return {
    application: getInternApplicationByUserId(userId)!,
    score: totalScore,
    selected
  };
}

export function submitInternInterviewByToken(
  token: string,
  answers: Record<string, string>,
  telemetry?: Partial<ProctoringTelemetry>
): { application: InternApplication; score: number; selected: boolean } {
  const db = getDb();
  const app = getInternApplicationByToken(token);
  if (!app) {
    throw new Error('Invalid or expired interview token.');
  }

  // Idempotency: If already submitted, return the recorded state
  if (
    app.interviewAnswers &&
    (app.status === 'selected' ||
      app.status === 'interview_completed' ||
      app.status === 'offer_sent' ||
      app.status === 'offer_accepted' ||
      app.status === 'enrolled')
  ) {
    return {
      application: app,
      score: app.interviewScore || 0,
      selected: app.status !== 'interview_completed'
    };
  }

  const { score: totalScore, selected, feedback, dbertProfile } = evaluateInterviewAssessment(answers, app.trackName);
  const newStatus = selected ? 'selected' : 'interview_completed';
  const now = new Date().toISOString();

  // Process telemetry
  const proctoringMode = telemetry?.proctoringMode === 'camera_free' ? 'camera_free' : 'webcam';
  const isCameraFree = proctoringMode === 'camera_free';
  const tabSwitches = Number(telemetry?.tabSwitchCount || 0);
  const copyAttempts = Number(telemetry?.copyPasteAttempts || 0);
  const fullscreenExits = Number(telemetry?.fullscreenExits || 0);
  const totalSeconds = Number(telemetry?.totalDurationSeconds || 0);
  const webcamVerified = isCameraFree ? false : Boolean(telemetry?.webcamVerified ?? true);

  const flags: string[] = [];
  if (tabSwitches > 0) flags.push(`${tabSwitches} tab switch(es) detected`);
  if (copyAttempts > 0) flags.push(`${copyAttempts} clipboard copy/paste attempt(s) blocked`);
  if (fullscreenExits > 0) flags.push(`${fullscreenExits} fullscreen exit(s)`);
  if (!webcamVerified && !isCameraFree) {
    flags.push('Webcam proctoring was disconnected or unverified');
  } else if (isCameraFree) {
    flags.push('Candidate opted for Camera-Free Telemetry Mode (Browser focus & timing verified)');
  }

  let integrityScore: 'CLEAN' | 'FLAGGED_MODERATE' | 'FLAGGED_HIGH' = 'CLEAN';
  if (tabSwitches >= 3 || copyAttempts >= 2) {
    integrityScore = 'FLAGGED_HIGH';
  } else if (tabSwitches > 0 || copyAttempts > 0) {
    integrityScore = 'FLAGGED_MODERATE';
  }

  const fullTelemetry: ProctoringTelemetry = {
    proctoringMode,
    tabSwitchCount: tabSwitches,
    copyPasteAttempts: copyAttempts,
    fullscreenExits,
    totalDurationSeconds: totalSeconds,
    webcamVerified,
    cameraFreeReason: isCameraFree ? (telemetry?.cameraFreeReason || 'Candidate choice (camera unavailable or privacy)') : undefined,
    integrityScore,
    flags,
    submittedAt: now
  };

  db.prepare(`
    UPDATE intern_applications
    SET status = ?,
        interview_score = ?,
        interview_answers_json = ?,
        dbert_profile_json = ?,
        proctoring_telemetry_json = ?,
        feedback_note = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    newStatus,
    totalScore,
    JSON.stringify(answers),
    JSON.stringify(dbertProfile),
    JSON.stringify(fullTelemetry),
    feedback,
    now,
    app.id
  );

  return {
    application: getInternApplicationById(app.id)!,
    score: totalScore,
    selected
  };
}

export function resetInternApplicationForRetake(token: string): boolean {
  const db = getDb();
  const cleanToken = token.trim();
  const app = getInternApplicationByToken(cleanToken);
  if (!app) return false;

  db.prepare(`
    UPDATE intern_applications
    SET status = 'invited',
        interview_score = NULL,
        interview_answers_json = NULL,
        dbert_profile_json = NULL,
        proctoring_telemetry_json = NULL,
        feedback_note = NULL,
        updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), app.id);

  return true;
}

export function markInviteSent(id: string, sentAt?: string): void {
  const db = getDb();
  const now = sentAt || new Date().toISOString();
  db.prepare(`
    UPDATE intern_applications
    SET status = CASE WHEN status = 'applied' THEN 'invited' ELSE status END,
        invite_sent_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(now, now, id);
}

export function approveCandidateAndGenerateOffer(
  id: string,
  customOfferId?: string
): { application: InternApplication; offerId: string } {
  const db = getDb();
  const app = getInternApplicationById(id);
  if (!app) {
    throw new Error(`Intern application not found: ${id}`);
  }

  const now = new Date().toISOString();
  const offerId = customOfferId || app.offerLetterId || `VY-OFFER-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  db.prepare(`
    UPDATE intern_applications
    SET status = 'offer_sent',
        offer_letter_id = ?,
        offer_sent_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(offerId, now, now, id);

  return {
    application: getInternApplicationById(id)!,
    offerId
  };
}

export function adminApproveAssessment(
  id: string
): { application: InternApplication; offerLetterId: string } {
  const db = getDb();
  const app = getInternApplicationById(id);
  if (!app) {
    throw new Error(`Intern application not found: ${id}`);
  }

  const now = new Date().toISOString();
  let offerId = app.offerLetterId;
  if (!offerId) {
    const trackCode = (app.trackName || '').toLowerCase().includes('data')
      ? 'DA'
      : (app.trackName || '').toLowerCase().includes('ai')
      ? 'AI'
      : (app.trackName || '').toLowerCase().includes('python')
      ? 'PA'
      : (app.trackName || '').toLowerCase().includes('stack')
      ? 'FS'
      : 'OPS';
    offerId = `VY-2026-${trackCode}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  db.prepare(`
    UPDATE intern_applications
    SET status = 'selected',
        offer_letter_id = ?,
        offer_sent_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(offerId, now, now, id);

  return {
    application: getInternApplicationById(id)!,
    offerLetterId: offerId
  };
}

export function adminRejectAssessment(id: string, reason?: string): InternApplication {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE intern_applications
    SET status = 'rejected',
        feedback_note = COALESCE(?, feedback_note),
        updated_at = ?
    WHERE id = ?
  `).run(reason || 'Assessment evaluated and rejected by Admissions Council.', now, id);

  return getInternApplicationById(id)!;
}

export function rejectCandidate(id: string, note?: string): InternApplication {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE intern_applications
    SET status = 'rejected',
        feedback_note = COALESCE(?, feedback_note),
        updated_at = ?
    WHERE id = ?
  `).run(note || 'Application rejected during evaluation.', now, id);

  return getInternApplicationById(id)!;
}

export function acceptOfferWithSignature(
  token: string,
  signatureName: string
): InternApplication {
  const db = getDb();
  const app = getInternApplicationByToken(token);
  if (!app) {
    throw new Error('Invalid or expired offer token.');
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE intern_applications
    SET status = 'offer_accepted',
        signature_name = ?,
        offer_accepted_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(signatureName.trim(), now, now, app.id);

  return getInternApplicationById(app.id)!;
}

/**
 * Email-portal variant of acceptOfferWithSignature.
 * Looks up candidate by email address instead of magic token.
 */
export function acceptOfferByEmail(
  email: string,
  signatureName: string
): InternApplication {
  const app = getInternApplicationByEmail(email.trim().toLowerCase());
  if (!app) {
    throw new Error('No application found for this email address.');
  }

  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(`
    UPDATE intern_applications
    SET status = 'offer_accepted',
        signature_name = ?,
        offer_accepted_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(signatureName.trim(), now, now, app.id);

  return getInternApplicationById(app.id)!;
}

/**
 * Email-portal variant of processInternDeposit.
 * Sets status to 'deposit_pending_verification' so staff manually confirms the UTR
 * before the candidate is marked enrolled — safer than auto-enrolling on UTR entry.
 */
export function processInternDepositByEmail(
  email: string,
  paymentMethod: string = 'upi_qr',
  utrNumber?: string
): PaymentRecord {
  const cleanEmail = email.trim().toLowerCase();
  const app = getInternApplicationByEmail(cleanEmail);
  if (!app) {
    throw new Error('No application found for this email address.');
  }

  const db = getDb();
  const now = new Date().toISOString();
  const receiptNumber = `VP-VER-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const baseUtr = utrNumber && utrNumber.trim().length > 0
    ? utrNumber.trim()
    : `txn_pending_${Date.now().toString(36)}`;

  // Ensure transactionRef uniqueness
  let finalTransactionRef = baseUtr;
  const existingTxn = db.prepare('SELECT id FROM payments WHERE transaction_ref = ?').get(finalTransactionRef);
  if (existingTxn) {
    finalTransactionRef = `${baseUtr}_${Date.now().toString(36)}`;
  }

  const paymentId = `pay-email-${Date.now()}`;

  // Insert payment record as pending_verification (not completed — staff must verify UTR)
  db.prepare(`
    INSERT INTO payments (
      id, user_id, user_email, user_name, product_type, amount_inr,
      currency, payment_status, payment_method, transaction_ref,
      receipt_number, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    paymentId,
    app.userId,
    app.userEmail,
    app.userName,
    'security_deposit',
    499,
    'INR',
    'pending_verification',
    paymentMethod,
    finalTransactionRef,
    receiptNumber,
    now
  );

  // Set status to pending_verification — staff uses admin panel to finalize
  db.prepare(`
    UPDATE intern_applications
    SET status = 'deposit_pending_verification',
        deposit_receipt = ?,
        deposit_paid_at = ?,
        utr_number = ?,
        updated_at = ?
    WHERE id = ?
  `).run(receiptNumber, now, finalTransactionRef, now, app.id);

  return {
    id: paymentId,
    userId: app.userId,
    userEmail: app.userEmail,
    userName: app.userName,
    productType: 'security_deposit',
    amountINR: 499,
    currency: 'INR',
    paymentStatus: 'pending_verification',
    paymentMethod,
    transactionRef: finalTransactionRef,
    receiptNumber,
    createdAt: now
  };
}

export function processInternDeposit(
  userIdOrToken: string,
  paymentMethod: string = 'upi_qr',
  utrNumber?: string
): PaymentRecord {
  const db = getDb();
  let app = getInternApplicationByToken(userIdOrToken);
  if (!app) {
    app = getInternApplicationByUserId(userIdOrToken);
  }
  if (!app) {
    app = getInternApplicationById(userIdOrToken);
  }
  if (!app) {
    throw new Error('Intern application not found.');
  }

  const now = new Date().toISOString();
  const receiptNumber = `VP-DEP-499-${Math.floor(1000 + Math.random() * 9000)}`;
  const baseUtr = utrNumber && utrNumber.trim().length > 0
    ? utrNumber.trim()
    : `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Idempotency check: if application already has a deposit receipt
  if (app.depositReceipt && (app.status === 'enrolled' || app.status === 'onboarded')) {
    const existingPayment = db.prepare(`
      SELECT * FROM payments WHERE (user_id = ? OR receipt_number = ?) AND product_type = 'security_deposit' ORDER BY created_at DESC LIMIT 1
    `).get(app.userId, app.depositReceipt) as Record<string, unknown> | undefined;

    if (existingPayment) {
      return {
        id: String(existingPayment.id),
        userId: String(existingPayment.user_id),
        userEmail: String(existingPayment.user_email),
        userName: String(existingPayment.user_name),
        productType: 'security_deposit',
        amountINR: Number(existingPayment.amount_inr),
        currency: 'INR',
        paymentStatus: 'completed',
        paymentMethod: String(existingPayment.payment_method || 'upi_qr'),
        transactionRef: String(existingPayment.transaction_ref),
        receiptNumber: String(existingPayment.receipt_number),
        createdAt: String(existingPayment.created_at)
      };
    }
  }

  // Ensure transactionRef uniqueness against existing payments
  let finalTransactionRef = baseUtr;
  const existingTxn = db.prepare('SELECT id FROM payments WHERE transaction_ref = ?').get(finalTransactionRef);
  if (existingTxn) {
    finalTransactionRef = `${baseUtr}_${Date.now().toString(36)}`;
  }

  const paymentId = `pay-${Date.now()}`;

  // Insert payment record as completed
  db.prepare(`
    INSERT INTO payments (
      id, user_id, user_email, user_name, product_type, amount_inr,
      currency, payment_status, payment_method, transaction_ref,
      receipt_number, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    paymentId,
    app.userId,
    app.userEmail,
    app.userName,
    'security_deposit',
    499,
    'INR',
    'completed',
    paymentMethod,
    finalTransactionRef,
    receiptNumber,
    now
  );

  // Seat lock: Status set to enrolled
  const newStatus = 'enrolled';

  db.prepare(`
    UPDATE intern_applications
    SET status = ?,
        deposit_receipt = ?,
        deposit_paid_at = ?,
        utr_number = ?,
        updated_at = ?
    WHERE id = ?
  `).run(newStatus, receiptNumber, now, finalTransactionRef, now, app.id);

  return {
    id: paymentId,
    userId: app.userId,
    userEmail: app.userEmail,
    userName: app.userName,
    productType: 'security_deposit',
    amountINR: 499,
    currency: 'INR',
    paymentStatus: 'completed',
    paymentMethod,
    transactionRef: finalTransactionRef,
    receiptNumber,
    createdAt: now
  };
}

export function verifyAndAdmitIntern(id: string): InternApplication {
  const db = getDb();
  const app = getInternApplicationById(id);
  if (!app) throw new Error(`Intern application not found: ${id}`);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE intern_applications
    SET status = 'enrolled',
        batch_start_date = COALESCE(batch_start_date, ?),
        updated_at = ?
    WHERE id = ?
  `).run(now.split('T')[0], now, id);

  // Update any pending payments
  if (app.depositReceipt) {
    db.prepare(`
      UPDATE payments
      SET payment_status = 'completed'
      WHERE receipt_number = ? OR user_id = ?
    `).run(app.depositReceipt, app.userId);
  }

  return getInternApplicationById(id)!;
}

export function rejectInternDeposit(id: string, reason?: string): InternApplication {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE intern_applications
    SET status = 'offer_accepted',
        feedback_note = ?,
        updated_at = ?
    WHERE id = ?
  `).run(reason || 'Deposit UTR verification failed. Please submit a valid transaction reference.', now, id);

  return getInternApplicationById(id)!;
}

export function clearInternCompletion(id: string): InternApplication {
  const db = getDb();
  const app = getInternApplicationById(id);
  if (!app) throw new Error(`Intern application not found: ${id}`);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE intern_applications
    SET status = 'completed',
        updated_at = ?
    WHERE id = ?
  `).run(now, id);

  // Ensure active certificate in certificates table
  const existingCert = db.prepare('SELECT id FROM certificates WHERE LOWER(intern_email) = ?').get(app.userEmail.toLowerCase());
  if (!existingCert) {
    const certCode = `CERT-VAY-${new Date().getFullYear()}-${app.trackName.includes('AI') ? 'AI' : app.trackName.includes('Data') ? 'DA' : 'RO'}-${Math.floor(100 + Math.random() * 900)}`;
    const certId = `cert-${Date.now()}`;
    const joiningDate = app.batchStartDate || '2026-11-02';
    const completionDate = now.split('T')[0];
    const qrUrl = `https://vayanai.in.net/verify/${certCode}`;

    db.prepare(`
      INSERT INTO certificates (
        id, certificate_id, intern_id, user_id, intern_name, intern_email,
        domain, topics_covered, project_name, project_description, project_deliverables,
        mentor_name, mentor_role, mentor_email, joining_date, completion_date,
        issue_date, qr_payload_url, status, udyam_reg_number, issuing_authority,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'UDYAM-UP-29-0109046', 'DBERT Technical Council & Vayanai Operations Platform', ?, ?)
    `).run(
      certId,
      certCode,
      app.id,
      app.userId,
      app.userName,
      app.userEmail,
      app.trackName,
      'Data Analytics, Mountain Corridor Route Optimization, Regional Impact Auditing',
      `${app.trackName} Industry Practicum`,
      'Industrial research, real-time corridor pacing models, and regional travel economic metrics.',
      'Verified telemetry model, route pacing ledger, and presentation to technical review board.',
      'Dr. Raghavan Nair',
      'Chief Technical Mentor & Operations Lead',
      'operations@vayanai.in.net',
      joiningDate,
      completionDate,
      completionDate,
      qrUrl,
      now,
      now
    );
  }

  return getInternApplicationById(id)!;
}

export interface InternApplicationFilters {
  status?: string;
  track?: string;
  search?: string;
  dbertLead?: string;
  scoreBracket?: string;
  integrityLevel?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function listAllInternApplications(filters?: InternApplicationFilters): InternApplication[] {
  const db = getDb();
  let sql = 'SELECT * FROM intern_applications WHERE 1=1';
  const params: (string | number | bigint | null)[] = [];

  if (filters?.status && filters.status !== 'ALL') {
    if (filters.status === 'flagged') {
      sql += ' AND (proctoring_telemetry_json LIKE \'%"tabSwitchCount":%\' AND (proctoring_telemetry_json NOT LIKE \'%"tabSwitchCount":0%\' OR proctoring_telemetry_json NOT LIKE \'%"copyPasteAttempts":0%\'))';
    } else {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
  }

  if (filters?.track && filters.track !== 'ALL') {
    sql += ' AND LOWER(track_name) LIKE ?';
    params.push(`%${filters.track.toLowerCase()}%`);
  }

  if (filters?.dbertLead && filters.dbertLead !== 'ALL') {
    sql += ' AND dbert_profile_json LIKE ?';
    params.push(`%"leadPropensity":"${filters.dbertLead}"%`);
  }

  if (filters?.scoreBracket && filters.scoreBracket !== 'ALL') {
    if (filters.scoreBracket === 'distinction') {
      sql += ' AND interview_score >= 85';
    } else if (filters.scoreBracket === 'qualified') {
      sql += ' AND interview_score >= 70';
    } else if (filters.scoreBracket === 'marginal') {
      sql += ' AND interview_score >= 50 AND interview_score < 70';
    } else if (filters.scoreBracket === 'disqualified') {
      sql += ' AND interview_score < 50';
    }
  }

  if (filters?.integrityLevel && filters.integrityLevel !== 'ALL') {
    if (filters.integrityLevel === 'clean') {
      sql += ' AND (proctoring_telemetry_json IS NULL OR proctoring_telemetry_json LIKE \'%"integrityScore":"CLEAN"%\')';
    } else if (filters.integrityLevel === 'tab_switches') {
      sql += ' AND (proctoring_telemetry_json LIKE \'%"tabSwitchCount":1%\' OR proctoring_telemetry_json LIKE \'%"tabSwitchCount":2%\' OR proctoring_telemetry_json LIKE \'%"tabSwitchCount":3%\' OR proctoring_telemetry_json LIKE \'%"tabSwitchCount":4%\' OR proctoring_telemetry_json LIKE \'%"tabSwitchCount":5%\')';
    } else if (filters.integrityLevel === 'copy_paste') {
      sql += ' AND (proctoring_telemetry_json LIKE \'%"copyPasteAttempts":1%\' OR proctoring_telemetry_json LIKE \'%"copyPasteAttempts":2%\' OR proctoring_telemetry_json LIKE \'%"copyPasteAttempts":3%\')';
    } else if (filters.integrityLevel === 'flagged') {
      sql += ' AND proctoring_telemetry_json LIKE \'%"integrityScore":"FLAGGED%\'';
    }
  }

  if (filters?.search) {
    const q = `%${filters.search.toLowerCase()}%`;
    sql += ' AND (LOWER(user_name) LIKE ? OR LOWER(user_email) LIKE ? OR phone LIKE ? OR LOWER(college_name) LIKE ? OR offer_letter_id LIKE ? OR utr_number LIKE ?)';
    params.push(q, q, q, q, q, q);
  }

  const validSortMap: Record<string, string> = {
    'applied_at': 'applied_at',
    'appliedAt': 'applied_at',
    'interview_score': 'interview_score',
    'interviewScore': 'interview_score',
    'user_name': 'user_name',
    'userName': 'user_name',
    'status': 'status',
    'track_name': 'track_name',
    'trackName': 'track_name'
  };

  const sortCol = filters?.sortBy && validSortMap[filters.sortBy] ? validSortMap[filters.sortBy] : 'applied_at';
  const sortDir = (filters?.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  sql += ` ORDER BY ${sortCol} ${sortDir}, updated_at DESC`;

  if (filters?.page && filters?.limit) {
    const offset = (filters.page - 1) * filters.limit;
    sql += ` LIMIT ${filters.limit} OFFSET ${offset}`;
  }

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(mapRowToInternApplication);
}

export function countInternApplications(filters?: InternApplicationFilters): number {
  const db = getDb();
  let sql = 'SELECT COUNT(*) as cnt FROM intern_applications WHERE 1=1';
  const params: (string | number | bigint | null)[] = [];

  if (filters?.status && filters.status !== 'ALL') {
    if (filters.status === 'flagged') {
      sql += ' AND (proctoring_telemetry_json LIKE \'%"tabSwitchCount":%\' AND (proctoring_telemetry_json NOT LIKE \'%"tabSwitchCount":0%\' OR proctoring_telemetry_json NOT LIKE \'%"copyPasteAttempts":0%\'))';
    } else {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
  }

  if (filters?.track && filters.track !== 'ALL') {
    sql += ' AND LOWER(track_name) LIKE ?';
    params.push(`%${filters.track.toLowerCase()}%`);
  }

  if (filters?.dbertLead && filters.dbertLead !== 'ALL') {
    sql += ' AND dbert_profile_json LIKE ?';
    params.push(`%"leadPropensity":"${filters.dbertLead}"%`);
  }

  if (filters?.scoreBracket && filters.scoreBracket !== 'ALL') {
    if (filters.scoreBracket === 'distinction') {
      sql += ' AND interview_score >= 85';
    } else if (filters.scoreBracket === 'qualified') {
      sql += ' AND interview_score >= 70';
    } else if (filters.scoreBracket === 'marginal') {
      sql += ' AND interview_score >= 50 AND interview_score < 70';
    } else if (filters.scoreBracket === 'disqualified') {
      sql += ' AND interview_score < 50';
    }
  }

  if (filters?.integrityLevel && filters.integrityLevel !== 'ALL') {
    if (filters.integrityLevel === 'clean') {
      sql += ' AND (proctoring_telemetry_json IS NULL OR proctoring_telemetry_json LIKE \'%"integrityScore":"CLEAN"%\')';
    } else if (filters.integrityLevel === 'tab_switches') {
      sql += ' AND (proctoring_telemetry_json LIKE \'%"tabSwitchCount":1%\' OR proctoring_telemetry_json LIKE \'%"tabSwitchCount":2%\' OR proctoring_telemetry_json LIKE \'%"tabSwitchCount":3%\' OR proctoring_telemetry_json LIKE \'%"tabSwitchCount":4%\' OR proctoring_telemetry_json LIKE \'%"tabSwitchCount":5%\')';
    } else if (filters.integrityLevel === 'copy_paste') {
      sql += ' AND (proctoring_telemetry_json LIKE \'%"copyPasteAttempts":1%\' OR proctoring_telemetry_json LIKE \'%"copyPasteAttempts":2%\' OR proctoring_telemetry_json LIKE \'%"copyPasteAttempts":3%\')';
    } else if (filters.integrityLevel === 'flagged') {
      sql += ' AND proctoring_telemetry_json LIKE \'%"integrityScore":"FLAGGED%\'';
    }
  }

  if (filters?.search) {
    const q = `%${filters.search.toLowerCase()}%`;
    sql += ' AND (LOWER(user_name) LIKE ? OR LOWER(user_email) LIKE ? OR phone LIKE ? OR LOWER(college_name) LIKE ? OR offer_letter_id LIKE ? OR utr_number LIKE ?)';
    params.push(q, q, q, q, q, q);
  }

  const row = db.prepare(sql).get(...params) as { cnt: number } | undefined;
  return row ? Number(row.cnt) : 0;
}

export const submitInternAssessment = submitInternInterview;
export const recordRefundableDepositPayment = processInternDeposit;
export const getAllInternApplications = listAllInternApplications;
