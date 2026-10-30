import { describe, it, expect } from 'vitest';
import {
  getInterviewQuestions,
  evaluateInterviewAssessment,
  submitInternAssessment,
  recordRefundableDepositPayment,
  getInternApplicationByUserId,
  getAllInternApplications,
  getTechnicalQuestionsForTrack,
  upsertInternApplicationFromSheet
} from '@/lib/db/intern-repo';
import { getUserByEmail, createUser } from '@/lib/db/users-repo';
import { hashPassword } from '@/lib/auth/password';

describe('Intern Candidate Flow & Virtual Assessment Engine', () => {
  it('supplies 8 interleaved questions: 5 technical scenarios and 3 DBERT indirect profiling questions', () => {
    const questions = getInterviewQuestions();
    expect(questions).toHaveLength(8);

    const qIds = questions.map((q) => q.id);
    // 5 Technical scenarios
    expect(qIds).toContain('q-pacing-safety');
    expect(qIds).toContain('q-partner-integrity');
    expect(qIds).toContain('q-altitude-protocol');
    expect(qIds).toContain('q-community-spend');
    expect(qIds).toContain('q-ops-contingency');

    // 3 Interleaved profiling questions
    expect(qIds).toContain('q-profile-urgency');
    expect(qIds).toContain('q-profile-investment');
    expect(qIds).toContain('q-profile-support');

    // Verify profiling questions are at steps 3, 5, 7
    expect(questions[2].id).toBe('q-profile-urgency');
    expect(questions[4].id).toBe('q-profile-investment');
    expect(questions[6].id).toBe('q-profile-support');
  });

  it('verifies answer options are jumbled across multiple positions rather than locked at option A', () => {
    const techQuestions = getTechnicalQuestionsForTrack('Operations');
    const optimalIndices: number[] = [];

    for (const q of techQuestions) {
      const optIdx = q.options.findIndex((o) => o.isOptimal);
      expect(optIdx).toBeGreaterThanOrEqual(0);
      optimalIndices.push(optIdx);
    }

    // Verify optimal answers occupy different indices (not all 0)
    const uniqueIndices = new Set(optimalIndices);
    expect(uniqueIndices.size).toBeGreaterThan(1);
  });

  it('evaluates answers and awards 100% for all optimal responses with DBERT intelligence profile', () => {
    const perfectAnswers = {
      'q-pacing-safety': 'opt-1-optimal',
      'q-partner-integrity': 'opt-2-optimal',
      'q-profile-urgency': 'opt-urgency-immediate',
      'q-altitude-protocol': 'opt-3-optimal',
      'q-profile-investment': 'opt-invest-premium',
      'q-community-spend': 'opt-4-optimal',
      'q-profile-support': 'opt-support-family',
      'q-ops-contingency': 'opt-5-optimal'
    };

    const result = evaluateInterviewAssessment(perfectAnswers, 'Operations');
    expect(result.score).toBe(100);
    expect(result.selected).toBe(true);
    expect(result.feedback.toLowerCase()).toContain('selected');

    // Verify DBERT lead intelligence
    expect(result.dbertProfile).toBeDefined();
    expect(result.dbertProfile.leadPropensity).toBe('HIGH');
    expect(result.dbertProfile.urgencyLevel).toBe('IMMEDIATE');
    expect(result.dbertProfile.priorSpend).toBe('PREMIUM_COHORTS');
    expect(result.dbertProfile.financialSupport).toBe('FAMILY_SPONSORED');
    expect(result.dbertProfile.counselorPitchGuide).toContain('High Propensity DBERT Lead');
  });

  it('selects candidates scoring >= 70 points and holds < 70 for manual review', () => {
    // 4 correct (80 pts) + 1 incorrect (0 pts) = 80 pts (>= 70 -> selected)
    const passingAnswers = {
      'q-pacing-safety': 'opt-1-optimal', // 20
      'q-partner-integrity': 'opt-2-optimal', // 20
      'q-altitude-protocol': 'opt-3-optimal', // 20
      'q-community-spend': 'opt-4-optimal', // 20
      'q-ops-contingency': 'opt-5-wait' // 2
    };
    const passingResult = evaluateInterviewAssessment(passingAnswers, 'Operations');
    expect(passingResult.score).toBe(82);
    expect(passingResult.selected).toBe(true);

    // 2 correct (40 pts) + 3 incorrect = 44 pts (< 70 -> not immediately selected)
    const lowAnswers = {
      'q-pacing-safety': 'opt-1-rush', // 4
      'q-partner-integrity': 'opt-2-compromise', // 0
      'q-altitude-protocol': 'opt-3-optimal', // 20
      'q-community-spend': 'opt-4-optimal', // 20
      'q-ops-contingency': 'opt-5-cancel' // 0
    };
    const lowResult = evaluateInterviewAssessment(lowAnswers, 'Operations');
    expect(lowResult.score).toBe(44);
    expect(lowResult.selected).toBe(false);
  });

  it('submits assessment for candidate and updates application state with DBERT profile', () => {
    // Create candidate user
    const testCandidateEmail = `candidate.${Date.now()}@example.com`;
    const candidate = createUser({
      name: 'Tanvi Roy',
      email: testCandidateEmail,
      password: 'InternTestPass123!',
      role: 'intern'
    });

    const answers = {
      'q-pacing-safety': 'opt-1-optimal',
      'q-partner-integrity': 'opt-2-optimal',
      'q-profile-urgency': 'opt-urgency-short',
      'q-altitude-protocol': 'opt-3-optimal',
      'q-profile-investment': 'opt-invest-modest',
      'q-community-spend': 'opt-4-optimal',
      'q-profile-support': 'opt-support-self',
      'q-ops-contingency': 'opt-5-optimal'
    };

    const result = submitInternAssessment(candidate.id, answers);
    expect(result.application.userId).toBe(candidate.id);
    expect(result.score).toBe(100);
    expect(result.selected).toBe(true);
    expect(result.application.status).toBe('selected');

    // Retrieve via user ID query
    const fetched = getInternApplicationByUserId(candidate.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.status).toBe('selected');
    expect(fetched?.interviewScore).toBe(100);
    expect(fetched?.dbertProfile).toBeDefined();
    expect(fetched?.dbertProfile?.urgencyLevel).toBe('SHORT_TERM');
  });

  it('records ₹499 Refundable Commitment Deposit and unlocks workspace', () => {
    let candidate = getUserByEmail('ananya.intern@example.com');
    if (!candidate) {
      candidate = createUser({
        name: 'Ananya Ghosh',
        email: `deposit.flow.${Date.now()}@example.com`,
        password: 'InternPass123!',
        role: 'intern'
      });
      upsertInternApplicationFromSheet({
        userName: candidate.name,
        userEmail: candidate.email,
        trackName: 'Sustainable Regional Operations & Growth'
      });
    }

    // Process ₹499 deposit payment
    const payment = recordRefundableDepositPayment(
      candidate!.id,
      'upi_mock'
    );

    expect(payment.amountINR).toBe(499);
    expect(payment.paymentStatus).toBe('completed');
    expect(payment.productType).toBe('security_deposit');
    expect(payment.receiptNumber).toMatch(/^VP-DEP-499-[A-Z0-9]+$/);

    // Verify candidate application status transitioned to enrolled/onboarded
    const updatedApp = getInternApplicationByUserId(candidate!.id);
    expect(['enrolled', 'onboarded']).toContain(updatedApp?.status);
    expect(updatedApp?.depositReceipt).toBe(payment.receiptNumber);
    expect(updatedApp?.depositPaidAt).toBeDefined();

    // Verify in overall applications list
    const allApps = getAllInternApplications();
    const candidateApp = allApps.find((a) => a.userId === candidate!.id);
    expect(candidateApp).toBeDefined();
    expect(candidateApp?.depositReceipt).toBe(payment.receiptNumber);
  });
});
