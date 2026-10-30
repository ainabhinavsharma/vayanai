/**
 * tests/email-smoke.ts
 *
 * Standalone offline smoke test script.
 * Instantiates every email builder / renderer in lib/services/email-dispatcher.ts
 * with both rich and minimal/sparse fixtures. Asserts that the literal substring
 * "undefined" NEVER appears anywhere in the rendered subject, html, or text.
 *
 * Runs completely offline without SMTP credentials or network access.
 * Runnable via:
 *   npx tsx tests/email-smoke.ts
 *   npm run test:smoke
 *   npx vitest run tests/email-smoke.ts
 */

import {
  buildApplicationReceivedEmail,
  buildInterviewInvitationEmail,
  buildAssessmentCompletedEmail,
  buildOfferLetterEmail,
  buildRejectionNoticeEmail,
  buildPasswordResetEmail,
  buildCertificateIssuedEmail,
  buildCertificateApprovedEmail,
  buildProfileUpdatedEmail
} from '../lib/services/email-dispatcher';
import { InternApplication, ProctoringTelemetry } from '../types/auth';

// ----------------------------------------------------------------------------
// TEST FIXTURES
// ----------------------------------------------------------------------------

const richCandidate: InternApplication = {
  id: 'cand-rich-001',
  userId: 'usr-rich-001',
  userName: 'Ananya Sharma',
  userEmail: 'ananya.sharma@example.com',
  phone: '+91 98765 43210',
  collegeName: 'Delhi Technological University',
  semester: '6th Semester',
  trackName: 'Full Stack AI Engineering',
  cvUrl: 'https://example.com/cv.pdf',
  status: 'applied',
  magicToken: 'mag-tok-rich-abcdef123456',
  magicTokenExpiresAt: '2026-11-30T00:00:00Z',
  inviteScheduledAt: '2026-10-28T04:00:00Z',
  inviteSentAt: '2026-10-28T05:00:00Z',
  interviewScore: 92,
  interviewAnswers: { q1: 'opt1' },
  dbertProfile: {
    leadPropensity: 'HIGH',
    urgencyLevel: 'IMMEDIATE',
    financialSupport: 'FAMILY_SPONSORED',
    priorSpend: 'PREMIUM_COHORTS',
    counselorPitchGuide: 'Highlight premium features'
  },
  proctoringTelemetry: {
    proctoringMode: 'webcam',
    tabSwitchCount: 0,
    copyPasteAttempts: 0,
    totalDurationSeconds: 1200,
    webcamVerified: true,
    integrityScore: 'CLEAN',
    flags: [],
    submittedAt: '2026-10-28T05:00:00Z'
  },
  feedbackNote: 'Strong technical aptitude shown.',
  offerLetterId: 'VY-OFFER-2026-9021',
  offerSentAt: '2026-10-28T06:00:00Z',
  offerAcceptedAt: '2026-10-28T07:00:00Z',
  signatureName: 'Ananya Sharma',
  batchStartDate: '2026-11-02',
  available3Months: 'Yes',
  laptopInternet: 'Yes',
  placementNeeded: 'Yes',
  sourceReferral: 'Campus Drive',
  depositReceipt: 'VP-DEP-499-1234',
  depositPaidAt: '2026-10-28T08:00:00Z',
  appliedAt: '2026-10-28T02:00:00Z',
  updatedAt: '2026-10-28T08:00:00Z'
};

const sparseCandidate: InternApplication = {
  id: 'cand-sparse-002',
  userId: 'usr-sparse-002',
  userName: '',
  userEmail: 'sparse.intern@example.com',
  trackName: '',
  status: 'applied',
  magicToken: 'mag-tok-sparse-999',
  appliedAt: '2026-10-28T00:00:00Z',
  updatedAt: '2026-10-28T00:00:00Z'
};

const richTelemetry: ProctoringTelemetry = {
  proctoringMode: 'webcam',
  tabSwitchCount: 0,
  copyPasteAttempts: 0,
  totalDurationSeconds: 780,
  webcamVerified: true,
  integrityScore: 'CLEAN',
  flags: [],
  submittedAt: '2026-10-28T05:00:00Z'
};

