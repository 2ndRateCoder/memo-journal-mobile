# Monetization — Free vs Pro

## The pitch (matches the product's three selling points)

- **Free forever:** record, transcribe, journal, and run full AI analysis on-device. No account. No API key. Your words never leave the phone. This tier costs us ~$0/user and can never be taken away — that's the trust anchor.
- **Pro (subscription):** deeper analysis from frontier models (70B-class reasoning) routed through **Tinfoil confidential inference** — hardware-attested secure enclaves, HPKE-encrypted transport, even the provider can't read your journal. Plus encrypted cloud sync across devices.

The free tier is genuinely good (that's the point — it's the demo that sells itself). Pro is for people who want the smartest possible coach on their patterns without giving up privacy.

## What's gated

| Feature | Free | Pro |
|---|---|---|
| Voice memos + on-device transcription | ✅ | ✅ |
| Journal timeline, edit/delete | ✅ | ✅ |
| On-device analysis (Gemma) | ✅ unlimited | ✅ |
| Frontier-model analysis (Tinfoil) | ❌ | ✅ |
| Encrypted cloud sync | ❌ | ✅ (TODO) |
| Priority new voices/models | ❌ | ✅ |

Nothing about *capturing* thoughts is ever paywalled. We monetize *depth of insight*, not access to your own memories.

## RevenueCat sketch

- **Entitlement:** `pro` (the only string the app checks — see `lib/subscription.ts#isPro`).
- **Products (App Store Connect, iOS-first):**
  - `memo_journal_pro_monthly` — e.g. $7.99/mo (price TBD — validate against comparable journaling apps)
  - `memo_journal_pro_annual` — e.g. $59.99/yr (price TBD)
  - Both in one subscription group, both attached to the `pro` entitlement.
- **Offering:** `default` containing monthly + annual packages. Paywalls and pricing iterate in the RevenueCat dashboard — no app update needed.
- **Keys:** RevenueCat *public* iOS key via EAS secrets → `expo-constants` extra. Never commit.
- **Flow:** Settings → "Go Pro" → paywall (TODO UI) → StoreKit purchase → RevenueCat webhook confirms → `isPro()` true → `engine.ts` routes analysis to Tinfoil.

Apple takes 15–30% (15% after year one / Small Business Program). Factor into unit economics.

## Tinfoil cost considerations

- Pro inference is our only real marginal cost: Tinfoil bills per token like a normal inference API (exact pricing **UNVERIFIED** — confirm at https://tinfoil.sh before setting Pro prices).
- The RAG "context fix" is also a cost control: we send ~12 retrieved chunks, not the whole journal, so per-analysis token spend stays small and predictable.
- Mitigations: cap Pro analyses per day (generous, e.g. 20), cache results per journal-state hash, keep the free local engine excellent so Pro is a want, not a need.
- The Tinfoil API key lives server-side (or in a minimal relay); the app never holds it. The SDK encrypts to the enclave client-side, so even our relay can't read bodies — but it *does* see metadata (timestamps, token counts). Disclose that.

## Pricing discipline

1. Confirm Tinfoil per-1M-token pricing.
2. Measure median tokens per analysis (chunks in + JSON out).
3. Set Pro price so that a heavy user (10 analyses/day) stays comfortably under ~30% of subscription revenue after Apple's cut.
4. Revisit after 1,000 Pro users with real usage data.
