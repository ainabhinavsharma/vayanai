import { describe, it, expect } from 'vitest';
import { buildInterviewInvitationEmail } from '@/lib/services/email-dispatcher';
import {
  upsertInternApplicationFromSheet,
  submitInternInterviewByToken,
  getInternApplicationByToken,
  listAllInternApplications
} from '@/lib/db/intern-repo';
import { InternApplication } from '@/types/auth';
import { pickBestFemaleIndianVoice } from '@/lib/utils/speech';

describe('Virtual Interview, Human Panelist Presence & Anti-Cheat Proctoring Pipeline', () => {
  it('generates an invitation email with strict one-time attempt and 10-15 min quiet time requirements', () => {
    const mockCandidate: InternApplication = {
      id: 'app-test-mock-123',
      userId: 'usr-test-123',
      userName: 'Rohit Sharma',
      userEmail: 'rohit@example.com',
      trackName: 'Data Analyst',
      collegeName: 'IIT Bombay',
      status: 'invited',
      magicToken: 'mock_magic_token_proctoring_123',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const emailData = buildInterviewInvitationEmail(mockCandidate);

    expect(emailData.subject).toContain('Online Technical & Values Assessment');
    expect(emailData.subject).toContain('Data Analyst');

    // Verify strict one-time attempt warning
    expect(emailData.text).toContain('STRICT ONE-TIME ATTEMPT');
    expect(emailData.html.toUpperCase()).toContain('STRICT ONE-TIME ATTEMPT');

    // Verify 10-15 minutes quiet time notice
    expect(emailData.text).toContain('10 to 15 minutes');
    expect(emailData.html).toContain('10 to 15 minutes');

    // Verify proctoring environment requirements (webcam, tab switching, focus integrity)
    expect(emailData.text.toLowerCase()).toContain('webcam');
    expect(emailData.html.toLowerCase()).toContain('webcam');

    // Verify cohort start date Monday, 2 November 2026
    expect(emailData.text).toContain('2 November 2026');
    expect(emailData.html).toContain('2 November 2026');

    // Verify direct assessment portal link with magic token
    expect(emailData.text).toContain(`token=${mockCandidate.magicToken}`);
    expect(emailData.html).toContain(`token=${mockCandidate.magicToken}`);
  });

  it('records a clean assessment submission with complete proctoring telemetry in SQLite', () => {
    const uniqueEmail = `clean.candidate.${Date.now()}@example.com`;
    const { application } = upsertInternApplicationFromSheet({
      userName: 'Clean Proctor Candidate',
      userEmail: uniqueEmail,
      trackName: 'Data Analyst',
      collegeName: 'IIT Bombay',
      appliedAt: new Date().toISOString()
    });

    const token = application.magicToken!;
    expect(token).toBeDefined();

    const answers = {
      'q-pacing-safety': 'opt-1-optimal',
      'q-partner-integrity': 'opt-2-optimal',
      'q-altitude-protocol': 'opt-3-optimal',
      'q-community-spend': 'opt-4-optimal',
      'q-ops-contingency': 'opt-5-optimal',
      'q-profile-urgency': 'opt-urgency-immediate',
      'q-profile-investment': 'opt-invest-premium',
      'q-profile-support': 'opt-support-family'
    };

    const telemetry = {
      tabSwitchCount: 0,
      copyPasteAttempts: 0,
      fullscreenExits: 0,
      totalDurationSeconds: 480,
      webcamVerified: true
    };

    const result = submitInternInterviewByToken(token, answers, telemetry);
    expect(result).not.toBeNull();
    expect(result?.score).toBe(100);
    expect(result?.selected).toBe(true);

    const app = getInternApplicationByToken(token);
    expect(app).not.toBeNull();
    expect(app?.status).toBe('selected');
    expect(app?.proctoringTelemetry).toBeDefined();
    expect(app?.proctoringTelemetry?.integrityScore).toBe('CLEAN');
    expect(app?.proctoringTelemetry?.tabSwitchCount).toBe(0);
    expect(app?.proctoringTelemetry?.copyPasteAttempts).toBe(0);
    expect(app?.proctoringTelemetry?.webcamVerified).toBe(true);
    expect(app?.proctoringTelemetry?.totalDurationSeconds).toBe(480);
    expect(app?.proctoringTelemetry?.flags).toHaveLength(0);
  });

  it('flags high-risk anomalies when excessive tab switches or clipboard actions are detected', () => {
    const uniqueEmail = `anomalous.candidate.${Date.now()}@example.com`;
    const { application } = upsertInternApplicationFromSheet({
      userName: 'Anomalous Candidate',
      userEmail: uniqueEmail,
      trackName: 'Full Stack Development',
      collegeName: 'BITS Pilani',
      appliedAt: new Date().toISOString()
    });

    const token = application.magicToken!;
    expect(token).toBeDefined();

    const answers = {
      'q-pacing-safety': 'opt-1-optimal',
      'q-partner-integrity': 'opt-2-optimal',
      'q-altitude-protocol': 'opt-3-optimal',
      'q-community-spend': 'opt-4-optimal',
      'q-ops-contingency': 'opt-5-optimal'
    };

    const telemetry = {
      tabSwitchCount: 5,
      copyPasteAttempts: 3,
      fullscreenExits: 2,
      totalDurationSeconds: 110,
      webcamVerified: false
    };

    const result = submitInternInterviewByToken(token, answers, telemetry);
    expect(result).not.toBeNull();

    const app = getInternApplicationByToken(token);
    expect(app?.proctoringTelemetry).toBeDefined();
    expect(app?.proctoringTelemetry?.integrityScore).toBe('FLAGGED_HIGH');
    expect(app?.proctoringTelemetry?.tabSwitchCount).toBe(5);
    expect(app?.proctoringTelemetry?.copyPasteAttempts).toBe(3);
    expect(app?.proctoringTelemetry?.webcamVerified).toBe(false);

    // Verify flags array detailed reasons
    const flags = app?.proctoringTelemetry?.flags || [];
    expect(flags.some((f) => f.toLowerCase().includes('tab switch'))).toBe(true);
    expect(flags.some((f) => f.toLowerCase().includes('clipboard'))).toBe(true);
    expect(flags.some((f) => f.toLowerCase().includes('webcam'))).toBe(true);
  });

  it('strictly enforces single-sitting idempotency on submitted interviews', () => {
    const uniqueEmail = `idempotent.candidate.${Date.now()}@example.com`;
    const { application } = upsertInternApplicationFromSheet({
      userName: 'Idempotent Candidate',
      userEmail: uniqueEmail,
      trackName: 'Operations',
      collegeName: 'Delhi University',
      appliedAt: new Date().toISOString()
    });

    const token = application.magicToken!;
    expect(token).toBeDefined();

    const originalAnswers = {
      'q-pacing-safety': 'opt-1-optimal',
      'q-partner-integrity': 'opt-2-optimal',
      'q-altitude-protocol': 'opt-3-optimal',
      'q-community-spend': 'opt-4-optimal',
      'q-ops-contingency': 'opt-5-optimal'
    };

    const originalTelemetry = {
      tabSwitchCount: 0,
      copyPasteAttempts: 0,
      webcamVerified: true,
      totalDurationSeconds: 600
    };

    const firstSubmission = submitInternInterviewByToken(token, originalAnswers, originalTelemetry);
    expect(firstSubmission?.score).toBe(100);

    // Candidate attempts a second submission with altered telemetry and answers
    const secondSubmission = submitInternInterviewByToken(
      token,
      { 'q-pacing-safety': 'opt-1-rush' },
      { tabSwitchCount: 10, copyPasteAttempts: 10, totalDurationSeconds: 10, webcamVerified: false }
    );

    // Second submission must return original score and application without altering
    expect(secondSubmission?.score).toBe(100);
    const finalApp = getInternApplicationByToken(token);
    expect(finalApp?.interviewScore).toBe(100);
    expect(finalApp?.proctoringTelemetry?.tabSwitchCount).toBe(0);
    expect(finalApp?.proctoringTelemetry?.integrityScore).toBe('CLEAN');
  });

  it('exposes proctoring telemetry in admin supervision queries', () => {
    const candidates = listAllInternApplications();
    expect(Array.isArray(candidates)).toBe(true);

    const auditedCandidates = candidates.filter((c) => c.proctoringTelemetry !== undefined);
    expect(auditedCandidates.length).toBeGreaterThan(0);

    const sample = auditedCandidates[0];
    expect(sample.proctoringTelemetry).toBeDefined();
    expect(['CLEAN', 'FLAGGED_MODERATE', 'FLAGGED_HIGH']).toContain(sample.proctoringTelemetry?.integrityScore);
  });

  it('supports optional camera-free proctoring mode without penalizing clean telemetry', () => {
    const uniqueEmail = `camerafree.candidate.${Date.now()}@example.com`;
    const { application } = upsertInternApplicationFromSheet({
      userName: 'Camera Free Candidate',
      userEmail: uniqueEmail,
      trackName: 'AI & Machine Learning',
      collegeName: 'IIT Delhi',
      appliedAt: new Date().toISOString()
    });

    const token = application.magicToken!;
    const answers = {
      'q-pacing-safety': 'opt-1-optimal',
      'q-partner-integrity': 'opt-2-optimal',
      'q-altitude-protocol': 'opt-3-optimal',
      'q-community-spend': 'opt-4-optimal',
      'q-ops-contingency': 'opt-5-optimal'
    };

    const cameraFreeTelemetry = {
      proctoringMode: 'camera_free' as const,
      tabSwitchCount: 0,
      copyPasteAttempts: 0,
      totalDurationSeconds: 450,
      webcamVerified: false,
      cameraFreeReason: 'Candidate preference / camera restricted'
    };

    const result = submitInternInterviewByToken(token, answers, cameraFreeTelemetry);
    expect(result).not.toBeNull();
    expect(result?.score).toBe(100);

    const app = getInternApplicationByToken(token);
    expect(app?.proctoringTelemetry).toBeDefined();
    expect(app?.proctoringTelemetry?.proctoringMode).toBe('camera_free');
    expect(app?.proctoringTelemetry?.webcamVerified).toBe(false);
    expect(app?.proctoringTelemetry?.integrityScore).toBe('CLEAN');
    expect(app?.proctoringTelemetry?.flags.some((f) => f.includes('Camera-Free'))).toBe(true);
  });

  it('prioritizes natural female Indian voices over robotic male voices', () => {
    const mockVoices = [
      { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' } as SpeechSynthesisVoice,
      { name: 'Microsoft Ravi - English (India)', lang: 'en-IN' } as SpeechSynthesisVoice,
      { name: 'Microsoft Neerja Online (Natural) - English (India)', lang: 'en-IN' } as SpeechSynthesisVoice,
      { name: 'Microsoft Mark - English (United States)', lang: 'en-US' } as SpeechSynthesisVoice
    ];

    const pick1 = pickBestFemaleIndianVoice(mockVoices);
    expect(pick1.voice?.name).toBe('Microsoft Neerja Online (Natural) - English (India)');

    // Test with Heera
    const mockVoices2 = [
      { name: 'Microsoft Ravi - English (India)', lang: 'en-IN' } as SpeechSynthesisVoice,
      { name: 'Microsoft Heera - English (India)', lang: 'en-IN' } as SpeechSynthesisVoice
    ];
    const pick2 = pickBestFemaleIndianVoice(mockVoices2);
    expect(pick2.voice?.name).toBe('Microsoft Heera - English (India)');

    // Test fallback to natural female voice when no Indian female voice is installed
    const mockVoices3 = [
      { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US' } as SpeechSynthesisVoice,
      { name: 'Microsoft Jenny Online (Natural) - English (United States)', lang: 'en-US' } as SpeechSynthesisVoice
    ];
    const pick3 = pickBestFemaleIndianVoice(mockVoices3);
    expect(pick3.voice?.name).toBe('Microsoft Jenny Online (Natural) - English (United States)');
  });
});
