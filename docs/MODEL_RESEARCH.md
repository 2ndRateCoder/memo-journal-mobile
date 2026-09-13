# Model Research — on-device LLMs for Memo Journal

Researched 2026-09-12. Anything marked **UNVERIFIED** could not be confirmed against official docs/HuggingFace at scaffold time — verify before wiring downloads.

## Candidate models

| Model | Params | Quantised size (est.) | Context | Strengths | Concerns |
|---|---|---|---|---|---|
| **Gemma 3n E2B** (`google/gemma-3n-E2B-it`) | ~2B effective | ~1.5–2 GB (Q4) — UNVERIFIED | 32k | Google's mobile-first model; MatFormer-style elastic sizing; best quality-per-MB in its class | Gated HF repo (free account + license click); GGUF build id UNVERIFIED |
| **Gemma 4 E4B** (`google/gemma-4-E4B-it`; LiteRT ref: `litert-community/gemma-4-E4B-it-litert-lm` — verified to exist) | ~4B effective (MoE) | ~3.66 GB `.litertlm` file, ~0.7 GB RAM on GPU — UNVERIFIED | 128k (UNVERIFIED) | Most capable small Gemma; official LiteRT-LM builds; Swift/JS/C APIs exist | 3.66 GB download is heavy for low-end phones; gated license |
| **Qwen3 0.6B** | 0.6B | ~400–500 MB (Q4) — UNVERIFIED | 32k | Tiny; runs on anything; permissive Apache 2.0 | Noticeably weaker at nuanced coaching/analysis |
| **Llama 3.2 3B** | 3B | ~1.8–2 GB (Q4) — UNVERIFIED | 128k | Strong instruction following; huge GGUF ecosystem | Meta community license; larger than Gemma 3n for similar quality |
| **Phi-4-mini / Phi-3.5-mini** | 3.8B | ~2.2–2.4 GB (Q4) | 128k | Excellent reasoning-per-parameter; official bartowski GGUFs | Microsoft license; 2.4 GB pushes low-end devices |

**Default plan:** Gemma 3n E2B on light devices, Gemma 4 E4B on capable devices (device gate in `localEngine.ts`). Qwen3 0.6B is the emergency fallback if a device can't hold 2B.

## Runtime options

| Runtime | RN-ready? | Notes |
|---|---|---|
| **llama.rn** (llama.cpp bindings, `mybigday/llama.rn`) | ✅ Yes | The only mature RN path. GGUF ecosystem (incl. community Gemma GGUF builds). Requires dev build + New Architecture. Streaming, GPU offload (`n_gpu_layers`). Proven by multiple shipped Expo apps. |
| **LiteRT-LM native module** (Google AI Edge) | ❌ Not yet | The "true" Gemma 4 path: Swift API + Metal GPU exists (verified, v0.12+), C API prebuilts (v0.16). But no React Native binding — we'd write a TurboModule ourselves. Best v0.2+ upgrade. |
| **ExecuTorch** | ⚠️ Partial | Meta's on-device runtime; RN bindings exist experimentally. Weaker model availability for Gemma specifically. |
| Apple Foundation Models | ⚠️ iOS 26+ only | Free, private, zero integration cost — but Apple-only, model choice fixed, availability gated by OS version. Worth a fallback evaluation at beta time. |

## Recommendation

**Ship v0.1 on `llama.rn` + GGUF Gemma builds.** Reasons:

1. It's the only path that works in React Native *today* without writing native code.
2. GGUF is the lingua franca of small-model distribution — if Gemma GGUF builds disappoint, Qwen/Llama/Phi GGUFs are drop-in swaps behind the same `InferenceEngine` interface.
3. No account, no key, no network at inference time — the free-tier privacy story is airtight by construction.
4. The `InferenceEngine` interface isolates the runtime choice; migrating to a LiteRT-LM TurboModule later (for official Gemma 4 E4B `.litertlm` with Metal acceleration) touches one file.

**Do not** bundle weights in the IPA — download on first launch over Wi-Fi into the app sandbox (see ROADMAP.md for App Store size rules).

## UNVERIFIED items (must confirm before beta)

- Exact HuggingFace GGUF repo ids + file sizes for Gemma 3n E2B and Gemma 4 E4B quantised builds.
- Gemma 4 E4B context length and the ~3.66 GB / ~0.7 GB RAM figures (from secondary sources).
- Tinfoil model catalog ids (`llama3-3-70b` seen in their README; others per https://docs.tinfoil.sh/models/catalog).
- `tinfoil` npm SDK compatibility with React Native Hermes (HPKE crypto primitives).
- MediaPipe Text Embedder availability as an RN-accessible native module (else: tiny GGUF embedder via llama.rn).
