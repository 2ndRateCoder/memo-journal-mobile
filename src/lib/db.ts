/**
 * SQLite persistence (expo-sqlite). All data lives in the app sandbox.
 *
 * Tables:
 *  - entries    : one row per journal entry (transcript)
 *  - chunks     : entries split into retrievable chunks for RAG
 *  - embeddings : one embedding vector per chunk (BLOB of float32), for cosine top-k
 *
 * Deleting an entry cascades to its chunks and embeddings.
 */
import * as SQLite from 'expo-sqlite';

export interface JournalEntry {
  id: number;
  text: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
  durationSec: number | null;
  audioPath: string | null; // TODO: optional audio retention (off by default)
}

export interface Chunk {
  id: number;
  entryId: number;
  chunkIndex: number;
  text: string;
}

export interface StoredEmbedding {
  chunkId: number;
  entryId: number;
  dim: number;
  vector: Float32Array;
}

const DB_NAME = 'memo-journal.db';
let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database not initialised — call initDb() first.');
  return db;
}

export async function initDb(): Promise<void> {
  db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      duration_sec REAL,
      audio_path TEXT
    );
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS embeddings (
      chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
      dim INTEGER NOT NULL,
      vector BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_entry ON chunks(entry_id);
  `);
}

/** Insert a transcript as a new dated entry. Returns the entry id. */
export async function insertEntry(text: string, durationSec: number | null = null): Promise<number> {
  const res = await getDb().runAsync(
    'INSERT INTO entries (text, duration_sec) VALUES (?, ?);',
    [text, durationSec],
  );
  return res.lastInsertRowId;
}

export async function getEntries(limit = 500): Promise<JournalEntry[]> {
  const rows = await getDb().getAllAsync<{
    id: number;
    text: string;
    created_at: string;
    updated_at: string;
    duration_sec: number | null;
    audio_path: string | null;
  }>('SELECT * FROM entries ORDER BY created_at DESC LIMIT ?;', [limit]);
  return rows.map((r) => ({
    audioPath: r.audio_path,
    createdAt: r.created_at,
    durationSec: r.duration_sec,
    id: r.id,
    text: r.text,
    updatedAt: r.updated_at,
  }));
}

export async function deleteEntry(id: number): Promise<void> {
  await getDb().runAsync('DELETE FROM entries WHERE id = ?;', [id]);
}

export async function insertChunks(entryId: number, texts: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (let i = 0; i < texts.length; i++) {
    const res = await getDb().runAsync(
      'INSERT INTO chunks (entry_id, chunk_index, text) VALUES (?, ?, ?);',
      [entryId, i, texts[i]],
    );
    ids.push(res.lastInsertRowId);
  }
  return ids;
}

function f32ToBlob(v: Float32Array): Uint8Array {
  return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
}

function blobToF32(blob: Uint8Array, dim: number): Float32Array {
  const buf = blob.buffer.slice(blob.byteOffset, blob.byteOffset + blob.byteLength);
  const arr = new Float32Array(buf);
  if (arr.length !== dim) throw new Error(`Embedding dim mismatch: expected ${dim}, got ${arr.length}`);
  return arr;
}

export async function saveEmbedding(chunkId: number, vector: Float32Array): Promise<void> {
  await getDb().runAsync('INSERT OR REPLACE INTO embeddings (chunk_id, dim, vector) VALUES (?, ?, ?);', [
    chunkId,
    vector.length,
    f32ToBlob(vector),
  ]);
}

/** Load every stored embedding (chunk text joined) for brute-force cosine top-k. */
export async function getAllEmbeddings(): Promise<(StoredEmbedding & { text: string })[]> {
  const rows = await getDb().getAllAsync<{ chunk_id: number; entry_id: number; dim: number; vector: Uint8Array; text: string }>(
    `SELECT e.chunk_id, c.entry_id, e.dim, e.vector, c.text
     FROM embeddings e JOIN chunks c ON c.id = e.chunk_id;`,
  );
  return rows.map((r) => ({
    chunkId: r.chunk_id,
    dim: r.dim,
    entryId: r.entry_id,
    text: r.text,
    vector: blobToF32(r.vector, r.dim),
  }));
}

export async function countEntries(): Promise<number> {
  const row = await getDb().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM entries;');
  return row?.n ?? 0;
}
