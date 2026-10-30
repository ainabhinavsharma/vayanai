'use client';

import React, { useState } from 'react';
import { AlignmentQuestion, VayuAlignmentScore } from '@/types/portal';
import { getAlignmentQuestions, calculateAlignment } from '@/lib/portal/portal-service';
import { useToast } from '@/components/ui/Toast';

interface VayuAlignmentStudioProps {
  onApplyPacing: (score: VayuAlignmentScore) => void;
  onNavigateTab: (tab: string) => void;
}

export function VayuAlignmentStudio({
  onApplyPacing,
  onNavigateTab
}: VayuAlignmentStudioProps) {
  const { showToast } = useToast();
  const questions: AlignmentQuestion[] = getAlignmentQuestions();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({
    'q-daily-rhythm': 'opt-slow-tea',
    'q-road-endurance': 'opt-short-legs',
    'q-culinary-style': 'opt-hearth',
    'q-physical-terrain': 'opt-forest-paths'
  });

  const [scoreResult, setScoreResult] = useState<VayuAlignmentScore | null>(null);

  const currentQ = questions[currentStep];

  const handleSelectOption = (optionId: string) => {
    const updated = { ...answers, [currentQ.id]: optionId };
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate final score
      const res = calculateAlignment(answers);
      setScoreResult(res);
      showToast('Pacing alignment calculated successfully!');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleApplyToRoute = () => {
    if (scoreResult) {
      onApplyPacing(scoreResult);
      showToast(`Applied ${scoreResult.rhythmTitle} to your active itinerary!`);
      onNavigateTab('trips');
    }
  };

  const handleReset = () => {
    setScoreResult(null);
    setCurrentStep(0);
  };

  return (
    <div className="alignment-studio-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow eyebrow-muted">
            <i></i> VAYU ALIGNMENT STUDIO
          </div>
          <h2>Itinerary Rhythm & <em>Pacing Interview</em></h2>
        </div>
        {scoreResult && (
          <button type="button" className="small-action" onClick={handleReset}>
            Retake Interview ↺
          </button>
        )}
      </div>

      <p className="alignment-intro">
        Most travel itineraries fail because the road pacing does not match the travellers’ biological rhythm.
        Vayu asks 4 focused questions to calibrate rest intervals, scenic stops, and meal buffer times.
      </p>

      {!scoreResult ? (
        <div className="alignment-quiz-card">
          {/* Progress bar */}
          <div className="quiz-progress-track">
            <div
              className="quiz-progress-fill"
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>

          <div className="quiz-step-header">
            <span className="step-count">Question {currentStep + 1} of {questions.length}</span>
            <span className="step-tag">PACE CALIBRATION</span>
          </div>

          <h3 className="quiz-question-title">{currentQ.question}</h3>
          <p className="quiz-question-subtitle">{currentQ.subtitle}</p>

          <div className="quiz-options-grid">
            {currentQ.options.map((opt) => {
              const isSelected = answers[currentQ.id] === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`quiz-option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(opt.id)}
                >
                  <div className="option-radio-indicator">
                    {isSelected ? '●' : '○'}
                  </div>
                  <div className="option-content">
                    <div className="option-top">
                      <b>{opt.label}</b>
                      <span className="rhythm-tag">{opt.rhythmKeyword}</span>
                    </div>
                    <p>{opt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="quiz-nav-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={handlePrev}
              disabled={currentStep === 0}
              style={{ opacity: currentStep === 0 ? 0.4 : 1 }}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={handleNext}
            >
              {currentStep === questions.length - 1 ? 'Compute Alignment & Buffers ↗' : 'Next Step →'}
            </button>
          </div>
        </div>
      ) : (
        /* Computed Alignment Result Card */
        <div className="alignment-result-card">
          <div className="result-badge-row">
            <span className="score-pill">
              <b>{scoreResult.score}%</b> RHYTHM COMPATIBILITY
            </span>
            <span className="calibrated-pill">
              Buffer Factor: +{Math.round((scoreResult.bufferFactor - 1) * 100)}%
            </span>
          </div>

          <h3 className="result-rhythm-title">{scoreResult.rhythmTitle}</h3>
          <p className="result-pacing-desc">{scoreResult.pacingSummary}</p>

          <div className="adjustments-box">
            <h4>Vayu’s Calibrated Recommendations for this Trip:</h4>
            <ul>
              {scoreResult.recommendedAdjustments.map((adj, idx) => (
                <li key={idx}>
                  <span className="check-bullet">✓</span>
                  <span>{adj}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="result-cta-strip">
            <button
              type="button"
              className="primary-btn"
              onClick={handleApplyToRoute}
            >
              Apply Recalibrated Buffers to Route ↗
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigateTab('trips')}
            >
              Return to Itinerary View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
