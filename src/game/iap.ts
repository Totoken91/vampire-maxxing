// L10/L11 — IAP grant engine.
//
// This module is the bridge between the platform billing facade
// (src/platform/iap.ts → returns "Google said yes/no") and the game
// economy (Ichor balance, thrall roster, spending log, FT-Double
// bookkeeping). It owns:
//
//   1. The end-to-end purchase flow: gate → call platform → on success,
//      grant rewards + record purchase + emit events.
//   2. The First-Time Double bonus accounting (one-shot per SKU).
//   3. The Pacte Fondateur trigger arming on first Rare+ acquisition.
//   4. Pack visibility helpers used by the Shop UI.
//
// It does NOT own the pull RNG, the rates, or the modal flow — those
// live in their own modules and consume what we expose here.

import { events } from './events';
import { gameState } from './state';
import { grantIchor, type IchorSource } from './ichor';
import { THRALLS, THRALLS_BY_ID, type ThrallId } from './config/thralls';
import {
  FOUNDER_PACK_SKU,
  packForSku,
  type PackDef,
} from './config/packs';
import { purchasePack as platformPurchase } from '../platform/iap';

/** What was actually granted on a successful purchase. The UI uses
 *  this to render the post-purchase celebration (Ichor counter
 *  animation, thrall reveal modal if applicable, etc.). */
export interface PurchaseGrant {
  sku: string;
  ichorCredited: number;
  ichorWasFirstTime: boolean;
  thrallGranted: ThrallId | null;
  /** Set when the bonus is `guaranteed_rare` and the random pull
   *  resolved to a specific thrall id. */
  rarePullThrall: ThrallId | null;
}

/** Failure reasons surfaced to the UI. Keep stable — copy strings
 *  reference these. */
export type PurchaseFailure =
  | 'unknown-sku'
  | 'cancelled'
  | 'pending'
  | 'failed'
  | 'native-unavailable'
  | 'blocked-under13'
  | 'blocked-spending-cap';

export type PurchaseOutcome =
  | { ok: true; grant: PurchaseGrant }
  | { ok: false; reason: PurchaseFailure; message?: string };

/**
 * Run the full purchase flow for a SKU.
 *
 * Order of operations:
 *  1. Look up the pack — unknown SKU rejects.
 *  2. Check L13 spending guards (under-13 lock, daily cap). If blocked,
 *     return early WITHOUT calling Play Billing — keeps the receipt
 *     ledger clean and sidesteps a refund flow.
 *  3. Call the platform layer (web stub or Play Billing).
 *  4. On success: grant Ichor + bonus, mark FT consumed, append to
 *     spending log, emit `pack-purchased`.
 */
export async function purchasePack(sku: string): Promise<PurchaseOutcome> {
  const pack = packForSku(sku);
  if (!pack) return { ok: false, reason: 'unknown-sku' };

  const blockMsg = gameState.blockReasonForPurchase(pack.priceEur);
  if (blockMsg) {
    if (gameState.isUnder13()) {
      return { ok: false, reason: 'blocked-under13', message: blockMsg };
    }
    return { ok: false, reason: 'blocked-spending-cap', message: blockMsg };
  }

  const result = await platformPurchase(sku);
  if (!result.ok) {
    const mapped = mapPlatformReason(result.reason);
    return { ok: false, reason: mapped };
  }

  const grant = grantPackContents(pack);
  gameState.recordPurchase(pack.priceEur, sku);
  events.emit('pack-purchased', {
    sku,
    priceEur: pack.priceEur,
    ichorCredited: grant.ichorCredited,
    wasFirstTime: grant.ichorWasFirstTime,
  });
  return { ok: true, grant };
}

/** Grant the configured rewards for a pack. Pure side-effect on state;
 *  returns the breakdown so callers can render a post-purchase modal. */
