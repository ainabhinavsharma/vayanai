import { apiSuccess } from '@/lib/api-response';
import { routeData } from '@/lib/mock-routes';

export async function GET() {
  const destinations = Object.values(routeData).map((route) => ({
    id: route.id,
    name: route.name,
    title: route.title,
    stops: route.stops,
    image: route.image,
    match: route.match,
    summary: route.summary,
    sampleBudget: route.budget.totalRange
  }));

  return apiSuccess({
    count: destinations.length,
    destinations
  });
}
