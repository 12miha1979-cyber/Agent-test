import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "tutor.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

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
const getManyStmt = (count) =>
  db.prepare(`SELECT * FROM documents WHERE id IN (${Array(count).fill("?").join(",")})`);

export function addDocument(doc) {
  insertStmt.run(doc);
  return doc;
}

export function getDocument(id) {
  return getStmt.get(id);
}

export function listDocuments() {
  return listStmt.all();
}

export function removeDocument(id) {
  return deleteStmt.run(id).changes > 0;
}

export function getCombinedText(ids) {
  const docs = ids && ids.length ? getManyStmt(ids.length).all(...ids) : db.prepare("SELECT * FROM documents").all();
  return docs.map((d) => `--- ${d.name} ---\n${d.text}`).join("\n\n");
}