function grantPackContents(pack: PackDef): PurchaseGrant {
  const isFirstTime = !gameState.hasConsumedFirstTime(pack.sku);
  const ichorAmount =
    pack.baseIchor + (isFirstTime ? pack.firstTimeBonusIchor : 0);
  const ichorCredited = grantIchor(ichorAmount, sourceForPack(pack));
  if (isFirstTime) gameState.markFirstTimeConsumed(pack.sku);

  let thrallGranted: ThrallId | null = null;
  let rarePullThrall: ThrallId | null = null;
  switch (pack.bonus.kind) {
    case 'guaranteed_thrall': {
      const id = pack.bonus.thrallId;
      if (!gameState.isThrallOwned(id)) {
        gameState.obtainThrall(id);
        thrallGranted = id;
      }
      break;
    }
    case 'guaranteed_rare': {
      // Direct grant — pick a random un-owned Rare thrall and obtain it.
      // We don't route through the ritual engine because (a) the pull
      // cost shouldn't fire, (b) bundling the grant with the ritual
      // history would muddy player-facing pull-rate analytics, and
      // (c) this path is rare (one Starter Coven per save), simplicity
      // wins over reusing the gacha cascade.
      const unownedRares = THRALLS.filter(
        (t) => t.rarity === 'rare' && !gameState.isThrallOwned(t.id),
      );
      if (unownedRares.length > 0) {
        const pick = unownedRares[Math.floor(Math.random() * unownedRares.length)];
        gameState.obtainThrall(pick.id);
        rarePullThrall = pick.id;
      } else {
        // Player already owns every Rare → fall back to a small Ichor
        // compensation (10 Ichor — roughly the value of a single pull).
        // Cheaper than a Cinder Ceremony but matches its spirit.
        grantIchor(10, 'iap_pack');
      }
      break;
    }
    case 'none':
      break;
  }

  return {
    sku: pack.sku,
    ichorCredited,
    ichorWasFirstTime: isFirstTime,
    thrallGranted,
    rarePullThrall,
  };
}

/** Map a platform-layer failure reason to the UI-facing PurchaseFailure
 *  type. Keep these in lockstep with copy in the Shop tab. */
function mapPlatformReason(
  reason: string | undefined,
): PurchaseFailure {
  switch (reason) {
    case 'cancelled':
      return 'cancelled';
    case 'pending':
      return 'pending';
    case 'unknown-sku':
      return 'unknown-sku';
    case 'native-unavailable':
      return 'native-unavailable';
    default:
      return 'failed';
  }
}

/** All packs route their Ichor through `'iap_pack'` per the
 *  IchorSource enum — analytics segment paid vs earned by reading the
 *  `earnedNotPaid` flag on the ledger entry. */
function sourceForPack(_pack: PackDef): IchorSource {
  return 'iap_pack';
}

// ─── Pacte Fondateur trigger ────────────────────────────────────────

/**
 * Watch for the player's first Rare+ acquisition (any source). On the
 * first one, stamp the welcome-pack timestamp so the Pacte Fondateur
 * jumps to the FEATURED hero slot in Shop. Idempotent — subsequent
 * Rare/Epic obtains don't reset the timestamp.
 *
 * Wired in main.ts at boot via `installFounderPackTrigger()`.
 */
export function installFounderPackTrigger(): void {
  events.on('thrall-obtained', ({ id, firstTime }) => {
    if (!firstTime) return;
    const def = THRALLS_BY_ID[id];
    if (!def) return;
    if (def.rarity === 'common') return;
    const before = gameState.getWelcomeFirstRareAt();
    gameState.markWelcomeFirstRareEarned();
    const after = gameState.getWelcomeFirstRareAt();
    if (before === null && after !== null) {
      events.emit('welcome-pack-armed', { sku: FOUNDER_PACK_SKU, ts: after });
    }
  });
}

// ─── UI helpers ────────────────────────────────────────────────────

/**
 * Returns the visibility state of a pack in the Shop. Used to drive
 * featured-vs-grid placement + lock-state UI:
 *   - `hidden`   = triggered pack whose trigger hasn't fired yet
 *   - `featured` = triggered pack inside its hero window (post-trigger
 *                  for `featuredDays` days)
 *   - `grid`     = always-visible pack OR triggered pack past its
 *                  featured window
 *
 * The Shop UI layer renders `featured` packs in a hero card slot above
 * the regular grid.
 */
export function packDisplayMode(
  pack: PackDef,
  now: number = Date.now(),
): 'hidden' | 'featured' | 'grid' {
  if (!pack.triggered) return 'grid';
  const armedAt = gameState.getWelcomeFirstRareAt();
  if (armedAt === null) return 'hidden';
  const cutoff = armedAt + pack.triggered.featuredDays * 24 * 60 * 60 * 1000;
  return now < cutoff ? 'featured' : 'grid';
}

/** Whether the FT-Double ribbon should still show on this pack. */
export function isFirstTimeAvailable(pack: PackDef): boolean {
  return (
    pack.firstTimeBonusIchor > 0 && !gameState.hasConsumedFirstTime(pack.sku)
  );
}
