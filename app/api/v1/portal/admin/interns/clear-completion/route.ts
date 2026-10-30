import { NextRequest, NextResponse } from 'next/server';
import { clearInternCompletion } from '@/lib/db/intern-repo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const candidateId = body.candidateId || body.id;

    if (!candidateId) {
      return NextResponse.json({ success: false, error: 'Candidate ID is required' }, { status: 400 });
    }

    const updated = clearInternCompletion(candidateId);
    return NextResponse.json({
      success: true,
      data: {
        message: `3-Month completion cleared and certificate generated for ${updated.userName}!`,
        candidate: updated
      }
    });
  } catch (err: any) {
    console.error('Error in clear-completion:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
