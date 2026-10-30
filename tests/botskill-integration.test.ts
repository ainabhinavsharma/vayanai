import { describe, it, expect, vi } from 'vitest';
import { botskillClient } from '@/lib/adapters/botskill-client';
import { POST as planRoute } from '@/server-api/v1/plan/route';
import { POST as chatRoute } from '@/server-api/v1/chat/route';
import { POST as inquireRoute } from '@/server-api/v1/partners/inquire/route';
import { GET as healthRoute } from '@/server-api/v1/health/route';
import { GET as getAccountsRoute, POST as postAccountsRoute } from '@/server-api/v1/portal/admin/botskill/accounts/route';
import { POST as postDiscoverRoute } from '@/server-api/v1/portal/admin/botskill/accounts/discover/route';
import { GET as getPoliciesRoute, POST as postPoliciesRoute } from '@/server-api/v1/portal/admin/botskill/policies/route';
import { NextRequest } from 'next/server';

describe('BOTSKILL Client Adapter & Next.js Endpoints Integration', () => {
  it('falls back to local deterministic planning when sidecar is offline', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));
    try {
      const brief = {
        prompt: 'A gentle 5-day holiday in green hills for my family',
        origin: 'Mumbai',
        when: 'October',
        party: 'Family with elders',
        duration: '5 days',
        budget: 'Moderate',
        interests: ['Nature', 'Quiet'],
        accessibility: ['step-free'],
        routeKey: 'meghalaya'
      };

      const result = await botskillClient.planTrip(brief);
      expect(result.status).toBe('matched');
      expect(result.selectedRouteKey).toBe('meghalaya');
      expect(result.trip.id).toBe('meghalaya');
      expect(result.rankedCandidates.length).toBeGreaterThan(0);
      expect(result.sourceProvenance.engine).toContain('Fallback');
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('falls back to local deterministic chat when sidecar is offline', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));
    try {
      const chatResult = await botskillClient.chatVayu('Can we have gentle road transfers?', 'meghalaya');
      expect(chatResult.answer).toContain('gentler version');
      expect(chatResult.suggestedAction).toBe('verify_transfers');
      expect(chatResult.disclaimer).toContain('Live road conditions');
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('handles server-api/v1/plan endpoint with validation and successful plan response', async () => {
    const req = new NextRequest('http://localhost:3000/server-api/v1/plan', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Quiet backwaters and food walks in Kochi',
        origin: 'Bengaluru',
        when: 'November',
        party: 'Couple',
        duration: '5 days',
        budget: 'Comfortable',
        interests: ['Food', 'Quiet'],
        accessibility: [],
        routeKey: 'kerala'
      })
    });

    const res = await planRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.selectedRouteKey).toBe('kerala');
  });

  it('rejects invalid plan brief with 422 error', async () => {
    const req = new NextRequest('http://localhost:3000/server-api/v1/plan', {
      method: 'POST',
      body: JSON.stringify({
        // missing required fields
        interests: 'invalid-should-be-array'
      })
    });

    const res = await planRoute(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_FAILED');
  });

  it('handles server-api/v1/chat endpoint', async () => {
    const req = new NextRequest('http://localhost:3000/server-api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What about high altitude sickness in Ladakh?',
        routeKey: 'ladakh'
      })
    });

    const res = await chatRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.suggestedAction).toBe('altitude_rest');
  });

  it('handles server-api/v1/partners/inquire endpoint input validation', async () => {
    const invalidReq = new NextRequest('http://localhost:3000/server-api/v1/partners/inquire', {
      method: 'POST',
      body: JSON.stringify({
        travelerName: 'Aarav'
        // missing email and partnerId
      })
    });

    const res = await inquireRoute(invalidReq);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('serves server-api/v1/health with botskillEngine status', async () => {
    const res = await healthRoute();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.botskillEngine).toBeDefined();
    expect(json.data.supportedRoutes).toContain('meghalaya');
  });

  it('serves accounts route with domain filtering fallback', async () => {
    const req = new NextRequest('http://localhost:3000/server-api/v1/portal/admin/botskill/accounts', {
      method: 'GET'
    });
    const res = await getAccountsRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.monitored_domain).toBe('vayanai.in.net');
    expect(json.data.accounts.length).toBeGreaterThan(0);
  });

  it('rejects invalid email address in accounts POST route', async () => {
    const req = new NextRequest('http://localhost:3000/server-api/v1/portal/admin/botskill/accounts', {
      method: 'POST',
      body: JSON.stringify({ email: '' })
    });
    const res = await postAccountsRoute(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_EMAIL');
  });

  it('strictly rejects non-vayanai.in.net email addresses with INVALID_DOMAIN', async () => {
    const req = new NextRequest('http://localhost:3000/server-api/v1/portal/admin/botskill/accounts', {
      method: 'POST',
      body: JSON.stringify({ email: 'unauthorized@gmail.com' })
    });
    const res = await postAccountsRoute(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_DOMAIN');
  });

  it('serves policies route and rejects empty policy fields in POST', async () => {
    const getReq = new NextRequest('http://localhost:3000/server-api/v1/portal/admin/botskill/policies', {
      method: 'GET'
    });
    const getRes = await getPoliciesRoute(getReq);
    expect(getRes.status).toBe(200);

    const postReq = new NextRequest('http://localhost:3000/server-api/v1/portal/admin/botskill/policies', {
      method: 'POST',
      body: JSON.stringify({ title: '' })
    });
    const postRes = await postPoliciesRoute(postReq);
    expect(postRes.status).toBe(400);
    const postJson = await postRes.json();
    expect(postJson.success).toBe(false);
    expect(postJson.error.code).toBe('INVALID_RULE_DATA');
  });

  it('serves accounts/discover route and returns auto-pick status', async () => {
    const req = new NextRequest('http://localhost:3000/server-api/v1/portal/admin/botskill/accounts/discover', {
      method: 'POST'
    });
    const res = await postDiscoverRoute(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.newly_picked).toBeDefined();
  });
});
