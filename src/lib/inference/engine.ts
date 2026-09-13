/**
 * Engine factory — one decision point for the whole app.
 *
 *   free tier (default) -> LocalGemmaEngine  (on-device, no account, no key)
 *   pro tier            -> TinfoilCloudEngine (confidential enclave inference)
 *
 * Fail-closed: if the Pro engine can't be constructed (no key, attestation
 * failure, SDK incompat), we surface an error — we NEVER silently route a
 * Pro user's journal through a different cloud provider.
 */
import { TinfoilCloudEngine } from './cloudEngine';
import { estimateDeviceTier, LocalGemmaEngine, MODEL_CATALOG } from './localEngine';
import { InferenceEngine } from './types';
import { isPro } from '../subscription';

function tinfoilApiKey(): string | null {
  // TODO: read from expo-constants extra / EAS secrets. Never hardcode.
  const key = process.env.TINFOIL_API_KEY;
  return key && !key.includes('replace_me') ? key : null;
}

export async function getEngine(): Promise<InferenceEngine> {
  if (await isPro()) {
    const key = tinfoilApiKey();
    if (!key) throw new Error('Pro is active but no Tinfoil API key is configured. Contact support.');
    const engine = new TinfoilCloudEngine(key);
    await engine.load();
    return engine;
  }
  const tier = await estimateDeviceTier();
  return new LocalGemmaEngine(MODEL_CATALOG[tier]);
}
