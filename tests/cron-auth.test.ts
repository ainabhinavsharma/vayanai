import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as dispatchRoute } from '@/app/api/v1/portal/admin/interns/dispatch/route';
import { POST as syncRoute } from '@/app/api/v1/portal/admin/interns/sync/route';

describe('Cron Endpoints Authentication & Security Guard', () => {
  const originalEnv = process.env.CRON_SECRET;
  const testSecret = 'test-super-secret-cron-token-12345';

  beforeEach(() => {
    process.env.CRON_SECRET = testSecret;
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  describe('/api/v1/portal/admin/interns/dispatch', () => {
    it('rejects unauthenticated requests with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/portal/admin/interns/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_due' })
      });

      const res = await dispatchRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with an incorrect X-Cron-Secret header with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/portal/admin/interns/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Secret': 'wrong-token'
        },
        body: JSON.stringify({ action: 'dispatch_due' })
      });

      const res = await dispatchRoute(req);
      expect(res.status).toBe(401);
    });

    it('allows requests with a valid X-Cron-Secret header', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/portal/admin/interns/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Secret': testSecret
        },
        body: JSON.stringify({ action: 'dispatch_due' })
      });

      const res = await dispatchRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data?.dispatchedCount).toBeDefined();
    });
  });

  describe('/api/v1/portal/admin/interns/sync', () => {
    it('rejects unauthenticated requests with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/portal/admin/interns/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const res = await syncRoute(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with an incorrect X-Cron-Secret header with HTTP 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/portal/admin/interns/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Cron-Secret': 'wrong-token'
        },
        body: JSON.stringify({})
      });

      const res = await syncRoute(req);
      expect(res.status).toBe(401);
    });
  });
});
