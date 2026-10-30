export interface TransitEstimate {
  from: string;
  to: string;
  roadDistanceKm: number;
  estimatedMinutes: number;
  recommendedBufferMinutes: number;
  terrainType: 'plains_highway' | 'winding_hills' | 'high_altitude_pass';
  pacingAdvice: string;
}

const TRANSIT_MATRIX: Record<string, TransitEstimate> = {
  'guwahati-shillong': {
    from: 'Guwahati Airport (GAU)',
    to: 'Shillong Pine Hills',
    roadDistanceKm: 120,
    estimatedMinutes: 210, // ~3.5 hours
    recommendedBufferMinutes: 60,
    terrainType: 'winding_hills',
    pacingAdvice: 'Hills slow highway speeds. Plan an early afternoon start so you arrive before sunset fog.'
  },
  'shillong-sohra': {
    from: 'Shillong',
    to: 'Sohra (Cherrapunji)',
    roadDistanceKm: 54,
    estimatedMinutes: 120, // ~2 hours
    recommendedBufferMinutes: 45,
    terrainType: 'winding_hills',
    pacingAdvice: 'Gorge mist and cloud cover can reduce speed; keep viewpoint stops flexible.'
  },
  'leh-airport-hotel': {
    from: 'Leh Kushok Bakula Rimpochee Airport (IXL)',
    to: 'Leh Old Town Stay',
    roadDistanceKm: 6,
    estimatedMinutes: 20,
    recommendedBufferMinutes: 30,
    terrainType: 'high_altitude_pass',
    pacingAdvice: 'Short road drive, but immediate bed rest for 24-36 hours is mandatory for acclimatisation.'
  },
  'kochi-alleppey': {
    from: 'Fort Kochi Heritage Quarter',
    to: 'Alleppey Backwater Jetty',
    roadDistanceKm: 55,
    estimatedMinutes: 90,
    recommendedBufferMinutes: 30,
    terrainType: 'plains_highway',
    pacingAdvice: 'Coastal highway with village intersections; midday traffic is lighter than evening peak.'
  },
  'jaipur-amer': {
    from: 'Jaipur Pink City',
    to: 'Amer Fort Ridge',
    roadDistanceKm: 11,
    estimatedMinutes: 30,
    recommendedBufferMinutes: 20,
    terrainType: 'plains_highway',
    pacingAdvice: 'Start before 8:30 AM to beat tourist buses and avoid midday sun on the stone ramparts.'
  }
};

export function getTransitEstimate(fromToKey: string): TransitEstimate | null {
  return TRANSIT_MATRIX[fromToKey.toLowerCase()] || null;
}
