/**
 * Subscription state via RevenueCat (react-native-purchases).
 *
 * The ONLY thing the app checks: the "pro" entitlement. Everything else —
 * products, pricing, paywalls — lives in the RevenueCat dashboard and the
 * App Store / Play Console, so pricing can change without an app update.
 *
 * Setup checklist (see docs/MONETIZATION.md):
 *  1. RevenueCat project + iOS app (bundle id com.wormgod.memojournal)
 *  2. App Store Connect subscription group + products
 *  3. Entitlement named "pro" attached to both monthly + annual products
 *  4. REVENUECAT_IOS_KEY in EAS secrets (TODO: wire into app config)
 */
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

export const PRO_ENTITLEMENT = 'pro';

let configured = false;

export async function initializePurchases(): Promise<void> {
  if (configured) return;
  // TODO: replace with real public SDK key from EAS secrets / expo-constants.
  const apiKey = Platform.select({
    ios: process.env.REVENUECAT_IOS_KEY,
    android: process.env.REVENUECAT_ANDROID_KEY,
  });
  if (!apiKey) {
    // No key configured (dev / scaffold) — stay on the free tier.
    return;
  }
  Purchases.configure({ apiKey });
  configured = true;
}

/** Single source of truth for tier gating. */
export async function isPro(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[PRO_ENTITLEMENT] != null;
  } catch {
    return false; // fail closed toward free tier
  }
}

export async function getOfferings() {
  if (!configured) return null;
  return Purchases.getOfferings();
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  await Purchases.restorePurchases();
  return isPro();
}
