import { ai, EMBEDDING_MODEL } from "./ai.js";

const BATCH_SIZE = 100;

export async function embedTexts(texts) {
  if (!texts.length) return [];

  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await ai.embeddings.create({ model: EMBEDDING_MODEL, input: batch });
    vectors.push(...response.data.map((d) => d.embedding));
  }
  return vectors;
}

export async function embedQuery(text) {
  const [vector] = await embedTexts([text]);
  return vector;
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
