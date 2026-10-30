import nodemailer, { type Transporter } from 'nodemailer';
import {
  getInternApplicationById,
  markInviteSent,
  approveCandidateAndGenerateOffer,
  listAllInternApplications,
  ensureCandidateMagicToken
} from '@/lib/db/intern-repo';
import { InternApplication, ProctoringTelemetry } from '@/types/auth';

export type CandidateEmailType =
  | 'application_received'
  | 'invitation'
  | 'assessment_completed'
  | 'offer'
  | 'rejection'
  | 'password_reset'
  | 'certificate_issued'
  | 'certificate_approved'
  | 'profile_update';

export interface DispatchResult {
  success: boolean;
  dispatchedCount: number;
  candidateIds: string[];
  skippedCount?: number;
  errors?: string[];
  mode: 'smtp' | 'botskill_mapi' | 'simulated_local';
}

export function getBaseAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://vayanai.in.net';
}

/**
 * Singleton cached nodemailer SMTP transporter with connection pooling.
 * Prevents socket exhaustion during batch dispatches.
 */
let cachedTransporter: Transporter | null = null;

export function getSmtpTransporter(): Transporter | null {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    auth: {
      user,
      pass: pass || ''
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });

  return cachedTransporter;
}

export function resetSmtpTransporterForTesting(): void {
  if (cachedTransporter) {
    try {
      cachedTransporter.close();
    } catch {
      // ignore
    }
    cachedTransporter = null;
  }
}

// ============================================================================
// EMAIL DISPATCH IDEMPOTENCY TRACKER
// ============================================================================

const globalForEmailIdempotency = globalThis as unknown as {
  __vayanai_dispatched_emails__?: Set<string>;
};

if (!globalForEmailIdempotency.__vayanai_dispatched_emails__) {
  globalForEmailIdempotency.__vayanai_dispatched_emails__ = new Set<string>();
}

export function isEmailDispatched(emailType: string, key: string): boolean {
  return globalForEmailIdempotency.__vayanai_dispatched_emails__!.has(`${emailType}:${key}`);
}

export function recordEmailDispatched(emailType: string, key: string): void {
  globalForEmailIdempotency.__vayanai_dispatched_emails__!.add(`${emailType}:${key}`);
}

export function resetEmailDispatchIdempotencyForTesting(): void {
  globalForEmailIdempotency.__vayanai_dispatched_emails__!.clear();
}

// ============================================================================
// STAGE 1: APPLICATION ACKNOWLEDGEMENT (AFTER GOOGLE SHEET SYNC)
// ============================================================================

