import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createUser } from '@/lib/db/users-repo';
import { createSession } from '@/lib/auth/session';
import { attachAuthCookie } from '@/lib/auth/cookie';
import { getDb } from '@/lib/db/sqlite';
import { PortalRole } from '@/types/portal';
import { dispatchApplicationReceivedEmail } from '@/lib/services/email-dispatcher';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      name,
      role = 'traveler',
      phone,
      organization,
      licenseNumber,
      college,
      collegeName,
      track,
      trackName
    } = body;

    if (!email || !password || !name) {
      return apiError('Email, password, and name are required', 'MISSING_FIELDS', 400);
    }

    if (password.length < 8) {
      return apiError('Password must be at least 8 characters long', 'WEAK_PASSWORD', 400);
    }

    const validRoles: PortalRole[] = ['traveler', 'partner', 'admin', 'staff', 'intern'];
    if (!validRoles.includes(role)) {
      return apiError('Invalid user role specified', 'INVALID_ROLE', 400);
    }

    const user = createUser({
      email,
      password,
      name,
      role,
      phone,
      organization,
      licenseNumber
    });

    let magicToken = '';
    let applicationId = '';

    if (role === 'intern') {
      const db = getDb();
      const cleanEmail = email.toLowerCase().trim();
      const existingApp = db.prepare('SELECT * FROM intern_applications WHERE LOWER(user_email) = ?').get(cleanEmail) as Record<string, unknown> | undefined;

      const now = new Date().toISOString();
      const inviteScheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const resolvedTrack = trackName || track || (existingApp?.track_name as string) || 'Data Analyst';
      const resolvedCollege = collegeName || college || (existingApp?.college_name as string) || 'Verified University';

      if (existingApp) {
        applicationId = String(existingApp.id);
        const existingToken = existingApp.magic_token ? String(existingApp.magic_token).trim() : '';
        magicToken = existingToken && existingToken !== 'undefined' ? existingToken : (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

        db.prepare(`
          UPDATE intern_applications 
          SET user_id = ?, 
              phone = COALESCE(?, phone), 
              magic_token = ?,
              track_name = COALESCE(NULLIF(?, ''), track_name),
              college_name = COALESCE(NULLIF(?, ''), college_name),
              invite_scheduled_at = COALESCE(invite_scheduled_at, ?),
              updated_at = ? 
          WHERE id = ?
        `).run(user.id, phone || null, magicToken, resolvedTrack, resolvedCollege, inviteScheduledAt, now, applicationId);
      } else {
        magicToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        applicationId = `app-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

        db.prepare(`
          INSERT INTO intern_applications (
            id, user_id, user_name, user_email, phone, college_name,
            track_name, status, magic_token, invite_scheduled_at, applied_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'applied', ?, ?, ?, ?)
        `).run(
          applicationId,
          user.id,
          name,
          cleanEmail,
          phone || null,
          resolvedCollege,
          resolvedTrack,
          magicToken,
          inviteScheduledAt,
          now,
          now
        );
      }

      // Bug 3: Trigger application received acknowledgement email
      try {
        await dispatchApplicationReceivedEmail(applicationId);
      } catch (mailErr: any) {
        console.warn('[Signup Mail Warning] Could not dispatch welcome email:', mailErr?.message);
      }
    }

    // Create session
    const session = createSession(user.id);

    const res = apiSuccess({
      user,
      magicToken,
      applicationId,
      message: 'Account created successfully'
    }, 201);

    attachAuthCookie(res, session.token);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return apiError(message, 'SIGNUP_ERROR', 400);
  }
}
