import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { TripBriefSchema } from '@/lib/domain/schemas';

interface ConstraintWarning {
  field: string;
  level: 'info' | 'caution' | 'warning';
  message: string;
  suggestion: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = TripBriefSchema.safeParse(body);

    if (!parseResult.success) {
      return apiError(
        'Invalid trip brief input',
        'VALIDATION_FAILED',
        422,
        parseResult.error.flatten()
      );
    }

    const brief = parseResult.data;
    const warnings: ConstraintWarning[] = [];

    // Altitude & Health Check
    if (brief.routeKey === 'ladakh' && brief.party.toLowerCase().includes('elder')) {
      warnings.push({
        field: 'party',
        level: 'caution',
        message: 'Leh sits at 3,500m elevation. Rapid altitude gain can impact senior travellers.',
        suggestion: 'Ensure at least 48 hours of complete rest in Leh before scheduling outlying excursions.'
      });
    }

    // Road Transfer Time Check
    if (brief.routeKey === 'meghalaya' && brief.duration.includes('3 nights')) {
      warnings.push({
        field: 'duration',
        level: 'info',
        message: 'Guwahati to Shillong and Sohra involves significant highway transit.',
        suggestion: 'Consider 4-5 nights to avoid spending most daylight hours on the road.'
      });
    }

    // Accessibility & Step-Free Check
    if (
      brief.accessibility.some((a) => a.toLowerCase().includes('walking') || a.toLowerCase().includes('step-free')) &&
      brief.routeKey === 'meghalaya'
    ) {
      warnings.push({
        field: 'accessibility',
        level: 'info',
        message: 'Popular valley and root bridge trails in Sohra involve steep, uneven steps.',
        suggestion: 'We have pre-selected scenic viewpoints with direct vehicular access.'
      });
    }

    return apiSuccess({
      isValid: true,
      brief,
      warnings,
      estimatedPacing: warnings.length > 0 ? 'requires_buffer' : 'balanced'
    });
  } catch (err) {
    return apiError('Malformed JSON payload', 'INVALID_JSON', 400, String(err));
  }
}
