import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '@/lib/db/sqlite';
import {
  parseCSV,
  parseTimestampToISO,
  fetchAndSyncGoogleSheet
} from '@/lib/services/intern-sync';
import {
  getInternApplicationByEmail,
  getInternApplicationByToken,
  getInternApplicationById,
  submitInternInterviewByToken,
  approveCandidateAndGenerateOffer,
  acceptOfferWithSignature,
  processInternDeposit,
  listAllInternApplications
} from '@/lib/db/intern-repo';
import {
  getInterviewQuestionsForTrack,
  DATA_ANALYST_QUESTIONS,
  FULLSTACK_QUESTIONS,
  AIML_QUESTIONS,
  ORIGINAL_OPERATIONS_QUESTIONS
} from '@/lib/data/intern-questions';
import {
  buildApplicationReceivedEmail,
  buildInterviewInvitationEmail,
  buildAssessmentCompletedEmail,
  buildOfferLetterEmail,
  buildRejectionNoticeEmail,
  runScheduledInviteDispatcher,
  dispatchApplicationReceivedEmail,
  dispatchSingleCandidateInvite,
  dispatchAssessmentCompletedEmail,
  dispatchSingleCandidateOffer,
  dispatchRejectionEmail
} from '@/lib/services/email-dispatcher';

const TEST_EMAIL = 'sync.intern.test@example.com';

describe('Phase 1: Google Sheet CSV Parser & Ingestion Engine', () => {
  beforeAll(() => {
    const db = getDb();
    db.prepare('DELETE FROM intern_applications WHERE user_email = ?').run(TEST_EMAIL);
    db.prepare('DELETE FROM users WHERE email = ?').run(TEST_EMAIL);
  });

  it('correctly parses complex CSV rows with quoted fields and commas', () => {
    const rawCSV = `Timestamp,Email Address,Select Internship,Name,College Name,Semester,WhatsApp number ,Are you available for next 3 months for Internship?,Do you Laptop and Internet Connection ?,Do u require job placement after completion of Internship?,How did you hear about us,Please Upload Your CV
10/24/2026 0:25:37,test.candidate1@example.com,Data Analyst,"Arya, Astha",Dayananda Sagar College of Engineering,5th Semester,9471988277,Yes,Yes,Yes,Unstop,https://drive.google.com/open?id=1A5qiRLbwH19oblKocr7tM0S_YWGstEVn
10/24/2026 0:34:28,test.candidate2@example.com,Full Stack Development,Kavya Mathur,"Manipal University, Jaipur",3rd Semester,8837515478,Yes,Yes,No,LinkedIn,https://drive.google.com/open?id=test2`;

    const records = parseCSV(rawCSV);
    expect(records.length).toBe(2);
    expect(records[0]['Email Address']).toBe('test.candidate1@example.com');
    expect(records[0]['Name']).toBe('Arya, Astha');
    expect(records[0]['Select Internship']).toBe('Data Analyst');
    expect(records[1]['College Name']).toBe('Manipal University, Jaipur');
  });

  it('accurately parses date strings and computes 2-hour delay window', () => {
    const rawTimestamp = '10/24/2026 14:00:00';
    const iso = parseTimestampToISO(rawTimestamp);
    expect(iso).toBeDefined();

    const date = new Date(iso);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9); // 0-indexed October
    expect(date.getDate()).toBe(24);
  });

  it('ingests candidates from CSV and deduplicates existing emails', async () => {
    const sampleCSV = `Timestamp,Email Address,Select Internship,Name,College Name,Semester,WhatsApp number ,Are you available for next 3 months for Internship?,Do you Laptop and Internet Connection ?,Do u require job placement after completion of Internship?,How did you hear about us,Please Upload Your CV
10/24/2026 10:00:00,${TEST_EMAIL},Data Analyst,Rohit Verma,IIT Guwahati,7th Semester,9876543210,Yes,Yes,Yes,Direct,https://drive.google.com/open?id=test01`;

    const res1 = await fetchAndSyncGoogleSheet('mock-url', sampleCSV);
    expect(res1.success).toBe(true);
    expect(res1.newInserted).toBeGreaterThanOrEqual(1);

    const cand1 = getInternApplicationByEmail(TEST_EMAIL);
    expect(cand1).not.toBeNull();
    expect(cand1?.userName).toBe('Rohit Verma');
    expect(cand1?.trackName).toBe('Data Analyst');
    expect(cand1?.magicToken).toBeDefined();
    expect(cand1?.status).toBe('applied');

    // Deduplication check: sync the exact same CSV again
    const res2 = await fetchAndSyncGoogleSheet('mock-url', sampleCSV);
    expect(res2.success).toBe(true);
    expect(res2.newInserted).toBe(0);
    expect(res2.updatedExisting).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 2: 2-Hour Queue & BOTSKILL Email Dispatcher', () => {
  it('correctly generates branded assessment invitation and offer letter templates', () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    const inviteEmail = buildInterviewInvitationEmail(cand, 'https://vayanai.in.net');
    expect(inviteEmail.subject).toContain('Next Step: Online Technical & Values Assessment');
    expect(inviteEmail.html).toContain(cand.magicToken);
    expect(inviteEmail.html).toContain('2 November 2026');

    const offerEmail = buildOfferLetterEmail(cand, 'https://vayanai.in.net');
    expect(offerEmail.subject).toContain('Congratulations! Offer Letter');
    expect(offerEmail.html).toContain('/intern/offer?token=');
  });

  it('dispatches single candidate invite immediately when manual override is invoked', async () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    const res = await dispatchSingleCandidateInvite(cand.id);
    expect(res.success).toBe(true);
    expect(res.application.status).toBe('invited');
    expect(res.application.inviteSentAt).toBeDefined();
  });
});

