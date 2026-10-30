import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  dispatchApplicationReceivedEmail,
  dispatchSingleCandidateInvite,
  dispatchInterviewInviteEmail,
  dispatchAssessmentCompletedEmail,
  dispatchSingleCandidateOffer,
  dispatchOfferEmail,
  dispatchRejectionEmail,
  sendPasswordResetEmail,
  dispatchCertificateIssuedEmail,
  dispatchCertificateApprovedEmail,
  runScheduledInviteDispatcher,
  emailDispatcher,
  resetEmailDispatchIdempotencyForTesting,
  CandidateEmailType
} from '@/lib/services/email-dispatcher';
import {
  upsertInternApplicationFromSheet,
  getInternApplicationById
} from '@/lib/db/intern-repo';

describe('Intern Lifecycle Email Mocked Test Suite (R5 Verification)', () => {
  beforeEach(() => {
    resetEmailDispatchIdempotencyForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createTestCandidate(suffix: string) {
    const email = `mock.lifecycle.${Date.now()}.${suffix}@example.com`;
    const res = upsertInternApplicationFromSheet({
      userName: `Candidate ${suffix}`,
      userEmail: email,
      phone: '+91 98765 00000',
      collegeName: 'National Institute of Technology',
      semester: '8th Semester',
      trackName: 'Artificial Intelligence & Operations',
      cvUrl: 'https://example.com/cv.pdf',
      available3Months: 'Yes',
      laptopInternet: 'Yes',
      placementNeeded: 'Yes',
      sourceReferral: 'Campus Program',
      appliedAt: new Date().toISOString()
    });
    return res.application;
  }

  // --------------------------------------------------------------------------
  // 1. STAGE 1: APPLICATION RECEIVED
  // --------------------------------------------------------------------------
  it('dispatches application_received email with correct emailType, non-empty to/subject, and idempotency', async () => {
    const cand = createTestCandidate('app-rec');
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');

    // First call: Should dispatch
    const res1 = await dispatchApplicationReceivedEmail(cand.id);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // Assertions required by R5:
    expect(payload.emailType).toBe('application_received');
    expect(payload.to).toBeTruthy();
    expect(payload.to).toBe(cand.userEmail);
    expect(payload.to).toContain('@');
    expect(payload.subject).toBeTruthy();
    expect(typeof payload.subject).toBe('string');
    expect(payload.subject.length).toBeGreaterThan(5);
    expect(payload.subject).toContain('Application Received');
    expect(payload.html).toBeTruthy();
    expect(payload.text).toBeTruthy();
    expect(res1.success).toBe(true);

    // Second call: Idempotency check — must not send duplicate email
    const res2 = await dispatchApplicationReceivedEmail(cand.id);

    expect(spy).toHaveBeenCalledTimes(1); // Call count remains 1!
    expect(res2.success).toBe(true);
    expect(res2.skipped).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 2. STAGE 2: INTERVIEW INVITATION
  // --------------------------------------------------------------------------
  it('dispatches interview_invite (invitation) email with correct emailType, non-empty to/subject, and idempotency', async () => {
    const cand = createTestCandidate('invite');
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');

    // First call: Should dispatch
    const res1 = await dispatchSingleCandidateInvite(cand.id);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // Assertions required by R5:
    expect(payload.emailType).toBe('invitation');
    expect(payload.to).toBeTruthy();
    expect(payload.to).toBe(cand.userEmail);
    expect(payload.subject).toBeTruthy();
    expect(typeof payload.subject).toBe('string');
    expect(payload.subject.length).toBeGreaterThan(5);
    expect(payload.subject).toContain('Online Technical & Values Assessment');
    expect(payload.html).toContain('intern/assessment?token=');
    expect(payload.html).not.toContain('undefined');
    expect(res1.success).toBe(true);

    // Check DB updated
    const updated = getInternApplicationById(cand.id)!;
    expect(updated.inviteSentAt).toBeDefined();

    // Second call: Idempotency check — must not send duplicate invite
    const res2 = await dispatchSingleCandidateInvite(cand.id);

    expect(spy).toHaveBeenCalledTimes(1); // Call count remains 1
    expect(res2.success).toBe(true);
    expect(res2.skipped).toBe(true);

    // Also verify alias helper dispatchInterviewInviteEmail respects idempotency
    const res3 = await dispatchInterviewInviteEmail(cand.id);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(res3.skipped).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 3. STAGE 3: ASSESSMENT COMPLETED
  // --------------------------------------------------------------------------
  it('dispatches assessment_completed email with telemetry, non-empty to/subject, and idempotency', async () => {
    const cand = createTestCandidate('assess-comp');
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');

    const telemetry = {
      proctoringMode: 'webcam' as const,
      tabSwitchCount: 1,
      copyPasteAttempts: 0,
      totalDurationSeconds: 660,
      webcamVerified: true,
      integrityScore: 'CLEAN' as const,
      flags: [],
      submittedAt: new Date().toISOString()
    };

    // First call: Should dispatch
    const res1 = await dispatchAssessmentCompletedEmail(cand.id, telemetry);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // Assertions required by R5:
    expect(payload.emailType).toBe('assessment_completed');
    expect(payload.to).toBeTruthy();
    expect(payload.to).toBe(cand.userEmail);
    expect(payload.subject).toBeTruthy();
    expect(typeof payload.subject).toBe('string');
    expect(payload.subject).toContain('Assessment Recorded:');
    expect(payload.html).toContain('11 minutes');
    expect(payload.html).not.toContain('undefined');
    expect(res1.success).toBe(true);

    // Second call: Idempotency check — must not send duplicate email
    const res2 = await dispatchAssessmentCompletedEmail(cand.id, telemetry);

    expect(spy).toHaveBeenCalledTimes(1); // Call count remains 1
    expect(res2.success).toBe(true);
    expect(res2.skipped).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 4. STAGE 4: OFFER LETTER
  // --------------------------------------------------------------------------
  it('dispatches offer_letter (offer) email with correct emailType, non-empty to/subject, and idempotency', async () => {
    const cand = createTestCandidate('offer');
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');

    // First call: Should generate offer ID and dispatch offer letter email
    const res1 = await dispatchSingleCandidateOffer(cand.id);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // Assertions required by R5:
    expect(payload.emailType).toBe('offer');
    expect(payload.to).toBeTruthy();
    expect(payload.to).toBe(cand.userEmail);
    expect(payload.subject).toBeTruthy();
    expect(typeof payload.subject).toBe('string');
    expect(payload.subject).toContain('Offer Letter & Batch Enrollment');
    expect(res1.success).toBe(true);
    expect(res1.offerId).toBeTruthy();
    expect(res1.application.status).toBe('offer_sent');

    const originalOfferId = res1.offerId;

    // Second call: Idempotency check — must return existing offer without generating duplicate ID or re-sending
    const res2 = await dispatchSingleCandidateOffer(cand.id);

    expect(spy).toHaveBeenCalledTimes(1); // No second email sent!
    expect(res2.success).toBe(true);
    expect(res2.skipped).toBe(true);
    expect(res2.offerId).toBe(originalOfferId); // Exact same offer ID preserved

    // Also verify alias helper dispatchOfferEmail respects idempotency
    const res3 = await dispatchOfferEmail(cand.id);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(res3.skipped).toBe(true);
    expect(res3.offerId).toBe(originalOfferId);
  });

  // --------------------------------------------------------------------------
  // 5. STAGE 5: REJECTION NOTICE
  // --------------------------------------------------------------------------
  it('dispatches rejection email with feedback note, non-empty to/subject, and idempotency', async () => {
    const cand = createTestCandidate('rejection');
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');

    // First call: Should dispatch rejection notice
    const res1 = await dispatchRejectionEmail(cand.id, 'Evaluation capacity reached.');

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // Assertions required by R5:
    expect(payload.emailType).toBe('rejection');
    expect(payload.to).toBeTruthy();
    expect(payload.to).toBe(cand.userEmail);
    expect(payload.subject).toBeTruthy();
    expect(typeof payload.subject).toBe('string');
    expect(payload.subject).toContain('Update on your Vayanai Internship Application');
    expect(payload.html).toContain('Evaluation capacity reached.');
    expect(payload.html).not.toContain('undefined');
    expect(res1.success).toBe(true);

    // Second call: Idempotency check — must not send duplicate rejection
    const res2 = await dispatchRejectionEmail(cand.id, 'Evaluation capacity reached.');

    expect(spy).toHaveBeenCalledTimes(1); // Call count remains 1!
    expect(res2.success).toBe(true);
    expect(res2.skipped).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 6. STAGE 6: PASSWORD RESET
  // --------------------------------------------------------------------------
  it('dispatches password_reset email with correct emailType, non-empty to/subject, and idempotency', async () => {
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');
    const testEmail = `reset.user.${Date.now()}@vayanai.in.net`;
    const resetUrl = `https://vayanai.in.net/auth/reset-password?token=sec-reset-token-${Date.now()}`;

    // First call: Should dispatch password reset instructions
    const res1 = await sendPasswordResetEmail(testEmail, 'Meera Nair', resetUrl);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // Assertions required by R5:
    expect(payload.emailType).toBe('password_reset');
    expect(payload.to).toBe(testEmail);
    expect(payload.subject).toBeTruthy();
    expect(typeof payload.subject).toBe('string');
    expect(payload.subject).toBe('Reset Your Vayanai Account Password');
    expect(payload.html).toContain('Meera Nair');
    expect(payload.html).toContain(resetUrl);
    expect(payload.html).not.toContain('undefined');
    expect(res1.success).toBe(true);

    // Second call with same resetUrl: Idempotency check — must skip sending duplicate email
    const res2 = await sendPasswordResetEmail(testEmail, 'Meera Nair', resetUrl);

    expect(spy).toHaveBeenCalledTimes(1); // Still 1 call
    expect(res2.success).toBe(true);
    expect(res2.skipped).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 7. STAGE 7: CERTIFICATE ISSUED
  // --------------------------------------------------------------------------
  it('dispatches certificate_issued email with credential link, non-empty to/subject, and idempotency', async () => {
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');
    const certId = `CERT-VAY-2026-ISSUE-${Date.now()}`;
    const certPayload = {
      internName: 'Sanjay Reddy',
      internEmail: `sanjay.reddy.${Date.now()}@example.com`,
      certificateId: certId,
      internId: `VAY-INT-${Date.now()}`,
      domain: 'Full Stack AI Engineering',
      projectName: 'Autonomous Planning Matrix'
    };

    // First call: Should dispatch certificate issued notification
    const res1 = await dispatchCertificateIssuedEmail(certPayload);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // Assertions required by R5:
    expect(payload.emailType).toBe('certificate_issued');
    expect(payload.to).toBe(certPayload.internEmail);
    expect(payload.subject).toBeTruthy();
    expect(typeof payload.subject).toBe('string');
    expect(payload.subject).toContain('Certificate of Internship Has Been Issued');
    expect(payload.subject).toContain(certId);
    expect(payload.html).toContain('Sanjay Reddy');
    expect(payload.html).toContain(certId);
    expect(payload.html).not.toContain('undefined');
    expect(res1.success).toBe(true);

    // Second call: Idempotency check — must skip duplicate certificate email
    const res2 = await dispatchCertificateIssuedEmail(certPayload);

    expect(spy).toHaveBeenCalledTimes(1); // Call count remains 1!
    expect(res2.success).toBe(true);
    expect(res2.skipped).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 8. STAGE 8: CERTIFICATE APPROVED
  // --------------------------------------------------------------------------
  it('dispatches certificate_approved email with LOR verification link, non-empty to/subject, and idempotency', async () => {
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');
    const certId = `CERT-VAY-2026-APPR-${Date.now()}`;
    const certPayload = {
      internName: 'Tanvi Joshi',
      internEmail: `tanvi.joshi.${Date.now()}@example.com`,
      certificateId: certId,
      internId: `VAY-INT-${Date.now()}`,
      domain: 'Cloud Architecture & Microservices',
      projectName: 'Vayanai High-Volume Cluster'
    };

    // First call: Should dispatch approval & LOR email
    const res1 = await dispatchCertificateApprovedEmail(certPayload);

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0];

    // Assertions required by R5:
    expect(payload.emailType).toBe('certificate_approved');
    expect(payload.to).toBe(certPayload.internEmail);
    expect(payload.subject).toBeTruthy();
    expect(typeof payload.subject).toBe('string');
    expect(payload.subject).toContain('Your Verified Certificate of Completion & LOR is Ready');
    expect(payload.subject).toContain(certId);
    expect(payload.html).toContain('Tanvi Joshi');
    expect(payload.html).toContain(certId);
    expect(payload.html).not.toContain('undefined');
    expect(res1.success).toBe(true);

    // Second call: Idempotency check — must skip duplicate approval email
    const res2 = await dispatchCertificateApprovedEmail(certPayload);

    expect(spy).toHaveBeenCalledTimes(1); // Call count remains 1
    expect(res2.success).toBe(true);
    expect(res2.skipped).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 9. BATCH DISPATCHER IDEMPOTENCY
  // --------------------------------------------------------------------------
  it('runScheduledInviteDispatcher runs idempotently and skips already-sent candidates', async () => {
    const spy = vi.spyOn(emailDispatcher, 'sendCandidateEmail');

    // First run of scheduled dispatcher
    const batch1 = await runScheduledInviteDispatcher();
    expect(batch1).toBeDefined();

    const initialCalls = spy.mock.calls.length;

    // Second run immediately following
    const batch2 = await runScheduledInviteDispatcher();

    // Candidates dispatched in batch1 must NOT be dispatched again in batch2
    expect(batch2.dispatchedCount).toBe(0);
    expect(spy.mock.calls.length).toBe(initialCalls);
  });
});
