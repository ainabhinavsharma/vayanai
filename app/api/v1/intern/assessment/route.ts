import { NextRequest } from 'next/server';
import {
  getInternApplicationByToken,
  submitInternInterviewByToken,
  getInterviewQuestionsForTrack,
  resetInternApplicationForRetake
} from '@/lib/db/intern-repo';
import { dispatchAssessmentCompletedEmail } from '@/lib/services/email-dispatcher';
import { apiError, apiSuccess } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return apiError('Missing assessment access token.', 'MISSING_TOKEN', 400);
    }

    const application = getInternApplicationByToken(token);
    if (!application) {
      return apiError('Invalid or expired assessment link. Please contact operations@vayanai.in.net.', 'INVALID_TOKEN', 404);
    }

    // Get track-tailored 8 interleaved questions
    const rawQuestions = getInterviewQuestionsForTrack(application.trackName);

    // Sanitize questions: strip point values, optimal flags, and categories to prevent client inspection
    const sanitizedQuestions = rawQuestions.map((q) => ({
      id: q.id,
      step: q.step,
      question: q.question,
      scenario: q.scenario,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text
      }))
    }));

    return apiSuccess({
      candidate: {
        id: application.id,
        name: application.userName,
        email: application.userEmail,
        college: application.collegeName,
        track: application.trackName,
        status: application.status,
        batchStartDate: application.batchStartDate || '2026-11-02'
      },
      questions: sanitizedQuestions,
      totalQuestions: sanitizedQuestions.length,
      isAlreadySubmitted: application.status !== 'applied' && application.status !== 'invited',
      integrityAudit: application.proctoringTelemetry
    });
  } catch (err: any) {
    return apiError(`Failed to load assessment: ${err.message}`, 'ASSESSMENT_LOAD_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, answers, telemetry } = body;

    if (!token) {
      return apiError('Missing assessment token.', 'MISSING_TOKEN', 400);
    }

    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return apiError('Assessment answers are required.', 'EMPTY_ANSWERS', 400);
    }

    const result = submitInternInterviewByToken(token, answers, telemetry);

    // Dispatch submission confirmation & integrity audit email to candidate
    try {
      await dispatchAssessmentCompletedEmail(result.application.id, result.application.proctoringTelemetry);
    } catch (mailErr: any) {
      console.warn('[Assessment Mail Notice] Could not dispatch completion email:', mailErr.message);
    }

    // Intentionally do NOT leak evaluation score or selection status to the candidate,
    // but provide transparent proctoring integrity audit report
    return apiSuccess({
      message: 'Assessment successfully submitted. Our evaluation committee is reviewing your submission on a rolling basis. Selected candidates for Batch 2 Nov 2026 will be notified via their registered email address within 24–48 hours.',
      isSubmitted: true,
      integrityAudit: result.application.proctoringTelemetry
    });
  } catch (err: any) {
    return apiError(`Failed to submit assessment: ${err.message}`, 'SUBMIT_ERROR', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, action } = body;
    if (!token) {
      return apiError('Missing assessment token.', 'MISSING_TOKEN', 400);
    }
    if (action === 'reset') {
      const reset = resetInternApplicationForRetake(token);
      if (!reset) {
        return apiError('Application not found for token.', 'NOT_FOUND', 404);
      }
      return apiSuccess({ message: 'Session reset successfully for retake.' });
    }
    return apiError('Invalid action.', 'INVALID_ACTION', 400);
  } catch (err: any) {
    return apiError(`Failed to update assessment: ${err.message}`, 'UPDATE_ERROR', 500);
  }
}
