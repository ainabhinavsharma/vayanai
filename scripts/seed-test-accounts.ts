import { getDb, seedInitialData } from '../lib/db/sqlite';
import { getUserByEmail } from '../lib/db/users-repo';
import { getInternApplicationByEmail } from '../lib/db/intern-repo';

async function main() {
  console.log('Seeding test accounts into SQLite...');
  const db = getDb();
  seedInitialData(db);

  const admin = getUserByEmail('contactus@vayanai.in.net');
  console.log('✓ Admin Account:', admin ? { id: admin.id, email: admin.email, role: admin.role, name: admin.name } : 'NOT FOUND');

  const testCandidate = getUserByEmail('candidate.test@vayanai.in.net');
  console.log('✓ Test Candidate User:', testCandidate ? { id: testCandidate.id, email: testCandidate.email, role: testCandidate.role, name: testCandidate.name } : 'NOT FOUND');

  const app = getInternApplicationByEmail('candidate.test@vayanai.in.net');
  console.log('✓ Test Candidate App:', app ? { id: app.id, track: app.trackName, token: app.magicToken, status: app.status } : 'NOT FOUND');

  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  console.log('✓ SQLite WAL Checkpoint executed cleanly.');
}

main().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
