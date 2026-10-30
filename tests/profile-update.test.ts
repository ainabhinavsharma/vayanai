import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/v1/auth/me/route';
import { createUser, getUserById } from '@/lib/db/users-repo';
import { createSession } from '@/lib/auth/session';
import { emailDispatcher } from '@/lib/services/email-dispatcher';

describe('User Profile Update & Email Notification (/api/v1/auth/me)', () => {
  let testUser: ReturnType<typeof createUser>;
  let sessionToken: string;

  beforeEach(() => {
    vi.restoreAllMocks();

    const uniqueEmail = `test.profile.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`;
    testUser = createUser({
      email: uniqueEmail,
      password: 'Password123!',
      name: 'Original Profile Name',
      role: 'intern',
      phone: '9876543210'
    });

    const session = createSession(testUser.id);
    sessionToken = session.token;
  });

  it('rejects unauthenticated PATCH requests with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' })
    });

    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('updates profile and dispatches profile_update email notification', async () => {
    const sendMailSpy = vi.spyOn(emailDispatcher, 'sendCandidateEmail').mockResolvedValue({
      success: true,
      mode: 'simulated_local',
      messageId: 'mock-prof-msg-id'
    });

    const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        cookie: `vayanai_session=${sessionToken}`
      },
      body: JSON.stringify({
        name: 'Updated Profile Name',
        phone: '9123456780'
      })
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.user.name).toBe('Updated Profile Name');
    expect(json.data.user.phone).toBe('9123456780');

    // Verify DB updated
    const freshUser = getUserById(testUser.id);
    expect(freshUser?.name).toBe('Updated Profile Name');
    expect(freshUser?.phone).toBe('9123456780');

    // Verify profile_update email was dispatched
    expect(sendMailSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendMailSpy.mock.calls[0][0];
    expect(callArgs.to).toBe(testUser.email);
    expect(callArgs.emailType).toBe('profile_update');
    expect(callArgs.subject).toContain('Profile Updated');
    expect(callArgs.html).toContain('Updated Profile Name');
    expect(callArgs.html).not.toContain('undefined');
  });
});
