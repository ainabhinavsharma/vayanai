import { describe, it, expect } from 'vitest';
import { orchestrateVayuPlan } from '@/lib/vayu/planner';
import { handleVayuChat } from '@/lib/vayu/chat';
import { TripBrief } from '@/types';

describe('Vayu Planning Orchestrator', () => {
  it('generates a ranked plan matching a nature brief', async () => {
    const brief: TripBrief = {
      prompt: 'A gentle nature escape from Mumbai in October',
      origin: 'Mumbai',
      when: 'October 2026',
      party: 'Two of us',
      duration: 'About 5 days',
      budget: '₹45–75k',
      interests: ['Nature', 'Quiet'],
      accessibility: [],
      routeKey: 'meghalaya'
    };

    const result = await orchestrateVayuPlan(brief);
    expect(result.status).toBe('matched');
    expect(result.selectedRouteKey).toBe('meghalaya');
    expect(result.trip.name).toBe('Meghalaya');
    expect(result.rankedCandidates.length).toBeGreaterThan(0);
    expect(result.rankedCandidates[0].matchScore).toBeGreaterThanOrEqual(80);
  });

  it('detects ambiguous short input and returns a clarifying question', async () => {
    const ambiguousBrief: TripBrief = {
      prompt: 'holiday',
      origin: 'Delhi',
      when: 'Flexible for now',
      party: 'Just me',
      duration: 'About 5 days',
      budget: 'Keep it flexible',
      interests: [],
      accessibility: [],
      routeKey: 'meghalaya'
    };

    const result = await orchestrateVayuPlan(ambiguousBrief);
    expect(result.status).toBe('needs_clarification');
    expect(result.clarifyingQuestion).toBeDefined();
    expect(result.clarifyingQuestion).toContain('kind of scenery');
  });

  it('attaches high-altitude caution for Ladakh trips with elders', async () => {
    const ladakhElderBrief: TripBrief = {
      prompt: 'Trip to Leh for family',
      origin: 'Delhi',
      when: 'June 2027',
      party: 'Family with elders',
      duration: 'About 5 days',
      budget: '₹75k–1.2L',
      interests: ['Nature'],
      accessibility: [],
      routeKey: 'ladakh'
    };

    const result = await orchestrateVayuPlan(ladakhElderBrief);
    expect(result.warnings.some((w) => w.toLowerCase().includes('altitude'))).toBe(true);
  });
});

describe('Vayu Conversational Assistant', () => {
  it('handles road transfer reduction queries', () => {
    const res = handleVayuChat('Can we keep road journeys shorter?', 'meghalaya');
    expect(res.suggestedAction).toBe('verify_transfers');
    expect(res.answer).toContain('road');
    expect(res.disclaimer).toContain('Planning suggestion');
  });

  it('handles food-led inquiries', () => {
    const res = handleVayuChat('Add more local food and restaurants', 'kerala');
    expect(res.suggestedAction).toBe('add_food_day');
    expect(res.answer).toContain('food');
  });

  it('handles altitude and health questions', () => {
    const res = handleVayuChat('How to acclimatise safely in Leh?', 'ladakh');
    expect(res.suggestedAction).toBe('altitude_rest');
    expect(res.answer).toContain('resting');
  });
});