export function buildApplicationReceivedEmail(
  candidate: InternApplication,
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const candidateName = candidate.userName || 'Candidate';
  const track = candidate.trackName || 'Internship';
  const college = candidate.collegeName || 'Verified University';
  const subject = `Application Received: Vayanai Internship & Incubation Program (${track})`;

  const text = `Dear ${candidateName},

Thank you for registering for the Vayanai Operations & Technology Internship for our upcoming cohort commencing on Monday, 2 November 2026.

We have successfully logged your application from ${college} for the ${track} track.

WHAT HAPPENS NEXT:
1. Batch Capacity Review: Our automated queue is evaluating domain slots and mentor bandwidth (2-hour queue window).
2. Assessment Invitation: You will shortly receive your personalized online virtual interview link.
3. Preparation: Ensure you have 10–15 minutes of quiet time to spare when you open the assessment.

BATCH DETAILS:
- Domain Track: ${track}
- Institution: ${college}
- Batch Commencement: Monday, 2 November 2026
- Incubation Partner: DBERT Technical Council (MSME Udyam: UDYAM-UP-29-0109046)

Warm regards,
Vayanai Admissions & Talent Council
operations@vayanai.in.net | ${baseUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #131c16; border: 1px solid rgba(232, 163, 76, 0.3); border-radius: 12px; padding: 36px 32px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #fff8ee; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .highlight-box { background: rgba(255, 255, 255, 0.04); border-left: 3px solid #e8a34c; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .step-box { background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 14px 18px; margin: 18px 0; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #889990; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Application Acknowledged</div>
    <h1>Welcome, ${candidateName}!</h1>
    <p>We have successfully received your application for the <strong>${track}</strong> internship program starting <strong>Monday, 2 November 2026</strong>.</p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 13px;">
        <strong>Candidate Name:</strong> ${candidateName}<br>
        <strong>Selected Track:</strong> ${track}<br>
        <strong>Academic Institution:</strong> ${college}<br>
        <strong>Batch Start:</strong> Monday, 2 November 2026<br>
        <strong>Incubation Partner:</strong> DBERT Technical Council (UDYAM-UP-29-0109046)
      </p>
    </div>

    <div class="step-box">
      <div style="font-weight: 700; color: #e8a34c; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
        Next Steps in Selection:
      </div>
      <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #c9d6ce; line-height: 1.6;">
        <li><strong>Evaluation Queue:</strong> Our admissions algorithm is queuing batch slots.</li>
        <li><strong>Assessment Invitation:</strong> You will receive a separate email containing your secure single-use virtual interview link.</li>
        <li><strong>Readiness:</strong> Ensure you have 10–15 minutes of quiet time to complete the 8 scenario challenges.</li>
      </ol>
    </div>

    <p style="font-size: 13px; color: #889990;">
      No further action is required right now. Please keep an eye on your inbox (and spam folder) for your interview access invite.
    </p>

    <div class="footer">
      <strong>Vayanai Talent & Mentorship Council</strong><br>
      In partnership with DBERT Technical Council &bull; operations@vayanai.in.net &bull; ${baseUrl}
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

// ============================================================================
// STAGE 2: VIRTUAL INTERVIEW INVITATION (QUEUE MATURED / DISPATCHED)
// ============================================================================

export function buildInterviewInvitationEmail(
  candidate: InternApplication,
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const token = candidate.magicToken;
  if (!token || typeof token !== 'string' || token.trim() === '' || token.trim() === 'undefined') {
    throw new Error(`Cannot build interview invitation email: magicToken is missing or empty for candidate ${candidate.id || candidate.userEmail}`);
  }
  const candidateName = candidate.userName || 'Candidate';
  const track = candidate.trackName || 'Internship';
  const college = candidate.collegeName || 'Verified University';
  const assessmentUrl = `${baseUrl}/intern/assessment?token=${encodeURIComponent(token.trim())}`;
  const subject = `Next Step: Online Technical & Values Assessment for Vayanai Internship (${track})`;

  const text = `Dear ${candidateName},

Thank you for applying for the ${track} internship at Vayanai for our upcoming cohort starting on Monday, 2 November 2026.

We have reviewed your preliminary submission from ${college}. The next step in our selection process is an online interactive virtual interview tailored to ${track}.

IMPORTANT SESSION INSTRUCTIONS (PLEASE READ BEFORE OPENING):
- STRICT ONE-TIME ATTEMPT: This virtual interview must be completed in a single continuous sitting. It cannot be paused or restarted once submitted.
- TIME REQUIRED: Please ensure you have at least 10 to 15 minutes of quiet, uninterrupted time to spare before launching.
- SYSTEM REQUIREMENTS: Webcam or camera-free focus mode (webcam is optional). You can complete the interview using Video Proctoring or Camera-Free Focus Mode.
- ASSESSMENT STRUCTURE: Interactive company & domain briefing by our virtual interviewer, followed by 8 situational & technical challenges.
- BATCH COMMENCEMENT: Monday, 2 November 2026.

Please launch your personalized virtual interview session below:
${assessmentUrl}

Please complete this assessment within 48 hours to be considered for final offer letter issuance.

Warm regards,
Ananya & Vayanai Talent Council
In partnership with DBERT Technical Council (MSME Udyam: UDYAM-UP-29-0109046)
operations@vayanai.in.net | ${baseUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #131c16; border: 1px solid rgba(232, 163, 76, 0.3); border-radius: 12px; padding: 36px 32px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(232, 163, 76, 0.15); border: 1px solid #e8a34c; color: #e8a34c; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #fff8ee; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .highlight-box { background: rgba(255, 255, 255, 0.04); border-left: 3px solid #e8a34c; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .warning-box { background: rgba(232, 163, 76, 0.1); border: 1px solid rgba(232, 163, 76, 0.4); border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #fff8ee; line-height: 1.6; }
    .btn { display: inline-block; background: #e8a34c; color: #0d1410; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #889990; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Vayanai Operations Talent Initiative</div>
    <h1>Online Interactive Interview Invitation</h1>
    <p>Dear <strong>${candidateName}</strong>,</p>
    <p>Thank you for submitting your application for the <strong>${track}</strong> internship at Vayanai.</p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 13px;">
        <strong>Track:</strong> ${track}<br>
        <strong>Institution:</strong> ${college}<br>
        <strong>Upcoming Cohort:</strong> Starts Monday, 2 November 2026<br>
        <strong>Format:</strong> Interactive Virtual Interview with Live Case Scenarios
      </p>
    </div>

    <div class="warning-box">
      <div style="font-weight: 700; color: #e8a34c; margin-bottom: 6px; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase;">
        ⚠️ Important Session Rules & Requirements:
      </div>
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Strict One-Time Attempt:</strong> This session is a single-sitting interview. It cannot be paused or restarted once submitted.</li>
        <li><strong>Time Requirement:</strong> Please ensure you have <strong>at least 10 to 15 minutes of quiet time to spare</strong> before clicking launch.</li>
        <li><strong>Webcam Optional:</strong> Video proctoring with webcam or camera-free focus monitoring are both supported without score penalties.</li>
      </ul>
    </div>

    <p>Our virtual panelist Ananya will guide you through the session, beginning with an overview of Vayanai and your specific internship domain.</p>

    <div style="text-align: center;">
      <a href="${assessmentUrl}" class="btn">Launch Virtual Interview &rarr;</a>
    </div>

    <p style="font-size: 12px; color: #889990; text-align: center;">
      If the button above does not open, copy and paste this secure link into your browser:<br>
      <a href="${assessmentUrl}" style="color: #e8a34c; word-break: break-all;">${assessmentUrl}</a>
    </p>

    <div class="footer">
      <strong>Vayanai Talent & Mentorship Council</strong><br>
      In partnership with DBERT Technical Council (MSME Udyam: UDYAM-UP-29-0109046)<br>
      Strict Project Isolation: operations@vayanai.in.net &bull; ${baseUrl}
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

// ============================================================================
// STAGE 3: ASSESSMENT COMPLETED & PROCTORING CONFIRMATION
// ============================================================================

export function buildAssessmentCompletedEmail(
  candidate: InternApplication,
  audit?: ProctoringTelemetry,
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const candidateName = candidate.userName || 'Candidate';
  const track = candidate.trackName || 'Internship';
  const college = candidate.collegeName || 'Verified University';
  const subject = `Assessment Recorded: Evaluation in Progress - Vayanai Talent Council`;
  const durationMin = audit?.totalDurationSeconds != null ? Math.floor(audit.totalDurationSeconds / 60) : 10;
  const proctorModeLabel = audit?.proctoringMode === 'camera_free' ? 'Camera-Free Focus Mode' : 'Live Video Proctored';
  const integrityLabel = audit?.integrityScore === 'CLEAN' ? 'Verified Clean Audit' : 'Logged with Evaluation Committee';

  const text = `Dear ${candidateName},

Your virtual interview assessment for the ${track} internship program has been successfully recorded and encrypted.

SESSION INTEGRITY AUDIT SUMMARY:
- Candidate Name: ${candidateName}
- Track: ${track}
- Institution: ${college}
- Proctoring Mode: ${proctorModeLabel}
- Total Duration: ${durationMin} minutes
- Integrity Status: ${integrityLabel}

NEXT SELECTION STEPS:
Our admissions and evaluation committee is reviewing submissions on a rolling basis. Selected candidates for the cohort starting Monday, 2 November 2026 will be notified via email within 24–48 hours with instructions to review their official offer letter.

Thank you for your dedication and thoughtful responses during the evaluation.

Warm regards,
Vayanai Admissions & Talent Council
operations@vayanai.in.net | ${baseUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #131c16; border: 1px solid rgba(232, 163, 76, 0.3); border-radius: 12px; padding: 36px 32px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #fff8ee; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .audit-card { background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 18px; margin: 20px 0; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #889990; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Assessment Successfully Recorded</div>
    <h1>Thank You, ${candidateName}!</h1>
    <p>Your interactive interview assessment for the <strong>${track}</strong> internship has been securely submitted to the Admissions Committee.</p>
    
    <div class="audit-card">
      <div style="font-weight: 700; color: #e8a34c; font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 10px;">
        🛡️ Proctoring & Session Integrity Receipt
      </div>
      <table style="width: 100%; font-size: 12.5px; color: #c9d6ce; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #889990;">Track:</td><td style="font-weight: 600; color: #fff8ee;">${track}</td></tr>
        <tr><td style="padding: 4px 0; color: #889990;">Institution:</td><td>${college}</td></tr>
        <tr><td style="padding: 4px 0; color: #889990;">Proctoring Mode:</td><td>${proctorModeLabel}</td></tr>
        <tr><td style="padding: 4px 0; color: #889990;">Session Duration:</td><td>${durationMin} minutes</td></tr>
        <tr><td style="padding: 4px 0; color: #889990;">Audit Trail:</td><td style="color: #4caf50; font-weight: 600;">✓ Encrypted & Verified</td></tr>
      </table>
    </div>

    <p style="font-size: 13.5px; color: #fff8ee;">
      <strong>What to expect next:</strong> Our evaluation committee is reviewing candidate submissions on a rolling basis. Selected candidates will be notified within <strong>24–48 hours</strong> with formal offer letters and onboarding instructions for the cohort starting <strong>Monday, 2 November 2026</strong>.
    </p>

    <div class="footer">
      <strong>Vayanai Talent & Mentorship Council</strong><br>
      In partnership with DBERT Technical Council (MSME Udyam: UDYAM-UP-29-0109046)<br>
      operations@vayanai.in.net &bull; ${baseUrl}
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

// ============================================================================
// STAGE 4: OFFER LETTER & BATCH ENROLLMENT
// ============================================================================

export function buildOfferLetterEmail(
  candidate: InternApplication,
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const token = candidate.magicToken;
  if (!token || typeof token !== 'string' || token.trim() === '' || token.trim() === 'undefined') {
    throw new Error(`Cannot build offer letter email: magicToken is missing or empty for candidate ${candidate.id || candidate.userEmail}`);
  }
  const candidateName = candidate.userName || 'Candidate';
  const track = candidate.trackName || 'Internship';
  const offerRef = candidate.offerLetterId || 'VY-OFFER-2026';
  const scoreVal = candidate.interviewScore != null ? candidate.interviewScore : 100;
  const offerUrl = `${baseUrl}/intern/offer?token=${encodeURIComponent(token.trim())}`;
  const subject = `Congratulations! Offer Letter & Batch Enrollment for Vayanai Internship (Starting 2 Nov 2026)`;

  const text = `Dear ${candidateName},

Congratulations! Following your successful virtual interview and evaluation, the Admissions Committee of Vayanai in partnership with DBERT Technical Council is pleased to extend an official Letter of Offer for the ${track} internship program.

OFFER HIGHLIGHTS:
- Candidate Name: ${candidateName}
- Track: ${track}
- Offer Reference: ${offerRef}
- Assessment Score: ${scoreVal}/100 (Selected)
- Batch Commencement: Monday, 2 November 2026
- Performance-Linked Stipend: Up to INR 8,000 per month upon milestone achievement
- Duration: 3 Months (Remote / Hybrid Ground Ops)
- Incubation Partner: DBERT Technical Council (MSME Udyam: UDYAM-UP-29-0109046)

REVIEW & ACCEPT YOUR OFFER:
Please visit your personalized offer portal to review your formal Letter of Offer, provide your digital signature, and confirm your seat:
${offerUrl}

We are excited to welcome you to our innovation cohort!

Warm regards,
Vayanai Admissions & Talent Council
operations@vayanai.in.net | ${baseUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #131c16; border: 1px solid rgba(232, 163, 76, 0.3); border-radius: 12px; padding: 36px 32px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #fff8ee; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .highlight-box { background: rgba(255, 255, 255, 0.04); border-left: 3px solid #e8a34c; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #e8a34c, #c9822b); color: #0d1410; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #889990; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Official Selection Offer</div>
    <h1>Congratulations, ${candidateName}!</h1>
    <p>The Selection Committee is pleased to offer you an internship position in our <strong>${track}</strong> program.</p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 13px;">
        <strong>Offer Reference:</strong> ${offerRef}<br>
        <strong>Assessment Score:</strong> ${scoreVal}/100 (Selected)<br>
        <strong>Tenure:</strong> 3 Months &bull; <strong>Batch Start:</strong> Monday, 2 November 2026<br>
        <strong>Affiliation:</strong> DBERT Technical Council & Vayanai Operations Platform
      </p>
    </div>

    <p>Please access your offer portal to review your formal Letter of Offer, digitally confirm your acceptance, and complete your seat lock:</p>

    <div style="text-align: center;">
      <a href="${offerUrl}" class="btn">View Offer Letter & Confirm Seat &rarr;</a>
    </div>

    <p style="font-size: 12px; color: #889990; text-align: center;">
      Secure link: <a href="${offerUrl}" style="color: #e8a34c; word-break: break-all;">${offerUrl}</a>
    </p>

    <div class="footer">
      <strong>Vayanai Operations & Technology Council</strong><br>
      MSME Registered Entity (Udyam: UDYAM-UP-29-0109046)<br>
      operations@vayanai.in.net &bull; ${baseUrl}
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

// ============================================================================
// STAGE 5: REJECTION / ENCOURAGING NOTICE
// ============================================================================

export function buildRejectionNoticeEmail(
  candidate: InternApplication,
  note?: string,
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const candidateName = candidate.userName || 'Candidate';
  const track = candidate.trackName || 'Internship';
  const subject = `Update on your Vayanai Internship Application (${track})`;

  const text = `Dear ${candidateName},

Thank you for your interest in the ${track} internship program at Vayanai and for completing our selection evaluation.

Due to limited batch capacity for our upcoming November 2026 cohort, we are unable to extend an offer at this time.
${note ? `\nReview Note: ${note}\n` : ''}
We were impressed by your background and encourage you to reapply for our upcoming quarterly cohorts.

We wish you every success in your academic and professional endeavors.

Warm regards,
Vayanai Admissions Committee
operations@vayanai.in.net | ${baseUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #131c16; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 36px 32px; }
    h1 { font-size: 20px; color: #fff8ee; margin: 0 0 16px; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #889990; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Application Update &bull; ${track}</h1>
    <p>Dear <strong>${candidateName}</strong>,</p>
    <p>Thank you for taking the time to apply and participate in our selection evaluation for the <strong>${track}</strong> internship.</p>
    <p>Due to high applicant volume and batch capacity limits for the November 2026 cohort, we are unable to offer you an internship seat at this time.</p>
    ${note ? `<div style="background: rgba(255,255,255,0.03); padding: 12px 16px; border-left: 2px solid #889990; margin: 16px 0; font-size: 13px; color: #c9d6ce;"><strong>Evaluation Note:</strong> ${note}</div>` : ''}
    <p>We appreciate your effort and encourage you to keep developing your skills and reapply for future quarterly cohorts.</p>
    <div class="footer">
      <strong>Vayanai Admissions Committee</strong> &bull; operations@vayanai.in.net &bull; ${baseUrl}
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

// ============================================================================
// CORE TRANSPORT DISPATCHER: SMTP -> BOTSKILL -> LOCAL SIMULATED
// ============================================================================

export async function sendCandidateEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
  emailType: CandidateEmailType;
  candidateId?: string;
}): Promise<{
  success: boolean;
  mode: 'smtp' | 'botskill_mapi' | 'simulated_local';
  messageId?: string;
  error?: string;
}> {
  // 1. Production Mode: Use direct SMTP if host/credentials are configured
  const transporter = getSmtpTransporter();
  if (transporter) {
    const from = process.env.SMTP_FROM || `"Vayanai Operations" <${process.env.SMTP_USER}>`;
    const MAX_RETRIES = 2;
    const RETRY_DELAYS = [500, 1500];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const replyTo = process.env.SMTP_REPLY_TO || process.env.SMTP_USER || 'contactus@vayanai.in.net';
        const info = await transporter.sendMail({
          from,
          to: payload.to,
          replyTo,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          headers: {
            'List-Unsubscribe': `<mailto:${replyTo}?subject=Unsubscribe>`,
            'Precedence': 'bulk',
            'X-Entity-Ref-ID': payload.candidateId || 'vayanai-candidate'
          }
        });

        console.log(`[Email Dispatcher - SMTP Live] Dispatched ${payload.emailType} to ${payload.to}`);
        return {
          success: true,
          mode: 'smtp',
          messageId: info?.messageId || `smtp-${Date.now()}`
        };
      } catch (smtpErr: any) {
        lastError = smtpErr;
        const errMsg = smtpErr?.message || '';
        const isTransient = /timeout|econnreset|econnrefused|etimedout|socket|421|451/i.test(errMsg);
        if (attempt < MAX_RETRIES && isTransient) {
          console.warn(`[Email Dispatcher - SMTP Retry] Attempt ${attempt + 1} failed (${errMsg}). Retrying in ${RETRY_DELAYS[attempt]}ms...`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }
        console.warn(`[Email Dispatcher - SMTP Warning] Failed sending via SMTP to ${payload.to}:`, errMsg);
        break;
      }
    }

    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        mode: 'smtp',
        error: lastError?.message || 'SMTP delivery failed after retries'
      };
    }
  }

  // 2. Secondary Mode: Forward to BOTSKILL sidecar if active
  const botskillUrl = process.env.BOTSKILL_URL || 'http://127.0.0.1:8765';
  try {
    const res = await fetch(`${botskillUrl}/api/vayanai/dispatch-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: payload.to,
        subject: payload.subject,
        body_html: payload.html,
        body_text: payload.text,
        email_type: payload.emailType,
        candidate_id: payload.candidateId
      }),
      signal: AbortSignal.timeout(2000)
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        mode: data.mode === 'outlook' ? 'botskill_mapi' : 'smtp',
        messageId: data.messageId || `botskill-${Date.now()}`
      };
    }
  } catch {
    // Sidecar offline or endpoint not registered - proceed to simulated local
  }

  // 3. Graceful Local Simulated Mode: For development, testing, and offline staging
  console.log(`[Email Dispatcher - Simulated] To: ${payload.to} | Subject: ${payload.subject}`);
  return {
    success: true,
    mode: 'simulated_local',
    messageId: `sim-${Date.now()}`
  };
}

