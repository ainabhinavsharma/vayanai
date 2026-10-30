import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import {
  getInterviewQuestions,
  getInternApplicationByUserId,
  submitInternInterview
} from '@/lib/db/intern-repo';

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

    const result = submitInternInterview(user.id, answers);

    return apiSuccess({
      score: result.score,
      selected: result.selected,
      application: result.application,
      message: result.selected
        ? 'Congratulations! You have been selected for the internship. Please proceed to the refundable deposit step.'
        : 'Interview evaluated. Your score did not meet the 75% threshold.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Interview evaluation failed';
    return apiError(message, 'INTERVIEW_ERROR', 400);
  }
}
