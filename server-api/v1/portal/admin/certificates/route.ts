import { NextResponse } from 'next/server';
import { getPendingCertificates, getAllCertificates } from '@/lib/db/certificates-repo';

export async function GET() {
  try {
    const pending = getPendingCertificates();
    const all = getAllCertificates(100);

    return NextResponse.json({
      success: true,
      data: {
        pending,
        all,
        pendingCount: pending.length,
        totalCount: all.length
      }
    });
  } catch (error) {
    console.error('Error fetching admin certificates queue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load certificate approval queue.' },
      { status: 500 }
    );
  }
}
