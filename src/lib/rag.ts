/**
 * RAG over the journal — the fix for the "AI context" problem.
 *
 * Instead of dumping the entire journal into the model's context window
 * (expensive, lossy, and privacy-hostile), we:
 *   1. chunk each entry at write time,
 *   2. embed each chunk with an on-device text embedder,
 *   3. store vectors in SQLite next to the entries,
 *   4. at analysis time, embed the query ("recurring themes in my journal"),
 *      retrieve the top-k most similar chunks by cosine similarity,
 *   5. hand ONLY those chunks to the inference engine.
 *
 * Bounded context in, relevant context out. Free tier does all of this on-device.
 */

import { getAllEmbeddings, insertChunks, saveEmbedding } from './db';
import { AnalysisContext } from './themes';

const CHUNK_CHARS = 600;
const CHUNK_OVERLAP = 120;
const TOP_K = 12;

/** Split text into overlapping chunks. Pure function — unit-testable. */
export function chunkText(text: string, size = CHUNK_CHARS, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  const clean = text.replace(/\s+/g, ' ').trim();
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks.filter((c) => c.length > 0);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error('Vector dim mismatch');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Embed text with the on-device text embedder.
 *
 * TODO: wire a real native embedder. Candidates:
 *  - MediaPipe Text Embedder (google.ai.edge) via a custom native module
 *  - a tiny GGUF embedding model through llama.rn (slower, but zero new native deps)
 * Until then this throws — RAG indexing is disabled but entries still save.
 */
export async function embedText(_text: string): Promise<Float32Array> {
  throw new Error('On-device embedder not wired yet (see TODO in lib/rag.ts).');
}

/** Chunk + embed a freshly saved entry so it's retrievable later. */
export async function indexEntryForRag(entryId: number, text: string): Promise<void> {
  const chunks = chunkText(text);
  if (chunks.length === 0) return;
  const chunkIds = await insertChunks(entryId, chunks);
  for (let i = 0; i < chunks.length; i++) {
    const vec = await embedText(chunks[i]!); // throws until embedder is wired
    await saveEmbedding(chunkIds[i]!, vec);
  }
}

/** Retrieve the top-k chunks most similar to the analysis query. */
export async function retrieveRelevantChunks(query: string, k = TOP_K): Promise<{ entryId: number; text: string; score: number }[]> {
  const queryVec = await embedText(query);
  const stored = await getAllEmbeddings();
  return stored
    .map((s) => ({ entryId: s.entryId, text: s.text, score: cosineSimilarity(queryVec, s.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Build the bounded analysis context. If the embedder isn't wired yet (v0.1),
 * we fall back to the most recent entries with a hard cap — and say so in the UI.
 * TODO: remove the fallback once embeddings ship; the whole point is relevance.
 */
export async function buildAnalysisContext(): Promise<AnalysisContext & { entryCount: number }> {
  const { countEntries, getEntries } = await import('./db');
  const total = await countEntries();
  try {
    const chunks = await retrieveRelevantChunks('recurring themes, goals, worries, and excitements in my journal');
    return { chunks, entryCount: total, totalEntries: total };
  } catch {
    const recent = await getEntries(TOP_K);
    return {
      chunks: recent.map((e) => ({ entryId: e.id, score: 0, text: e.text.slice(0, CHUNK_CHARS) })),
      entryCount: total,
      totalEntries: total,
    };
  }
}
