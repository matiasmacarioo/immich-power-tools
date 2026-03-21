import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDirPath = path.join(process.cwd(), 'data');

// Create data directory if it doesn't exist
if (!fs.existsSync(dataDirPath)) {
  fs.mkdirSync(dataDirPath, { recursive: true });
}

export const localDb = new Database(path.join(dataDirPath, 'power_tools.sqlite'));

localDb.pragma('journal_mode = WAL');

// Initialize the local relationships table
localDb.exec(`
  CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    person1Id TEXT NOT NULL,
    person2Id TEXT NOT NULL,
    relationshipType TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Person states table (deceased, alias, etc.)
localDb.exec(`
  CREATE TABLE IF NOT EXISTS person_states (
    personId TEXT PRIMARY KEY,
    isDeceased INTEGER NOT NULL DEFAULT 0,
    alias TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
try { localDb.exec(`ALTER TABLE person_states ADD COLUMN alias TEXT`); } catch(e) {}

// vCard UIDs table for syncing
localDb.exec(`
  CREATE TABLE IF NOT EXISTS vcard_uids (
    personId TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
