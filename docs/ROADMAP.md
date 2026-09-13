# Roadmap — to iOS TestFlight, then Android

## Phase 0 — Scaffold (this repo, v0.1) ✅
- [x] Project skeleton, screens, SQLite schema, engine interfaces, RAG module
- [x] Docs: architecture, model research, monetization, roadmap

## Phase 1 — Make it real (local tier)
- [ ] Wire `llama.rn`: dev build (`npx expo run:ios`), New Architecture on, `initLlama` in `localEngine.ts`
- [ ] Confirm GGUF repo ids for Gemma 3n E2B / Gemma 4 E4B on HuggingFace (UNVERIFIED — see MODEL_RESEARCH.md)
- [ ] Model download UX: first-launch Wi-Fi prompt, progress bar, resume, delete; store in app sandbox (`expo-file-system`)
- [ ] Wire on-device embedder (MediaPipe Text Embedder native module, or tiny GGUF embedder via llama.rn) — unblocks real RAG
- [ ] Remove the recency-fallback in `buildAnalysisContext()` once embeddings ship
- [ ] Speech: validate `@react-native-voice/voice` on-device mode on iOS 17+; handle permissions properly
- [ ] Unit tests: `chunkText`, `cosineSimilarity`, prompt builders

## Phase 2 — iOS TestFlight
- [ ] Apple Developer Program enrollment ($99/yr) — required for TestFlight + App Store
- [ ] `eas init`, configure `eas.json` build profiles (development / preview / production)
- [ ] App Store Connect: create app record, bundle id `com.wormgod.memojournal`
- [ ] Privacy manifest: `NSPrivacyAccessedAPICategories`, nutrition label — "Data Not Collected" for free tier (verify with Apple's definitions; Pro tier discloses encrypted inference)
- [ ] **Model download strategy:** do NOT bundle multi-GB weights in the IPA.
  - App Store rule of thumb: apps over ~200 MB can't be downloaded over cellular (users on iOS 13+ can override, but don't rely on it); large IPAs also hurt conversion. On-demand Wi-Fi download into the sandbox is the correct pattern.
  - Disclose the download size up front; support background download + resume.
- [ ] `eas build --platform ios --profile preview` → submit to TestFlight → internal testers
- [ ] Dogfood: daily journaling for 2 weeks, measure tokens/sec + battery on iPhone 12 → 16 range

## Phase 3 — Pro tier
- [ ] RevenueCat: project, iOS app, `pro` entitlement, monthly + annual products in App Store Connect subscription group
- [ ] Paywall UI in Settings (driven by `getOfferings()`)
- [ ] Validate `tinfoil` npm SDK on Hermes (HPKE crypto) — UNVERIFIED; spike this early, it gates the whole Pro architecture
- [ ] Server-side Tinfoil key management (minimal relay or EAS secrets → remote config); never ship the key in the app
- [ ] Encrypted cloud sync design (E2E-encrypted SQLite snapshot; keys in iOS Keychain / Secure Enclave)
- [ ] Confirm Tinfoil pricing → finalise Pro prices (see MONETIZATION.md)

## Phase 4 — App Store launch (iOS)
- [ ] Final privacy review, App Store screenshots, description leaning on the three selling points
- [ ] `eas submit --platform ios`
- [ ] Launch checklist: support email, crash reporting (Sentry), phased release

## Phase 5 — Android
- [ ] `app.json` android config is stubbed (package `com.wormgod.memojournal`, RECORD_AUDIO)
- [ ] Google Play Console + Play Billing products mirrored to the same RevenueCat `pro` entitlement
- [ ] Validate llama.rn GPU offload on Snapdragon/Exynos; re-run device-gate thresholds
- [ ] Play Data safety form (mirrors the iOS privacy story)

## Out of scope for v1
macOS / web clients, shared journals, Apple Foundation Models fallback (revisit at iOS 26 adoption), LiteRT-LM TurboModule (v0.2+ perf upgrade path).
