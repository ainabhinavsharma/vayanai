/**
 * tests/adversarial-email.test.ts
 *
 * Empirical Adversarial Challenge Suite targeting:
 * 1. lib/services/email-dispatcher.ts template rendering with malformed/missing/adversarial inputs (no "undefined").
 * 2. dispatchSingleCandidateOffer concurrency & race conditions (idempotency under concurrent burst).
 * 3. Transient SMTP failure simulation, exponential backoff timing, and retry exhaustion behavior.
 * 4. Offer dispatch failure recovery (verifying if failed offer email can be retried).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodemailer from 'nodemailer';
import {
  buildApplicationReceivedEmail,
  buildInterviewInvitationEmail,
  buildAssessmentCompletedEmail,
  buildOfferLetterEmail,
  buildRejectionNoticeEmail,
  buildPasswordResetEmail,
  buildCertificateIssuedEmail,
  buildCertificateApprovedEmail,
  dispatchSingleCandidateOffer,
  sendCandidateEmail,
  emailDispatcher,
  resetEmailDispatchIdempotencyForTesting,
  resetSmtpTransporterForTesting
} from '../lib/services/email-dispatcher';
import {
  upsertInternApplicationFromSheet,
  getInternApplicationById
} from '../lib/db/intern-repo';
import { InternApplication, ProctoringTelemetry } from '../types/auth';

describe('Adversarial Email Challenge Suite', () => {
  beforeEach(() => {
    resetEmailDispatchIdempotencyForTesting();
    resetSmtpTransporterForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetEmailDispatchIdempotencyForTesting();
    resetSmtpTransporterForTesting();
    vi.restoreAllMocks();
  });

  function createUniqueCandidate(tag: string) {
    const email = `adv.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.${tag}@vayanai.test`;
    const res = upsertInternApplicationFromSheet({
      userName: `Adversarial ${tag}`,
      userEmail: email,
      phone: '+91 99999 00000',
      collegeName: 'Adversarial Tech Institute',
      semester: 'Final Semester',
      trackName: 'Adversarial Verification Track',
      cvUrl: 'https://example.com/cv.pdf',
      available3Months: 'Yes',
      laptopInternet: 'Yes',
      placementNeeded: 'Yes',
      sourceReferral: 'Adversarial Test Suite',
      appliedAt: new Date().toISOString()
    });
    return res.application;
  }

  // ==========================================================================
  // SECTION 1: MALFORMED / BOUNDARY TEMPLATE INPUT TESTING
  // ==========================================================================
  describe('1. Adversarial Template Rendering & "undefined" Elimination', () => {
    function assertNeverUndefined(output: { subject: string; html: string; text: string }, contextLabel: string) {
      for (const [field, str] of Object.entries(output)) {
        expect(typeof str, `${contextLabel} -> ${field} must be string`).toBe('string');
        expect(str.length, `${contextLabel} -> ${field} must not be empty`).toBeGreaterThan(0);
        expect(str.includes('undefined'), `${contextLabel} -> ${field} contains literal "undefined"!`).toBe(false);
      }
    }

    it('buildApplicationReceivedEmail handles null/empty/sparse/malformed candidate objects', () => {
      // Sparse / empty fields
      const c1 = {
        userName: undefined,
        trackName: undefined,
        collegeName: undefined
      } as unknown as InternApplication;
      assertNeverUndefined(buildApplicationReceivedEmail(c1), 'c1 (undefined fields)');

      // Null fields
      const c2 = {
        userName: null,
        trackName: null,
        collegeName: null
      } as unknown as InternApplication;
      assertNeverUndefined(buildApplicationReceivedEmail(c2), 'c2 (null fields)');

      // Empty string fields
      const c3 = {
        userName: '',
        trackName: '',
        collegeName: ''
      } as unknown as InternApplication;
      assertNeverUndefined(buildApplicationReceivedEmail(c3), 'c3 (empty strings)');

      // Trailing slash or custom baseUrl
      assertNeverUndefined(buildApplicationReceivedEmail(c1, 'https://test.vayanai.in.net/'), 'c1 with trailing slash baseUrl');
    });

    it('buildInterviewInvitationEmail strictly rejects missing/empty/undefined magicTokens and never renders undefined URL', () => {
      const invalidTokens = [
        undefined,
        null,
        '',
        '   ',
        'undefined',
        '\t\n'
      ];

      for (const badToken of invalidTokens) {
        const cand = {
          id: 'test-cand-01',
          userEmail: 'cand@test.com',
          magicToken: badToken as any
        } as InternApplication;

        expect(() => {
          buildInterviewInvitationEmail(cand);
        }).toThrow(/magicToken is missing or empty/);
      }

      // Valid token with sparse profile
      const validCand = {
        id: 'test-cand-02',
        userEmail: 'valid@test.com',
        magicToken: 'valid-secure-token-12345'
      } as InternApplication;

      const out = buildInterviewInvitationEmail(validCand);
      assertNeverUndefined(out, 'Valid candidate with sparse profile');
      expect(out.html).toContain('token=valid-secure-token-12345');
      expect(out.text).toContain('token=valid-secure-token-12345');
    });

    it('buildAssessmentCompletedEmail handles undefined, null, empty, and partial telemetry without rendering undefined', () => {
      const cand = {
        userName: 'Test User',
        trackName: 'AI Track',
        collegeName: 'IIT Delhi'
      } as InternApplication;

      // Telemetry undefined
      assertNeverUndefined(buildAssessmentCompletedEmail(cand, undefined), 'telemetry undefined');

      // Telemetry empty object
      assertNeverUndefined(buildAssessmentCompletedEmail(cand, {} as ProctoringTelemetry), 'telemetry empty object');

      // Telemetry with null/missing values
      const partialTelemetry: Partial<ProctoringTelemetry> = {
        totalDurationSeconds: undefined,
        proctoringMode: undefined,
        integrityScore: undefined
      };
      assertNeverUndefined(buildAssessmentCompletedEmail(cand, partialTelemetry as ProctoringTelemetry), 'telemetry partial undefined');

      // Telemetry duration is 0
      const zeroTelemetry: ProctoringTelemetry = {
        totalDurationSeconds: 0,
        proctoringMode: 'camera_free',
        tabSwitchCount: 0,
        copyPasteAttempts: 0,
        webcamVerified: false,
        integrityScore: 'CLEAN',
        flags: [],
        submittedAt: new Date().toISOString()
      };
      assertNeverUndefined(buildAssessmentCompletedEmail(cand, zeroTelemetry), 'telemetry 0 seconds duration');
    });

    it('buildOfferLetterEmail strictly rejects missing/undefined magicToken and handles missing score/offerLetterId', () => {
      // Invalid tokens must throw
      const badCand = {
        id: 'bad-01',
        magicToken: 'undefined'
      } as InternApplication;
      expect(() => buildOfferLetterEmail(badCand)).toThrow(/magicToken is missing or empty/);

      // Valid token, but missing score and offerLetterId
      const sparseCand = {
        id: 'sparse-01',
        magicToken: 'valid-token-777',
        offerLetterId: undefined,
        interviewScore: undefined
      } as InternApplication;

      const out = buildOfferLetterEmail(sparseCand);
      assertNeverUndefined(out, 'sparse offer candidate');
      expect(out.html).toContain('VY-OFFER-2026'); // Fallback offer ID
      expect(out.html).toContain('100/100'); // Fallback score
    });

    it('buildRejectionNoticeEmail handles undefined note, empty note, and sparse candidate', () => {
      const cand = {
        userName: '',
        trackName: ''
      } as InternApplication;

      assertNeverUndefined(buildRejectionNoticeEmail(cand, undefined), 'rejection with undefined note');
      assertNeverUndefined(buildRejectionNoticeEmail(cand, ''), 'rejection with empty string note');
      assertNeverUndefined(buildRejectionNoticeEmail(cand, 'Specific feedback note provided'), 'rejection with note');
    });

    it('buildPasswordResetEmail handles missing name and sparse email without rendering undefined', () => {
      const out1 = buildPasswordResetEmail({ email: 'john.doe@example.com' }, 'https://vayanai.in.net/reset?tok=123');
      assertNeverUndefined(out1, 'user with no name');
      expect(out1.html).toContain('john.doe');

      const out2 = buildPasswordResetEmail({ name: 'Jane', email: 'jane@example.com' }, 'https://vayanai.in.net/reset?tok=456');
      assertNeverUndefined(out2, 'user with name');
    });

    it('buildCertificateIssuedEmail and ApprovedEmail handle missing internName, domain, projectName', () => {
      const certSparse = {
        certificateId: 'CERT-TEST-999',
        internEmail: 'cert@test.com'
      };

      assertNeverUndefined(buildCertificateIssuedEmail(certSparse), 'sparse cert issued');
      assertNeverUndefined(buildCertificateApprovedEmail(certSparse), 'sparse cert approved');
    });
  });

  // ==========================================================================
  // SECTION 2: CONCURRENCY & RACE CONDITION IDEMPOTENCY
  // ==========================================================================
  describe('2. Concurrency & Race Condition Idempotency on dispatchSingleCandidateOffer', () => {
    it('handles 10 concurrent bursts of dispatchSingleCandidateOffer with identical candidateId idempotently', async () => {
      const cand = createUniqueCandidate('burst-10');
      const spySend = vi.spyOn(emailDispatcher, 'sendCandidateEmail');

      // Launch 10 simultaneous calls to dispatchSingleCandidateOffer
      const promises = Array.from({ length: 10 }, () =>
        dispatchSingleCandidateOffer(cand.id)
      );

      const results = await Promise.all(promises);

      // Exactly ONE call should perform the actual dispatch; other 9 must be skipped
      const dispatched = results.filter((r) => !r.skipped);
      const skipped = results.filter((r) => r.skipped);

      expect(dispatched.length).toBe(1);
      expect(skipped.length).toBe(9);

      // Email transport must have been called exactly 1 time
      expect(spySend).toHaveBeenCalledTimes(1);

      // All 10 returned results must reference the EXACT SAME offerId
      const primeOfferId = dispatched[0].offerId;
      expect(primeOfferId).toBeTruthy();

      for (const res of results) {
        expect(res.offerId).toBe(primeOfferId);
        expect(res.success).toBe(true);
      }

      // Verify DB final state
      const finalDbApp = getInternApplicationById(cand.id)!;
      expect(finalDbApp.status).toBe('offer_sent');
      expect(finalDbApp.offerLetterId).toBe(primeOfferId);
      expect(finalDbApp.offerSentAt).toBeDefined();
    });

    it('handles concurrency when email transport has simulated latency', async () => {
      const cand = createUniqueCandidate('latency-burst');

      // Add 25ms async latency to sendCandidateEmail
      let callCount = 0;
      const originalSend = emailDispatcher.sendCandidateEmail;
      vi.spyOn(emailDispatcher, 'sendCandidateEmail').mockImplementation(async (payload) => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 25));
        return {
          success: true,
          mode: 'simulated_local',
          messageId: `sim-delayed-${Date.now()}`
        };
      });

      // Launch 5 parallel dispatches
      const results = await Promise.all([
        dispatchSingleCandidateOffer(cand.id),
        dispatchSingleCandidateOffer(cand.id),
        dispatchSingleCandidateOffer(cand.id),
        dispatchSingleCandidateOffer(cand.id),
        dispatchSingleCandidateOffer(cand.id)
      ]);

      expect(callCount).toBe(1);
      const dispatched = results.filter((r) => !r.skipped);
      expect(dispatched.length).toBe(1);

      const uniqueOfferIds = new Set(results.map((r) => r.offerId));
      expect(uniqueOfferIds.size).toBe(1);
    });

    it('CRITICAL VULNERABILITY: When email transport fails on attempt 1, dispatchSingleCandidateOffer erroneously marks DB as offer_sent, causing subsequent retries to skip without sending email', async () => {
      const cand = createUniqueCandidate('failure-retry');

      // Attempt 1: Simulate email delivery failure (e.g. SMTP connection error or timeout)
      const spySend = vi.spyOn(emailDispatcher, 'sendCandidateEmail');
      spySend.mockResolvedValueOnce({
        success: false,
        mode: 'smtp',
        error: 'ETIMEDOUT: Connection to mail server timed out'
      });

      const attempt1 = await dispatchSingleCandidateOffer(cand.id);
      expect(attempt1.success).toBe(false);
      expect(attempt1.error).toContain('ETIMEDOUT');
      expect(spySend).toHaveBeenCalledTimes(1);

      // Verify DB state after attempt 1 failure:
      // Vulnerability: DB was already updated with status='offer_sent' and offer_sent_at!
      const dbAfterFail = getInternApplicationById(cand.id)!;
      expect(dbAfterFail.status).toBe('offer_sent');
      expect(dbAfterFail.offerSentAt).toBeDefined();

      // Attempt 2: Admin or worker retries dispatching the offer because attempt 1 failed!
      // Provide mock response ready to send
      spySend.mockResolvedValueOnce({
        success: true,
        mode: 'smtp',
        messageId: 'smtp-retry-success-123'
      });

      const attempt2 = await dispatchSingleCandidateOffer(cand.id);

      // EMPIRICAL FINDING:
      // Attempt 2 was skipped because line 826 checks `existing.status === 'offer_sent' && existing.offerSentAt`!
      // This causes Attempt 2 to return `skipped: true` WITHOUT ever calling `sendCandidateEmail`!
      expect(attempt2.skipped).toBe(true);
      expect(spySend).toHaveBeenCalledTimes(1); // spy was NOT called a second time!
      // Consequence: The offer email was NEVER sent to the candidate, and normal retries are silently swallowed.
    });
  });

  // ==========================================================================
  // SECTION 3: TRANSIENT SMTP FAILURE SIMULATION & EXPONENTIAL BACKOFF
  // ==========================================================================
  describe('3. Transient SMTP Failure & Backoff Retry Logic', () => {
    it('retries up to 2 times on transient SMTP network errors (ETIMEDOUT) and succeeds on 3rd attempt', async () => {
      // Mock nodemailer transporter
      process.env.SMTP_HOST = 'smtp.vayanai.in.net';
      process.env.SMTP_USER = 'operations@vayanai.in.net';
      process.env.SMTP_PASS = 'mock-password';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_SECURE = 'true';

      let sendMailAttempts = 0;
      const attemptTimestamps: number[] = [];

      const mockSendMail = vi.fn().mockImplementation(async () => {
        sendMailAttempts++;
        attemptTimestamps.push(Date.now());
        if (sendMailAttempts < 3) {
          // Fail attempts 1 and 2 with transient socket timeout
          throw new Error('connect ETIMEDOUT 198.51.100.1:465');
        }
        // Attempt 3 succeeds
        return { messageId: '<success-msg-attempt-3@vayanai.in.net>' };
      });

      vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: mockSendMail,
        close: vi.fn()
      } as any);

      const res = await sendCandidateEmail({
        to: 'candidate.retry@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
        emailType: 'invitation',
        candidateId: 'test-cand-retry'
      });

      // Verify attempts: Attempt 0, Attempt 1, Attempt 2 -> Total 3 calls
      expect(sendMailAttempts).toBe(3);
      expect(res.success).toBe(true);
      expect(res.mode).toBe('smtp');
      expect(res.messageId).toBe('<success-msg-attempt-3@vayanai.in.net>');

      // Verify backoff delays:
      // Delay 1: >= 500ms
      // Delay 2: >= 1500ms
      const delay1 = attemptTimestamps[1] - attemptTimestamps[0];
      const delay2 = attemptTimestamps[2] - attemptTimestamps[1];
      console.log(`[Backoff Timing] Delay 1: ${delay1}ms (expected >= 500ms), Delay 2: ${delay2}ms (expected >= 1500ms)`);
      expect(delay1).toBeGreaterThanOrEqual(450); // slight tolerance for timer jitter
      expect(delay2).toBeGreaterThanOrEqual(1450);
    });

    it('does NOT retry on permanent non-transient SMTP errors (e.g. 550 User unknown)', async () => {
      process.env.SMTP_HOST = 'smtp.vayanai.in.net';
      process.env.SMTP_USER = 'operations@vayanai.in.net';
      process.env.SMTP_PASS = 'mock-password';
      process.env.SMTP_PORT = '465';

      let sendMailAttempts = 0;
      const mockSendMail = vi.fn().mockImplementation(async () => {
        sendMailAttempts++;
        throw new Error('550 5.1.1 <invalid@domain.invalid>: Recipient address rejected: User unknown in virtual mailbox table');
      });

      vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: mockSendMail,
        close: vi.fn()
      } as any);

      // In production mode, permanent error should fail immediately without retries
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const res = await sendCandidateEmail({
          to: 'invalid@domain.invalid',
          subject: 'Test Subject',
          html: '<p>Test</p>',
          text: 'Test',
          emailType: 'rejection'
        });

        // Exactly 1 attempt made (0 retries because non-transient error)
        expect(sendMailAttempts).toBe(1);
        expect(res.success).toBe(false);
        expect(res.mode).toBe('smtp');
        expect(res.error).toContain('550');
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('exhausts all 2 retries on continuous transient failures and reports error in production', async () => {
      process.env.SMTP_HOST = 'smtp.vayanai.in.net';
      process.env.SMTP_USER = 'operations@vayanai.in.net';
      process.env.SMTP_PASS = 'mock-password';
      process.env.SMTP_PORT = '465';

      let sendMailAttempts = 0;
      const mockSendMail = vi.fn().mockImplementation(async () => {
        sendMailAttempts++;
        throw new Error('read ECONNRESET: connection reset by peer');
      });

      vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: mockSendMail,
        close: vi.fn()
      } as any);

      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const res = await sendCandidateEmail({
          to: 'candidate.down@example.com',
          subject: 'Test Subject',
          html: '<p>Test</p>',
          text: 'Test',
          emailType: 'invitation'
        });

        // Attempt 0 + 2 retries = 3 attempts total
        expect(sendMailAttempts).toBe(3);
        expect(res.success).toBe(false);
        expect(res.mode).toBe('smtp');
        expect(res.error).toContain('ECONNRESET');
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });
});
