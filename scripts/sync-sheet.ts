import { fetchAndSyncGoogleSheet, normalizeGoogleSheetCsvUrl } from '../lib/services/intern-sync';
import { getDb } from '../lib/db/sqlite';

const TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1koeFclx1MsMM_cQXk3hrU-JTLXlj3OGrDegQIG9-Zio/edit?resourcekey&usp=forms_web_b&urp=linked#gid=1670509518';

async function main() {
  console.log(`[Sync] Target Google Sheet: ${TARGET_SHEET_URL}`);
  const csvUrl = normalizeGoogleSheetCsvUrl(TARGET_SHEET_URL);
  console.log(`[Sync] Normalized CSV URL: ${csvUrl}`);

  const beforeDb = getDb();
  const countBefore = (beforeDb.prepare('SELECT count(*) as count FROM intern_applications').get() as { count: number }).count;
  console.log(`[Sync] Current candidates in DB before sync: ${countBefore}`);

  const result = await fetchAndSyncGoogleSheet(TARGET_SHEET_URL);

  if (!result.success) {
    console.error(`[Sync Error] ${result.error}`);
    process.exit(1);
  }

  const db = getDb();

  // Ensure every candidate without an offer_letter_id has one generated
  const withoutOffer = db.prepare("SELECT id, track_name, status FROM intern_applications WHERE offer_letter_id IS NULL OR offer_letter_id = ''").all() as Array<{ id: string; track_name: string; status: string }>;
  
  if (withoutOffer.length > 0) {
    console.log(`[Sync] Generating offer letter IDs for ${withoutOffer.length} candidate(s)...`);
    const updateStmt = db.prepare(`
      UPDATE intern_applications
      SET offer_letter_id = ?,
          offer_sent_at = COALESCE(offer_sent_at, ?),
          updated_at = ?
      WHERE id = ?
    `);

    const now = new Date().toISOString();
    for (const cand of withoutOffer) {
      const trackCode = (cand.track_name || '').toLowerCase().includes('data')
        ? 'DA'
        : (cand.track_name || '').toLowerCase().includes('ai')
        ? 'AI'
        : (cand.track_name || '').toLowerCase().includes('python')
        ? 'PA'
        : (cand.track_name || '').toLowerCase().includes('stack')
        ? 'FS'
        : 'OPS';
      const offerId = `VY-2026-${trackCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      updateStmt.run(offerId, now, now, cand.id);
    }
  }

  // Force checkpoint to flush WAL changes completely into vayanai.db file
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');

  const countAfter = (db.prepare('SELECT count(*) as count FROM intern_applications').get() as { count: number }).count;

  console.log('\n=== Google Sheet Sync Complete ===');
  console.log(`Rows fetched from Sheet: ${result.totalFetched}`);
  console.log(`New entries inserted:    ${result.newInserted}`);
  console.log(`Existing entries updated: ${result.updatedExisting}`);
  console.log(`Total candidates in DB:  ${countAfter} (was ${countBefore})`);
  console.log('==================================\n');

  // Print top 10 most recently added / updated candidates
  const recent = db.prepare(`
    SELECT user_name, user_email, track_name, college_name, offer_letter_id, status, applied_at
    FROM intern_applications
    ORDER BY applied_at DESC, id DESC
    LIMIT 10
  `).all() as Array<{
    user_name: string;
    user_email: string;
    track_name: string;
    college_name: string;
    offer_letter_id: string;
    status: string;
    applied_at: string;
  }>;

  console.log('Latest 10 registered candidates:');
  console.table(recent);
}

main().catch((err) => {
  console.error('[Sync Fatal Error]', err);
  process.exit(1);
});
