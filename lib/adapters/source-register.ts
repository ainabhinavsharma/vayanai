export interface SourceEntry {
  sourceId: string;
  name: string;
  owner: string;
  termsUrl: string;
  lastCheckedDate: string;
  fieldsUsed: string[];
  quota: string;
  attributionRequired: boolean;
  attributionText: string;
  fallbackStrategy: string;
  commercialStatus: 'permitted_with_attribution' | 'internal_only' | 'partner_contract_needed';
}

export const sourceRegister: Record<string, SourceEntry> = {
  'open-meteo': {
    sourceId: 'open-meteo',
    name: 'Open-Meteo Weather Forecast API',
    owner: 'Open-Meteo GmbH',
    termsUrl: 'https://open-meteo.com/en/terms',
    lastCheckedDate: '2026-10-18',
    fieldsUsed: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'weathercode'],
    quota: '10,000 daily calls (free tier), non-commercial/commercial with attribution',
    attributionRequired: true,
    attributionText: 'Weather data provided by Open-Meteo under CC BY 4.0',
    fallbackStrategy: 'Deterministic regional seasonal climate profile cached in lib/adapters/weather.ts',
    commercialStatus: 'permitted_with_attribution'
  },
  'india-transit-heuristics': {
    sourceId: 'india-transit-heuristics',
    name: 'Vayanai India Pacing & Transit Model',
    owner: 'Vayanai Internal Engine',
    termsUrl: 'https://vayanai.com/terms/data-provenance',
    lastCheckedDate: '2026-10-18',
    fieldsUsed: ['roadTransferMinutes', 'monsoonBufferMinutes', 'altitudeAcclimatisationHours'],
    quota: 'Uncapped (local deterministic model)',
    attributionRequired: false,
    attributionText: 'Calculated using terrain and seasonality travel buffers',
    fallbackStrategy: 'Local static buffers per route',
    commercialStatus: 'internal_only'
  },
  'local-partners': {
    sourceId: 'local-partners',
    name: 'Vayanai Curated Local Partner Directory',
    owner: 'Vayanai Network Operations',
    termsUrl: 'https://vayanai.com/partners/terms',
    lastCheckedDate: '2026-10-18',
    fieldsUsed: ['category', 'specialty', 'experienceDescription'],
    quota: 'N/A (prototype conceptual categories)',
    attributionRequired: true,
    attributionText: 'Concept cards only · live partners require authorized onboarding and verification',
    fallbackStrategy: 'Display conceptual partner categories with explicit unverified status disclosure',
    commercialStatus: 'partner_contract_needed'
  }
};
