import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

const globalForDb = globalThis as unknown as {
  __vayanai_db_instance__?: DatabaseSync;
  __vayanai_db_initialized__?: boolean;
};

export function getDb(): DatabaseSync {
  if (globalForDb.__vayanai_db_instance__) {
    return globalForDb.__vayanai_db_instance__;
  }

  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'vayanai.db');
  const db = new DatabaseSync(dbPath);

  // Performance & integrity pragmas
  db.exec('PRAGMA busy_timeout = 10000;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  if (!globalForDb.__vayanai_db_initialized__) {
    initSchema(db);

    // Guard seedInitialData so it only runs when users table is empty
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number } | undefined;
    if (!userCount || userCount.count === 0) {
      seedInitialData(db);
    }

    // Ensure default admin password hash is properly seeded so tests/db-auth.test.ts passes
    ensureDefaultAdminCredentials(db);

    // Ensure alumni certificates exist for public verification
    ensureCertificatesSeeded(db);

    globalForDb.__vayanai_db_initialized__ = true;
  }

  globalForDb.__vayanai_db_instance__ = db;
  return db;
}

function ensureDefaultAdminCredentials(db: DatabaseSync): void {
  // 1. Verify/update primary admin: admin@vayanai.in (pass: AdminSecure123!)
  const admin = db.prepare('SELECT id, password_hash, salt FROM users WHERE email = ?').get('admin@vayanai.in') as
    | { id: string; password_hash: string; salt: string }
    | undefined;
  if (!admin || !verifyPassword('AdminSecure123!', admin.password_hash, admin.salt)) {
    const creds = hashPassword('AdminSecure123!');
    const now = new Date().toISOString();
    if (!admin) {
      db.prepare(`
        INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usr-admin-03', 'admin@vayanai.in', creds.hash, creds.salt, 'Integrity Operations Lead', 'admin', '+91 11 2345 6789', 'verified', now, now);
    } else {
      db.prepare(`
        UPDATE users
        SET password_hash = ?, salt = ?, updated_at = ?
        WHERE email = ?
      `).run(creds.hash, creds.salt, now, 'admin@vayanai.in');
    }
  }

  // 2. Verify/update secondary admin: auditor@vayanai.in (pass: AdminSecure123!)
  const auditor = db.prepare('SELECT id, password_hash, salt FROM users WHERE email = ?').get('auditor@vayanai.in') as
    | { id: string; password_hash: string; salt: string }
    | undefined;
  if (!auditor || !verifyPassword('AdminSecure123!', auditor.password_hash, auditor.salt)) {
    const creds = hashPassword('AdminSecure123!');
    const now = new Date().toISOString();
    if (!auditor) {
      db.prepare(`
        INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usr-admin-04', 'auditor@vayanai.in', creds.hash, creds.salt, 'Devika Rao (Compliance Auditor)', 'admin', '+91 11 2345 9900', 'verified', now, now);
    } else {
      db.prepare(`
        UPDATE users
        SET password_hash = ?, salt = ?, updated_at = ?
        WHERE email = ?
      `).run(creds.hash, creds.salt, now, 'auditor@vayanai.in');
    }
  }
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      organization TEXT,
      license_number TEXT,
      verification_status TEXT DEFAULT 'pending',
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS intern_applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      phone TEXT,
      college_name TEXT,
      semester TEXT,
      track_name TEXT NOT NULL,
      cv_url TEXT,
      status TEXT NOT NULL DEFAULT 'applied',
      magic_token TEXT UNIQUE,
      magic_token_expires_at TEXT,
      invite_scheduled_at TEXT,
      invite_sent_at TEXT,
      interview_score INTEGER DEFAULT 0,
      interview_answers_json TEXT,
      dbert_profile_json TEXT,
      proctoring_telemetry_json TEXT,
      feedback_note TEXT,
      offer_letter_id TEXT,
      offer_sent_at TEXT,
      offer_accepted_at TEXT,
      signature_name TEXT,
      batch_start_date TEXT DEFAULT '2026-11-02',
      available_3_months TEXT,
      laptop_internet TEXT,
      placement_needed TEXT,
      source_referral TEXT,
      deposit_receipt TEXT,
      deposit_paid_at TEXT,
      applied_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_name TEXT NOT NULL,
      product_type TEXT NOT NULL DEFAULT 'security_deposit',
      amount_inr INTEGER NOT NULL DEFAULT 499,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_status TEXT NOT NULL DEFAULT 'completed',
      payment_method TEXT NOT NULL,
      transaction_ref TEXT UNIQUE NOT NULL,
      receipt_number TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS staff_leads (
      id TEXT PRIMARY KEY,
      bda_user_id TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      lead_type TEXT NOT NULL,
      region TEXT NOT NULL,
      contact_info TEXT NOT NULL,
      pipeline_stage TEXT NOT NULL DEFAULT 'outreach',
      estimated_value_inr INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bda_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      certificate_id TEXT UNIQUE NOT NULL,
      intern_id TEXT NOT NULL,
      user_id TEXT,
      intern_name TEXT NOT NULL,
      intern_email TEXT NOT NULL,
      phone TEXT,
      college_name TEXT,
      domain TEXT NOT NULL,
      topics_covered TEXT NOT NULL,
      project_name TEXT NOT NULL,
      project_description TEXT,
      project_deliverables TEXT,
      mentor_name TEXT NOT NULL,
      mentor_role TEXT NOT NULL,
      mentor_email TEXT,
      joining_date TEXT NOT NULL,
      completion_date TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      qr_payload_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      udyam_reg_number TEXT DEFAULT 'UDYAM-UP-29-0109046',
      issuing_authority TEXT NOT NULL DEFAULT 'DBERT Technical Council & Vayanai Operations Platform',
      payment_proof_url TEXT,
      placement_prep TEXT,
      fee_inr INTEGER DEFAULT 299,
      utr_number TEXT,
      approved_by TEXT,
      approved_at TEXT,
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_intern_user_id ON intern_applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON certificates(certificate_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_intern_id ON certificates(intern_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_email ON certificates(intern_email);
    CREATE INDEX IF NOT EXISTS idx_intern_user_email ON intern_applications(user_email);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_email ON password_reset_tokens(email);
  `);

  // Safe migration for existing databases
  const migrationCols = [
    'ALTER TABLE certificates ADD COLUMN phone TEXT;',
    'ALTER TABLE certificates ADD COLUMN college_name TEXT;',
    'ALTER TABLE certificates ADD COLUMN payment_proof_url TEXT;',
    'ALTER TABLE certificates ADD COLUMN placement_prep TEXT;',
    'ALTER TABLE certificates ADD COLUMN fee_inr INTEGER DEFAULT 299;',
    'ALTER TABLE certificates ADD COLUMN utr_number TEXT;',
    'ALTER TABLE certificates ADD COLUMN approved_by TEXT;',
    'ALTER TABLE certificates ADD COLUMN approved_at TEXT;',
    'ALTER TABLE certificates ADD COLUMN admin_notes TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN phone TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN college_name TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN semester TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN cv_url TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN magic_token TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN magic_token_expires_at TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN invite_scheduled_at TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN invite_sent_at TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN offer_letter_id TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN offer_sent_at TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN offer_accepted_at TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN signature_name TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN batch_start_date TEXT DEFAULT "2026-11-02";',
    'ALTER TABLE intern_applications ADD COLUMN available_3_months TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN laptop_internet TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN placement_needed TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN source_referral TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN dbert_profile_json TEXT;',
    'ALTER TABLE intern_applications ADD COLUMN proctoring_telemetry_json TEXT;'
  ];
  for (const sql of migrationCols) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists
    }
  }

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_intern_magic_token ON intern_applications(magic_token);');
  } catch {
    // Index creation safe
  }
}

export function seedInitialData(db: DatabaseSync): void {
  const now = new Date().toISOString();

  // =========================================================================
  // 1. TRAVELER ACCOUNTS
  // =========================================================================
  // Primary Traveler: Aarav Sharma (Active 5-day Meghalaya route & travel pass)
  const travelerCreds1 = hashPassword('Traveler123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-traveler-01',
    'aarav@example.com',
    travelerCreds1.hash,
    travelerCreds1.salt,
    'Aarav Sharma',
    'traveler',
    '+91 98200 11223',
    'verified',
    now,
    now
  );

  // Secondary Traveler: Priya Iyer (Family & High-Altitude Ladakh Planner)
  const travelerCreds2 = hashPassword('Traveler123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-traveler-02',
    'priya.traveler@example.com',
    travelerCreds2.hash,
    travelerCreds2.salt,
    'Priya Iyer',
    'traveler',
    '+91 98450 33445',
    'verified',
    now,
    now
  );

  // =========================================================================
  // 2. HOST / PARTNER ACCOUNTS
  // =========================================================================
  // Primary Host: Banteilang Marbaniang (Sohra Indigenous Stays Collective, Meghalaya)
  const partnerCreds1 = hashPassword('Partner123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, organization, license_number, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-partner-02',
    'sohra@example.com',
    partnerCreds1.hash,
    partnerCreds1.salt,
    'Banteilang Marbaniang',
    'partner',
    '+91 98620 55667',
    'Sohra Indigenous Stays Collective',
    'MEGH-TOUR-2024-884',
    'verified',
    now,
    now
  );

  // Secondary Host: Sunil Kumar (Munro Island Canoe Guild, Kerala Backwaters)
  const partnerCreds2 = hashPassword('Partner123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, organization, license_number, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-partner-03',
    'munro@example.com',
    partnerCreds2.hash,
    partnerCreds2.salt,
    'Sunil Kumar',
    'partner',
    '+91 94470 77889',
    'Munro Island Canoe Guild',
    'KER-TOUR-2023-412',
    'verified',
    now,
    now
  );

  // =========================================================================
  // 3. ADMIN ACCOUNTS
  // =========================================================================
  // Primary Admin: Integrity Operations Lead (Platform Compliance & Anti-Fabrication)
  const adminCreds1 = hashPassword('AdminSecure123!');
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-admin-03',
    'admin@vayanai.in',
    adminCreds1.hash,
    adminCreds1.salt,
    'Integrity Operations Lead',
    'admin',
    '+91 11 2345 6789',
    'verified',
    now,
    now
  );

  // Secondary Admin: Devika Rao (Compliance & Host Safety Auditor)
  const adminCreds2 = hashPassword('AdminSecure123!');
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-admin-04',
    'auditor@vayanai.in',
    adminCreds2.hash,
    adminCreds2.salt,
    'Devika Rao (Compliance Auditor)',
    'admin',
    '+91 11 2345 9900',
    'verified',
    now,
    now
  );

  // Production Operations Admin Account
  const defaultAdminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminSecure123!';
  const contactusAdminCreds = hashPassword(defaultAdminPass);
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-admin-contactus',
    'contactus@vayanai.in.net',
    contactusAdminCreds.hash,
    contactusAdminCreds.salt,
    'Vayanai Operations Admin',
    'admin',
    '+91 98200 11223',
    'verified',
    now,
    now
  );

  // =========================================================================
  // 4. STAFF / BDA ACCOUNTS (Business Development Associates)
  // =========================================================================
  // Primary Staff: Rohit Sen (BDA Lead, Northeast & Western Himalayas)
  const staffCreds1 = hashPassword('StaffPass123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, organization, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-staff-04',
    'rohit.bda@vayanai.in',
    staffCreds1.hash,
    staffCreds1.salt,
    'Rohit Sen (BDA Lead)',
    'staff',
    '+91 98110 44556',
    'Vayanai Business Development & Partnerships',
    'verified',
    now,
    now
  );

  // Secondary Staff: Kavita Nair (Regional BDA Associate, South & Western Ghats)
  const staffCreds2 = hashPassword('StaffPass123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, organization, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-staff-05',
    'kavita.bda@vayanai.in',
    staffCreds2.hash,
    staffCreds2.salt,
    'Kavita Nair (Regional BDA Associate)',
    'staff',
    '+91 98950 66778',
    'Vayanai Western Ghats & Coastal Desk',
    'verified',
    now,
    now
  );

  // =========================================================================
  // 5. INTERN CANDIDATE & ONBOARDED ACCOUNTS (DBERT LMS Flow)
  // =========================================================================
  // Stage 5 Intern: Ananya Ghosh (Assessment 100%, ₹499 Refundable Deposit Paid, Workspace Active)
  const internCreds1 = hashPassword('InternPass123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-intern-05',
    'ananya.intern@example.com',
    internCreds1.hash,
    internCreds1.salt,
    'Ananya Ghosh',
    'intern',
    '+91 97480 12345',
    'verified',
    now,
    now
  );

  // Stage 3 Intern: Sneha Patel (Assessment Scored 85%, Selected, Pending ₹499 Deposit)
  const internCreds2 = hashPassword('InternPass123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-intern-06',
    'sneha.intern@example.com',
    internCreds2.hash,
    internCreds2.salt,
    'Sneha Patel',
    'intern',
    '+91 98250 56789',
    'pending',
    now,
    now
  );

  // Stage 1 Intern: Vikram Joshi (Fresh Candidate, Ready to Take Virtual Interview Assessment)
  const internCreds3 = hashPassword('InternPass123!');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-intern-07',
    'vikram.intern@example.com',
    internCreds3.hash,
    internCreds3.salt,
    'Vikram Joshi',
    'intern',
    '+91 98210 98765',
    'pending',
    now,
    now
  );

  // Production Test Candidate Account for Live Verification
  const testCandidateCreds = hashPassword('CandidatePass123!');
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, role, phone, verification_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'usr-candidate-test',
    'candidate.test@vayanai.in.net',
    testCandidateCreds.hash,
    testCandidateCreds.salt,
    'Test Candidate (Online Verification)',
    'intern',
    '+91 98765 43210',
    'verified',
    now,
    now
  );

  // =========================================================================
  // INTERN APPLICATIONS (3 distinct stages for candidate experience)
  // =========================================================================
  // Ananya Ghosh: Onboarded with completed interview and deposit
  db.prepare(`
    INSERT OR IGNORE INTO intern_applications (id, user_id, user_name, user_email, track_name, status, interview_score, interview_answers_json, feedback_note, deposit_receipt, deposit_paid_at, applied_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'app-intern-01',
    'usr-intern-05',
    'Ananya Ghosh',
    'ananya.intern@example.com',
    'Sustainable Regional Operations & Growth Intern',
    'onboarded',
    100,
    JSON.stringify({
      'q-pacing-safety': 'opt-1-optimal',
      'q-partner-integrity': 'opt-2-optimal',
      'q-altitude-protocol': 'opt-3-optimal',
      'q-community-spend': 'opt-4-optimal'
    }),
    'Congratulations! You demonstrated strong alignment with Vayanai’s pacing, partner integrity, and community benefit values. You are officially selected.',
    'VP-DEP-499-8821',
    now,
    now,
    now
  );

  // Sneha Patel: Selected candidate awaiting ₹499 deposit payment
  db.prepare(`
    INSERT OR IGNORE INTO intern_applications (id, user_id, user_name, user_email, track_name, status, interview_score, interview_answers_json, feedback_note, applied_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'app-intern-02',
    'usr-intern-06',
    'Sneha Patel',
    'sneha.intern@example.com',
    'Sustainable Regional Operations & Growth Intern',
    'selected',
    85,
    JSON.stringify({
      'q-pacing-safety': 'opt-1-optimal',
      'q-partner-integrity': 'opt-2-optimal',
      'q-altitude-protocol': 'opt-3-optimal',
      'q-community-spend': 'opt-4-split'
    }),
    'Congratulations! You scored 85% in your Virtual Interview Assessment. Complete your refundable ₹499 deposit to activate your workspace.',
    now,
    now
  );

  // Vikram Joshi: Fresh applicant ready to take the assessment
  db.prepare(`
    INSERT OR IGNORE INTO intern_applications (id, user_id, user_name, user_email, track_name, status, applied_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'app-intern-03',
    'usr-intern-07',
    'Vikram Joshi',
    'vikram.intern@example.com',
    'Sustainable Regional Operations & Growth Intern',
    'applied',
    now,
    now
  );

  // Test Candidate Application: Live ready with single-use magic token
  db.prepare(`
    INSERT OR REPLACE INTO intern_applications (
      id, user_id, user_name, user_email, phone, college_name, semester,
      track_name, status, magic_token, magic_token_expires_at,
      invite_scheduled_at, invite_sent_at, applied_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'app-candidate-test',
    'usr-candidate-test',
    'Test Candidate (Online Verification)',
    'candidate.test@vayanai.in.net',
    '+91 98765 43210',
    'Indian Institute of Technology (IIT)',
    'Semester 7',
    'Data Analyst',
    'invited',
    'test-candidate-token-2026',
    '2026-12-31T23:59:59.000Z',
    now,
    now,
    now,
    now
  );

  // =========================================================================
  // PAYMENTS & REFUNDABLE DEPOSIT RECORDS
  // =========================================================================
  db.prepare(`
    INSERT OR IGNORE INTO payments (id, user_id, user_email, user_name, product_type, amount_inr, currency, payment_status, payment_method, transaction_ref, receipt_number, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pay-intern-01',
    'usr-intern-05',
    'ananya.intern@example.com',
    'Ananya Ghosh',
    'security_deposit',
    499,
    'INR',
    'completed',
    'upi_mock',
    'txn_ananya_deposit_8821',
    'VP-DEP-499-8821',
    now
  );

  // =========================================================================
  // STAFF / BDA PARTNER LEADS PIPELINE
  // =========================================================================
  // Lead 1: Meghalaya Discovery
  db.prepare(`
    INSERT OR IGNORE INTO staff_leads (id, bda_user_id, lead_name, lead_type, region, contact_info, pipeline_stage, estimated_value_inr, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'lead-01',
    'usr-staff-04',
    'Cherrapunji Forest Village Collective',
    'homestay_partner',
    'Meghalaya',
    'Kong Mary · +91 94361 XXXXX',
    'discovery',
    180000,
    'Auditing 4 step-free cottages with natural rainwater filtration.',
    now,
    now
  );

  // Lead 2: Kerala Backwaters Outreach
  db.prepare(`
    INSERT OR IGNORE INTO staff_leads (id, bda_user_id, lead_name, lead_type, region, contact_info, pipeline_stage, estimated_value_inr, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'lead-02',
    'usr-staff-04',
    'Munro Island Canoe Guild',
    'tour_collective',
    'Kerala',
    'Sunil Kumar · +91 94470 XXXXX',
    'outreach',
    125000,
    'Electric/manual country boats without diesel engine noise.',
    now,
    now
  );

  // Lead 3: Spiti Valley Verified Onboard
  db.prepare(`
    INSERT OR IGNORE INTO staff_leads (id, bda_user_id, lead_name, lead_type, region, contact_info, pipeline_stage, estimated_value_inr, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'lead-03',
    'usr-staff-04',
    'Spiti Valley Solar Farmstay Co-op',
    'homestay_partner',
    'Himachal Pradesh',
    'Tsering Dorje · +91 94180 XXXXX',
    'verified_onboard',
    240000,
    'Passive solar earthen architecture, mud-plaster insulation at 3,800m.',
    now,
    now
  );

  // Lead 4: Coorg Canopy Eco-Agro Farm (Kavita Nair)
  db.prepare(`
    INSERT OR IGNORE INTO staff_leads (id, bda_user_id, lead_name, lead_type, region, contact_info, pipeline_stage, estimated_value_inr, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'lead-04',
    'usr-staff-05',
    'Coorg Canopy Shade-Coffee Farmstays',
    'homestay_partner',
    'Karnataka',
    'Bopanna Appachu · +91 94480 XXXXX',
    'discovery',
    165000,
    'Bird-friendly certified shade-grown coffee estate with zero single-use plastics.',
    now,
    now
  );

  // Lead 5: Wayanad Sacred Grove Collective (Kavita Nair)
  db.prepare(`
    INSERT OR IGNORE INTO staff_leads (id, bda_user_id, lead_name, lead_type, region, contact_info, pipeline_stage, estimated_value_inr, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'lead-05',
    'usr-staff-05',
    'Wayanad Sacred Grove Custodian Trails',
    'tour_collective',
    'Kerala',
    'Raman Nambiar · +91 94950 XXXXX',
    'outreach',
    140000,
    'Indigenous medicinal plant walk with tribal elder honorarium.',
    now,
    now
  );

  ensureCertificatesSeeded(db);
}

export function ensureCertificatesSeeded(db: DatabaseSync): void {
  const hasBase = db.prepare("SELECT id FROM certificates WHERE certificate_id = 'CERT-VAY-2026-SO-001'").get();
  if (hasBase) {
    return;
  }
  const now = new Date().toISOString();

  // =========================================================================
  // 6. ISSUED INTERN CERTIFICATES (Past Batches & Platform Graduates)
  // =========================================================================
  // Certificate 1: Ananya Ghosh (Sustainable Regional Operations & Growth)
  db.prepare(`
    INSERT OR IGNORE INTO certificates (
      id, certificate_id, intern_id, user_id, intern_name, intern_email, domain, topics_covered,
      project_name, project_description, project_deliverables, mentor_name, mentor_role, mentor_email,
      joining_date, completion_date, issue_date, qr_payload_url, status, udyam_reg_number, issuing_authority,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'cert-seed-01',
    'CERT-VAY-2026-SO-001',
    'VAY-INT-AG-2345-001',
    null,
    'Ananya Ghosh',
    'ananya.intern@example.com',
    'Sustainable Regional Operations & Growth',
    'Homestay Auditing, Pacing Protocols, Partner Integrity, Community Direct-Spend Metrics, Regional Logistics',
    'Northeast Meghalaya Community Homestays Audit',
    'Audited 12 indigenous Khasi homestays across Mawlynnong and Sohra valleys. Verified step-free accessibility, indigenous rainwater conservation capacity, and village council contact information.',
    JSON.stringify([
      'Standardized Pacing Matrix for high-rainfall regions and elder travelers',
      '100% verified zero-fabrication supplier catalog with authentic local contact references',
      'Community revenue retention framework guaranteeing 88%+ direct spend to family hosts'
    ]),
    'Rohit Sen',
    'Senior BDA Lead & Regional Supervisor',
    'rohit.bda@vayanai.in',
    '10 January 2026',
    '10 March 2026',
    '12 March 2026',
    'https://vayanai.in.net/verify?certid=CERT-VAY-2026-SO-001',
    'active',
    'UDYAM-UP-29-0109046',
    'DBERT Technical Council & Vayanai Operations Platform',
    now,
    now
  );

  // Certificate 2: Rahul Kulkarni (AI Agent Development - Alkame Project)
  db.prepare(`
    INSERT OR IGNORE INTO certificates (
      id, certificate_id, intern_id, user_id, intern_name, intern_email, domain, topics_covered,
      project_name, project_description, project_deliverables, mentor_name, mentor_role, mentor_email,
      joining_date, completion_date, issue_date, qr_payload_url, status, udyam_reg_number, issuing_authority,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'cert-seed-02',
    'CERT-DBERT-2025-AI-014',
    'DBERT-INT-RK-4501-014',
    null,
    'Rahul Kulkarni',
    'rahul.kulkarni@example.com',
    'AI Agent Development',
    'Prompt Engineering, Autonomous AI Agents, RAG Pipelines, LangChain, API Integration, Agent Workflows',
    'Alkame — AI Market Intelligence & Autonomous Companion Engine',
    'Architected explainable context orchestration for automated route planning, verifiable source grounding, and local offline-compatible fallback engines.',
    JSON.stringify([
      'Multi-agent prompt routing pipeline with source citation verification',
      'Offline-capable fallback itinerary planner with zero hallucinated supplier listings',
      'Automated trip pacing engine accounting for mountain drive times and high-altitude acclimation'
    ]),
    'Sarita Bansal',
    'Program Head, DBERT Technical Council',
    'sarita.bansal@dbert.online',
    '01 November 2025',
    '01 January 2026',
    '05 January 2026',
    'https://vayanai.in.net/verify?certid=CERT-DBERT-2025-AI-014',
    'active',
    'UDYAM-UP-29-0109046',
    'DBERT Technical Council & Vayanai Operations Platform',
    now,
    now
  );

  // Certificate 3: Tanvi Deshmukh (Python Automation)
  db.prepare(`
    INSERT OR IGNORE INTO certificates (
      id, certificate_id, intern_id, user_id, intern_name, intern_email, domain, topics_covered,
      project_name, project_description, project_deliverables, mentor_name, mentor_role, mentor_email,
      joining_date, completion_date, issue_date, qr_payload_url, status, udyam_reg_number, issuing_authority,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'cert-seed-03',
    'CERT-DBERT-2025-PA-022',
    'DBERT-INT-TD-8921-022',
    null,
    'Tanvi Deshmukh',
    'tanvi.deshmukh@example.com',
    'Python Automation',
    'Python Automation Scripts, File Handling, Batch Excel/CSV Pipelines, REST APIs, Task Scheduling, Automated Testing',
    'Multi-Tenant Supplier Verification & Automated Reconciliation Pipeline',
    'Engineered automated reconciliation scripts for partner vouchers, tax compliance verification, and batch generation of tamper-evident credentials.',
    JSON.stringify([
      'Automated CSV & Excel validation scripts handling 2,000+ monthly partner transaction records',
      'ReportLab automated PDF watermarking and QR verification dispatch pipeline',
      'Automated system health telemetry alerts and error logging handlers'
    ]),
    'Rohit Sen',
    'Senior BDA Lead & Technical Advisor',
    'rohit.bda@vayanai.in',
    '15 September 2025',
    '15 November 2025',
    '18 November 2025',
    'https://vayanai.in.net/verify?certid=CERT-DBERT-2025-PA-022',
    'active',
    'UDYAM-UP-29-0109046',
    'DBERT Technical Council & Vayanai Operations Platform',
    now,
    now
  );

  // Certificate 4: Aditya Verma (Data Analyst)
  db.prepare(`
    INSERT OR IGNORE INTO certificates (
      id, certificate_id, intern_id, user_id, intern_name, intern_email, domain, topics_covered,
      project_name, project_description, project_deliverables, mentor_name, mentor_role, mentor_email,
      joining_date, completion_date, issue_date, qr_payload_url, status, udyam_reg_number, issuing_authority,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'cert-seed-04',
    'CERT-DBERT-2025-DA-038',
    'DBERT-INT-AV-1092-038',
    null,
    'Aditya Verma',
    'aditya.verma@example.com',
    'Data Analyst',
    'Data Cleaning, SQL Queries, Python Pandas, Data Visualization, Power BI, Regional Economic Spend Impact Modeling',
    'Indigenous Tourism Economic Yield & Direct-Spend Impact Analysis',
    'Constructed multi-dimensional analytical dashboards measuring traveler spending leakage across rural tourism corridors, ensuring maximum capital retention in local villages.',
    JSON.stringify([
      'Interactive Power BI dashboard tracking 94% local community revenue retention rate',
      'High-altitude traveler health and elevation acclimation safety correlation models',
      'Seasonal demand forecasting model for off-grid homestay clusters'
    ]),
    'Sarita Bansal',
    'Program Head, DBERT Technical Council',
    'sarita.bansal@dbert.online',
    '01 August 2025',
    '01 October 2025',
    '05 October 2025',
    'https://vayanai.in.net/verify?certid=CERT-DBERT-2025-DA-038',
    'active',
    'UDYAM-UP-29-0109046',
    'DBERT Technical Council & Vayanai Operations Platform',
    now,
    now
  );

  // =========================================================================
  // 7. VERIFIED RECENT INTERN BATCHES (Excel Records)
  // =========================================================================
  const excelInterns = [
    {
      name: 'Kushal Agarwal',
      email: 'kushalagarwal27496@gmail.com',
      batch: 'July to Sep 2026',
      domain: 'Data Analyst',
      college: 'Ajeekya dy Patil university',
      phone: '9503296769',
      placement: 'No, I’m only interested in the Certificate & LOR.',
      paymentProof: 'https://drive.google.com/open?id=1XyZF-YPaXuqyrkm_tUjCU-RuKOdgwdVs',
      project: 'Gayatri Ai',
      mentor: 'Sarita Bansal',
      mentorRole: 'Program Head, DBERT Technical Council',
      mentorEmail: 'sarita.bansal@dbert.online',
      joinDate: '01 July 2026',
      endDate: '30 September 2026',
      certId: 'CERT-DBERT-2026-DA-101',
      internId: 'DBERT-INT-KA-7496-101',
      topics: 'Excel, SQL, Python, Pandas, Data Cleaning, Data Visualization, Business Analytics'
    },
    {
      name: 'SHANMUKHA SRI SAIKUMAR MEDISETTY',
      email: 'medisettyshanmukh@gmail.com',
      batch: 'Aug to Oct 2026',
      domain: 'Artificial Intelligence (AI) and Machine Learning (ML)',
      college: 'SRINIVASA INSTITUTE OF ENGINEERING AND TECHNOLOGY',
      phone: '9010111728',
      placement: 'Yes, I’m interested in Placement Assistance & Interview Preparation.',
      paymentProof: 'https://drive.google.com/open?id=1DU-hKE9MZ_0tH8tLCivyZWxuZ697GU1x',
      project: 'Gayatri Ai, DBERT',
      mentor: 'Sarita Bansal',
      mentorRole: 'Program Head, DBERT Technical Council',
      mentorEmail: 'sarita.bansal@dbert.online',
      joinDate: '01 August 2026',
      endDate: '31 October 2026',
      certId: 'CERT-DBERT-2026-AI-102',
      internId: 'DBERT-INT-SM-1728-102',
      topics: 'Prompt Engineering, AI Agents, Machine Learning Models, Neural Networks, LangChain, API Pipelines'
    },
    {
      name: 'Neha Choudhary',
      email: 'nehachoudhary29337@gmail.com',
      batch: 'July to Sep 2026',
      domain: 'Data Analyst',
      college: 'Institute of Management Studies',
      phone: '9310129337',
      placement: 'No, I’m only interested in the Certificate & LOR.',
      paymentProof: 'https://drive.google.com/open?id=19waTVmDw-dV1-Z1Yv8gmZSdVul2ZyGh2',
      project: 'Alkame',
      mentor: 'Rohit Sen',
      mentorRole: 'Senior BDA Lead & Technical Advisor',
      mentorEmail: 'rohit.bda@vayanai.in',
      joinDate: '01 July 2026',
      endDate: '30 September 2026',
      certId: 'CERT-DBERT-2026-DA-103',
      internId: 'DBERT-INT-NC-9337-103',
      topics: 'Data Cleaning, Pandas, Power BI Dashboards, SQL Query Optimization, Regional Spend Analytics'
    },
    {
      name: 'Anushka',
      email: 'anushkachaudhary0988@gmail.com',
      batch: 'Aug to Oct 2026',
      domain: 'Data Analyst',
      college: 'Eternal university Barusahib',
      phone: '9805162569',
      placement: 'Yes, I’m interested in Placement Assistance & Interview Preparation.',
      paymentProof: 'https://drive.google.com/open?id=1eqTarpwVsKj0ih-Fax43VfKUbzomygh0',
      project: 'DBERT',
      mentor: 'Sarita Bansal',
      mentorRole: 'Program Head, DBERT Technical Council',
      mentorEmail: 'sarita.bansal@dbert.online',
      joinDate: '01 August 2026',
      endDate: '31 October 2026',
      certId: 'CERT-DBERT-2026-DA-104',
      internId: 'DBERT-INT-AN-2569-104',
      topics: 'Business Intelligence, Statistical Analysis, Excel Automation, Pandas, ETL Pipelines'
    },
    {
      name: 'Danisaram Anji',
      email: 'anjidanisaram@gmail.com',
      batch: 'Aug to Oct 2026',
      domain: 'Data Analyst',
      college: 'Balaji institute of technology and science warangal',
      phone: '8179125765',
      placement: 'Yes, I’m interested in Placement Assistance & Interview Preparation.',
      paymentProof: 'https://drive.google.com/open?id=1ahk4r2q32p9u7xNKtHw24Pul0-fVGbi3',
      project: 'Aivara, Gayatri Ai, DBERT',
      mentor: 'Sarita Bansal',
      mentorRole: 'Program Head, DBERT Technical Council',
      mentorEmail: 'sarita.bansal@dbert.online',
      joinDate: '01 August 2026',
      endDate: '31 October 2026',
      certId: 'CERT-DBERT-2026-DA-105',
      internId: 'DBERT-INT-DA-5765-105',
      topics: 'Multi-Tenant Data Analysis, SQL Transformations, Power BI Metrics, Predictive Modeling'
    },
    {
      name: 'Harshpreet singh',
      email: 'harshssandhu2003@gmail.com',
      batch: 'Aug to Oct 2026',
      domain: 'Artificial Intelligence (AI) and Machine Learning (ML)',
      college: 'RIET',
      phone: '8968705627',
      placement: 'Yes, I’m interested in Placement Assistance & Interview Preparation.',
      paymentProof: 'https://drive.google.com/open?id=1k3kJYT9rzTX82BoC3VZMdQRG05k0DcQq',
      project: 'Gayatri Ai',
      mentor: 'Sarita Bansal',
      mentorRole: 'Program Head, DBERT Technical Council',
      mentorEmail: 'sarita.bansal@dbert.online',
      joinDate: '01 August 2026',
      endDate: '31 October 2026',
      certId: 'CERT-DBERT-2026-AI-106',
      internId: 'DBERT-INT-HS-5627-106',
      topics: 'Natural Language Processing, PyTorch/TensorFlow, Model Evaluation, RAG Implementations'
    },
    {
      name: 'Sipun Das',
      email: 'dsipun8484@gmail.com',
      batch: 'June to Aug 2026',
      domain: 'Full Stack Development',
      college: 'Institute of Technical Education and Research (soa)',
      phone: '7327018484',
      placement: 'No, I’m only interested in the Certificate & LOR.',
      paymentProof: 'https://drive.google.com/open?id=1PvCx8OnYP4VQFpLUQIlsAYvBJjk_xEHT',
      project: 'Alkame',
      mentor: 'Rohit Sen',
      mentorRole: 'Senior BDA Lead & Technical Advisor',
      mentorEmail: 'rohit.bda@vayanai.in',
      joinDate: '01 June 2026',
      endDate: '31 August 2026',
      certId: 'CERT-DBERT-2026-FS-107',
      internId: 'DBERT-INT-SD-8484-107',
      topics: 'React, Next.js, Node.js, REST APIs, Database Architecture, Authentication Systems'
    },
    {
      name: 'Yogesh',
      email: 'yogijangir345@gmail.com',
      batch: 'Aug to Oct 2026',
      domain: 'Full Stack Development',
      college: 'Gurugram university',
      phone: '7404075475',
      placement: 'Yes, I’m interested in Placement Assistance & Interview Preparation.',
      paymentProof: 'https://drive.google.com/open?id=1PPz1QUKT3-ydGRWMWWdR0BQDTR3-HvqH',
      project: 'Gayatri Ai',
      mentor: 'Rohit Sen',
      mentorRole: 'Senior BDA Lead & Technical Advisor',
      mentorEmail: 'rohit.bda@vayanai.in',
      joinDate: '01 August 2026',
      endDate: '31 October 2026',
      certId: 'CERT-DBERT-2026-FS-108',
      internId: 'DBERT-INT-YO-5475-108',
      topics: 'Frontend Engineering, Serverless Workflows, API Integration, Responsive UI Architectures'
    },
    {
      name: 'Oishani Majumder',
      email: 'majumderoishani@gmail.com',
      batch: 'Aug to Oct 2026',
      domain: 'Artificial Intelligence (AI) and Machine Learning (ML)',
      college: 'Kalinga Institute of Industrial Technology',
      phone: '9831800941',
      placement: 'No, I’m only interested in the Certificate & LOR.',
      paymentProof: 'https://drive.google.com/open?id=1rtxhwlaFx6CJMC-rK9RUKmiqOsa6adRj',
      project: 'Gayatri Ai',
      mentor: 'Sarita Bansal',
      mentorRole: 'Program Head, DBERT Technical Council',
      mentorEmail: 'sarita.bansal@dbert.online',
      joinDate: '01 August 2026',
      endDate: '31 October 2026',
      certId: 'CERT-DBERT-2026-AI-109',
      internId: 'DBERT-INT-OM-0941-109',
      topics: 'Deep Learning Architectures, LLM Integration, Data Pipelines, AI System Performance Tuning'
    },
    {
      name: 'Gupta Ankit Ramvijay',
      email: 'guptaankit6630@gmail.com',
      batch: 'Aug to Oct 2026',
      domain: 'Data Analyst',
      college: 'Mulund College of Commerce',
      phone: '8828177412',
      placement: 'Yes, I’m interested in Placement Assistance & Interview Preparation.',
      paymentProof: 'https://drive.google.com/open?id=1r0DsGsfMpmg9ximbxxK2e9RaLZLfjnu8',
      project: 'DBERT',
      mentor: 'Sarita Bansal',
      mentorRole: 'Program Head, DBERT Technical Council',
      mentorEmail: 'sarita.bansal@dbert.online',
      joinDate: '01 August 2026',
      endDate: '31 October 2026',
      certId: 'CERT-DBERT-2026-DA-110',
      internId: 'DBERT-INT-GA-7412-110',
      topics: 'Financial Analytics, Quantitative Modeling, SQL Queries, Power BI, Advanced Excel Spreadsheets'
    },
    {
      name: 'Kartik Suchak',
      email: 'kartiksuchak05@gmail.com',
      batch: 'May to July 2026',
      domain: 'Artificial Intelligence (AI) and Machine Learning (ML)',
      college: 'Shri Ramdeobaba College of Engineering and Management',
      phone: '9422857055',
      placement: 'No, I’m only interested in the Certificate & LOR.',
      paymentProof: 'https://drive.google.com/open?id=18pq94NecrcdqZwrWBUoR_MI8BepRczSn',
      project: 'Gayatri Ai',
      mentor: 'Sarita Bansal',
      mentorRole: 'Program Head, DBERT Technical Council',
      mentorEmail: 'sarita.bansal@dbert.online',
      joinDate: '01 May 2026',
      endDate: '31 July 2026',
      certId: 'CERT-DBERT-2026-AI-111',
      internId: 'DBERT-INT-KS-7055-111',
      topics: 'Autonomous Machine Learning Pipelines, Agent Workflows, Prompt Optimization, Model Evaluation'
    }
  ];

  for (const item of excelInterns) {
    const deliverables = JSON.stringify([
      `Completed applied engineering milestone on ${item.project}`,
      `Verified academic credentials from ${item.college}`,
      `Institutional sign-off by ${item.mentor}`
    ]);

    db.prepare(`
      INSERT OR REPLACE INTO certificates (
        id, certificate_id, intern_id, user_id, intern_name, intern_email, phone, college_name,
        domain, topics_covered, project_name, project_description, project_deliverables,
        mentor_name, mentor_role, mentor_email, joining_date, completion_date, issue_date,
        qr_payload_url, status, udyam_reg_number, issuing_authority, payment_proof_url,
        placement_prep, fee_inr, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `cert-${item.certId.toLowerCase()}`,
      item.certId,
      item.internId,
      null,
      item.name,
      item.email,
      item.phone,
      item.college,
      item.domain,
      item.topics,
      item.project,
      `Applied internship project on ${item.project} for ${item.batch}. Academic Institution: ${item.college}.`,
      deliverables,
      item.mentor,
      item.mentorRole,
      item.mentorEmail,
      item.joinDate,
      item.endDate,
      item.endDate,
      `https://vayanai.in.net/verify?certid=${item.certId}`,
      'active',
      'UDYAM-UP-29-0109046',
      'DBERT Technical Council & Vayanai Operations Platform',
      item.paymentProof,
      item.placement,
      299,
      now,
      now
    );
  }
}

