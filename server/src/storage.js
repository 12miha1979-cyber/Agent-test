import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "tutor.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

// Deliberately NOT using WAL mode: WAL writes go to a separate tutor.db-wal
// sidecar file and are only merged back into tutor.db on a checkpoint, which
// makes the main file look untouched after an upload (and risks data loss if
// something ever backs up tutor.db alone). This app is single-process with no
// concurrent readers, so the default rollback journal — which commits
// directly into tutor.db every time — is simpler and avoids that confusion.
db.exec("PRAGMA journal_mode = DELETE");

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    text TEXT NOT NULL,
    textLength INTEGER NOT NULL,
    createdAt TEXT NOT NULL
  )
`);

const insertStmt = db.prepare(
  "INSERT INTO documents (id, name, size, text, textLength, createdAt) VALUES (@id, @name, @size, @text, @textLength, @createdAt)"
);
const getStmt = db.prepare("SELECT * FROM documents WHERE id = ?");
const listStmt = db.prepare("SELECT id, name, size, createdAt, textLength FROM documents ORDER BY createdAt DESC");
const deleteStmt = db.prepare("DELETE FROM documents WHERE id = ?");
const selectAllStmt = db.prepare("SELECT * FROM documents");

export function addDocument(doc) {
  try {
    insertStmt.run(doc);
  } catch (err) {
    console.error("Failed to write document to SQLite:", err);
    throw err;
  }
  return doc;
}

export function getDocument(id) {
  return getStmt.get(id);
}

export function listDocuments() {
  return listStmt.all();
}

export function removeDocument(id) {
  try {
    return deleteStmt.run(id).changes > 0;
  } catch (err) {
    console.error("Failed to delete document from SQLite:", err);
    throw err;
  }
}

export function getCombinedText(ids) {
  const docs =
    ids && ids.length
      ? db.prepare(`SELECT * FROM documents WHERE id IN (${ids.map(() => "?").join(",")})`).all(...ids)
      : selectAllStmt.all();
  return docs.map((d) => `--- ${d.name} ---\n${d.text}`).join("\n\n");
}
