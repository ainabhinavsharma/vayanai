import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import {
  getInterviewQuestions,
  getInternApplicationByUserId,
  submitInternInterview
} from '@/lib/db/intern-repo';
import { dispatchAssessmentCompletedEmail } from '@/lib/services/email-dispatcher';

export async function GET() {
  const questions = getInterviewQuestions();
  const token = await getAuthToken();
  const user = token ? getSessionUser(token) : null;

  const application = user ? getInternApplicationByUserId(user.id) : null;

  return apiSuccess({
    questions,
    application
  });
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const user = token ? getSessionUser(token) : null;

    if (!user) {
      return apiError('Authentication required to submit virtual interview', 'UNAUTHORIZED', 401);
    }

    const body = await req.json();
    const answers = body.answers || {};
    const telemetry = body.telemetry;

    const result = submitInternInterview(user.id, answers, telemetry);

    // Dispatch completion & session integrity audit email to candidate
    try {
      await dispatchAssessmentCompletedEmail(result.application.id, result.application.proctoringTelemetry);
    } catch (mailErr: any) {
      console.warn('[Interview Assessment Mail Notice] Could not dispatch completion email:', mailErr?.message);
    }

    return apiSuccess({
      score: result.score,
      selected: result.selected,
      application: result.application,
      message: 'Assessment and anti-cheat telemetry successfully submitted for evaluation by the Admissions Council. You will receive an email notification once reviewed.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Interview evaluation failed';
    return apiError(message, 'INTERVIEW_ERROR', 400);
  }
}