const sparseTelemetry: ProctoringTelemetry = {
  proctoringMode: 'camera_free',
  tabSwitchCount: 0,
  copyPasteAttempts: 0,
  totalDurationSeconds: 0,
  webcamVerified: false,
  integrityScore: 'FLAGGED_HIGH',
  flags: [],
  submittedAt: '2026-10-28T05:00:00Z'
};

const richCert = {
  certificateId: 'CERT-VAY-2026-FS-901',
  internName: 'Aarav Patel',
  internEmail: 'aarav.patel@example.com',
  internId: 'VAY-INT-2026-088',
  domain: 'Distributed Operations & AI Architecture',
  projectName: 'Regional Route Optimization Engine'
};

const sparseCert = {
  certificateId: 'CERT-VAY-2026-MIN',
  internEmail: 'minimal.cert@example.com'
};

// ----------------------------------------------------------------------------
// VERIFICATION ENGINE
// ----------------------------------------------------------------------------

export function assertNoUndefined(
  templateName: string,
  variant: string,
  output: { subject: string; html: string; text: string }
): void {
  const parts: Array<[string, string]> = [
    ['subject', output.subject],
    ['html', output.html],
    ['text', output.text]
  ];

  for (const [field, content] of parts) {
    if (typeof content !== 'string') {
      throw new Error(`[${templateName} - ${variant}] Expected ${field} to be string, received ${typeof content}`);
    }
    if (content.length === 0) {
      throw new Error(`[${templateName} - ${variant}] Output ${field} is unexpectedly empty`);
    }
    if (content.includes('undefined')) {
      const idx = content.indexOf('undefined');
      const snippet = content.substring(Math.max(0, idx - 40), Math.min(content.length, idx + 50));
      throw new Error(
        `[${templateName} - ${variant}] Literal "undefined" found in ${field}!\nContext: "...${snippet}..."`
      );
    }
  }

  console.log(`  ✓ [${templateName}] ${variant}: Clean (subject: ${output.subject.length}c, html: ${output.html.length}c, text: ${output.text.length}c)`);
}

