import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import crypto from 'node:crypto';

const dbPath = path.resolve(process.cwd(), 'data', 'vayanai.db');
const db = new DatabaseSync(dbPath);

const demoCandidates = [
  {
    userId: 'usr-demo-data',
    appId: 'app-demo-data',
    name: 'Manpreet Singh (Data Track)',
    email: 'demo.data@vayanai.in.net',
    phone: '+91 98765 43210',
    college: 'IIT Delhi',
    semester: '7th Semester',
    track: 'Data Analyst',
    token: 'test-interview-data',
  },
  {
    userId: 'usr-demo-fullstack',
    appId: 'app-demo-fullstack',
    name: 'Kavya Mathur (Full Stack Track)',
    email: 'demo.fullstack@vayanai.in.net',
    phone: '+91 88375 15478',
    college: 'Manipal University Jaipur',
    semester: '5th Semester',
    track: 'Full Stack Development',
    token: 'test-interview-fullstack',
  },
  {
    userId: 'usr-demo-aiml',
    appId: 'app-demo-aiml',
    name: 'Rohan Verma (AI/ML Track)',
    email: 'demo.aiml@vayanai.in.net',
    phone: '+91 91234 56789',
    college: 'BITS Pilani',
    semester: '6th Semester',
    track: 'AI/ML Engineering',
    token: 'test-interview-aiml',
  },
  {
    userId: 'usr-demo-ops',
    appId: 'app-demo-ops',
    name: 'Ananya Roy (Operations Track)',
    email: 'demo.ops@vayanai.in.net',
    phone: '+91 99887 76655',
    college: 'St. Xavier\'s College',
    semester: '4th Semester',
    track: 'Operations & Travel Coordination',
    token: 'test-interview-ops',
  },
  {
    // General test token that matches the original test token
    userId: 'usr-demo-candidate',
    appId: 'app-demo-candidate-01',
    name: 'Manpreet Singh (Demo Candidate)',
    email: 'demo.candidate@vayanai.in.net',
    phone: '+91 98765 43210',
    college: 'Indian Institute of Technology',
    semester: '7th Semester',
    track: 'Data Analyst',
    token: 'test-interview-2026',
  }
];

const now = new Date().toISOString();
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

for (const c of demoCandidates) {
  // 1. Ensure user exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(c.email);
  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'intern', ?, ?)
    `).run(c.userId, c.email, 'scrypt$dummy_hash', 'dummy_salt', c.name, now, now);
  }

  // 2. Upsert intern application
  const existingApp = db.prepare('SELECT id FROM intern_applications WHERE user_email = ?').get(c.email);
  if (existingApp) {
    db.prepare(`
      UPDATE intern_applications
      SET status = 'invited',
          magic_token = ?,
          magic_token_expires_at = ?,
          interview_score = 0,
          interview_answers_json = NULL,
          feedback_note = NULL,
          offer_letter_id = NULL,
          offer_sent_at = NULL,
          offer_accepted_at = NULL,
          signature_name = NULL,
          deposit_receipt = NULL,
          deposit_paid_at = NULL,
          batch_start_date = '2026-11-02',
          updated_at = ?
      WHERE user_email = ?
    `).run(c.token, expiresAt, now, c.email);
  } else {
    db.prepare(`
      INSERT INTO intern_applications (
        id, user_id, user_name, user_email, phone, college_name, semester,
        track_name, cv_url, status, magic_token, magic_token_expires_at,
        invite_scheduled_at, invite_sent_at, interview_score, batch_start_date,
        available_3_months, laptop_internet, placement_needed, source_referral,
        applied_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, 'https://drive.google.com/demo-cv', 'invited', ?, ?,
        ?, ?, 0, '2026-11-02',
        'Yes', 'Yes', 'Yes', 'Local Demo Test',
        ?, ?
      )
    `).run(
      c.appId, c.userId, c.name, c.email, c.phone, c.college, c.semester,
      c.track, c.token, expiresAt,
      now, now,
      now, now
    );
  }

  console.log(`✓ Seeded ${c.name} [Track: ${c.track}]`);
  console.log(`  Assessment Link: http://localhost:3000/intern/assessment?token=${c.token}`);
}

console.log('\nAll 5 demo candidates seeded and ready for test!');
