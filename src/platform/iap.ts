// L10 — Google Play Billing facade.
//
// Mirrors the ads.ts pattern: a clean async API (`purchase`, `restore`,
// `available`) that the rest of the app calls without caring about the
// platform. The actual native plugin is dynamically imported on Android
// (Capacitor) and a web stub fulfils calls instantly in dev/web builds so
// the full pack flow can be exercised without device deploy.
//
// Plugin choice (decided 2026-04-25): we wire against
// `@capgo/capacitor-purchases` lazily (RevenueCat-backed Capacitor 8
// plugin). It's not yet listed in package.json — the dynamic import will
// resolve to null until Kenny installs it. Until then the WEB STUB is the
// active implementation everywhere; fully testable.
//
// IMPORTANT: this module never grants Ichor itself. It only confirms a
// purchase succeeded with Google + returns the SKU. The grant logic lives
// in src/game/iap.ts which decides what bonus to award based on the SKU
// catalog. Separation of concerns keeps the platform layer thin and the
// economy logic testable in pure TS.

import { packForSku } from '../game/config/packs';

export type PurchaseFailureReason =
  | 'native-unavailable'
  | 'unknown-sku'
  | 'cancelled'
  | 'pending'
  | 'failed'
  | 'blocked';

export interface PurchaseResult {
  ok: boolean;
  sku: string;
  reason?: PurchaseFailureReason;
  /** Set by the native plugin on success — opaque server-verifiable token.
   *  We don't validate it client-side at v1.2; future server-side receipt
   *  validation will read this. */
  receiptToken?: string;
}

let initialized = false;
let billingPromise: Promise<unknown | null> | null = null;

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return cap?.isNativePlatform ? cap.isNativePlatform() : false;
}

/** Lazily resolve the native plugin. Returns null on web or when the
 *  module isn't installed; the stub path then handles the call.
 *
 *  Note on the indirection: Vite's `import-analysis` plugin would try
 *  to resolve `@capgo/capacitor-purchases` at build time even though
 *  the import lives inside a try/catch — it would fail the build with
 *  "Failed to resolve import" until the package is in package.json.
 *  Routing through a string variable + `/* @vite-ignore *\/` skips
 *  the static analysis so the catch can do its job at runtime only. */
async function getBilling(): Promise<unknown | null> {
  if (!isNativePlatform()) return null;
  if (!billingPromise) {
    billingPromise = (async () => {
      try {
        const moduleName = '@capgo/capacitor-purchases';
        const mod = await import(/* @vite-ignore */ moduleName);
        return mod;
      } catch {
        return null;
      }
    })();
  }
  return billingPromise;
}

/** Initialise the billing client. Idempotent. Safe on web (no-op).
 *
 *  Once the `@capgo/capacitor-purchases` dependency lands, this is
 *  where the plugin's `initialize({ apiKey, ... })` call goes. For
 *  now we just resolve the import to keep the code path warm and
 *  flip the flag so subsequent calls short-circuit. */
export async function initIap(): Promise<void> {
  if (initialized) return;
  await getBilling();
  initialized = true;
}

/** Whether real Play Billing is wired in. Drives whether the Shop
 *  surfaces "test mode" copy or not. */
export function iapAvailable(): boolean {
  return isNativePlatform();
}

/**
 * Trigger a purchase for `sku`. Returns a PurchaseResult once the Play
 * sheet resolves (success / cancellation / error). On web this fulfils
 * instantly with `ok=true` so the dev loop is unblocked.
 *
 * The caller is expected to call `recordPurchase()` + grant rewards on
 * `ok=true`. Failures are silent — surface a toast in the UI layer.
 */
export async function purchasePack(sku: string): Promise<PurchaseResult> {
  if (!packForSku(sku)) {
    return { ok: false, sku, reason: 'unknown-sku' };
  }
  if (!initialized) await initIap();

  // Native path — currently unwired; will dispatch to the plugin once
  // the dependency lands. Falls through to the stub when null.
  // const billing = await getBilling();
  // if (billing) { return realPurchaseFlow(billing, sku); }

  // Web / dev stub: pretend the user paid and return a fake receipt so
  // the grant flow downstream can be exercised end-to-end.
  if (!isNativePlatform()) {
    return { ok: true, sku, receiptToken: `web-stub-${Date.now()}` };
  }

  // Native platform but no plugin installed yet — refuse cleanly so the
  // UI can show "Purchases coming soon" rather than a silent fail.
  return { ok: false, sku, reason: 'native-unavailable' };
}

/**
 * Restore previously-purchased non-consumable entitlements. We don't
 * have any non-consumable SKUs at v1.2 (every pack is a consumable
 * Ichor bundle, even Pacte Fondateur — the thrall is granted once,
 * the entitlement isn't replayable). Stub returns an empty list.
 */
export async function restorePurchases(): Promise<readonly string[]> {
  if (!initialized) await initIap();
  return [];
}
