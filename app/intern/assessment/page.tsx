'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getAvailableVoices,
  pickBestFemaleIndianVoice,
  speakWithAnanyaVoice,
  stopSpeech
} from '@/lib/utils/speech';

interface AssessmentQuestion {
  id: string;
  step: number;
  question: string;
  scenario: string;
  options: Array<{
    id: string;
    text: string;
  }>;
}

interface CandidateInfo {
  id: string;
  name: string;
  email: string;
  college?: string;
  track: string;
  status: string;
  batchStartDate: string;
}

interface IntegrityAudit {
  proctoringMode?: 'webcam' | 'camera_free';
  tabSwitchCount: number;
  copyPasteAttempts: number;
  fullscreenExits?: number;
  totalDurationSeconds: number;
  webcamVerified: boolean;
  cameraFreeReason?: string;
  integrityScore: 'CLEAN' | 'FLAGGED_MODERATE' | 'FLAGGED_HIGH';
  flags: string[];
  submittedAt: string;
}

function getTrackRoleBrief(trackName: string): string {
  const lower = trackName.toLowerCase();
  if (lower.includes('data')) {
    return 'As a Data Analyst Intern at Vayanai, you will analyze real traveler pacing trends, optimize routing anomalies across regional corridors, evaluate revenue distribution with local partner hosts, and uphold ethical data privacy.';
  }
  if (lower.includes('stack') || lower.includes('software') || lower.includes('web')) {
    return 'As a Full Stack Development Intern, you will build responsive interfaces, architect fast SQLite persistence workflows, integrate partner APIs, and craft resilient experiences for India-first travelers.';
  }
  if (lower.includes('ai') || lower.includes('ml') || lower.includes('machine') || lower.includes('intelligence')) {
    return 'As an AI/ML Intern, you will work on local SLM models, Retrieval-Augmented Generation (RAG) for regional Indian itineraries, adversarial prompt filtering, and offline-first edge inference companions.';
  }
  return 'As a Sustainable Regional Operations Intern, you will engage with verified local hosts, coordinate ground logistics across high-altitude and eco-sensitive corridors, and safeguard sustainable traveler pacing.';
}

function getQuestionConversationalBridge(
  step: number,
  firstName: string,
  collegeName: string,
  trackName: string
): string {
  switch (step) {
    case 1:
      return `Welcome, ${firstName}. Let's begin with Scenario 1. In ${trackName}, handling real-world field anomalies is essential. Review the situation below and share your approach.`;
    case 2:
      return `Thank you for your response, ${firstName}. Let's move to Scenario 2, focusing on cumulative revenue metrics, partner guide retention, and analytical clarity.`;
    case 3:
      return `Well considered, ${firstName}. As a student at ${collegeName || 'your university'} preparing for professional hiring cycles, batch pacing and mentorship timelines are vital for us to schedule resources. Let's look at Scenario 3.`;
    case 4:
      return `Moving to Scenario 4, ${firstName}. In mountain travel planning, GPS anomalies and vehicle pacing require keen analytical verification.`;
    case 5:
      return `Good thinking, ${firstName}. In Scenario 5, we look at how you approach advanced technical upskilling, practical mentorship, and industry readiness.`;
    case 6:
      return `In Scenario 6, ${firstName}, let's examine data governance, traveler privacy, and candidate PII masking across public reporting tools.`;
    case 7:
      return `Understood, ${firstName}. In Scenario 7, we'd like to understand how you manage technical tool budgets, development environments, and certification goals.`;
    case 8:
      return `Our final challenge, Scenario 8, ${firstName}. At Vayanai, authentic partner feedback is sacred. Here is an anti-fabrication anomaly to evaluate.`;
    default:
      return `Scenario ${step} for ${firstName}: Review the scenario below and select the optimal response.`;
  }
}

function AssessmentContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    integrityAudit?: IntegrityAudit;
  } | null>(null);

  // Stage Management: false = Stage 0 Pre-Interview Briefing; true = Active Questions
  const [sessionStarted, setSessionStarted] = useState(false);
  const [agreedSessionRules, setAgreedSessionRules] = useState(false);

  // Proctoring Mode: 'webcam' (default) vs 'camera_free'
  const [proctoringMode, setProctoringMode] = useState<'webcam' | 'camera_free'>('webcam');
  const [cameraFreeReason, setCameraFreeReason] = useState<string>('');
  const [showCameraDeniedModal, setShowCameraDeniedModal] = useState<boolean>(false);

  // Voice Engine State
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceLabel, setVoiceLabel] = useState<string>('Ananya (Indian English Female - Natural)');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Webcam State
  const [webcamActive, setWebcamActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const floatingVideoRef = useRef<HTMLVideoElement | null>(null);

  // Anti-Cheat Telemetry
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [copyPasteAttempts, setCopyPasteAttempts] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [toastAlert, setToastAlert] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Session Timer: 15-minute countdown (900 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900);

  const showToast = (msg: string) => {
    setToastAlert(msg);
    setTimeout(() => setToastAlert(null), 4000);
  };

  // Initialize Voices on mount
  useEffect(() => {
    let mounted = true;
    getAvailableVoices().then((voices) => {
      if (!mounted) return;
      const best = pickBestFemaleIndianVoice(voices);
      setSelectedVoice(best.voice);
      setVoiceLabel(best.label);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Timer countdown once session starts
  useEffect(() => {
    if (!sessionStarted || result) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStarted, result]);



  useEffect(() => {
    if (!token) {
      setError('No assessment token provided. Please use the personalized link sent to your email.');
      setLoading(false);
      return;
    }

    async function loadAssessment() {
      try {
        const res = await fetch(`/api/v1/intern/assessment?token=${encodeURIComponent(token || '')}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error?.message || 'Failed to load assessment. Link may be invalid or expired.');
          setLoading(false);
          return;
        }

        setCandidate(data.data.candidate);
        setQuestions(data.data.questions || []);

        if (data.data.isAlreadySubmitted) {
          setResult({
            message: 'Your assessment was previously recorded. Our evaluation committee reviews submissions on a rolling basis. Selected candidates will be notified via their registered email address.',
            integrityAudit: data.data.integrityAudit
          });
        }
      } catch (err: any) {
        setError(`Connection error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadAssessment();
  }, [token]);

  // Voice Narration trigger using Ananya female Indian engine
  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    speakWithAnanyaVoice(text, {
      voice: selectedVoice,
      voiceName: selectedVoice?.name,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: (err) => {
        console.warn('[Vayanai Speech] Voice playback warning:', err);
        setIsSpeaking(false);
      }
    });
  };

  // Preview Voice test
  const handleTestVoice = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    const firstName = candidate ? candidate.name.split(' ')[0] : 'there';
    const sample = `Hello ${firstName}! I am Ananya from the Vayanai Talent Council. I will be your interviewer and guide today.`;
    handleSpeak(sample);
  };

  // Start Webcam
  const handleEnableCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false
        });
        setCameraStream(stream);
        setWebcamActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        showToast('✓ Webcam proctoring connected successfully.');
      } else {
        showToast('Camera API unavailable. You can proceed under Camera-Free Mode.');
      }
    } catch (err: any) {
      console.warn('Camera access denied:', err);
      showToast('Camera permission denied. Camera-Free Mode is available.');
    }
  };

  const handleSwitchToCameraFree = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setWebcamActive(false);
    setProctoringMode('camera_free');
    showToast('✓ Switched to Camera-Free Mode. Focus & session telemetry will monitor integrity.');
  };

  // Attach stream to floating video when session starts
  useEffect(() => {
    if (sessionStarted && proctoringMode === 'webcam' && cameraStream && floatingVideoRef.current) {
      floatingVideoRef.current.srcObject = cameraStream;
    }
  }, [sessionStarted, proctoringMode, cameraStream]);

  // Anti-Cheat Listeners (active once session starts)
  useEffect(() => {
    if (!sessionStarted || result) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          showToast(`⚠️ Tab switch detected (${next}). Event recorded in your proctoring audit log.`);
          return next;
        });
      }
    };

    const handleWindowBlur = () => {
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        showToast(`⚠️ Window focus lost (${next}). Returning to interview is required.`);
        return next;
      });
    };

    const handleClipboardEvent = (e: Event) => {
      e.preventDefault();
      setCopyPasteAttempts((prev) => {
        const next = prev + 1;
        showToast(`⚠️ Clipboard operations are restricted during proctored assessment (${next}).`);
        return next;
      });
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenExits((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleClipboardEvent);
    document.addEventListener('cut', handleClipboardEvent);
    document.addEventListener('paste', handleClipboardEvent);
    document.addEventListener('contextmenu', handleClipboardEvent);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleClipboardEvent);
      document.removeEventListener('cut', handleClipboardEvent);
      document.removeEventListener('paste', handleClipboardEvent);
      document.removeEventListener('contextmenu', handleClipboardEvent);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [sessionStarted, result]);

  // Keyboard shortcut listener for option selection [1-4] or [A-D]
  useEffect(() => {
    if (!sessionStarted || result || !questions[currentStep]) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;

      const q = questions[currentStep];
      let optionIndex = -1;
      if (e.key === '1' || e.key.toLowerCase() === 'a') optionIndex = 0;
      if (e.key === '2' || e.key.toLowerCase() === 'b') optionIndex = 1;
      if (e.key === '3' || e.key.toLowerCase() === 'c') optionIndex = 2;
      if (e.key === '4' || e.key.toLowerCase() === 'd') optionIndex = 3;

      if (optionIndex >= 0 && optionIndex < q.options.length) {
        handleSelectOption(q.id, q.options[optionIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionStarted, result, currentStep, questions]);

  const launchSessionWithMode = (mode: 'webcam' | 'camera_free', activeStream?: MediaStream) => {
    setProctoringMode(mode);
    if (mode === 'camera_free' && cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      setWebcamActive(false);
    }
    if (mode === 'webcam' && activeStream) {
      setCameraStream(activeStream);
      setWebcamActive(true);
    }
    setShowCameraDeniedModal(false);
    sessionStartTimeRef.current = Date.now();
    setSessionStarted(true);

    // Speak initial scenario prompt
    if (questions.length > 0 && candidate) {
      const firstName = candidate.name.split(' ')[0];
      const bridge = getQuestionConversationalBridge(1, firstName, candidate.college || '', candidate.track);
      setTimeout(() => {
        handleSpeak(`${bridge} ${questions[0].scenario}`);
      }, 500);
    }
  };

  const handleStartInterview = async () => {
    if (!agreedSessionRules) {
      showToast('Please confirm the single-sitting environment agreement.');
      return;
    }
    stopSpeech();
    setIsSpeaking(false);

    // If camera stream is already running, proceed directly with webcam proctoring
    if (cameraStream) {
      launchSessionWithMode('webcam');
      return;
    }

    // 3. Request camera access once
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false
        });
        launchSessionWithMode('webcam', stream);
      } catch (err: any) {
        console.warn('[Vayanai Proctoring] Camera access declined or unavailable:', err);
        // Ask once via sleek non-blocking modal: proceed camera-free or retry
        setShowCameraDeniedModal(true);
      }
    } else {
      // Browser or device does not support getUserMedia
      launchSessionWithMode('camera_free');
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleNextStep = () => {
    stopSpeech();
    setIsSpeaking(false);
    if (currentStep < questions.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      // Auto-narrate next scenario
      if (candidate) {
        const firstName = candidate.name.split(' ')[0];
        const bridge = getQuestionConversationalBridge(nextStep + 1, firstName, candidate.college || '', candidate.track);
        setTimeout(() => {
          handleSpeak(`${bridge} ${questions[nextStep].scenario}`);
        }, 400);
      }
    }
  };

  const handlePrevStep = () => {
    stopSpeech();
    setIsSpeaking(false);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!token) return;
    stopSpeech();
    setIsSpeaking(false);
    setSubmitting(true);
    setShowSubmitModal(false);

    try {
      const durationSeconds = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
      const telemetryPayload = {
        proctoringMode,
        tabSwitchCount,
        copyPasteAttempts,
        fullscreenExits,
        totalDurationSeconds: Math.max(durationSeconds, 45),
        webcamVerified: proctoringMode === 'webcam' && webcamActive,
        cameraFreeReason: proctoringMode === 'camera_free' ? (cameraFreeReason || 'Candidate choice') : undefined
      };

      const res = await fetch('/api/v1/intern/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          answers,
          telemetry: telemetryPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        setResult({
          message: data.data.message,
          integrityAudit: data.data.integrityAudit
        });
        if (cameraStream) {
          cameraStream.getTracks().forEach((t) => t.stop());
        }
      } else {
        showToast(data.error?.message || 'Failed to submit assessment.');
      }
    } catch (err: any) {
      showToast(`Network error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c9d6ce' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px', animation: 'spin 1s infinite linear' }}>⏳</div>
        <p style={{ fontSize: '14px', letterSpacing: '0.5px' }}>Initializing Secure Virtual Interview Room...</p>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', background: '#131c16', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#f4ede0' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', color: '#ef4444', margin: '0 0 12px' }}>Access Denied</h2>
          <p style={{ fontSize: '13px', color: '#c9d6ce', lineHeight: 1.6, marginBottom: '24px' }}>
            {error || 'Invalid or expired session token.'}
          </p>
          <Link
            href="/"
            style={{ display: 'inline-block', background: '#e8a34c', color: '#0d1410', padding: '12px 24px', minHeight: '44px', borderRadius: '6px', textDecoration: 'none', fontWeight: 700, fontSize: '13px' }}
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const firstName = candidate.name.split(' ')[0];

  // Stage 2: Submission Confirmation & Transparent Integrity Audit Dossier
  if (result) {
    const audit = result.integrityAudit;
    return (
      <div style={{ minHeight: '90vh', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: '680px', width: '100%', background: '#131c16', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '14px', padding: '36px', color: '#f4ede0', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(76, 175, 80, 0.15)', border: '2px solid #4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', color: '#4caf50' }}>
              ✓
            </div>
            <span className="badge badge-gold" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ASSESSMENT RECORDED
            </span>
            <h2 style={{ fontSize: '22px', color: '#fff8ee', margin: '12px 0 6px' }}>{candidate.name}</h2>
            <p style={{ fontSize: '12px', color: '#889990', margin: 0 }}>
              {candidate.track} &bull; {candidate.college || 'Verified Institution'} &bull; Cohort: {candidate.batchStartDate}
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#c9d6ce', lineHeight: 1.6 }}>
              {result.message}
            </p>
          </div>

          {/* Session Integrity & Anti-Cheat Audit Card */}
          <div style={{ background: '#0e1611', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8a34c', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                🛡️ Session Integrity & Anti-Cheat Audit
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background:
                    audit && audit.integrityScore === 'CLEAN'
                      ? 'rgba(76, 175, 80, 0.2)'
                      : audit && audit.integrityScore === 'FLAGGED_MODERATE'
                      ? 'rgba(232, 163, 76, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)',
                  color:
                    audit && audit.integrityScore === 'CLEAN'
                      ? '#4caf50'
                      : audit && audit.integrityScore === 'FLAGGED_MODERATE'
                      ? '#e8a34c'
                      : '#ef4444',
                  border: '1px solid currentColor'
                }}
              >
                {audit && audit.integrityScore === 'CLEAN'
                  ? '✓ Clean Proctoring Audit'
                  : audit && audit.integrityScore === 'FLAGGED_MODERATE'
                  ? '⚡ Moderate Focus Flags'
                  : '⚠️ Telemetry Anomaly Detected'}
              </span>
            </div>

            <div className="assessment-telemetry-grid">
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#889990' }}>Tab Switches</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: audit && audit.tabSwitchCount > 0 ? '#ef4444' : '#4caf50', marginTop: '2px' }}>
                  {audit ? audit.tabSwitchCount : 0}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#889990' }}>Clipboard Actions</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: audit && audit.copyPasteAttempts > 0 ? '#ef4444' : '#4caf50', marginTop: '2px' }}>
                  {audit ? audit.copyPasteAttempts : 0}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#889990' }}>Proctoring Mode</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4caf50', marginTop: '4px' }}>
                  {audit?.proctoringMode === 'camera_free' ? '🎙️ Camera-Free' : audit?.webcamVerified ? '📹 Live Video' : 'Logged'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#889990' }}>Session Time</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff8ee', marginTop: '4px' }}>
                  {audit ? `${Math.floor(audit.totalDurationSeconds / 60)}m ${audit.totalDurationSeconds % 60}s` : '12m'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#889990', lineHeight: 1.5 }}>
              🔒 <em>This encrypted proctoring audit trail has been securely submitted to the Admissions Committee for review alongside your answers.</em>
            </div>
          </div>

          <div style={{ background: 'rgba(232, 163, 76, 0.08)', borderLeft: '3px solid #e8a34c', padding: '16px', borderRadius: '0 8px 8px 0', marginBottom: '28px' }}>
            <h4 style={{ margin: '0 0 6px', color: '#e8a34c', fontSize: '13px' }}>Next Selection Steps</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#c9d6ce', lineHeight: 1.6 }}>
              Our evaluation committee is reviewing submissions on a rolling basis. Selected candidates for Batch starting on <strong>{candidate.batchStartDate}</strong> will be notified via their registered email address (<code>{candidate.email}</code>) within 24–48 hours with instructions to review their offer letter.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #e8a34c, #c9822b)',
                color: '#0e1611',
                padding: '12px 28px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}
            >
              Return to Vayanai Home ↗
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleBriefText = getTrackRoleBrief(candidate.track);
  const introWelcomeText = `Hello ${firstName}! I am Ananya from the Vayanai Talent and Mentorship Council. Welcome to your virtual interview. At Vayanai, we are building an India-first, pacing-led travel platform incubated under DBERT. We reviewed your submission from ${candidate.college || 'your college'} for the ${candidate.track} track. Today, you will work through 8 real-world situational and technical scenarios. Please take your time, review each option carefully, and select the approach you would take.`;

  // Stage 0: Enterprise Briefing & Pre-Session Setup Room
  if (!sessionStarted) {
    return (
      <div style={{ minHeight: '90vh', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {toastAlert && (
          <div style={{ position: 'fixed', top: '24px', right: '24px', background: '#e8a34c', color: '#0d1410', padding: '12px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', zIndex: 9999, boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}>
            {toastAlert}
          </div>
        )}

        {/* Camera Unavailable / Denied Modal: Ask once, then proceed camera-free if preferred */}
        {showCameraDeniedModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
            <div style={{ maxWidth: '480px', width: '100%', background: '#131c16', border: '1px solid #e8a34c', borderRadius: '12px', padding: '28px', color: '#f4ede0', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ fontSize: '28px' }}>🎙️</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', color: '#fff8ee' }}>Camera Not Connected</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#e8a34c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Camera-Free Proctoring Available
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#c9d6ce', lineHeight: 1.6, margin: '14px 0 22px' }}>
                We couldn&apos;t connect to your webcam (access was denied or no camera device was found). You can proceed immediately in <strong>Camera-Free Mode</strong> with zero penalty. Your focus and session telemetry will safeguard your submission.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button
                  type="button"
                  onClick={() => launchSessionWithMode('camera_free')}
                  style={{
                    background: 'linear-gradient(135deg, #e8a34c, #c9822b)',
                    color: '#0e1611',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🎙️ Proceed in Camera-Free Mode &rarr;
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowCameraDeniedModal(false);
                    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false });
                        launchSessionWithMode('webcam', stream);
                      } catch (e) {
                        setShowCameraDeniedModal(true);
                      }
                    }
                  }}
                  style={{
                    background: 'transparent',
                    color: '#889990',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    padding: '12px 18px', minHeight: '44px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🔄 Retry Camera Access
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ maxWidth: '840px', width: '100%', background: '#131c16', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '14px', padding: '36px', color: '#f4ede0', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' }}>
          {/* Top Panelist Presence Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '20px', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg, #28413a, #131c16)', border: '2px solid #e8a34c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#e8a34c', fontWeight: 700 }}>
                  A
                </div>
                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '14px', height: '14px', borderRadius: '50%', background: '#4caf50', border: '2px solid #131c16', animation: 'pulse 2s infinite' }} />
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff8ee' }}>
                  Ananya
                </div>
                <div style={{ fontSize: '11px', color: '#e8a34c', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Vayanai Talent & Mentorship Council &bull; Virtual Interview Panelist
                </div>
                <div style={{ fontSize: '11px', color: '#4caf50', marginTop: '2px' }}>
                  🟢 Interactive Session Active &bull; Incubation Partner: DBERT
                </div>
              </div>
            </div>

            {/* Voice Preview & Audio Wave Visualizer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isSpeaking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '0 8px' }}>
                  <span style={{ display: 'inline-block', width: '3px', height: '14px', background: '#4caf50', animation: 'soundwave 0.8s infinite ease-in-out' }} />
                  <span style={{ display: 'inline-block', width: '3px', height: '20px', background: '#e8a34c', animation: 'soundwave 0.6s infinite ease-in-out' }} />
                  <span style={{ display: 'inline-block', width: '3px', height: '10px', background: '#4caf50', animation: 'soundwave 0.9s infinite ease-in-out' }} />
                </div>
              )}
              <button
                type="button"
                onClick={handleTestVoice}
                style={{
                  background: isSpeaking ? '#ef4444' : 'rgba(232, 163, 76, 0.15)',
                  color: isSpeaking ? '#ffffff' : '#e8a34c',
                  border: '1px solid #e8a34c',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                title={voiceLabel}
              >
                {isSpeaking ? '⏹️ Stop Voice' : '🔊 Preview Ananya (Female Voice)'}
              </button>
            </div>
          </div>

          {/* Personalized Interviewer Orientation Bubble */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#fff8ee', lineHeight: 1.6 }}>
              Welcome, <strong>{candidate.name}</strong>! We are delighted to review your application from <strong>{candidate.college || 'your college'}</strong> for the <strong>{candidate.track}</strong> internship starting <strong>{candidate.batchStartDate}</strong>.
            </p>
            <div style={{ background: 'rgba(232, 163, 76, 0.08)', borderLeft: '3px solid #e8a34c', padding: '12px 16px', borderRadius: '0 6px 6px 0', margin: '14px 0', fontSize: '12.5px', color: '#c9d6ce', lineHeight: 1.6 }}>
              <strong style={{ color: '#e8a34c', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px' }}>
                Your Domain Focus ({candidate.track}):
              </strong>
              {roleBriefText}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#889990', lineHeight: 1.6 }}>
              Today's interview features <strong>8 real-world case scenarios</strong>. Ananya will introduce each scenario in a conversational setting. You can listen aloud or read at your own pace.
            </p>
          </div>

          {/* Confirmation Checkbox & Begin Button */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: '#c9d6ce', cursor: 'pointer', marginBottom: '20px' }}>
              <input
                type="checkbox"
                checked={agreedSessionRules}
                onChange={(e) => setAgreedSessionRules(e.target.checked)}
                style={{ marginTop: '3px', accentColor: '#e8a34c' }}
              />
              <span>
                I confirm that I have 10–15 minutes of uninterrupted quiet time, understand this is a single attempt, and agree to session telemetry monitoring.
              </span>
            </label>

            <button
              type="button"
              onClick={handleStartInterview}
              disabled={!agreedSessionRules}
              style={{
                width: '100%',
                background: agreedSessionRules ? 'linear-gradient(135deg, #e8a34c, #c9822b)' : '#333333',
                color: agreedSessionRules ? '#0e1611' : '#888888',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: agreedSessionRules ? 'pointer' : 'not-allowed',
                boxShadow: agreedSessionRules ? '0 4px 16px rgba(232, 163, 76, 0.3)' : 'none',
                letterSpacing: '0.5px'
              }}
            >
              🚀 Start Virtual Interview &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Stage 1: Active Question Workspace (Industrial Split-Pane Layout)
  const currentQ = questions[currentStep];
  const selectedOption = answers[currentQ?.id];
  const progressPercent = Math.round(((currentStep + 1) / questions.length) * 100);
  const conversationalBridge = getQuestionConversationalBridge(currentStep + 1, firstName, candidate.college || '', candidate.track);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{ minHeight: '94vh', padding: '16px 20px', maxWidth: '1180px', margin: '0 auto', color: '#f4ede0' }}>
      {toastAlert && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: '#e8a34c', color: '#0d1410', padding: '12px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', zIndex: 9999, boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}>
          {toastAlert}
        </div>
      )}

      {/* Floating Proctoring HUD */}
      {proctoringMode === 'webcam' && webcamActive && cameraStream ? (
        <div className="proctor-floating-hud" style={{ width: '160px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #4caf50', background: '#000', zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          <video ref={floatingVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.7)', color: '#4caf50', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px' }}>
            ● LIVE PROCTOR
          </div>
        </div>
      ) : (
        <div className="proctor-floating-hud" style={{ background: '#131c16', border: '1px solid rgba(232, 163, 76, 0.4)', borderRadius: '20px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(0,0,0,0.5)', fontSize: '11px', color: '#e8a34c' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4caf50', display: 'inline-block' }} />
          <strong>FOCUS PROCTOR ACTIVE</strong>
          {tabSwitchCount > 0 && <span style={{ color: '#ef4444' }}>({tabSwitchCount} switches)</span>}
        </div>
      )}

      {/* Top Industrial Navigation Bar */}
      <div style={{ background: '#131c16', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-gold" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            VAYANAI &bull; DBERT
          </span>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff8ee' }}>
            {candidate.name} <span style={{ color: '#889990', fontWeight: 400 }}>({candidate.track})</span>
          </div>
        </div>

        {/* Center Progress & Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#c9d6ce' }}>
            <span>Scenario <strong>{currentStep + 1}</strong> of <strong>{questions.length}</strong></span>
            <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: '#e8a34c', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          <div style={{ background: secondsRemaining < 180 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.3)', border: `1px solid ${secondsRemaining < 180 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: secondsRemaining < 180 ? '#ef4444' : '#fff8ee', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⏱️</span>
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        </div>

        {/* Right Audio Controls with Waveform Animation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isSpeaking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 4px' }}>
              <span style={{ display: 'inline-block', width: '2px', height: '12px', background: '#4caf50', animation: 'soundwave 0.8s infinite ease-in-out' }} />
              <span style={{ display: 'inline-block', width: '2px', height: '18px', background: '#e8a34c', animation: 'soundwave 0.6s infinite ease-in-out' }} />
              <span style={{ display: 'inline-block', width: '2px', height: '8px', background: '#4caf50', animation: 'soundwave 0.9s infinite ease-in-out' }} />
            </div>
          )}
          <button
            type="button"
            onClick={() => handleSpeak(`${conversationalBridge} ${currentQ?.scenario}`)}
            style={{
              background: isSpeaking ? '#ef4444' : 'rgba(232, 163, 76, 0.15)',
              color: isSpeaking ? '#ffffff' : '#e8a34c',
              border: '1px solid #e8a34c',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isSpeaking ? '⏹️ Stop Narration' : '🔊 Listen to Scenario'}
          </button>
        </div>
      </div>

      {/* Main Split-Pane Workspace */}
      <div className="interview-workspace-grid">
        {/* Left Column: Panelist Ananya Workspace */}
        <div className="interview-panelist-sidebar" style={{ background: '#131c16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '20px', position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #28413a, #131c16)', border: '2px solid #e8a34c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#e8a34c', fontWeight: 700 }}>
                A
              </div>
              <div style={{ position: 'absolute', bottom: '0', right: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#4caf50', border: '2px solid #131c16' }} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff8ee' }}>Ananya</div>
              <div style={{ fontSize: '10px', color: '#e8a34c', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Interviewer & Mentor
              </div>
            </div>
          </div>

          {/* Spoken Context Bubble */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '14px', fontSize: '12px', lineHeight: 1.6, color: '#c9d6ce', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#fff8ee' }}>
              "{conversationalBridge}"
            </p>
          </div>

          {/* Candidate Context Pill */}
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '10px 12px', fontSize: '11px', color: '#889990', lineHeight: 1.5 }}>
            <div>🎓 <strong>{candidate.college || 'Verified University'}</strong></div>
            <div style={{ marginTop: '2px' }}>🎯 Track: <span style={{ color: '#e8a34c' }}>{candidate.track}</span></div>
            <div style={{ marginTop: '2px' }}>🗓️ Cohort: <strong>{candidate.batchStartDate}</strong></div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '10px', color: '#889990', lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            💡 <em>Tip: You can use keyboard keys <strong>1-4</strong> or <strong>A-D</strong> to select options quickly.</em>
          </div>
        </div>

        {/* Right Column: Question & Scenario Details */}
        <div style={{ background: '#131c16', border: '1px solid rgba(232, 163, 76, 0.3)', borderRadius: '12px', padding: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          {currentQ && (
            <div>
              {/* Question Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="badge badge-gold" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  SCENARIO {currentStep + 1} OF {questions.length}
                </span>
                <span style={{ fontSize: '11px', color: '#889990' }}>
                  Single Option Choice
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff8ee', margin: '0 0 16px', lineHeight: 1.4 }}>
                {currentQ.question}
              </h3>

              {/* Scenario Context Box */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderLeft: '3px solid #e8a34c', borderRadius: '0 8px 8px 0', padding: '16px', marginBottom: '24px', fontSize: '13.5px', color: '#c9d6ce', lineHeight: 1.65 }}>
                {currentQ.scenario}
              </div>

              {/* Options List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOption === opt.id;
                  const keyLetter = ['A', 'B', 'C', 'D'][idx] || `${idx + 1}`;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      style={{
                        background: isSelected ? 'rgba(232, 163, 76, 0.12)' : 'rgba(0, 0, 0, 0.25)',
                        border: `2px solid ${isSelected ? '#e8a34c' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '8px',
                        padding: '14px 18px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px'
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          background: isSelected ? '#e8a34c' : 'rgba(255,255,255,0.06)',
                          color: isSelected ? '#0d1410' : '#889990',
                          fontWeight: 700,
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px'
                        }}
                      >
                        {keyLetter}
                      </div>
                      <div style={{ flex: 1, fontSize: '13px', color: isSelected ? '#fff8ee' : '#c9d6ce', lineHeight: 1.5 }}>
                        {opt.text}
                      </div>
                      {isSelected && (
                        <div style={{ color: '#e8a34c', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}>
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: currentStep === 0 ? '#555555' : '#c9d6ce',
                    borderRadius: '6px',
                    padding: '12px 18px', minHeight: '44px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: currentStep === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  &larr; Previous Scenario
                </button>

                {currentStep < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!selectedOption}
                    style={{
                      background: selectedOption ? '#e8a34c' : '#333333',
                      color: selectedOption ? '#0d1410' : '#888888',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '12px 24px', minHeight: '44px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: selectedOption ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Next Scenario &rarr;
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    disabled={!selectedOption || submitting}
                    style={{
                      background: selectedOption ? '#4caf50' : '#333333',
                      color: selectedOption ? '#ffffff' : '#888888',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '12px 24px', minHeight: '44px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: selectedOption ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {submitting ? 'Submitting...' : '✓ Submit Final Assessment'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ maxWidth: '480px', width: '100%', background: '#131c16', border: '1px solid rgba(232, 163, 76, 0.4)', borderRadius: '12px', padding: '28px', color: '#f4ede0', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: '#fff8ee' }}>Submit Assessment to Admissions Committee?</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#c9d6ce', lineHeight: 1.6 }}>
              You have answered <strong>{Object.keys(answers).length} of {questions.length}</strong> scenarios. Once submitted, your answers and proctoring telemetry are final and cannot be modified.
            </p>
            <div style={{ background: '#0e1611', borderRadius: '6px', padding: '12px', marginBottom: '20px', fontSize: '11px', color: '#889990' }}>
              🛡️ Active Proctoring Summary: {tabSwitchCount} tab switch(es) detected &bull; Duration: {Math.round((Date.now() - sessionStartTimeRef.current) / 60000)}m
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#c9d6ce', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={handleSubmitAssessment}
                disabled={submitting}
                style={{ background: '#4caf50', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: '#c9d6ce', textAlign: 'center' }}>Loading Interview Session...</div>}>
      <AssessmentContent />
    </Suspense>
  );
}
