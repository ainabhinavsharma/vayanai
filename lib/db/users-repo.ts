import crypto from 'crypto';
import { getDb } from './sqlite';
import { User, UserWithCredentials, PortalRole } from '@/types/auth';
import { hashPassword } from '@/lib/auth/password';

export function getUserByEmail(email: string): UserWithCredentials | null {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalized) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as PortalRole,
    phone: row.phone ? String(row.phone) : undefined,
    organization: row.organization ? String(row.organization) : undefined,
    licenseNumber: row.license_number ? String(row.license_number) : undefined,
    verificationStatus: (row.verification_status as 'verified' | 'pending' | 'rejected') || 'pending',
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    passwordHash: String(row.password_hash),
    salt: String(row.salt),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT id, email, name, role, phone, organization, license_number, verification_status, avatar_url, created_at, updated_at FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role: row.role as PortalRole,
    phone: row.phone ? String(row.phone) : undefined,
    organization: row.organization ? String(row.organization) : undefined,
    licenseNumber: row.license_number ? String(row.license_number) : undefined,
    verificationStatus: (row.verification_status as 'verified' | 'pending' | 'rejected') || 'pending',
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function createUser(
  data: {
    email: string;
    password: string;
    name: string;
    role: PortalRole;
    phone?: string;
    organization?: string;
    licenseNumber?: string;
  }
): User {
  const db = getDb();
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = getUserByEmail(normalizedEmail);
  if (existing) {
    // If the user was imported from Google Sheet or guest certificate without a password, activate their account now!
    if (existing.passwordHash === 'N/A' || existing.passwordHash === 'intern_certificate_guest_account' || !existing.passwordHash) {
      const { hash, salt } = hashPassword(data.password);
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE users
        SET password_hash = ?, salt = ?, name = COALESCE(NULLIF(?, ''), name), phone = COALESCE(?, phone), updated_at = ?
        WHERE id = ?
      `).run(hash, salt, data.name.trim(), data.phone || null, now, existing.id);

      return getUserById(existing.id)!;
    }
    throw new Error('User with this email already exists. Please sign in instead.');
  }

  const { hash, salt } = hashPassword(data.password);
  const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const verificationStatus = data.role === 'admin' || data.role === 'staff' ? 'verified' : 'pending';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, role, phone, organization, license_number, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    normalizedEmail,
    hash,
    salt,
    data.name.trim(),
    data.role,
    data.phone || null,
    data.organization || null,
    data.licenseNumber || null,
    verificationStatus,
    now,
    now
  );

  // If user signed up as intern, automatically create their application record!
  if (data.role === 'intern') {
    const magicToken = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const inviteScheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO intern_applications (id, user_id, user_name, user_email, track_name, status, magic_token, invite_scheduled_at, applied_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `app-${Date.now()}`,
      id,
      data.name.trim(),
      normalizedEmail,
      'Sustainable Regional Operations & Growth Intern',
      'applied',
      magicToken,
      inviteScheduledAt,
      now,
      now
    );
  }

  return {
    id,
    email: normalizedEmail,
    name: data.name.trim(),
    role: data.role,
    phone: data.phone,
    organization: data.organization,
    licenseNumber: data.licenseNumber,
    verificationStatus,
    createdAt: now,
    updatedAt: now
  };
}

export function listUsersByRole(role?: PortalRole): User[] {
  const db = getDb();
  let query = 'SELECT id, email, name, role, phone, organization, license_number, verification_status, avatar_url, created_at, updated_at FROM users';
  const params: (string | number | null)[] = [];

  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    name: String(r.name),
    role: r.role as PortalRole,
    phone: r.phone ? String(r.phone) : undefined,
    organization: r.organization ? String(r.organization) : undefined,
    licenseNumber: r.license_number ? String(r.license_number) : undefined,
    verificationStatus: (r.verification_status as 'verified' | 'pending' | 'rejected') || 'pending',
    avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at)
  }));
}

export const getAllUsers = (): User[] => listUsersByRole();

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export function createPasswordResetToken(email: string): { token: string; expiresAt: string; user: UserWithCredentials } {
  const db = getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const user = getUserByEmail(normalizedEmail);

  if (!user) {
    throw new Error('No account found with this email.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 minutes
  const now = new Date().toISOString();
  const id = `prt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Expire any existing unused tokens for this email
  db.prepare(`
    UPDATE password_reset_tokens
    SET used_at = ?
    WHERE LOWER(email) = ? AND used_at IS NULL
  `).run(now, normalizedEmail);

  // Insert new token
  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, email, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, user.id, normalizedEmail, token, expiresAt, now);

  return { token, expiresAt, user };
}

export function verifyPasswordResetToken(token: string): {
  valid: boolean;
  tokenRecord?: PasswordResetTokenRecord;
  error?: string;
} {
  const db = getDb();
  const cleanToken = (token || '').trim();

  if (!cleanToken) {
    return { valid: false, error: 'Password reset token is required.' };
  }

  const row = db.prepare(`
    SELECT id, user_id, email, token, expires_at, used_at, created_at
    FROM password_reset_tokens
    WHERE token = ?
    LIMIT 1
  `).get(cleanToken) as Record<string, unknown> | undefined;

  if (!row) {
    return { valid: false, error: 'Invalid or non-existent password reset link.' };
  }

  if (row.used_at) {
    return { valid: false, error: 'This password reset link has already been used.' };
  }

  const expiresTime = new Date(String(row.expires_at)).getTime();
  if (expiresTime < Date.now()) {
    return { valid: false, error: 'This password reset link has expired (valid for 60 minutes).' };
  }

  return {
    valid: true,
    tokenRecord: {
      id: String(row.id),
      userId: String(row.user_id),
      email: String(row.email),
      token: String(row.token),
      expiresAt: String(row.expires_at),
      usedAt: row.used_at ? String(row.used_at) : null,
      createdAt: String(row.created_at)
    }
  };
}

export function resetPasswordWithToken(token: string, newPassword: string): { success: boolean; error?: string } {
  const verification = verifyPasswordResetToken(token);
  if (!verification.valid || !verification.tokenRecord) {
    return { success: false, error: verification.error || 'Invalid reset token.' };
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' };
  }

  const db = getDb();
  const { hash, salt } = hashPassword(newPassword);
  const now = new Date().toISOString();
  const userId = verification.tokenRecord.userId;

  // 1. Update user password
  db.prepare(`
    UPDATE users
    SET password_hash = ?, salt = ?, updated_at = ?
    WHERE id = ?
  `).run(hash, salt, now, userId);

  // 2. Mark token used
  db.prepare(`
    UPDATE password_reset_tokens
    SET used_at = ?
    WHERE id = ?
  `).run(now, verification.tokenRecord.id);

  // 3. Invalidate any active sessions for security
  db.prepare(`
    DELETE FROM sessions
    WHERE user_id = ?
  `).run(userId);

  return { success: true };
}

export function updateUserProfile(
  userId: string,
  updates: { name?: string; phone?: string; avatarUrl?: string }
): User {
  const db = getDb();
  const existing = getUserById(userId);
  if (!existing) throw new Error('User not found');

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET name = COALESCE(NULLIF(?, ''), name),
        phone = COALESCE(?, phone),
        avatar_url = COALESCE(?, avatar_url),
        updated_at = ?
    WHERE id = ?
  `).run(
    updates.name !== undefined ? updates.name.trim() : null,
    updates.phone !== undefined ? updates.phone.trim() : null,
    updates.avatarUrl !== undefined ? updates.avatarUrl.trim() : null,
    now,
    userId
  );

  return getUserById(userId)!;
}

