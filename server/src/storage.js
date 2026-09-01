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
    direction TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  )
`);

// Guard for databases created before the "direction" column existed.
const documentColumns = db.prepare("PRAGMA table_info(documents)").all().map((c) => c.name);
if (!documentColumns.includes("direction")) {
  db.exec("ALTER TABLE documents ADD COLUMN direction TEXT NOT NULL DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    documentId TEXT NOT NULL,
    documentName TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT '',
    chunkIndex INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )
`);
db.exec("CREATE INDEX IF NOT EXISTS idx_chunks_documentId ON chunks(documentId)");
db.exec("CREATE INDEX IF NOT EXISTS idx_chunks_direction ON chunks(direction)");

const insertDocStmt = db.prepare(
  "INSERT INTO documents (id, name, size, text, textLength, direction, createdAt) VALUES (@id, @name, @size, @text, @textLength, @direction, @createdAt)"
);
const getDocStmt = db.prepare("SELECT * FROM documents WHERE id = ?");
const listDocsStmt = db.prepare(
  "SELECT id, name, size, direction, createdAt, textLength FROM documents ORDER BY createdAt DESC"
);
const deleteDocStmt = db.prepare("DELETE FROM documents WHERE id = ?");

const insertChunkStmt = db.prepare(
  "INSERT INTO chunks (id, documentId, documentName, direction, chunkIndex, text, embedding, createdAt) VALUES (@id, @documentId, @documentName, @direction, @chunkIndex, @text, @embedding, @createdAt)"
);
const deleteChunksByDocStmt = db.prepare("DELETE FROM chunks WHERE documentId = ?");
const chunksByDirectionStmt = db.prepare("SELECT * FROM chunks WHERE direction = ?");
const allChunksStmt = db.prepare("SELECT * FROM chunks");
const chunkCountByDocStmt = db.prepare("SELECT COUNT(*) AS count FROM chunks WHERE documentId = ?");

export function addDocument(doc) {
  try {
    insertDocStmt.run(doc);
  } catch (err) {
    console.error("Failed to write document to SQLite:", err);
    throw err;
  }
  return doc;
}

export function getDocument(id) {
  return getDocStmt.get(id);
}

export function listDocuments() {
  return listDocsStmt.all();
}

export function removeDocument(id) {
  try {
    db.exec("BEGIN");
    deleteChunksByDocStmt.run(id);
    const result = deleteDocStmt.run(id);
    db.exec("COMMIT");
    return result.changes > 0;
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Failed to delete document from SQLite:", err);
    throw err;
  }
}

export function addChunks(chunks) {
  if (!chunks.length) return;
  try {
    db.exec("BEGIN");
    for (const chunk of chunks) {
      insertChunkStmt.run({ ...chunk, embedding: JSON.stringify(chunk.embedding) });
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Failed to write chunks to SQLite:", err);
    throw err;
  }
}

export function getChunks({ direction } = {}) {
  const rows = direction ? chunksByDirectionStmt.all(direction) : allChunksStmt.all();
  return rows.map((row) => ({ ...row, embedding: JSON.parse(row.embedding) }));
}

export function countChunksForDocument(documentId) {
  return chunkCountByDocStmt.get(documentId)?.count ?? 0;
}
