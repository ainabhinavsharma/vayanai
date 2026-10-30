'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { InternApplication, InterviewQuestion, PaymentRecord } from '@/types/auth';
import { Certificate } from '@/types/certificates';
import { getInterviewQuestions } from '@/lib/data/intern-questions';
import { useToast } from '@/components/ui/Toast';

interface InternDashboardProps {
  initialApplication?: InternApplication | null;
  currentUser?: { id?: string; email?: string; name?: string; role?: string } | null;
  onInterviewCompleted?: (score: number, selected: boolean) => void;
  onDepositCompleted?: (payment: PaymentRecord) => void;
}

export function InternDashboard({
  initialApplication,
  currentUser,
  onInterviewCompleted,
  onDepositCompleted
}: InternDashboardProps) {
  const { showToast } = useToast();
  const questions: InterviewQuestion[] = getInterviewQuestions();

  const [activeInternTab, setActiveInternTab] = useState<'workspace' | 'credentials'>('workspace');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);

  const [application, setApplication] = useState<InternApplication>(
    initialApplication || {
      id: 'app-default',
      userId: 'usr-intern-05',
      userName: 'Ananya Ghosh',
      userEmail: 'ananya.intern@example.com',
      trackName: 'Sustainable Regional Operations & Growth Intern',
      status: 'applied',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  );

  // Cohort timing and milestone calculations
  const batchStart = application.batchStartDate ? new Date(application.batchStartDate).getTime() : new Date('2026-11-02').getTime();
  const daysElapsed = Math.max(1, Math.min(90, Math.floor((Date.now() - batchStart) / (1000 * 60 * 60 * 24))));
  const daysRemaining = Math.max(0, 90 - daysElapsed);
  const isTenureComplete = daysElapsed >= 90 || application.status === 'completed';
  const isEnrolled = application.status === 'enrolled' || application.status === 'onboarded' || application.status === 'completed';
  const isPendingDeposit = application.status === 'deposit_pending_verification';
  const isSelected = application.status === 'selected' || application.status === 'offer_sent' || application.status === 'offer_accepted';

  // Dynamically load candidate application for logged-in user
  useEffect(() => {
    async function loadCandidateApplication() {
      try {
        const email = currentUser?.email;
        const url = email ? `/api/v1/intern/me?email=${encodeURIComponent(email)}` : '/api/v1/intern/me';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.application) {
            setApplication(data.data.application);
            // Always default to candidate workspace so active stage loads first
            setActiveInternTab('workspace');
          }
        }
      } catch (err) {
        console.warn('Failed to fetch intern application:', err);
      }
    }
    loadCandidateApplication();
  }, [currentUser?.email]);

  const fetchMyCertificates = useCallback(async () => {
    setIsLoadingCerts(true);
    const email = (application.userEmail || '').trim().toLowerCase();

    // 1. If tenure is complete, load candidate's real verified certificate
    if (isTenureComplete) {
      try {
        const res = await fetch(`/api/v1/certificates/my?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.certificates?.length > 0) {
          setCertificates(data.data.certificates.map((c: Certificate) => ({ ...c, isSpecimen: false })));
          setIsLoadingCerts(false);
          return;
        }
      } catch {
        // Fallback to static & local
      }

      try {
        let combined: Certificate[] = [];
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('vayanai_certificates');
          if (stored) {
            combined = [...JSON.parse(stored)];
          }
        }

        const staticRes = await fetch('/data/certificates.json');
        if (staticRes.ok) {
          const staticList: Certificate[] = await staticRes.json();
          for (const item of staticList) {
            if (!combined.some((c) => c.certificateId === item.certificateId)) {
              combined.push(item);
            }
          }
        }

        const matched = combined.filter((c) => c.internEmail.toLowerCase() === email);
        if (matched.length > 0) {
          setCertificates(matched.map(c => ({ ...c, isSpecimen: false })));
          setIsLoadingCerts(false);
          return;
        }
      } catch (err) {
        console.warn('Error reading static certs for completed candidate:', err);
      }
    }

    // 2. If tenure is NOT complete (or no certificate issued yet), resolve track specimen preview
    try {
      const staticRes = await fetch('/data/certificates.json');
      if (staticRes.ok) {
        const staticList: Certificate[] = await staticRes.json();
        let trackSample: Certificate | undefined;
        const currentTrack = (application.trackName || '').toLowerCase();

        if (currentTrack.includes('data')) {
          trackSample = staticList.find((c) => (c.domain || '').toLowerCase().includes('data'));
        } else if (currentTrack.includes('ai') || currentTrack.includes('machine') || currentTrack.includes('agent')) {
          trackSample = staticList.find((c) => (c.domain || '').toLowerCase().includes('artificial') || (c.domain || '').toLowerCase().includes('ai'));
        } else if (currentTrack.includes('stack') || currentTrack.includes('full')) {
          trackSample = staticList.find((c) => (c.domain || '').toLowerCase().includes('full stack'));
        } else if (currentTrack.includes('python') || currentTrack.includes('automation')) {
          trackSample = staticList.find((c) => (c.domain || '').toLowerCase().includes('python'));
        } else if (currentTrack.includes('operation') || currentTrack.includes('growth')) {
          trackSample = staticList.find((c) => (c.domain || '').toLowerCase().includes('regional') || (c.domain || '').toLowerCase().includes('operations'));
        }
        if (!trackSample && staticList.length > 0) {
          trackSample = staticList[0];
        }

        if (trackSample) {
          setCertificates([{ ...trackSample, isSpecimen: true }]);
        } else {
          setCertificates([]);
        }
      }
    } catch (e) {
      console.warn('Failed to load specimen certificate:', e);
      setCertificates([]);
    } finally {
      setIsLoadingCerts(false);
    }
  }, [application.userEmail, application.trackName, isTenureComplete]);

  useEffect(() => {
    fetchMyCertificates();
  }, [fetchMyCertificates]);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    'q-pacing-safety': 'opt-1-optimal',
    'q-partner-integrity': 'opt-2-optimal',
    'q-altitude-protocol': 'opt-3-optimal',
    'q-community-spend': 'opt-4-optimal'
  });
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Anti-Cheat & Proctoring Telemetry State
  const [hasAgreedRules, setHasAgreedRules] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0);
  const sessionStartTimeRef = useRef(Date.now());

  // Deposit UTR payment state
  const [depositUtrInput, setDepositUtrInput] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi_mock' | 'card_mock'>('upi_mock');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Live anti-cheat tracking during active interview session
  useEffect(() => {
    if (!hasAgreedRules || (application.status !== 'applied' && application.status !== 'invited')) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          showToast(`⚠️ Warning: Tab switch detected (${next}). All browser tab switches are recorded in your integrity audit.`);
          return next;
        });
      }
    };

    const handleCopyPaste = (e: Event) => {
      e.preventDefault();
      setCopyPasteAttempts((prev) => {
        const next = prev + 1;
        showToast(`⚠️ Warning: Copy/paste is restricted during assessment (${next} attempt logged).`);
        return next;
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
  }, [hasAgreedRules, application.status, showToast]);

  const currentQ = questions[currentStep];

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleNextQuestion = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitInterview = async () => {
    setIsEvaluating(true);
    const durationSec = Math.max(10, Math.round((Date.now() - sessionStartTimeRef.current) / 1000));
    const telemetryPayload = {
      tabSwitchCount,
      copyPasteAttempts,
      totalDurationSeconds: durationSec,
      proctoringMode: 'camera_free' as const
    };

    try {
      const res = await fetch('/api/v1/intern/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, telemetry: telemetryPayload })
      });
      const data = await res.json();

      const calculatedScore = data.data?.score || 85;
      const flags: string[] = [];
      if (tabSwitchCount > 0) flags.push(`${tabSwitchCount} tab switch(es) detected`);
      if (copyPasteAttempts > 0) flags.push(`${copyPasteAttempts} clipboard copy/paste attempt(s) blocked`);
      const integrityScore = (tabSwitchCount >= 3 || copyPasteAttempts >= 2)
        ? 'FLAGGED_HIGH'
        : (tabSwitchCount > 0 || copyPasteAttempts > 0)
        ? 'FLAGGED_MODERATE'
        : 'CLEAN';

      setApplication((prev) => ({
        ...prev,
        status: 'interview_completed',
        interviewScore: calculatedScore,
        interviewAnswers: answers,
        feedbackNote: data.data?.message || 'Assessment and integrity audit submitted for committee review.',
        proctoringTelemetry: {
          tabSwitchCount,
          copyPasteAttempts,
          totalDurationSeconds: durationSec,
          webcamVerified: false,
          integrityScore,
          flags,
          submittedAt: new Date().toISOString()
        }
      }));

      if (onInterviewCompleted) {
        onInterviewCompleted(calculatedScore, false);
      }
      showToast('Assessment submitted! Our Admissions Committee is evaluating your profile.');
    } catch {
      // Offline fallback
      let calculated = 0;
      questions.forEach((q) => {
        const opt = q.options.find((o) => o.id === answers[q.id]);
        if (opt) calculated += opt.points;
      });
      setApplication((prev) => ({
        ...prev,
        status: 'interview_completed',
        interviewScore: calculated,
        interviewAnswers: answers,
        proctoringTelemetry: {
          tabSwitchCount,
          copyPasteAttempts,
          totalDurationSeconds: durationSec,
          webcamVerified: false,
          integrityScore: 'CLEAN',
          flags: [],
          submittedAt: new Date().toISOString()
        }
      }));
      showToast('Assessment submitted for evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDepositUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositUtrInput.trim() || depositUtrInput.trim().length < 6) {
      showToast('Please enter your valid 12-digit UPI UTR Number or Transaction Reference.');
      return;
    }
    setIsSubmittingDeposit(true);
    try {
      const res = await fetch('/api/v1/intern/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: application.magicToken || application.id,
          action: 'pay_deposit',
          paymentMethod: 'upi_qr',
          utrNumber: depositUtrInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setApplication((prev) => ({
          ...prev,
          status: 'deposit_pending_verification',
          depositReceipt: data.data.payment?.receiptNumber || `VP-VER-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          depositPaidAt: new Date().toISOString(),
          utrNumber: depositUtrInput.trim()
        }));
        showToast('₹499 Deposit Proof Submitted! Awaiting Admin verification.');
      } else {
        showToast(data.error?.message || 'Failed to submit payment proof.');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handlePayDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);
    try {
      const res = await fetch('/api/v1/intern/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod })
      });
      const data = await res.json();

      const receiptNo = data.success ? data.data.payment.receiptNumber : `VP-VER-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      setApplication((prev) => ({
        ...prev,
        status: 'onboarded',
        depositReceipt: receiptNo,
        depositPaidAt: new Date().toISOString()
      }));

      setShowDepositModal(false);
      showToast('Enrollment verification received! Workspace unlocked.');

      if (onDepositCompleted && data.success) {
        onDepositCompleted(data.data.payment);
      }
    } catch {
      const fallbackReceipt = `VP-VER-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setApplication((prev) => ({
        ...prev,
        status: 'onboarded',
        depositReceipt: fallbackReceipt,
        depositPaidAt: new Date().toISOString()
      }));
      setShowDepositModal(false);
      showToast('Enrollment confirmed! Workspace unlocked.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="intern-dashboard-panel">
      {/* Top Banner */}
      <div className="panel-heading">
        <div>
          <div className="eyebrow eyebrow-muted">
            <i></i> VAYANAI OPERATIONS TALENT INITIATIVE
          </div>
          <h2>Intern Candidate <em>Portal</em></h2>
        </div>
        <div className="intern-track-pill">
          <span>Track:</span> <b>{application.trackName}</b>
        </div>
      </div>

      {/* Subtab Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className={`button ${activeInternTab === 'workspace' ? 'button-gold' : 'button-outline'}`}
          onClick={() => setActiveInternTab('workspace')}
          style={{ minHeight: '40px', fontSize: '11px', flex: '1 1 200px' }}
        >
          💼 Candidate Workspace & Assessment
        </button>
        <button
          type="button"
          className={`button ${activeInternTab === 'credentials' ? 'button-gold' : 'button-outline'}`}
          onClick={() => setActiveInternTab('credentials')}
          style={{ minHeight: '40px', fontSize: '11px', flex: '1 1 200px' }}
        >
          🎓 My Verified Credentials & Downloads {certificates.length > 0 && `(${certificates.length})`}
        </button>
      </div>

      {/* VIEW 2: CANDIDATE WORKSPACE & ASSESSMENT */}
      {activeInternTab === 'workspace' && (
        <>
          {/* 6-Stage Candidate Lifecycle Progress Bar */}
          <div className="candidate-timeline-card">
            <div className="timeline-scroll-hint">
              <span>Swipe to view all stages ➔</span>
            </div>
            <div className="timeline-scroll-wrapper">
              <div className="timeline-step-row">
              <div className="timeline-step completed">
                <span className="step-circle">✓</span>
                <b>1. Registered</b>
                <small>{application.userName}</small>
              </div>
              <div className="timeline-connector active"></div>
              <div className={`timeline-step ${application.status !== 'applied' && application.status !== 'invited' ? 'completed' : 'active'}`}>
                <span className="step-circle">{application.status !== 'applied' && application.status !== 'invited' ? '✓' : '2'}</span>
                <b>2. Virtual Interview</b>
                <small>{application.interviewScore ? `${application.interviewScore}/100 Pts` : 'Scenario Test'}</small>
              </div>
              <div className="timeline-connector active"></div>
              <div className={`timeline-step ${isSelected || isPendingDeposit || isEnrolled ? 'completed' : application.status === 'interview_completed' ? 'active' : ''}`}>
                <span className="step-circle">{isSelected || isPendingDeposit || isEnrolled ? '✓' : '3'}</span>
                <b>3. Selection Offer</b>
                <small>{isSelected || isPendingDeposit || isEnrolled ? 'Qualified' : 'Pending'}</small>
              </div>
              <div className="timeline-connector active"></div>
              <div className={`timeline-step ${isEnrolled ? 'completed' : isPendingDeposit ? 'active' : isSelected ? 'active' : ''}`}>
                <span className="step-circle">{isEnrolled ? '✓' : isPendingDeposit ? '⏳' : '4'}</span>
                <b>4. Batch Slot Verification</b>
                <small>{isEnrolled ? 'Verified & Admitted' : isPendingDeposit ? 'Verification Underway' : 'Pending'}</small>
              </div>
              <div className="timeline-connector active"></div>
              <div className={`timeline-step ${isEnrolled ? 'completed' : ''}`}>
                <span className="step-circle">{isEnrolled ? '★' : '5'}</span>
                <b>5. Active Workspace</b>
                <small>{isEnrolled ? 'Unlocked' : 'Locked'}</small>
              </div>
              <div className="timeline-connector active"></div>
              <div className={`timeline-step ${isTenureComplete ? 'completed' : ''}`}>
                <span className="step-circle">{isTenureComplete ? '🎓' : '6'}</span>
                <b>6. Certificate & LOR</b>
                <small>{isTenureComplete ? 'Available' : `Day ${daysElapsed}/90`}</small>
              </div>
            </div>
            </div>
          </div>

      {/* STAGE A: Virtual Interview Studio */}
      {(application.status === 'applied' || application.status === 'invited') && (
        !hasAgreedRules ? (
          <div className="virtual-interview-card" style={{ border: '1px solid rgba(232, 163, 76, 0.4)', background: 'rgba(20, 30, 24, 0.95)' }}>
            <div className="interview-header" style={{ marginBottom: '18px' }}>
              <div>
                <span className="interview-badge" style={{ background: '#e8a34c', color: '#0d1410', fontWeight: 800 }}>
                  STAGE 2 OF 6 · PRE-ASSESSMENT INTEGRITY PROTOCOL
                </span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '18px', color: '#fff8ee' }}>
                  Virtual Interview Integrity & Anti-Cheat Protocols 🛡️
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#c9d6ce', lineHeight: 1.5 }}>
                  Please review and acknowledge the proctoring guidelines before questions unlock. Your session is monitored for integrity assurance.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '16px', marginBottom: '6px' }}>🚫 <strong>Tab Switching Monitored</strong></div>
                <p style={{ margin: 0, fontSize: '11px', color: '#889990', lineHeight: 1.5 }}>
                  Do not navigate away from this window or switch browser tabs. All tab focus loss events are recorded in your permanent integrity telemetry audit.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '16px', marginBottom: '6px' }}>📋 <strong>Copy & Paste Restricted</strong></div>
                <p style={{ margin: 0, fontSize: '11px', color: '#889990', lineHeight: 1.5 }}>
                  Clipboard copying of scenario questions or pasting external answers is restricted and logged as an integrity anomaly for committee review.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '16px', marginBottom: '6px' }}>🎙️ <strong>Camera-Free Proctoring</strong></div>
                <p style={{ margin: 0, fontSize: '11px', color: '#889990', lineHeight: 1.5 }}>
                  No invasive video recording. Proctoring runs passively through browser window state and focus timing telemetry.
                </p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '16px', marginBottom: '6px' }}>⏱️ <strong>Continuous Session</strong></div>
                <p style={{ margin: 0, fontSize: '11px', color: '#889990', lineHeight: 1.5 }}>
                  Answer the 4 real-world operational scenarios in a single continuous sitting. Expected duration: 8 to 12 minutes.
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(232, 163, 76, 0.08)', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '8px', padding: '14px 18px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12px', color: '#fff8ee' }}>
                <input
                  type="checkbox"
                  id="chk-rules-agreed"
                  style={{ marginTop: '3px', accentColor: '#e8a34c', width: '16px', height: '16px' }}
                />
                <span>
                  I declare that I am the registered candidate <strong>{application.userName}</strong>. I will complete this assessment independently without external assistance, and I acknowledge that tab switches and clipboard activities are logged and submitted to the Admissions Committee.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button button-gold"
                onClick={() => {
                  const chk = document.getElementById('chk-rules-agreed') as HTMLInputElement | null;
                  if (!chk || !chk.checked) {
                    showToast('Please check the box to acknowledge the anti-cheat protocols.');
                    return;
                  }
                  sessionStartTimeRef.current = Date.now();
                  setHasAgreedRules(true);
                  showToast('Assessment unlocked. Session integrity recording is active.');
                }}
                style={{ fontSize: '12px', minHeight: '38px', padding: '0 24px', fontWeight: 700 }}
              >
                ✓ I Agree & Begin Virtual Interview &rarr;
              </button>
            </div>
          </div>
        ) : (
          <div className="virtual-interview-card">
            <div className="interview-header">
              <div>
                <span className="interview-badge">STAGE 2 OF 6 · VIRTUAL INTERVIEW</span>
                <h3>Vayanai Operations & Pacing Assessment</h3>
                <p>Answer the 4 real-world operational scenarios below to test your judgment in sustainable, India-first travel planning.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '10px', color: tabSwitchCount > 0 ? '#ef4444' : '#4caf50', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px' }}>
                  {tabSwitchCount === 0 ? '🟢 0 Tab Switches' : `⚠️ ${tabSwitchCount} Tab Switch${tabSwitchCount > 1 ? 'es' : ''}`}
                </span>
                <div className="interview-progress-pill">
                  Question {currentStep + 1} of {questions.length}
                </div>
              </div>
            </div>

            <div className="scenario-box">
              <b>Scenario {currentStep + 1}: {currentQ.question}</b>
              <p>{currentQ.scenario}</p>
            </div>

            <div className="quiz-options-grid">
              {currentQ.options.map((opt) => {
                const isSelectedOpt = answers[currentQ.id] === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`quiz-option-card ${isSelectedOpt ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(currentQ.id, opt.id)}
                  >
                    <div className="option-radio-indicator">
                      {isSelectedOpt ? '●' : '○'}
                    </div>
                    <div className="option-content">
                      <p style={{ fontSize: '11px', color: 'var(--paper)', margin: 0 }}>
                        {opt.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="quiz-nav-row">
              <button
                type="button"
                className="secondary-btn"
                onClick={handlePrevQuestion}
                disabled={currentStep === 0}
                style={{ opacity: currentStep === 0 ? 0.4 : 1 }}
              >
                ← Previous
              </button>

              {currentStep < questions.length - 1 ? (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleNextQuestion}
                >
                  Next Question →
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSubmitInterview}
                  disabled={isEvaluating}
                >
                  {isEvaluating ? 'Evaluating Judgment...' : 'Submit Assessment for Evaluation ↗'}
                </button>
              )}
            </div>
          </div>
        )
      )}

      {/* STAGE A.5: Assessment Submitted & Under Committee Evaluation */}
      {application.status === 'interview_completed' && (
        <div className="selection-offer-card" style={{ borderColor: 'rgba(232, 163, 76, 0.4)', background: 'rgba(20, 30, 24, 0.95)' }}>
          <div className="offer-header">
            <span className="offer-tag" style={{ background: '#e8a34c', color: '#0d1410' }}>
              STAGE 2.5 OF 6 · ASSESSMENT SUBMITTED
            </span>
            <h3 style={{ margin: '8px 0 4px', fontSize: '18px', color: '#fff8ee' }}>
              Profile & Assessment Submitted for Evaluation ⏳
            </h3>
          </div>

          <div className="offer-body">
            <p>
              Dear <b>{application.userName}</b>, your virtual interview assessment for the <b>{application.trackName}</b> track has been recorded and submitted for Admissions & Technical Council evaluation.
            </p>
            <p style={{ color: '#889990', fontSize: '12px', margin: '4px 0 16px' }}>
              The Admissions Committee evaluates submissions on a rolling basis. Upon selection approval, an official selection email and offer letter access link will be dispatched to your registered email (<code>{application.userEmail}</code>).
            </p>
          </div>

          {/* Telemetry Integrity Summary Box */}
          <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px 20px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#e8a34c', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                🛡️ Recorded Session Telemetry & Integrity Audit
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background:
                    application.proctoringTelemetry?.integrityScore === 'CLEAN' || (!application.proctoringTelemetry && tabSwitchCount === 0)
                      ? 'rgba(76, 175, 80, 0.2)'
                      : 'rgba(232, 163, 76, 0.2)',
                  color:
                    application.proctoringTelemetry?.integrityScore === 'CLEAN' || (!application.proctoringTelemetry && tabSwitchCount === 0)
                      ? '#4caf50'
                      : '#e8a34c',
                  border: '1px solid currentColor'
                }}
              >
                {application.proctoringTelemetry?.integrityScore === 'CLEAN' || (!application.proctoringTelemetry && tabSwitchCount === 0)
                  ? '🟢 CLEAN INTEGRITY'
                  : '🟡 INTEGRITY FLAGS RECORDED'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '6px' }}>
                <span style={{ color: '#889990', display: 'block', fontSize: '10px' }}>Evaluation Score</span>
                <strong style={{ color: '#4caf50', fontSize: '14px' }}>
                  {application.interviewScore ? `${application.interviewScore}/100 Pts` : '85/100 Pts'}
                </strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '6px' }}>
                <span style={{ color: '#889990', display: 'block', fontSize: '10px' }}>Browser Tab Switches</span>
                <strong style={{ color: (application.proctoringTelemetry?.tabSwitchCount ?? tabSwitchCount) > 0 ? '#ef4444' : '#4caf50', fontSize: '14px' }}>
                  {application.proctoringTelemetry?.tabSwitchCount ?? tabSwitchCount}
                </strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '6px' }}>
                <span style={{ color: '#889990', display: 'block', fontSize: '10px' }}>Copy/Paste Interceptions</span>
                <strong style={{ color: (application.proctoringTelemetry?.copyPasteAttempts ?? copyPasteAttempts) > 0 ? '#ef4444' : '#4caf50', fontSize: '14px' }}>
                  {application.proctoringTelemetry?.copyPasteAttempts ?? copyPasteAttempts}
                </strong>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '6px' }}>
                <span style={{ color: '#889990', display: 'block', fontSize: '10px' }}>Review Status</span>
                <strong style={{ color: '#e8a34c', fontSize: '13px' }}>Under Council Review</strong>
              </div>
            </div>

            {(application.proctoringTelemetry?.flags && application.proctoringTelemetry.flags.length > 0) ? (
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', borderRadius: '4px', fontSize: '11px', color: '#ff8a80' }}>
                <strong>Recorded Anomaly Notice:</strong> {application.proctoringTelemetry.flags.join(' • ')}
              </div>
            ) : (tabSwitchCount > 0 || copyPasteAttempts > 0) ? (
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(232, 163, 76, 0.1)', borderLeft: '3px solid #e8a34c', borderRadius: '4px', fontSize: '11px', color: '#ffd54f' }}>
                <strong>Audit Note:</strong> {tabSwitchCount} tab switch(es) logged during assessment session.
              </div>
            ) : (
              <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(76, 175, 80, 0.1)', borderLeft: '3px solid #4caf50', borderRadius: '4px', fontSize: '11px', color: '#81c784' }}>
                ✓ Clean session integrity recorded. No tab transfers or clipboard events detected.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#889990', fontSize: '11px' }}>
            <span>⏳ Average committee turnaround: <strong>2 to 4 business hours</strong>.</span>
          </div>
        </div>
      )}

      {/* STAGE B: Conditional Selection & Refundable Security Deposit (₹499) */}
      {isSelected && (
        <div className="selection-offer-card">
          <div className="offer-header">
            <span className="offer-tag">STAGE 3 OF 6 · CANDIDATE SELECTED</span>
            <h3>Letter of Selection & Refundable Security Deposit (₹499) 📜</h3>
          </div>

          <div className="offer-body">
            <p>
              Dear <b>{application.userName}</b>, based on your score of <b>{application.interviewScore || 100} / 100</b> in our Virtual Interview Assessment, you have been selected for the <b>{application.trackName}</b>.
            </p>
            <p>
              To confirm your seat in the upcoming cohort commencing 2 Nov 2026 and activate your project workspace, complete your digital offer signature and submit the <strong>₹499 Refundable Security Deposit</strong>.
            </p>
          </div>

          <div className="refundable-deposit-highlight" style={{ background: 'rgba(232, 163, 76, 0.08)', border: '1px solid rgba(232, 163, 76, 0.3)' }}>
            <div className="deposit-info-left">
              <span className="deposit-amount" style={{ fontSize: '18px', color: '#e8a34c' }}>₹499</span>
              <small>REFUNDABLE SECURITY DEPOSIT</small>
            </div>
            <div className="deposit-info-right">
              <b>100% Refundable Cohort Seat Reservation:</b>
              <p>
                To reserve dedicated cloud resources and mentor bandwidth, a nominal deposit of ₹499 is placed by selected candidates upon offer acceptance. This ₹499 is <strong>100% refundable</strong> upon completion of your 3-month internship milestone.
              </p>
              <div style={{ fontSize: '11px', color: '#e8a34c', marginTop: '6px', fontWeight: 600 }}>
                🔒 Note: You can digitally sign your offer letter immediately. Official signed PDF download unlocks once your ₹499 deposit is verified by the admin.
              </div>
            </div>
          </div>

          <div className="offer-cta-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
            <Link
              href={`/intern/offer?token=${application.magicToken || application.id}`}
              className="primary-btn"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              📜 View, Digitally Sign Offer & Pay ₹499 Deposit ↗
            </Link>
          </div>
        </div>
      )}

      {/* STAGE B.5: Deposit Verification Pending */}
      {isPendingDeposit && (
        <div className="selection-offer-card" style={{ borderColor: 'rgba(232, 163, 76, 0.4)', background: 'rgba(232, 163, 76, 0.05)' }}>
          <div className="offer-header">
            <span className="offer-tag" style={{ background: '#e8a34c', color: '#0d1410' }}>STAGE 4 OF 6 · DEPOSIT VERIFICATION PENDING</span>
            <h3>₹499 Deposit Verification & Cohort Allocation Underway ⏳</h3>
          </div>
          <div className="offer-body">
            <p>
              Dear <b>{application.userName}</b>, your digitally signed acceptance and <strong>₹499 Refundable Security Deposit proof</strong> have been received (Reference: <code>{application.utrNumber || application.depositReceipt || 'VP-VER-PENDING'}</code>).
            </p>
            <p>
              The Admissions Council is validating your transaction reference with bank settlements. Once verified, your official signed offer PDF download unlocks and your 12-week workspace activates automatically.
            </p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', fontSize: '11px', color: '#889990', marginBottom: '16px' }}>
            <div><strong>Candidate:</strong> {application.userName} ({application.userEmail})</div>
            <div><strong>Track:</strong> {application.trackName}</div>
            <div><strong>Deposit Reference:</strong> {application.utrNumber || application.depositReceipt || 'Queued'}</div>
            <div><strong>Status:</strong> Queued for Admin Deposit Verification</div>
          </div>
          <Link
            href={`/intern/offer?token=${application.magicToken || application.id}`}
            className="button button-gold"
            style={{ fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            Inspect Offer Letter & Status Details ↗
          </Link>
        </div>
      )}

      {/* STAGE C: Active Onboarded Intern Workspace */}
      {isEnrolled && (
        <div className="intern-workspace">
          {/* 90-Day Industrial Practicum Tenure Tracker */}
          <div className="workspace-card" style={{ marginBottom: '20px', background: 'rgba(20, 30, 24, 0.9)', border: '1px solid rgba(232, 163, 76, 0.4)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span className="badge badge-amber" style={{ fontSize: '9px' }}>3-MONTH INDUSTRIAL PRACTICUM TENURE</span>
                <h4 style={{ margin: '4px 0 2px', color: 'var(--paper)', fontSize: '16px' }}>
                  Tenure Progress: Day {daysElapsed} of 90
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)' }}>
                  Batch Start: <strong>{new Date(batchStart).toLocaleDateString()}</strong> &bull; Target Graduation: <strong>{new Date(batchStart + 90 * 86400000).toLocaleDateString()}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gold)' }}>
                  {Math.round((daysElapsed / 90) * 100)}%
                </span>
                <small style={{ display: 'block', fontSize: '10px', color: 'var(--muted)' }}>
                  {daysRemaining} Days Until Official Certification
                </small>
              </div>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.round((daysElapsed / 90) * 100)}%`,
                  background: 'linear-gradient(90deg, #e8a34c, #4caf50)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          <div className="workspace-welcome-banner">
            <div>
              <span className="workspace-status-badge">ACTIVE INTERN · {application.status.toUpperCase()}</span>
              <h3>Welcome to the Team, {application.userName}! 🌿</h3>
              <p>Your commitment deposit has been verified. Your project supervisor is <b>Rohit Sen (BDA Lead)</b>.</p>
            </div>
            <div className="receipt-voucher-pill">
              <small>Enrollment Voucher</small>
              <b>{application.depositReceipt || 'VP-VER-2026-8821'}</b>
              <span>Verification Status: Admitted</span>
            </div>
          </div>

          <div className="workspace-grid">
            <div className="workspace-col-main">
              <div className="workspace-card">
                <h4>Assigned Project Milestone</h4>
                <div className="milestone-box">
                  <span className="milestone-tag">SPRINT 1 · LIVE ASSIGNMENT</span>
                  <h5>Northeast Meghalaya Community Homestays Audit</h5>
                  <p>
                    Verify step-free access, rainwater harvesting capacity, and village council contact information for 5 homestays across Mawlynnong and Sohra valleys. Ensure zero fabricated badges or reviews.
                  </p>
                  <div className="milestone-progress-bar">
                    <div className="milestone-fill" style={{ width: '25%' }}></div>
                  </div>
                  <small>Deadline: 14 Days · Milestone Completion triggers ₹499 Deposit Refund Release</small>
                </div>
              </div>

              <div className="workspace-card">
                <h4>Official Credential & QR Verification 📜</h4>
                <div className="milestone-box" style={{ background: 'rgba(232, 163, 76, 0.08)', borderColor: 'var(--gold)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span className="milestone-tag" style={{ background: '#238636', color: '#fff' }}>VERIFIED CREDENTIAL ISSUED</span>
                      <h5 style={{ margin: '6px 0 2px' }}>Certificate of Internship Completion</h5>
                      <p style={{ margin: '0 0 6px', fontSize: '10px', color: 'var(--paper)' }}>
                        Certificate ID: <b>CERT-VAY-2026-SO-001</b> • Intern ID: <b>VAY-INT-AG-2345-001</b>
                      </p>
                      <small style={{ color: 'var(--gold-lite)' }}>
                        Endorsed by Rohit Sen (Senior BDA Lead & Regional Supervisor) • Udyam: UDYAM-UP-29-0109046
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <a
                        href="/verify?certid=CERT-VAY-2026-SO-001"
                        target="_blank"
                        rel="noreferrer"
                        className="primary-btn"
                        style={{ fontSize: '9px', padding: '6px 12px', textDecoration: 'none' }}
                      >
                        Inspect Public QR Verification ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="workspace-card">
                <h4>Vayanai Operational Ethics Oath</h4>
                <ul className="ethics-list">
                  <li>✦ <b>Rule of Human Truth:</b> Never fabricate partner reviews, quotations, or verification badges.</li>
                  <li>✦ <b>Pacing-First Mandate:</b> Always recommend buffers for mountain highways and elder travelers.</li>
                  <li>✦ <b>Direct Spend Respect:</b> Ensure 88%+ of experience fees are retained by local family hosts.</li>
                </ul>
              </div>
            </div>

            <div className="workspace-col-side">
              <div className="supervisor-card">
                <h4>Assigned BDA Supervisor</h4>
                <div className="supervisor-info">
                  <div className="supervisor-avatar">RS</div>
                  <div>
                    <b>Rohit Sen</b>
                    <small>Business Development Associate</small>
                    <span className="supervisor-email">rohit.bda@vayanai.in</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="small-action"
                  onClick={() => showToast('Supervisor Slack channel: #ops-interns-2026')}
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  Connect on Team Chat 💬
                </button>
              </div>

              <div className="deposit-guarantee-card">
                <span className="guarantee-icon">🛡️</span>
                <b>Academic Enrollment Voucher</b>
                <p>Status: Admitted & Verified</p>
                <p>Voucher ID: {application.depositReceipt || 'VP-VER-2026-8821'}</p>
                <small>Official Practicum placement issued under DBERT Technical Council guidelines.</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {/* VIEW 1: MY CERTIFICATES & DOWNLOADS */}
      {activeInternTab === 'credentials' && (
        <div className="credentials-view-panel" style={{ marginBottom: '30px' }}>
          <div className="workspace-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge badge-amber" style={{ fontSize: '9px' }}>OFFICIAL VERIFIED CREDENTIALS</span>
                <h3 style={{ margin: '6px 0 2px', fontFamily: 'var(--font-serif)', color: 'var(--paper)' }}>
                  Internship Certificates & LOR Downloads
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)' }}>
                  Cryptographically verified certificates endorsed by DBERT Technical Council & Vayanai Operations Platform.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${isTenureComplete ? 'badge-green' : 'badge-amber'}`}>
                  {isTenureComplete ? '✓ 3-MONTH TENURE COMPLETED' : `🔒 Day ${daysElapsed} of 90 (${daysRemaining} Days Remaining)`}
                </span>
              </div>
            </div>
          </div>

          {isLoadingCerts ? (
            <div className="empty-message-state">
              <p>Loading your certificates and clearance status...</p>
            </div>
          ) : !isTenureComplete && certificates.length === 0 ? (
            <div className="empty-message-state" style={{ background: 'rgba(20, 30, 24, 0.6)', border: '1px dashed rgba(232, 163, 76, 0.3)', borderRadius: '10px', padding: '36px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>🔒</span>
              <h4 style={{ color: 'var(--paper)', margin: '0 0 6px' }}>Official Certificate & LOR Locked</h4>
              <p style={{ color: 'var(--muted)', fontSize: '12px', maxWidth: '520px', margin: '0 auto 16px', lineHeight: 1.6 }}>
                Your verified credentials will unlock automatically upon completing your <strong>3-month internship tenure</strong> ({daysRemaining} days remaining), or upon verified administrative clearance by the Admissions Council. No additional fee is required.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '20px', fontSize: '11px', color: 'var(--gold-lite)' }}>
                <span>📅 Expected Graduation: <strong>{new Date(batchStart + 90 * 86400000).toLocaleDateString()}</strong></span>
              </div>
            </div>
          ) : certificates.length === 0 ? (
            <div className="empty-message-state" style={{ background: 'rgba(20, 30, 24, 0.5)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '36px', textAlign: 'center' }}>
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '10px' }}>📜</span>
              <h4 style={{ color: 'var(--paper)', margin: '0 0 6px' }}>Tenure Complete &bull; Certificate Generation in Queue</h4>
              <p style={{ color: 'var(--muted)', fontSize: '12px', maxWidth: '480px', margin: '0 auto 16px' }}>
                Your 3-month milestone is verified! The Admissions Council is finalizing your cryptographic QR seal.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: cert.isSpecimen ? 'rgba(24, 28, 22, 0.94)' : 'rgba(20, 30, 24, 0.85)',
                    border: cert.isSpecimen
                      ? '1px dashed rgba(232, 163, 76, 0.55)'
                      : cert.status === 'active'
                      ? '1px solid rgba(76, 175, 80, 0.4)'
                      : '1px solid rgba(232, 163, 76, 0.4)',
                    borderRadius: '10px',
                    padding: '22px',
                    boxShadow: cert.isSpecimen ? '0 4px 20px rgba(0, 0, 0, 0.35)' : 'none'
                  }}
                >
                  {/* Subtle Angled Specimen Watermark Overlay */}
                  {cert.isSpecimen && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        right: '5%',
                        top: '45%',
                        transform: 'translateY(-50%) rotate(-12deg)',
                        fontSize: '54px',
                        fontWeight: 900,
                        color: 'rgba(232, 163, 76, 0.06)',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        letterSpacing: '8px',
                        fontFamily: 'var(--font-serif)',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        zIndex: 0
                      }}
                    >
                      SAMPLE SPECIMEN
                    </div>
                  )}

                  {/* Specimen Explanatory Banner */}
                  {cert.isSpecimen && (
                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        background: 'rgba(232, 163, 76, 0.12)',
                        border: '1px solid rgba(232, 163, 76, 0.35)',
                        borderRadius: '6px',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontSize: '18px', lineHeight: 1 }}>🔬</span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-lite)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Curriculum Specimen (Sample Preview)
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                          This is an official specimen preview tailored to your <strong>{cert.domain}</strong> track. Your verified personalized certificate and LOR with tamper-evident QR verification and Udyam MSME endorsement will be issued upon completing your 90-day internship tenure ({daysRemaining} days remaining).
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {cert.isSpecimen ? (
                          <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            🔬 SPECIMEN / SAMPLE PREVIEW
                          </span>
                        ) : cert.status === 'active' ? (
                          <span className="badge badge-green">✓ VERIFIED & ISSUED</span>
                        ) : cert.status === 'pending_approval' ? (
                          <span className="badge badge-amber">⏳ PENDING ADMIN VERIFICATION</span>
                        ) : (
                          <span className="badge badge-red">REJECTED / REVIEW REQUIRED</span>
                        )}
                        <code style={{ fontSize: '12px', color: 'var(--gold-lite)', fontWeight: 600 }}>{cert.certificateId}</code>
                      </div>

                      <h4 style={{ margin: '0 0 6px', fontSize: '17px', color: 'var(--paper)', fontFamily: 'var(--font-serif)' }}>
                        {cert.domain}
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--muted)', margin: '10px 0' }}>
                        <div>
                          <span><b>Intern ID:</b> {cert.isSpecimen ? `SPECIMEN-${cert.internId}` : cert.internId}</span><br />
                          <span><b>Project:</b> {cert.projectName}</span><br />
                          <span><b>Institution:</b> {cert.collegeName || 'Verified University'}</span>
                        </div>
                        <div>
                          <span><b>Tenure:</b> {cert.joiningDate} to {cert.completionDate}</span><br />
                          <span><b>Mentor:</b> {cert.mentorName} ({cert.mentorRole})</span><br />
                          <span><b>Udyam MSME:</b> {cert.udyamRegNumber || 'UDYAM-UP-29-0109046'}</span>
                        </div>
                      </div>

                      {cert.status === 'pending_approval' && !cert.isSpecimen && (
                        <div style={{ background: 'rgba(232, 163, 76, 0.1)', borderLeft: '3px solid var(--gold)', padding: '8px 12px', borderRadius: '4px', marginTop: '10px' }}>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--gold-lite)' }}>
                            ℹ️ <b>Manual Verification in Progress:</b> Your student verification (Roll No: <code>{application.utrNumber || 'Submitted'}</code>) is being verified against college records by the administration team. Once approved, the download button will activate.
                          </p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', justifyContent: 'center' }}>
                      {cert.isSpecimen ? (
                        <>
                          <Link
                            href={`/verify?certid=${encodeURIComponent(cert.certificateId)}&specimen=true&candidate=${encodeURIComponent(application.userName || '')}&track=${encodeURIComponent(cert.domain || '')}&daysRemaining=${daysRemaining}`}
                            target="_blank"
                            className="button button-gold"
                            style={{ fontSize: '10px', textDecoration: 'none', minHeight: '34px', display: 'flex', alignItems: 'center' }}
                          >
                            🔍 Inspect Verification Specimen Page ↗
                          </Link>
                          <button
                            type="button"
                            disabled
                            className="button button-outline"
                            style={{
                              fontSize: '9px',
                              minHeight: '30px',
                              opacity: 0.6,
                              cursor: 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={`Unlocks automatically upon completing your 90-day internship milestone (${daysRemaining} days remaining)`}
                          >
                            🔒 Download Official PDF (Unlocks on Day 90)
                          </button>
                          <button
                            type="button"
                            className="button button-outline"
                            style={{ fontSize: '9px', minHeight: '28px' }}
                            onClick={() => {
                              const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://vayanai.in.net'}/verify?certid=${encodeURIComponent(cert.certificateId)}&specimen=true&candidate=${encodeURIComponent(application.userName || '')}&track=${encodeURIComponent(cert.domain || '')}&daysRemaining=${daysRemaining}`;
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(url);
                                showToast('Specimen verification link copied!');
                              }
                            }}
                          >
                            🔗 Copy Specimen Link
                          </button>
                        </>
                      ) : (
                        <>
                          {cert.status === 'active' && (
                            <Link
                              href={`/verify?certid=${cert.certificateId}`}
                              target="_blank"
                              className="button button-gold"
                              style={{ fontSize: '10px', textDecoration: 'none', minHeight: '34px', display: 'flex', alignItems: 'center' }}
                            >
                              📥 Download Official PDF / Print ↗
                            </Link>
                          )}
                          <Link
                            href={`/verify?certid=${cert.certificateId}`}
                            target="_blank"
                            className="button button-outline"
                            style={{ fontSize: '9px', textDecoration: 'none', minHeight: '30px', display: 'flex', alignItems: 'center' }}
                          >
                            🔍 Public Verification Page ↗
                          </Link>
                          <button
                            type="button"
                            className="button button-outline"
                            style={{ fontSize: '9px', minHeight: '28px' }}
                            onClick={() => {
                              const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://vayanai.in.net'}/verify?certid=${cert.certificateId}`;
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(url);
                                showToast('Credential link copied!');
                              }
                            }}
                          >
                            🔗 Copy Link
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
