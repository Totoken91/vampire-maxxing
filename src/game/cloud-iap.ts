// Server-authoritative IAP receipt validation dispatcher.
//
// Used by src/game/iap.ts purchasePack AFTER the platform Play Billing
// flow returns ok with a receipt token + order id. Flow:
//   1. Push current local snapshot so the server reads our latest blob
//      (ichor balance, packsFirstTimeBought, etc.).
//   2. Invoke validate-purchase edge function with { sku, purchase_token,
//      order_id }. The function validates with Google's Android Publisher
//      API (when configured), inserts a purchases row idempotently on
//      order_id, patches state_blob with the grant, returns the
//      same Grant shape the local grantPackContents would.
//   3. Caller (src/game/iap.ts) emits the existing 'pack-purchased'
//      event so analytics + UI consume the result identically.
//
// On error returns null. The caller surfaces a generic "purchase
// validation failed" toast — the player should retry from the shop,
// which will idempotency-replay the same order_id and recover the grant
// if the server actually committed.

import { getCurrentUser } from './auth';
import { gameState } from './state';
import { pushCurrentSnapshot } from './cloud-sync';
import { getSupabase } from '../platform/supabase';
import { events } from './events';
import { grantIchor } from './ichor';
import type { ThrallId } from './config/thralls';

export interface ServerGrant {
  sku: string;
  ichorCredited: number;
  ichorWasFirstTime: boolean;
  thrallGranted: ThrallId | null;
  rarePullThrall: ThrallId | null;
}

interface ServerEnvelope {
  ok: true;
  grant: ServerGrant;
  validated: boolean;
  replay?: boolean;
}

interface ServerError {
  ok: false;
  error: string;
}

/** Validate a Play Billing purchase server-side and apply the grant
 *  locally. Returns the grant on success, null on validation failure or
 *  network error. The caller (src/game/iap.ts) is responsible for
 *  emitting the 'pack-purchased' event AFTER consuming this result. */
export async function performCloudValidatePurchase(
  sku: string,
  purchaseToken: string,
  orderId: string,
): Promise<ServerGrant | null> {
  const user = getCurrentUser();
  if (!user) return null;

  try {
    await pushCurrentSnapshot();
  } catch {
    // Non-fatal — proceed; the blob may be one autosave behind.
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.functions.invoke('validate-purchase', {
    body: { sku, purchase_token: purchaseToken, order_id: orderId },
  });
  if (error) return null;
  const envelope = data as ServerEnvelope | ServerError | null;
  if (!envelope || envelope.ok !== true) return null;

  // Replay = the order_id was already validated. The server returned
  // the cached grant but did NOT re-apply state_blob. Don't double-grant.
  if (envelope.replay) {
    return envelope.grant;
  }

  // Apply the grant to local state. We mirror the shape the local
  // grantPackContents would produce: ichor via grantIchor (emits
  // ichor-changed + ichor-earned), thrall via obtainThrall (emits
  // thrall-obtained), spending log + first-time consumed via
  // gameState helpers.
  applyGrantLocally(envelope.grant);
  return envelope.grant;
}

function applyGrantLocally(grant: ServerGrant): void {
  if (grant.ichorCredited > 0) {
    grantIchor(grant.ichorCredited, 'iap_pack');
  }
  if (grant.thrallGranted && !gameState.isThrallOwned(grant.thrallGranted)) {
    gameState.obtainThrall(grant.thrallGranted);
  }
  if (grant.rarePullThrall && !gameState.isThrallOwned(grant.rarePullThrall)) {
    gameState.obtainThrall(grant.rarePullThrall);
  }
  if (grant.ichorWasFirstTime) {
    gameState.markFirstTimeConsumed(grant.sku);
  }
  // Spending log — let gameState own this; matches the local path's
  // recordPurchase call. We don't have priceEur from the envelope, so
  // re-derive from the client packs catalog.
  // (Lazy import to avoid a circular dep at module init.)
  void import('./config/packs').then(({ packForSku }) => {
    const pack = packForSku(grant.sku);
    if (pack) gameState.recordPurchase(pack.priceEur, grant.sku);
    events.emit('pack-purchased', {
      sku: grant.sku,
      priceEur: pack?.priceEur ?? 0,
      ichorCredited: grant.ichorCredited,
      wasFirstTime: grant.ichorWasFirstTime,
    });
  });
}
