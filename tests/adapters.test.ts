import { describe, it, expect } from 'vitest';
import { sourceRegister } from '@/lib/adapters/source-register';
import { getDestinationWeather } from '@/lib/adapters/weather';
import { getTransitEstimate } from '@/lib/adapters/transit';

describe('Source Register & Terms Audit', () => {
  it('registers Open-Meteo with required attribution and quota documentation', () => {
    const entry = sourceRegister['open-meteo'];
    expect(entry).toBeDefined();
    expect(entry.attributionRequired).toBe(true);
    expect(entry.attributionText).toContain('Open-Meteo');
    expect(entry.termsUrl).toContain('open-meteo.com');
  });

  it('documents local partner directory as requiring authorized onboarding', () => {
    const entry = sourceRegister['local-partners'];
    expect(entry).toBeDefined();
    expect(entry.commercialStatus).toBe('partner_contract_needed');
  });
});

describe('Weather Adapter Resilience', () => {
  it('returns valid weather data with provenance for Meghalaya', async () => {
    const weather = await getDestinationWeather('meghalaya');
    expect(weather).toBeDefined();
    expect(weather.temperatureRange).toContain('°C');
    expect(weather.provenance).toBeDefined();
    expect(weather.provenance.attribution).toContain('Open-Meteo');
  });

  it('returns high altitude cautions for Ladakh', async () => {
    const weather = await getDestinationWeather('ladakh');
    expect(weather.destination).toContain('Ladakh');
    expect(weather.provenance.source).toBeDefined();
  });
});

describe('Transit & Pacing Heuristics', () => {
  it('calculates mountain buffer for Guwahati to Shillong', () => {
    const estimate = getTransitEstimate('guwahati-shillong');
    expect(estimate).not.toBeNull();
    expect(estimate!.terrainType).toBe('winding_hills');
    expect(estimate!.estimatedMinutes).toBeGreaterThanOrEqual(180);
    expect(estimate!.recommendedBufferMinutes).toBe(60);
  });

  it('provides high altitude transfer advice for Leh airport', () => {
    const estimate = getTransitEstimate('leh-airport-hotel');
    expect(estimate).not.toBeNull();
    expect(estimate!.terrainType).toBe('high_altitude_pass');
    expect(estimate!.pacingAdvice).toContain('acclimatisation');
  });
});
