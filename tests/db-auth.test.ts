import { describe, it, expect, beforeEach } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { getUserByEmail, createUser, getAllUsers } from '@/lib/db/users-repo';
import { createSession, getSessionUser, revokeSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/sqlite';

describe('SQLite Database & User Authentication Engine', () => {
  beforeEach(() => {
    // Ensure database is initialized
    getDb();
  });

  describe('Password Security (scryptSync + timingSafeEqual)', () => {
    it('generates a unique salt and valid scrypt hash', () => {
      const password = 'TestSecretPassword123!';
      const creds1 = hashPassword(password);
      const creds2 = hashPassword(password);

      expect(creds1.hash).toBeDefined();
      expect(creds1.salt).toBeDefined();
      // Different salts should yield different hashes
      expect(creds1.salt).not.toBe(creds2.salt);
      expect(creds1.hash).not.toBe(creds2.hash);
    });

    it('successfully verifies a valid password', () => {
      const password = 'SecurePassword789$';
      const { hash, salt } = hashPassword(password);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('rejects an incorrect password', () => {
      const password = 'CorrectPassword';
      const { hash, salt } = hashPassword(password);
      expect(verifyPassword('WrongPassword', hash, salt)).toBe(false);
    });
  });

  describe('User Repository & Pre-seeded Roles', () => {
    it('contains all 5 seeded role accounts', () => {
      const users = getAllUsers();
      expect(users.length).toBeGreaterThanOrEqual(5);

      const roles = users.map((u) => u.role);
      expect(roles).toContain('traveler');
      expect(roles).toContain('partner');
      expect(roles).toContain('admin');
      expect(roles).toContain('staff');
      expect(roles).toContain('intern');
    });

    it('retrieves pre-seeded accounts by email with verified credentials', () => {
      const demoUsersToCheck = [
        { email: 'aarav@example.com', pass: 'Traveler123!', role: 'traveler', name: 'Aarav Sharma' },
        { email: 'priya.traveler@example.com', pass: 'Traveler123!', role: 'traveler', name: 'Priya Iyer' },
        { email: 'sohra@example.com', pass: 'Partner123!', role: 'partner', name: 'Banteilang Marbaniang' },
        { email: 'munro@example.com', pass: 'Partner123!', role: 'partner', name: 'Sunil Kumar' },
        { email: 'admin@vayanai.in', pass: 'AdminSecure123!', role: 'admin', name: 'Integrity Operations Lead' },
        { email: 'auditor@vayanai.in', pass: 'AdminSecure123!', role: 'admin', name: 'Devika Rao' },
        { email: 'rohit.bda@vayanai.in', pass: 'StaffPass123!', role: 'staff', name: 'Rohit Sen' },
        { email: 'kavita.bda@vayanai.in', pass: 'StaffPass123!', role: 'staff', name: 'Kavita Nair' }
      ];

      for (const expected of demoUsersToCheck) {
        const u = getUserByEmail(expected.email);
        expect(u, `User ${expected.email} should exist`).not.toBeNull();
        expect(u?.role).toBe(expected.role);
        expect(u?.name).toContain(expected.name);
        expect(u?.passwordHash).toBeDefined();
        expect(u?.salt).toBeDefined();
        expect(verifyPassword(expected.pass, u!.passwordHash, u!.salt), `Password for ${expected.email} must verify`).toBe(true);
      }
    });

    it('creates a new user and denies duplicate email registration', () => {
      const uniqueEmail = `traveler.${Date.now()}@example.com`;
      const created = createUser({
        name: 'Mira Rajput',
        email: uniqueEmail,
        password: 'TestPassword123!',
        role: 'traveler'
      });

      expect(created.id).toBeDefined();
      expect(created.email).toBe(uniqueEmail);
      expect(created.role).toBe('traveler');

      // Duplicate email attempt must throw
      expect(() => {
        createUser({
          name: 'Mira Duplicate',
          email: uniqueEmail,
          password: 'AnotherPass!',
          role: 'traveler'
        });
      }).toThrow();
    });
  });

  describe('Session Lifecycle Management', () => {
    it('creates, resolves, and revokes an active session', () => {
      const user = getUserByEmail('aarav@example.com');
      expect(user).not.toBeNull();

      const session = createSession(user!.id);
      expect(session.token).toBeDefined();
      expect(session.userId).toBe(user!.id);
      expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());

      // Resolve user from token
      const resolvedUser = getSessionUser(session.token);
      expect(resolvedUser).not.toBeNull();
      expect(resolvedUser?.id).toBe(user!.id);
      expect(resolvedUser?.email).toBe(user!.email);

      // Revoke session
      revokeSession(session.token);
      const afterRevoke = getSessionUser(session.token);
      expect(afterRevoke).toBeNull();
    });

    it('returns null for an invalid or non-existent token', () => {
      expect(getSessionUser('non-existent-fake-token-xyz')).toBeNull();
    });
  });
});