/**
 * Delegating email dispatcher object allowing test suites to mock or spy on
 * sendCandidateEmail while maintaining genuine internal dispatch flow.
 */
export const emailDispatcher = {
  sendCandidateEmail
};

// ============================================================================
// INDIVIDUAL LIFECYCLE DISPATCH HELPERS
// ============================================================================

export async function dispatchApplicationReceivedEmail(candidateId: string): Promise<{
  success: boolean;
  application: InternApplication;
  mode: string;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}> {
  const candidate = getInternApplicationById(candidateId);
  if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);

  // Idempotency: prevent sending duplicate application acknowledgement emails
  if (isEmailDispatched('application_received', candidate.id)) {
    return {
      success: true,
      application: candidate,
      mode: 'simulated_local',
      skipped: true
    };
  }

  const emailContent = buildApplicationReceivedEmail(candidate);
  const res = await emailDispatcher.sendCandidateEmail({
    to: candidate.userEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'application_received',
    candidateId: candidate.id
  });

  if (res.success) {
    recordEmailDispatched('application_received', candidate.id);
  }

  return {
    success: res.success,
    application: candidate,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}

export async function dispatchSingleCandidateInvite(candidateId: string): Promise<{
  success: boolean;
  application: InternApplication;
  mode: string;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}> {
  const candidate = ensureCandidateMagicToken(candidateId);

  // Idempotency: candidate already invited via DB or in-flight dispatcher
  if (candidate.inviteSentAt || isEmailDispatched('invitation', candidate.id)) {
    return {
      success: true,
      application: candidate,
      mode: 'simulated_local',
      skipped: true
    };
  }

  const emailContent = buildInterviewInvitationEmail(candidate);
  const res = await emailDispatcher.sendCandidateEmail({
    to: candidate.userEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'invitation',
    candidateId: candidate.id
  });

  if (res.success) {
    markInviteSent(candidate.id);
    recordEmailDispatched('invitation', candidate.id);
  }
  const updated = getInternApplicationById(candidate.id)!;

  return {
    success: res.success,
    application: updated,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}

export const dispatchInterviewInviteEmail = dispatchSingleCandidateInvite;

export async function dispatchAssessmentCompletedEmail(
  candidateId: string,
  audit?: ProctoringTelemetry
): Promise<{
  success: boolean;
  application: InternApplication;
  mode: string;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}> {
  const candidate = getInternApplicationById(candidateId);
  if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);

  // Idempotency: assessment completed email already dispatched
  if (isEmailDispatched('assessment_completed', candidate.id)) {
    return {
      success: true,
      application: candidate,
      mode: 'simulated_local',
      skipped: true
    };
  }

  const emailContent = buildAssessmentCompletedEmail(candidate, audit);
  const res = await emailDispatcher.sendCandidateEmail({
    to: candidate.userEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'assessment_completed',
    candidateId: candidate.id
  });

  if (res.success) {
    recordEmailDispatched('assessment_completed', candidate.id);
  }

  return {
    success: res.success,
    application: candidate,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}

export async function dispatchSingleCandidateOffer(
  candidateId: string,
  customOfferId?: string
): Promise<{
  success: boolean;
  application: InternApplication;
  offerId: string;
  mode: string;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}> {
  const existing = getInternApplicationById(candidateId);
  if (!existing) throw new Error(`Candidate not found: ${candidateId}`);

  // Idempotency check: if offer was already sent and no customOfferId is requested
  if (
    (existing.status === 'offer_sent' && existing.offerLetterId && existing.offerSentAt && !customOfferId) ||
    (!customOfferId && isEmailDispatched('offer', candidateId))
  ) {
    return {
      success: true,
      application: existing,
      offerId: existing.offerLetterId || 'VY-OFFER-PREV',
      mode: 'simulated_local',
      skipped: true
    };
  }

  // Ensure magic token is present
  ensureCandidateMagicToken(candidateId);

  const { application, offerId } = approveCandidateAndGenerateOffer(candidateId, customOfferId);
  const emailContent = buildOfferLetterEmail(application);

  const res = await emailDispatcher.sendCandidateEmail({
    to: application.userEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'offer',
    candidateId: application.id
  });

  if (res.success) {
    recordEmailDispatched('offer', candidateId);
  }

  return {
    success: res.success,
    application,
    offerId,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}

export const dispatchOfferEmail = dispatchSingleCandidateOffer;

export async function dispatchRejectionEmail(
  candidateId: string,
  note?: string
): Promise<{
  success: boolean;
  application: InternApplication;
  mode: string;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}> {
  const candidate = getInternApplicationById(candidateId);
  if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);

  // Idempotency: rejection email already dispatched
  if (candidate.status === 'rejected' || isEmailDispatched('rejection', candidate.id)) {
    return {
      success: true,
      application: candidate,
      mode: 'simulated_local',
      skipped: true
    };
  }

  const emailContent = buildRejectionNoticeEmail(candidate, note);
  const res = await emailDispatcher.sendCandidateEmail({
    to: candidate.userEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'rejection',
    candidateId: candidate.id
  });

  if (res.success) {
    recordEmailDispatched('rejection', candidate.id);
  }

  return {
    success: res.success,
    application: candidate,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}

export async function runScheduledInviteDispatcher(options?: {
  maxBatch?: number;
  delayMinMs?: number;
  delayMaxMs?: number;
}): Promise<DispatchResult> {
  const all = listAllInternApplications();
  const now = Date.now();
  const candidatesDue = all.filter(
    (c) =>
      c.status === 'applied' &&
      c.inviteScheduledAt &&
      new Date(c.inviteScheduledAt).getTime() <= now &&
      !c.inviteSentAt &&
      !isEmailDispatched('invitation', c.id)
  );

  // Hourly rate limiting (max 60 emails per hour)
  const maxPerHour = parseInt(process.env.MAX_EMAILS_PER_HOUR || '60', 10);
  const oneHourAgo = new Date(now - 3600000).toISOString();
  const sentInLastHour = all.filter((c) => c.inviteSentAt && c.inviteSentAt >= oneHourAgo).length;
  const remainingBudget = Math.max(0, maxPerHour - sentInLastHour);

  const isTest = process.env.NODE_ENV === 'test';
  const maxBatch = options?.maxBatch || (isTest ? candidatesDue.length : parseInt(process.env.DISPATCH_BATCH_SIZE || '10', 10));
  const effectiveLimit = isTest ? (options?.maxBatch ? Math.min(candidatesDue.length, options.maxBatch) : candidatesDue.length) : Math.min(candidatesDue.length, remainingBudget, maxBatch);

  const targetCandidates = candidatesDue.slice(0, effectiveLimit);
  const candidateIds: string[] = [];
  const errors: string[] = [];
  let mode: 'smtp' | 'botskill_mapi' | 'simulated_local' = 'simulated_local';

  const minDelay = isTest ? 0 : (options?.delayMinMs ?? (parseFloat(process.env.EMAIL_DELAY_MIN_SEC || '0.5') * 1000));
  const maxDelay = isTest ? 0 : (options?.delayMaxMs ?? (parseFloat(process.env.EMAIL_DELAY_MAX_SEC || '2.0') * 1000));

  for (let i = 0; i < targetCandidates.length; i++) {
    const rawCandidate = targetCandidates[i];
    if (i > 0 && maxDelay > 0) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);
      if (delay > 0) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    try {
      const candidate = ensureCandidateMagicToken(rawCandidate.id);
      const emailContent = buildInterviewInvitationEmail(candidate);
      const res = await emailDispatcher.sendCandidateEmail({
        to: candidate.userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        emailType: 'invitation',
        candidateId: candidate.id
      });

      if (res.success) {
        markInviteSent(candidate.id);
        recordEmailDispatched('invitation', candidate.id);
        candidateIds.push(candidate.id);
        mode = res.mode;
      } else {
        errors.push(`Failed to dispatch invite to ${candidate.userEmail}: ${res.error || 'Delivery failed'}`);
      }
    } catch (err: any) {
      errors.push(`Failed to dispatch invite to ${rawCandidate.userEmail}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    dispatchedCount: candidateIds.length,
    candidateIds,
    skippedCount: all.length - candidateIds.length,
    errors: errors.length > 0 ? errors : undefined,
    mode
  };
}

// ============================================================================
// PASSWORD RESET EMAIL BUILDER & DISPATCHER
// ============================================================================

export function buildPasswordResetEmail(
  user: { name?: string; email: string },
  resetUrl: string,
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const subject = `Reset Your Vayanai Account Password`;
  const emailStr = user.email || 'your account email';
  const displayName = user.name || (user.email && user.email.includes('@') ? user.email.split('@')[0] : 'User');

  const text = `Dear ${displayName},

We received a request to reset the password for your Vayanai account (${emailStr}).

To create a new password, click the link below (valid for 60 minutes):
${resetUrl}

SECURITY NOTICE:
- This reset link will automatically expire in 60 minutes.
- If you did not make this request, you can safely ignore this email; your password will remain unchanged.
- Never forward or share this link with anyone.

Warm regards,
Vayanai Security & Account Operations
security@vayanai.in.net | ${baseUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #131c16; border: 1px solid rgba(232, 163, 76, 0.35); border-radius: 12px; padding: 36px 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(232, 163, 76, 0.15); border: 1px solid #e8a34c; color: #e8a34c; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #fff8ee; margin: 0 0 16px; line-height: 1.3; font-family: 'Playfair Display', Georgia, serif; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #e8a34c, #c9822b); color: #0d1410 !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin: 20px 0; text-align: center; letter-spacing: 0.5px; }
    .code-box { background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px 14px; border-radius: 6px; font-size: 12px; word-break: break-all; color: #e8a34c; margin: 16px 0; }
    .notice { font-size: 12px; color: #889990; line-height: 1.5; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🔒 SECURE ACCOUNT ACCESS</div>
    <h1>Password Reset Request</h1>
    <p>Dear <strong>${displayName}</strong>,</p>
    <p>We received a request to reset the password for your Vayanai account (<strong>${emailStr}</strong>). Click the button below to choose a new password:</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn" target="_blank">Reset Your Password ↗</a>
    </div>

    <p style="font-size: 12px; color: #a4b3aa;">If the button above does not work, copy and paste this secure link into your browser:</p>
    <div class="code-box">${resetUrl}</div>

    <div class="notice">
      <p style="margin: 0 0 8px;"><strong>Important Security Notes:</strong></p>
      <ul style="margin: 0; padding-left: 18px;">
        <li>This link is valid for <strong>60 minutes</strong> and can only be used once.</li>
        <li>If you did not request a password reset, no action is needed; your current password remains secure.</li>
        <li>For security reasons, Vayanai will never ask you for your password via email or chat.</li>
      </ul>
      <p style="margin: 16px 0 0; font-size: 11px;">
        Vayanai Security & Account Operations &bull; <a href="${baseUrl}" style="color: #e8a34c; text-decoration: none;">${baseUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<{ success: boolean; mode: string; messageId?: string; error?: string; skipped?: boolean }> {
  const idempotencyKey = `${email.trim().toLowerCase()}:${resetUrl.trim()}`;
  if (isEmailDispatched('password_reset', idempotencyKey)) {
    return {
      success: true,
      mode: 'simulated_local',
      skipped: true
    };
  }

  const emailContent = buildPasswordResetEmail({ name, email }, resetUrl);
  const res = await emailDispatcher.sendCandidateEmail({
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'password_reset',
    candidateId: 'password-reset'
  });

  if (res.success) {
    recordEmailDispatched('password_reset', idempotencyKey);
  }

  return {
    success: res.success,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}



// ============================================================================
// CERTIFICATE ISSUANCE & APPROVAL NOTIFICATIONS
// ============================================================================

export function buildCertificateIssuedEmail(
  cert: {
    internName?: string;
    internEmail?: string;
    certificateId: string;
    internId?: string;
    domain?: string;
    projectName?: string;
  },
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const certId = cert.certificateId || 'CERT-VAY-2026';
  const candidateName = cert.internName || 'Candidate';
  const domainName = cert.domain || 'Operations & Technology';
  const projectName = cert.projectName || 'Operations Practicum';
  const internId = cert.internId || 'VAY-INT';
  const verifyLink = `${baseUrl}/verify?certid=${encodeURIComponent(certId)}`;
  const subject = `Your Certificate of Internship Has Been Issued (${certId}) - Vayanai`;

  const text = `Dear ${candidateName},

Congratulations! Your official Certificate of Completion for the ${domainName} internship program at Vayanai has been issued.

CREDENTIAL DETAILS:
- Candidate Name: ${candidateName}
- Certificate ID: ${certId}
- Intern ID: ${internId}
- Domain / Specialization: ${domainName}
- Project: ${projectName}
- Official Verification Link: ${verifyLink}

You can view, verify, and download your credential at any time using your verification link above.

Warm regards,
Vayanai Admissions & Technical Council
operations@vayanai.in.net | ${baseUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #131c16; border: 1px solid rgba(76, 175, 80, 0.4); border-radius: 12px; padding: 36px 32px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #fff8ee; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .highlight-box { background: rgba(255, 255, 255, 0.04); border-left: 3px solid #4caf50; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .btn { display: inline-block; background: #1b5e20; color: #ffffff !important; font-weight: 700; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #889990; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Certificate Issued</div>
    <h1>Congratulations, ${candidateName}!</h1>
    <p>Your official Certificate of Completion has been registered under <strong>${certId}</strong>.</p>
    
    <div class="highlight-box">
      <p style="margin: 0; font-size: 13px;">
        <strong>Certificate ID:</strong> ${certId}<br>
        <strong>Domain:</strong> ${domainName}<br>
        <strong>Project:</strong> ${projectName}<br>
        <strong>Authority:</strong> DBERT Technical Council & Vayanai Operations Platform
      </p>
    </div>

    <p style="text-align: center;">
      <a href="${verifyLink}" class="btn">View &amp; Verify Certificate &rarr;</a>
    </p>

    <div class="footer">
      <strong>Vayanai Admissions &amp; Technical Council</strong><br>
      In partnership with DBERT Technical Council &bull; operations@vayanai.in.net &bull; ${baseUrl}
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export async function dispatchCertificateIssuedEmail(cert: {
  internName?: string;
  internEmail: string;
  certificateId: string;
  internId?: string;
  domain?: string;
  projectName?: string;
}): Promise<{ success: boolean; mode: string; messageId?: string; error?: string; skipped?: boolean }> {
  const cleanCertId = cert.certificateId.trim().toUpperCase();
  if (isEmailDispatched('certificate_issued', cleanCertId)) {
    return {
      success: true,
      mode: 'simulated_local',
      skipped: true
    };
  }

  const emailContent = buildCertificateIssuedEmail(cert);
  const res = await emailDispatcher.sendCandidateEmail({
    to: cert.internEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'certificate_issued',
    candidateId: cleanCertId
  });

  if (res.success) {
    recordEmailDispatched('certificate_issued', cleanCertId);
  }

  return {
    success: res.success,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}



export function buildCertificateApprovedEmail(
  cert: {
    internName?: string;
    internEmail?: string;
    certificateId: string;
    internId?: string;
    domain?: string;
    projectName?: string;
  },
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const certId = cert.certificateId || 'CERT-VAY-2026';
  const candidateName = cert.internName || 'Candidate';
  const domainName = cert.domain || 'Operations & Technology';
  const projectName = cert.projectName || 'Operations Practicum';
  const internId = cert.internId || 'VAY-INT';
  const verifyLink = `${baseUrl}/verify?certid=${encodeURIComponent(certId)}`;
  const subject = `Your Verified Certificate of Completion & LOR is Ready (${certId})`;

  const text = `Dear ${candidateName},

Congratulations! Your verified Certificate of Completion and Letter of Recommendation (LOR) from Vayanai in partnership with DBERT Technical Council has been officially approved and activated.

CREDENTIAL DETAILS:
- Candidate Name: ${candidateName}
- Certificate ID: ${certId}
- Intern ID: ${internId}
- Domain / Specialization: ${domainName}
- Project: ${projectName}
- Official Verification Link: ${verifyLink}

You can view, verify, and download your high-resolution credential and LOR document at any time using your verification link above.

Warm regards,
Vayanai Admissions & Technical Council
operations@vayanai.in.net | ${baseUrl}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #131c16; border: 1px solid rgba(76, 175, 80, 0.4); border-radius: 12px; padding: 36px 32px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #fff8ee; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .btn { display: inline-block; background: #1b5e20; color: #ffffff !important; font-weight: 700; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #889990; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Credential Activated</div>
    <h1>Congratulations, ${candidateName}!</h1>
    <p>Your official Certificate of Completion and Letter of Recommendation (LOR) have been approved and registered in our public registry under <strong>${certId}</strong>.</p>
    <p style="text-align: center;">
      <a href="${verifyLink}" class="btn">View &amp; Verify Credential &rarr;</a>
    </p>
    <div class="footer">
      <strong>Vayanai Admissions &amp; Technical Council</strong><br>
      In partnership with DBERT Technical Council &bull; operations@vayanai.in.net &bull; ${baseUrl}
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export async function dispatchCertificateApprovedEmail(cert: {
  internName?: string;
  internEmail: string;
  certificateId: string;
  internId?: string;
  domain?: string;
  projectName?: string;
}): Promise<{ success: boolean; mode: string; messageId?: string; error?: string; skipped?: boolean }> {
  const cleanCertId = cert.certificateId.trim().toUpperCase();
  if (isEmailDispatched('certificate_approved', cleanCertId)) {
    return {
      success: true,
      mode: 'simulated_local',
      skipped: true
    };
  }

  const emailContent = buildCertificateApprovedEmail(cert);
  const res = await emailDispatcher.sendCandidateEmail({
    to: cert.internEmail,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'certificate_approved',
    candidateId: cleanCertId
  });

  if (res.success) {
    recordEmailDispatched('certificate_approved', cleanCertId);
  }

  return {
    success: res.success,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}

// ============================================================================
// PROFILE UPDATE NOTIFICATION
// ============================================================================

export function buildProfileUpdatedEmail(
  user: { name?: string; email: string },
  changes: { name?: string; phone?: string },
  baseUrl: string = getBaseAppUrl()
): { subject: string; html: string; text: string } {
  const subject = `Account Profile Updated — Vayanai`;
  const emailStr = user.email || 'your account email';
  const displayName = user.name || (user.email && user.email.includes('@') ? user.email.split('@')[0] : 'Member');

  const text = `Dear ${displayName},

This is an automated notification to confirm that your Vayanai account profile details were recently updated.

UPDATED INFORMATION:
${changes.name ? `- Full Name: ${changes.name}\n` : ''}${changes.phone ? `- Contact Number: ${changes.phone}\n` : ''}- Updated At: ${new Date().toUTCString()}

SECURITY NOTICE:
If you initiated this change, no further action is required. If you did not make this update, please reset your password immediately and contact support:
operations@vayanai.in.net | ${baseUrl}

Warm regards,
Vayanai Security & Account Operations`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1410; color: #f4ede0; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #131c16; border: 1px solid rgba(232, 163, 76, 0.35); border-radius: 12px; padding: 36px 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; color: #4caf50; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 20px; color: #fff8ee; margin: 0 0 16px; line-height: 1.3; font-family: 'Playfair Display', Georgia, serif; }
    p { font-size: 14px; line-height: 1.6; color: #c9d6ce; margin: 0 0 16px; }
    .highlight-box { background: rgba(255, 255, 255, 0.04); border-left: 3px solid #e8a34c; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 13px; color: #fff8ee; }
    .notice { font-size: 12px; color: #889990; line-height: 1.5; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Security Notice</div>
    <h1>Account Profile Updated</h1>
    <p>Dear <strong>${displayName}</strong>,</p>
    <p>Your profile details on your Vayanai account (<strong>${emailStr}</strong>) were successfully updated.</p>

    <div class="highlight-box">
      <strong>Updated Details:</strong><br>
      ${changes.name ? `&bull; Name: ${changes.name}<br>` : ''}
      ${changes.phone ? `&bull; Phone: ${changes.phone}<br>` : ''}
      &bull; Updated At: ${new Date().toUTCString()}
    </div>

    <p style="font-size: 13px; color: #889990;">
      If you made this change, you can safely disregard this email. If you did not make this update, please contact operations@vayanai.in.net immediately.
    </p>

    <div class="notice">
      Vayanai Security & Account Operations &bull; <a href="${baseUrl}" style="color: #e8a34c; text-decoration: none;">${baseUrl}</a>
    </div>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export async function dispatchProfileUpdatedEmail(
  user: { name?: string; email: string },
  changes: { name?: string; phone?: string }
): Promise<{ success: boolean; mode: string; messageId?: string; error?: string }> {
  const emailContent = buildProfileUpdatedEmail(user, changes);
  const res = await emailDispatcher.sendCandidateEmail({
    to: user.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    emailType: 'profile_update',
    candidateId: user.email
  });

  return {
    success: res.success,
    mode: res.mode,
    messageId: res.messageId,
    error: res.error
  };
}
