import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve('data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'test.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const stmt = db.prepare('INSERT OR REPLACE INTO users (id, email, name, role, created_at) VALUES (?, ?, ?, ?, ?)');
stmt.run('usr-1', 'aarav@example.com', 'Aarav Sharma', 'traveler', new Date().toISOString());

const user = db.prepare('SELECT * FROM users WHERE email = ?').get('aarav@example.com');
console.log('Successfully queried SQLite user:', user);

db.close();
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
console.log('Cleaned up test db.');
