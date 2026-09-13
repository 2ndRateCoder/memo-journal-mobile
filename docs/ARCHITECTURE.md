# Memo Journal — Architecture

A private voice-to-text journal with on-device AI analysis. iOS first (Expo React Native, TypeScript), Android later.

## The three selling points (and how the architecture delivers them)

1. **Base tier free forever.** The free tier runs a small Gemma model entirely on-device via `llama.rn`. No account, no API key, no server, ~$0 marginal cost per user.
2. **AI is local.** On the free tier, voice transcripts, embeddings, and analysis never leave the phone. The app works in airplane mode after the one-time model download.
3. **The "AI context" fix.** We don't dump the whole journal into the model. Every entry is chunked and embedded on-device; analysis retrieves only the top-k relevant chunks (RAG) and feeds *those* to the model. Bounded, relevant context — cheaper, sharper, more private.

## System diagram (words)

```
┌─────────────────────────────── iPhone ───────────────────────────────┐
│                                                                      │
│  RecordScreen                                                        │
│    │ mic                                                            │
│    ▼                                                                │
│  lib/speech.ts ──► on-device STT (@react-native-voice/voice)         │
│    │ transcript                                                      │
│    ▼                                                                │
│  lib/db.ts (expo-sqlite)                                             │
│    entries(id, text, created_at) ──► chunks ──► embeddings(BLOB f32) │
│    │                                                                 │
│  lib/rag.ts                                                          │
│    chunkText() → embedText() [TODO: native embedder] → cosine top-k   │
│    │  "relevant chunks only — never the whole journal"               │
│    ▼                                                                 │
│  lib/inference/engine.ts ── getEngine() ── tier switch               │
│    ├─ FREE ─► LocalGemmaEngine (lib/inference/localEngine.ts)        │
│    │           llama.rn → GGUF Gemma (3n-E2B light / 4-E4B capable)   │
│    │           everything stays in the app sandbox                   │
│    └─ PRO ──► TinfoilCloudEngine (lib/inference/cloudEngine.ts)      │
│                tinfoil SDK → HPKE-encrypted → NVIDIA secure enclave   │
│                attested; provider cannot read plaintext              │
│                                                                      │
│  AnalyzeScreen ◄── AnalysisResult { themes, words, questions }        │
│  TimelineScreen ◄── entries by date                                  │
│  SettingsScreen ◄── tier status, model mgmt, RevenueCat              │
└──────────────────────────────────────────────────────────────────────┘
```

## Data flow: recording an entry

1. User taps record → `speech.ts` captures audio, transcribes on-device.
2. Transcript saved to `entries` in SQLite (app sandbox).
3. `rag.ts#indexEntryForRag` chunks the text (600 chars, 120 overlap) and embeds each chunk; vectors stored in `embeddings` as float32 BLOBs.
4. Timeline shows the entry immediately; indexing happens in the background.

## Data flow: Analyze

1. `AnalyzeScreen` calls `buildAnalysisContext()`.
2. RAG embeds the query *"recurring themes, goals, worries, excitements in my journal"* and retrieves the top-12 chunks by cosine similarity.
3. `getEngine()` picks the engine: local Gemma (free) or Tinfoil (Pro).
4. The engine receives **only the retrieved chunks** plus a coach-style system prompt, and returns JSON: themes, word frequencies, reflection questions.
5. v0.1 fallback (until the embedder is wired): most-recent entries with a hard cap, clearly labelled. The fallback is temporary — relevance is the product.

## Free vs Pro data paths

| | Free | Pro |
|---|---|---|
| Transcription | on-device | on-device |
| Storage | SQLite in app sandbox | SQLite + encrypted cloud sync (TODO) |
| Embeddings | on-device | on-device |
| Analysis model | Gemma GGUF via llama.rn | Frontier model via Tinfoil enclave |
| Journal text leaves phone? | **Never** | Only inside HPKE-encrypted enclave requests |
| Account / API key | None | RevenueCat entitlement → Tinfoil key server-side |
| Offline | Yes (after model download) | Analysis needs network; journaling doesn't |

## Privacy guarantees per tier

- **Free:** the strongest claim we can make — there is no code path that sends journal text off-device. No analytics SDK ships in v1.
- **Pro:** requests are encrypted with HPKE to a hardware-attested enclave. If attestation fails, the request fails (fail-closed). The API key lives in server-side config, never in the app. We never log request bodies.
- **Both:** deleting the app deletes the local database. There is no web dashboard, no export-to-server, no third-party SDK with journal access.

## Key files

- `src/lib/db.ts` — SQLite schema (entries / chunks / embeddings)
- `src/lib/rag.ts` — chunking, cosine similarity, top-k retrieval (the context fix)
- `src/lib/speech.ts` — mic → on-device transcript
- `src/lib/inference/` — `types.ts` (engine contract), `localEngine.ts` (Gemma), `cloudEngine.ts` (Tinfoil), `engine.ts` (tier switch)
- `src/lib/subscription.ts` — RevenueCat, single `isPro()` gate