describe('Phase 3: Track-Tailored Candidate Assessment', () => {
  it('loads distinct tailored questions for each internship domain with interleaved profiling', () => {
    const dataQs = getInterviewQuestionsForTrack('Data Analyst');
    expect(dataQs.length).toBe(8);
    expect(dataQs[0].id).toBe('q-data-missing');
    expect(dataQs[2].id).toBe('q-profile-urgency');

    const fsQs = getInterviewQuestionsForTrack('Full Stack Development');
    expect(fsQs.length).toBe(8);
    expect(fsQs[0].id).toBe('q-fs-rsc');
    expect(fsQs[4].id).toBe('q-profile-investment');

    const aiQs = getInterviewQuestionsForTrack('Artificial Intelligence (AI) and Machine Learning (ML)');
    expect(aiQs.length).toBe(8);
    expect(aiQs[0].id).toBe('q-ai-rag');
    expect(aiQs[6].id).toBe('q-profile-support');

    const opsQs = getInterviewQuestionsForTrack('Sustainable Regional Operations');
    expect(opsQs.length).toBe(8);
    expect(opsQs[0].id).toBe('q-pacing-safety');
  });

  it('submits assessment with magic token, evaluates score out of 100, and generates DBERT lead profile', () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    expect(cand.magicToken).toBeDefined();

    // Submit optimal answers for Data Analyst track with DBERT commercial responses
    const answers: Record<string, string> = {
      'q-data-missing': 'opt-data-1-optimal',
      'q-data-sql': 'opt-data-2-optimal',
      'q-profile-urgency': 'opt-urgency-immediate',
      'q-data-outlier': 'opt-data-3-optimal',
      'q-profile-investment': 'opt-invest-premium',
      'q-data-privacy': 'opt-data-4-optimal',
      'q-profile-support': 'opt-support-family',
      'q-data-ethics': 'opt-data-5-optimal'
    };

    const result = submitInternInterviewByToken(cand.magicToken!, answers);
    expect(result.score).toBe(100);
    expect(result.selected).toBe(true);
    expect(result.application.status).toBe('selected');
    expect(result.application.interviewScore).toBe(100);
    expect(result.application.dbertProfile).toBeDefined();
    expect(result.application.dbertProfile?.leadPropensity).toBe('HIGH');
    expect(result.application.dbertProfile?.urgencyLevel).toBe('IMMEDIATE');
  });
});

