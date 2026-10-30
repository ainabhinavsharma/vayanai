import { TripBrief, RouteDetail } from '@/types';
import { routeData, inferRoute } from '@/lib/mock-routes';
import { getDestinationWeather } from '@/lib/adapters/weather';

export interface RankedRoute {
  route: RouteDetail;
  matchScore: number;
  matchReasons: string[];
  weatherSnapshot: string;
}

export interface PlannerResult {
  status: 'matched' | 'needs_clarification';
  clarifyingQuestion?: string;
  selectedRouteKey: string;
  trip: RouteDetail;
  rankedCandidates: RankedRoute[];
  warnings: string[];
  sourceProvenance: {
    engine: string;
    verifiedAt: string;
    isDeterministic: boolean;
  };
}

export async function orchestrateVayuPlan(brief: TripBrief): Promise<PlannerResult> {
  const prompt = brief.prompt?.trim() || '';
  const interests = brief.interests || [];

  // Ambiguity Detection: If prompt is too vague and no interests selected
  if (prompt.length > 0 && prompt.length < 8 && interests.length === 0) {
    return {
      status: 'needs_clarification',
      clarifyingQuestion:
        'Could you tell us what kind of scenery you are imagining? For example: lush green hills, quiet backwaters, heritage forts, or mountain air?',
      selectedRouteKey: 'meghalaya',
      trip: routeData.meghalaya,
      rankedCandidates: [],
      warnings: [],
      sourceProvenance: {
        engine: 'Vayu Orchestrator v1',
        verifiedAt: new Date().toISOString(),
        isDeterministic: true
      }
    };
  }

  // 1. Infer primary route
  const primaryRouteKey = brief.routeKey || inferRoute(prompt, interests);

  // 2. Rank candidates based on interest match
  const candidateKeys = Object.keys(routeData);
  const rankedCandidates: RankedRoute[] = [];

  for (const key of candidateKeys) {
    const route = routeData[key];
    let score = 50; // base score
    const matchReasons: string[] = [];

    if (key === primaryRouteKey) score += 30;

    if (interests.includes('Nature') && (key === 'meghalaya' || key === 'ladakh')) {
      score += 15;
      matchReasons.push('Strong nature and open landscape focus');
    }
    if (interests.includes('Food') && (key === 'kerala' || key === 'rajasthan')) {
      score += 15;
      matchReasons.push('Rich regional culinary traditions and local food walks');
    }
    if (interests.includes('Culture') && key === 'rajasthan') {
      score += 20;
      matchReasons.push('Living craft traditions and royal architecture');
    }
    if (interests.includes('Quiet') && (key === 'ladakh' || key === 'meghalaya')) {
      score += 15;
      matchReasons.push('Uncrowded locations with space to breathe');
    }
    if (interests.includes('Family-friendly') && (key === 'rajasthan' || key === 'kerala')) {
      score += 15;
      matchReasons.push('Sensible transfer times and low-stress walking terrain');
    }

    const weather = await getDestinationWeather(key);

    rankedCandidates.push({
      route,
      matchScore: Math.min(score, 100),
      matchReasons,
      weatherSnapshot: `${weather.condition} (${weather.temperatureRange})`
    });
  }

  rankedCandidates.sort((a, b) => b.matchScore - a.matchScore);

  // 3. Safety and Constraint Warnings
  const warnings: string[] = [];
  if (primaryRouteKey === 'ladakh' && brief.party.toLowerCase().includes('elder')) {
    warnings.push('High-altitude note: Leh requires 48 hours of rest before any scenic excursions.');
  }
  if (
    brief.accessibility?.some((a) => a.toLowerCase().includes('walking') || a.toLowerCase().includes('step-free')) &&
    primaryRouteKey === 'meghalaya'
  ) {
    warnings.push('Accessibility note: Valley trails have uneven stone steps; vehicular viewpoints are pre-selected.');
  }

  const selectedTrip = routeData[primaryRouteKey] || routeData.meghalaya;

  return {
    status: 'matched',
    selectedRouteKey: primaryRouteKey,
    trip: selectedTrip,
    rankedCandidates,
    warnings,
    sourceProvenance: {
      engine: 'Vayu Orchestrator v1',
      verifiedAt: new Date().toISOString(),
      isDeterministic: true
    }
  };
}
