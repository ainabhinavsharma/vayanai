import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getPartnerInquiries, submitPartnerQuote } from '@/lib/portal/portal-service';

export async function GET() {
  const inquiries = getPartnerInquiries();
  return apiSuccess({ inquiries });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { inquiryId, quoteINR, quoteNotes } = body;

    if (!inquiryId || !quoteINR) {
      return apiError('Missing inquiryId or quoteINR in payload', 'MISSING_FIELDS', 400);
    }

    const updated = submitPartnerQuote(inquiryId, Number(quoteINR), quoteNotes || '');
    if (!updated) {
      return apiError(`Inquiry '${inquiryId}' not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess({
      message: 'Quote submitted to traveler',
      inquiry: updated
    });
  } catch (err) {
    return apiError('Failed to submit quote', 'QUOTE_FAILED', 500, String(err));
  }
}
