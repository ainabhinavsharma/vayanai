import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken } from '@/lib/auth/cookie';
import { getSessionUser } from '@/lib/auth/session';
import { listAllInternApplications } from '@/lib/db/intern-repo';

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getAuthToken();
    const sessionUser = token ? getSessionUser(token) : null;

    if (!sessionUser || (sessionUser.role !== 'admin' && sessionUser.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin or Staff privileges required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const track = searchParams.get('track') || undefined;
    const search = searchParams.get('search') || undefined;
    const dbertLead = searchParams.get('dbertLead') || undefined;
    const scoreBracket = searchParams.get('scoreBracket') || undefined;
    const integrityLevel = searchParams.get('integrityLevel') || undefined;

    const candidates = listAllInternApplications({
      status,
      track,
      search,
      dbertLead,
      scoreBracket,
      integrityLevel
    });

    const headers = [
      'Candidate ID',
      'Name',
      'Email',
      'WhatsApp Phone',
      'Academic Institution',
      'Semester',
      'Domain Track',
      'Lifecycle Status',
      'Interview Score',
      'Anti-Cheat Integrity Verdict',
      'Tab Switches Logged',
      'Clipboard Violations Logged',
      'DBERT Lead Propensity',
      'Financial Support',
      'Prior Course Spend',
      'Placement Urgency',
      'Offer Letter ID',
      'Offer Accepted At',
      'Deposit UTR Reference',
      'Deposit Paid At',
      'Applied Timestamp'
    ];

    const rows = candidates.map((c) => [
      c.id,
      c.userName,
      c.userEmail,
      c.phone || '',
      c.collegeName || '',
      c.semester || '',
      c.trackName,
      c.status,
      c.interviewScore !== undefined ? c.interviewScore : 'N/A',
      c.proctoringTelemetry?.integrityScore || 'CLEAN',
      c.proctoringTelemetry?.tabSwitchCount ?? 0,
      c.proctoringTelemetry?.copyPasteAttempts ?? 0,
      c.dbertProfile?.leadPropensity || 'STANDARD',
      c.dbertProfile?.financialSupport || '',
      c.dbertProfile?.priorSpend || '',
      c.dbertProfile?.urgencyLevel || '',
      c.offerLetterId || '',
      c.offerAcceptedAt || '',
      c.utrNumber || c.depositReceipt || '',
      c.depositPaidAt || '',
      c.appliedAt
    ]);

    const csvContent = [
      headers.map(escapeCsvField).join(','),
      ...rows.map((r) => r.map(escapeCsvField).join(','))
    ].join('\r\n');

    const filename = `vayanai_candidates_export_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err: any) {
    console.error('CSV Export Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to generate CSV export.' },
      { status: 500 }
    );
  }
}