export function runAllEmailSmokeTests(): { passed: number; failed: number } {
  console.log('------------------------------------------------------------');
  console.log('VAYANAI EMAIL SYSTEM OFFLINE SMOKE SUITE');
  console.log('Auditing all templates for literal "undefined" output...');
  console.log('------------------------------------------------------------');

  let passed = 0;

  // 1. Stage 1: Application Received
  assertNoUndefined('buildApplicationReceivedEmail', 'Rich Fixture', buildApplicationReceivedEmail(richCandidate));
  passed++;
  assertNoUndefined('buildApplicationReceivedEmail', 'Sparse Fixture', buildApplicationReceivedEmail(sparseCandidate));
  passed++;

  // 2. Stage 2: Interview Invitation
  assertNoUndefined('buildInterviewInvitationEmail', 'Rich Fixture', buildInterviewInvitationEmail(richCandidate));
  passed++;
  assertNoUndefined('buildInterviewInvitationEmail', 'Sparse Fixture', buildInterviewInvitationEmail(sparseCandidate));
  passed++;

  // 3. Stage 3: Assessment Completed
  assertNoUndefined('buildAssessmentCompletedEmail', 'Rich Candidate + Full Telemetry', buildAssessmentCompletedEmail(richCandidate, richTelemetry));
  passed++;
  assertNoUndefined('buildAssessmentCompletedEmail', 'Rich Candidate + Undefined Telemetry', buildAssessmentCompletedEmail(richCandidate, undefined));
  passed++;
  assertNoUndefined('buildAssessmentCompletedEmail', 'Sparse Candidate + Sparse Telemetry', buildAssessmentCompletedEmail(sparseCandidate, sparseTelemetry));
  passed++;
  assertNoUndefined('buildAssessmentCompletedEmail', 'Sparse Candidate + Undefined Telemetry', buildAssessmentCompletedEmail(sparseCandidate, undefined));
  passed++;

  // 4. Stage 4: Offer Letter
  assertNoUndefined('buildOfferLetterEmail', 'Rich Fixture (with Offer ID & Score)', buildOfferLetterEmail(richCandidate));
  passed++;
  assertNoUndefined('buildOfferLetterEmail', 'Sparse Fixture (omitted Offer ID & Score)', buildOfferLetterEmail(sparseCandidate));
  passed++;

  // 5. Stage 5: Rejection Notice
  assertNoUndefined('buildRejectionNoticeEmail', 'Rich Fixture with Note', buildRejectionNoticeEmail(richCandidate, 'Track capacity reached for November.'));
  passed++;
  assertNoUndefined('buildRejectionNoticeEmail', 'Sparse Fixture with Undefined Note', buildRejectionNoticeEmail(sparseCandidate, undefined));
  passed++;

  // 6. Stage 6: Password Reset
  assertNoUndefined(
    'buildPasswordResetEmail',
    'Rich Fixture (Full Name + Reset URL)',
    buildPasswordResetEmail({ name: 'Vikram Seth', email: 'vikram.seth@example.com' }, 'https://vayanai.in.net/auth/reset-password?token=sec-tok-1234')
  );
  passed++;
  assertNoUndefined(
    'buildPasswordResetEmail',
    'Sparse Fixture (Name Undefined + Reset URL)',
    buildPasswordResetEmail({ email: 'sparse.user@example.com' }, 'https://vayanai.in.net/auth/reset-password?token=sec-tok-5678')
  );
  passed++;
  assertNoUndefined(
    'buildPasswordResetEmail',
    'Minimal Fixture (Sparse Email + Local BaseUrl)',
    buildPasswordResetEmail({ email: 'minimal@local' }, 'http://localhost:3000/auth/reset-password?token=local-999', 'http://localhost:3000')
  );
  passed++;

  // 7. Stage 7: Certificate Issued
  assertNoUndefined('buildCertificateIssuedEmail', 'Rich Fixture (Complete Credential Metadata)', buildCertificateIssuedEmail(richCert));
  passed++;
  assertNoUndefined('buildCertificateIssuedEmail', 'Sparse Fixture (Minimal Cert ID + Email only)', buildCertificateIssuedEmail(sparseCert));
  passed++;

  // 8. Stage 8: Certificate Approved
  assertNoUndefined('buildCertificateApprovedEmail', 'Rich Fixture (Full Credential Metadata)', buildCertificateApprovedEmail(richCert));
  passed++;
  assertNoUndefined('buildCertificateApprovedEmail', 'Sparse Fixture (Minimal Cert ID + Email only)', buildCertificateApprovedEmail(sparseCert));
  passed++;

  // 9. Stage 9: Profile Update Notification
  assertNoUndefined(
    'buildProfileUpdatedEmail',
    'Rich Fixture (Full Name, Phone & Email)',
    buildProfileUpdatedEmail({ name: 'Rohit Verma', email: 'rohit.verma@example.com' }, { name: 'Rohit K. Verma', phone: '+91 99887 76655' })
  );
  passed++;
  assertNoUndefined(
    'buildProfileUpdatedEmail',
    'Sparse Fixture (Sparse User & Omitted Phone)',
    buildProfileUpdatedEmail({ email: 'sparse.profile@example.com' }, { name: 'Updated Name Only' })
  );
  passed++;

  console.log('------------------------------------------------------------');
  console.log(`✓ Smoke verification successful! ${passed} template renders verified with 0 "undefined" occurrences.`);
  console.log('------------------------------------------------------------');

  return { passed, failed: 0 };
}

// Support Vitest runner when run via `npx vitest run tests/email-smoke.ts`
declare const describe: ((name: string, fn: () => void) => void) | undefined;
declare const it: ((name: string, fn: () => void) => void) | undefined;
declare const expect: any;

if (typeof describe === 'function' && typeof it === 'function') {
  describe('Email Templates Offline Smoke Test Suite', () => {
    it('verifies that no template variant ever renders "undefined" literal', () => {
      const summary = runAllEmailSmokeTests();
      if (typeof expect !== 'undefined') {
        expect(summary.passed).toBeGreaterThanOrEqual(18);
        expect(summary.failed).toBe(0);
      }
    });
  });
}

// Standalone execution entrypoint when run via `npx tsx tests/email-smoke.ts`
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('email-smoke.ts') || process.argv[1].endsWith('email-smoke.js'));

if (isMain && !process.env.VITEST) {
  try {
    const summary = runAllEmailSmokeTests();
    if (summary.failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ Smoke Test Failure:', err.message);
    process.exit(1);
  }
}
