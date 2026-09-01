import { embedQuery, cosineSimilarity } from "./embeddings.js";
import { getChunks } from "./storage.js";

export async function retrieveChunks({ query, direction, topK = 8 }) {
  const candidates = getChunks({ direction: direction || undefined });
  if (!candidates.length) return [];

  const queryVector = await embedQuery(query);

  return candidates
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryVector, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
