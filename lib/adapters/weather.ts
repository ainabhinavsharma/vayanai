import { sourceRegister } from './source-register';

export interface WeatherCondition {
  destination: string;
  temperatureRange: string;
  condition: string;
  rainProbability: number;
  seasonFit: 'optimal' | 'moderate' | 'monsoon_cautions';
  seasonNote: string;
  provenance: {
    source: string;
    attribution: string;
    lastChecked: string;
    isLive: boolean;
    isFallback: boolean;
  };
}

interface DestinationCoordinates {
  name: string;
  lat: number;
  lon: number;
  fallbackCondition: WeatherCondition;
}

const DESTINATION_COORDS: Record<string, DestinationCoordinates> = {
  meghalaya: {
    name: 'Meghalaya (Shillong/Sohra)',
    lat: 25.5788,
    lon: 91.8933,
    fallbackCondition: {
      destination: 'Meghalaya',
      temperatureRange: '15°C – 22°C',
      condition: 'Misty with clearing showers',
      rainProbability: 35,
      seasonFit: 'optimal',
      seasonNote: 'Post-monsoon autumn brings lush green gorges with clearer mountain visibility.',
      provenance: {
        source: 'Vayanai Seasonal Norms (Offline Cache)',
        attribution: sourceRegister['open-meteo'].attributionText,
        lastChecked: new Date().toISOString(),
        isLive: false,
        isFallback: true
      }
    }
  },
  ladakh: {
    name: 'Ladakh (Leh)',
    lat: 34.1526,
    lon: 77.5771,
    fallbackCondition: {
      destination: 'Ladakh',
      temperatureRange: '2°C – 14°C',
      condition: 'Crisp, high-altitude sun',
      rainProbability: 5,
      seasonFit: 'optimal',
      seasonNote: 'Clear skies and daytime warmth, but sharp temperature drop immediately after sunset.',
      provenance: {
        source: 'Vayanai Seasonal Norms (Offline Cache)',
        attribution: sourceRegister['open-meteo'].attributionText,
        lastChecked: new Date().toISOString(),
        isLive: false,
        isFallback: true
      }
    }
  },
  kerala: {
    name: 'Kerala (Kochi/Alleppey)',
    lat: 9.9312,
    lon: 76.2673,
    fallbackCondition: {
      destination: 'Kerala',
      temperatureRange: '24°C – 31°C',
      condition: 'Warm tropical breeze with gentle humidity',
      rainProbability: 25,
      seasonFit: 'optimal',
      seasonNote: 'Pleasant canal cruising weather with calm water conditions.',
      provenance: {
        source: 'Vayanai Seasonal Norms (Offline Cache)',
        attribution: sourceRegister['open-meteo'].attributionText,
        lastChecked: new Date().toISOString(),
        isLive: false,
        isFallback: true
      }
    }
  },
  rajasthan: {
    name: 'Rajasthan (Jaipur)',
    lat: 26.9124,
    lon: 75.7873,
    fallbackCondition: {
      destination: 'Rajasthan',
      temperatureRange: '19°C – 32°C',
      condition: 'Dry, sunny heritage skies',
      rainProbability: 5,
      seasonFit: 'optimal',
      seasonNote: 'Cooler mornings suitable for fort walks; warm midday sun.',
      provenance: {
        source: 'Vayanai Seasonal Norms (Offline Cache)',
        attribution: sourceRegister['open-meteo'].attributionText,
        lastChecked: new Date().toISOString(),
        isLive: false,
        isFallback: true
      }
    }
  }
};

// In-memory cache for live weather
const weatherCache = new Map<string, { data: WeatherCondition; expiresAt: number }>();
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

export async function getDestinationWeather(routeKey: string): Promise<WeatherCondition> {
  const destination = DESTINATION_COORDS[routeKey.toLowerCase()] || DESTINATION_COORDS.meghalaya;

  // 1. Check cache
  const cached = weatherCache.get(routeKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 2. Try fetching from Open-Meteo with 2.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${destination.lat}&longitude=${destination.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const daily = json.daily;
      if (daily && daily.temperature_2m_max?.length) {
        const maxTemp = Math.round(daily.temperature_2m_max[0]);
        const minTemp = Math.round(daily.temperature_2m_min[0]);
        const rainProb = daily.precipitation_probability_max[0] || 0;

        const liveData: WeatherCondition = {
          destination: destination.name,
          temperatureRange: `${minTemp}°C – ${maxTemp}°C`,
          condition: rainProb > 50 ? 'Rain showers likely' : 'Clear to partly cloudy',
          rainProbability: rainProb,
          seasonFit: rainProb > 70 ? 'monsoon_cautions' : 'optimal',
          seasonNote: destination.fallbackCondition.seasonNote,
          provenance: {
            source: 'Open-Meteo Live API',
            attribution: sourceRegister['open-meteo'].attributionText,
            lastChecked: new Date().toISOString(),
            isLive: true,
            isFallback: false
          }
        };

        weatherCache.set(routeKey, {
          data: liveData,
          expiresAt: Date.now() + CACHE_TTL_MS
        });
        return liveData;
      }
    }
  } catch {
    // Network offline or timeout: seamlessly return verified local fallback
  }

  return destination.fallbackCondition;
}
