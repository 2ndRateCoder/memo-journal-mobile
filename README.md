# Memo Journal

A private voice-to-text journaling app with on-device AI analysis. Talk into your phone; get themes, patterns, and reflection questions back. iOS first, Android later.

## The three selling points

1. **Base tier free forever** — local AI, no account, no API key, ~$0 marginal cost. It can never be taken away.
2. **AI is local** — on the free tier your journal text never leaves the phone. Airplane-mode analysis after a one-time model download.
3. **Fixes the "AI context" problem** — instead of dumping your whole journal into the model, entries are chunked + embedded on-device and only the relevant chunks are retrieved (RAG) for each analysis. Bounded, relevant, private.

A Pro subscription unlocks frontier-model analysis through [Tinfoil](https://tinfoil.sh) confidential inference (hardware-attested enclaves, encrypted so even the provider can't read your journal) plus encrypted cloud sync.

## Quickstart

```bash
npm install
npx expo start        # then press i — requires a dev build for native modules
```

Native modules (`llama.rn`, speech, purchases) need a development build, not Expo Go:

```bash
npx expo run:ios      # builds + runs on simulator/device
npx expo run:android
```

Typecheck:

```bash
npm run typecheck
```

## Project layout

```
src/
  App.tsx                 entry, tab navigation, boot (DB + RevenueCat)
  screens/
    RecordScreen.tsx      big record button → transcript → dated entry
    TimelineScreen.tsx    scroll entries by date, delete
    AnalyzeScreen.tsx     the Analyze button → themes / words / questions
    SettingsScreen.tsx    tier status, local model mgmt, upgrade, privacy
  lib/
    db.ts                 expo-sqlite: entries, chunks, embeddings
    speech.ts             mic → on-device speech-to-text wrapper
    rag.ts                chunking, cosine top-k retrieval (the context fix)
    subscription.ts       RevenueCat wrapper, single isPro() gate
    themes.ts             AnalysisResult types
    inference/
      types.ts            InferenceEngine interface (screens only see this)
      localEngine.ts      Gemma via llama.rn (free tier) — runtime TODO
      cloudEngine.ts      Tinfoil confidential inference (Pro tier)
      engine.ts           factory: picks local vs cloud, fail-closed
docs/
  ARCHITECTURE.md         system diagram, data flows, privacy per tier
  MODEL_RESEARCH.md       model comparison, runtime options, recommendation
  MONETIZATION.md         free vs Pro, RevenueCat sketch, Tinfoil costs
  ROADMAP.md              concrete steps to TestFlight, then Android
```

## Status: scaffold v0.1

This is an honest skeleton: real SQLite schema, real RAG math, real engine interfaces and screen flows — but the native seams are marked TODO, not faked:

- **Local inference runtime** (`localEngine.ts`): `llama.rn` integration not wired; `analyze()` throws until it is.
- **On-device embedder** (`rag.ts`): `embedText()` throws; analysis falls back to recent entries (labelled) until wired.
- **Speech permissions**: `@react-native-voice/voice` wrapper written; on-device behaviour to be validated on hardware.
- **RevenueCat**: wrapper written; needs real products, entitlement `pro`, and SDK keys via EAS secrets.
- **Tinfoil**: client wrapper written; **Hermes (React Native) compatibility of the `tinfoil` SDK's HPKE crypto is UNVERIFIED** — spike this before committing to the Pro architecture.
- **Model files**: exact GGUF repo ids for the Gemma builds are UNVERIFIED — confirm on HuggingFace before wiring downloads. Never commit weights (`.gitignore` covers `*.gguf`, `*.litertlm`, `models/`).

See `docs/ROADMAP.md` for the path to TestFlight.
