import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import {
  getJournalEntries,
  addJournalEntry
} from '@/lib/portal/portal-service';

export async function GET() {
  const entries = getJournalEntries();
  return apiSuccess({
    entries,
    totalCount: entries.length
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.reflection || !body.day) {
      return apiError('Day, title, and reflection are required fields', 'MISSING_FIELDS', 400);
    }

    const newEntry = addJournalEntry({
      day: Number(body.day),
      date: body.date || `Trip Day ${body.day}`,
      title: String(body.title),
      location: String(body.location || 'Local Trail'),
      reflection: String(body.reflection),
      highlight: String(body.highlight || ''),
      localInteraction: String(body.localInteraction || ''),
      photoUrl: body.photoUrl || '/images/destinations/meghalaya.jpg',
      weatherCondition: body.weatherCondition || '22°C · Pleasant'
    });

    return apiSuccess({
      entry: newEntry
    });
  } catch (err) {
    return apiError('Invalid request body', 'INVALID_JSON', 400);
  }
}
