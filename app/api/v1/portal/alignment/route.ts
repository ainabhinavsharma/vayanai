import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import {
  getAlignmentQuestions,
  calculateAlignment
} from '@/lib/portal/portal-service';

export async function GET() {
  const questions = getAlignmentQuestions();
  return apiSuccess({
    questions
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const answers = body.answers || {};

    const alignment = calculateAlignment(answers);
    return apiSuccess({
      alignment
    });
  } catch (err) {
    return apiError('Invalid request body', 'INVALID_JSON', 400);
  }
}