describe('Phase 4: Candidate Selection & Offer Letter Generation', () => {
  it('approves candidate, generates unique Offer ID, and dispatches offer email', async () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    const res = await dispatchSingleCandidateOffer(cand.id);

    expect(res.success).toBe(true);
    expect(res.offerId).toMatch(/^VY-OFFER-2026-\d{4}$/);
    expect(res.application.status).toBe('offer_sent');
    expect(res.application.offerLetterId).toBe(res.offerId);
  });

  it('digitally signs offer letter with legal name and timestamp', () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    const signed = acceptOfferWithSignature(cand.magicToken!, 'Rohit Verma');

    expect(signed.status).toBe('offer_accepted');
    expect(signed.signatureName).toBe('Rohit Verma');
    expect(signed.offerAcceptedAt).toBeDefined();
  });
});

describe('Phase 5: Seat Lock via ₹499 Refundable Commitment Deposit', () => {
  it('confirms refundable deposit payment, issues official receipt, and transitions to enrolled', () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    const payment = processInternDeposit(cand.magicToken!, 'upi_mock');

    expect(payment.amountINR).toBe(499);
    expect(payment.productType).toBe('security_deposit');
    expect(payment.receiptNumber).toMatch(/^VP-DEP-499-\d{4}$/);

    const enrolled = getInternApplicationById(cand.id)!;
    expect(enrolled.status).toBe('enrolled');
    expect(enrolled.depositReceipt).toBe(payment.receiptNumber);
    expect(enrolled.depositPaidAt).toBeDefined();
  });
});

describe('Phase 6: Admin Candidate Supervision Desk Queries', () => {
  it('retrieves candidate list and filters by status and track', () => {
    const all = listAllInternApplications();
    expect(all.length).toBeGreaterThanOrEqual(1);

    const dataInterns = listAllInternApplications({ track: 'Data' });
    expect(dataInterns.every((c) => c.trackName.toLowerCase().includes('data'))).toBe(true);

    const enrolledInterns = listAllInternApplications({ status: 'enrolled' });
    expect(enrolledInterns.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 7: 5-Stage Candidate Email Lifecycle & SMTP Transport', () => {
  it('generates Stage 1 Application Received email with track and cohort details', () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    const email = buildApplicationReceivedEmail(cand);

    expect(email.subject).toContain('Application Received:');
    expect(email.subject).toContain(cand.trackName);
    expect(email.html).toContain(cand.userName);
    expect(email.html).toContain('Monday, 2 November 2026');
    expect(email.text).toContain('Batch Capacity Review');
  });

  it('generates Stage 3 Assessment Completed email with proctoring audit details', () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    const email = buildAssessmentCompletedEmail(cand, {
      proctoringMode: 'camera_free',
      tabSwitchCount: 0,
      copyPasteAttempts: 0,
      totalDurationSeconds: 420,
      webcamVerified: false,
      integrityScore: 'CLEAN',
      flags: [],
      submittedAt: new Date().toISOString()
    });

    expect(email.subject).toContain('Assessment Recorded:');
    expect(email.html).toContain('Camera-Free Focus Mode');
    expect(email.html).toContain('7 minutes');
    expect(email.text).toContain('Verified Clean Audit');
  });

  it('generates Stage 5 Rejection Notice email with professional feedback note', () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;
    const email = buildRejectionNoticeEmail(cand, 'High applicant volume for Data track.');

    expect(email.subject).toContain('Update on your Vayanai Internship Application');
    expect(email.html).toContain('High applicant volume for Data track.');
    expect(email.text).toContain('upcoming quarterly cohorts');
  });

  it('dispatches Stage 1, Stage 3, and Stage 5 lifecycle emails successfully', async () => {
    const cand = getInternApplicationByEmail(TEST_EMAIL)!;

    const res1 = await dispatchApplicationReceivedEmail(cand.id);
    expect(res1.success).toBe(true);

    const res3 = await dispatchAssessmentCompletedEmail(cand.id);
    expect(res3.success).toBe(true);

    const res5 = await dispatchRejectionEmail(cand.id, 'Test rejection note');
    expect(res5.success).toBe(true);
  });
});
