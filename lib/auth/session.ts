import crypto from 'crypto';
import { getDb } from '@/lib/db/sqlite';
import { getUserById } from '@/lib/db/users-repo';
import { Session, User } from '@/types/auth';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSession(userId: string): Session {
  const db = getDb();
  const id = `sess-${Date.now()}`;
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  const createdAt = now.toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, token, expiresAt, createdAt);

  return {
    id,
    userId,
    token,
    expiresAt,
    createdAt
  };
}

export function getSessionUser(token: string): User | null {
  if (!token) return null;

  const db = getDb();
  const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as { user_id: string; expires_at: string } | undefined;

  if (!row) return null;

  // Check expiration
  if (new Date(row.expires_at) < new Date()) {
    destroySession(token);
    return null;
  }

  return getUserById(row.user_id);
}

export function destroySession(token: string): boolean {
  if (!token) return false;
  const db = getDb();
  const res = db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  return res.changes > 0;
}

export const revokeSession = destroySession;
