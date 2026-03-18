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
