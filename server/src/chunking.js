// No tokenizer dependency: approximate tokens as ~1.3 tokens/word (reasonable
// for mixed Russian/English text), so ~550 words ≈ 700-750 tokens per chunk
// and ~80 words ≈ 100 tokens of overlap between consecutive chunks.
const WORDS_PER_CHUNK = 550;
const OVERLAP_WORDS = 80;

export function chunkText(text, { wordsPerChunk = WORDS_PER_CHUNK, overlapWords = OVERLAP_WORDS } = {}) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + wordsPerChunk, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - overlapWords;
  }

  return chunks;
}
