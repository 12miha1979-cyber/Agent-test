// In-memory store for uploaded documents. No persistence across server restarts by design (v1).
const documents = new Map();

export function addDocument(doc) {
  documents.set(doc.id, doc);
  return doc;
}

export function getDocument(id) {
  return documents.get(id);
}

export function listDocuments() {
  return Array.from(documents.values()).map(({ id, name, size, createdAt, textLength }) => ({
    id,
    name,
    size,
    createdAt,
    textLength,
  }));
}

export function removeDocument(id) {
  return documents.delete(id);
}

export function getCombinedText(ids) {
  const docs = ids && ids.length ? ids.map(getDocument).filter(Boolean) : Array.from(documents.values());
  return docs.map((d) => `--- ${d.name} ---\n${d.text}`).join("\n\n");
}
