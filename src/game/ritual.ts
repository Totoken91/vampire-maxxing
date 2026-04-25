// Ritual engine — the gacha brain. Handles RNG, pity, FRG, anti-streak,
// duplicate protection, and pool dynamic per the V1.2 brief.
//
// Decision priority for the rolled rarity (top wins):
//   1. First Rare Guarantee (lifetime, first pull ever → Rare)
//   2. 10-pull bundle guarantee (≥1 Rare+ in any 10-pull)
//   3. Featured Epic pity (every 40 pulls, featured banner only)
//   4. Banner Rare pity (every 10 pulls)
//   5. Anti-streak softener (5 Commons in a row → Rare+)
//   6. Base rates with pool-dynamic redistribution
//
// Dup-protection runs AFTER the thrall id is picked: if the player
// already owns it and an un-owned thrall of the same rarity exists,
// 50% chance to reroll the id (rarity stays).
//
// All randomness funnels through `rng()` so tests can stub it.

import { events } from './events';
import { spendIchor } from './ichor';
import { gameState } from './state';
import {
  BANNERS,
  type BannerId,
} from './config/banners';
import {
  DUPLICATE_PROTECTION_REROLL,
  ESSENCE_PER_DUPE,
  FEATURED_RATES,
  FEATURED_RATE_UP_SHARE,
  PITY,
  RITUAL_COST_BUNDLE_10,
  RITUAL_COST_SINGLE,
  STANDARD_RATES,
} from './config/ritual-rates';
import {
  THRALLS,
  type Thrall,
  type ThrallId,
  type ThrallRarity,
} from './config/thralls';

// ─────────── Types ───────────

export interface PullResult {
  /** null for a Cinder Ceremony (no portrait — every thrall of this
   *  rarity is already owned, so the rite yields essence directly). */
  readonly thrallId: ThrallId | null;
  readonly rarity: ThrallRarity;
  readonly wasDupe: boolean;
  readonly essenceGained: number;
  /** When true, the pull resolved as a saturation Cinder Ceremony.
   *  The animation skips the portrait reveal and goes straight to the
   *  rarity-tinted essence ember bloom. */
  readonly isCinder: boolean;
  readonly flags: PullFlags;
}

export interface PullFlags {
  readonly frg: boolean;
  readonly pityRare: boolean;
  readonly pityEpic: boolean;
  readonly bundleGuarantee: boolean;
  readonly antiStreak: boolean;
  readonly duplicateProtection: boolean;
  readonly featuredRateUp: boolean;
}

export interface BannerProgress {
  /** 0..N — pulls since last Rare+ on this banner. UI shows N - x left. */
  readonly pityRare: number;
  readonly pityRareCap: number;
  /** Featured-only — null on Standard. */
  readonly pityEpic: number | null;
  readonly pityEpicCap: number | null;
  readonly totalPulls: number;
}

// ─────────── RNG (swappable for tests) ───────────

let rngImpl: () => number = Math.random;
export function setRng(fn: () => number): void {
  rngImpl = fn;
}
export function resetRng(): void {
  rngImpl = Math.random;
}
function rng(): number {
  return rngImpl();
}

// ─────────── Cost / affordability ───────────

export function costFor(count: 1 | 10): number {
  return count === 10 ? RITUAL_COST_BUNDLE_10 : RITUAL_COST_SINGLE;
}

export function canAffordPull(count: 1 | 10): boolean {
  return gameState.getIchor() >= costFor(count);
}

// ─────────── Pull entry point ───────────

/**
 * Charge the Ichor cost and roll `count` pulls on the given banner.
 * Returns the rolled results (with dup/essence/flag metadata) or null
 * if the player can't afford the bundle. Caller is expected to drive
 * the UI animation from the returned array.
 */
export function performPull(banner: BannerId, count: 1 | 10): PullResult[] | null {
  const cost = costFor(count);
  if (!spendIchor(cost, 'ritual_spent')) return null;

  const results: PullResult[] = [];
  let bundleHasRarePlus = false;

  for (let i = 0; i < count; i += 1) {
    const isLastOfBundle = count === 10 && i === count - 1;
    const result = rollOne(banner, {
      bundleGuaranteeNeeded: isLastOfBundle && !bundleHasRarePlus,
    });
    if (result.rarity !== 'common') bundleHasRarePlus = true;
    results.push(result);
  }

  events.emit('ritual-pull-performed', { banner, results });
  return results;
}

// ─────────── Internals ───────────

interface RollContext {
  readonly bundleGuaranteeNeeded: boolean;
}

function rollOne(banner: BannerId, ctx: RollContext): PullResult {
  const ritual = ritualStateFor(banner);
  const featured = banner === 'featured';
  const flags: { -readonly [K in keyof PullFlags]: PullFlags[K] } = {
    frg: false,
    pityRare: false,
    pityEpic: false,
    bundleGuarantee: false,
    antiStreak: false,
    duplicateProtection: false,
    featuredRateUp: false,
  };

  // ── 1. Resolve forced rarity (top of priority list) ──
  let rarity: ThrallRarity | null = null;

  if (!gameState.hasUsedFirstRareGuarantee()) {
    rarity = 'rare';
    flags.frg = true;
  } else if (ctx.bundleGuaranteeNeeded) {
    // Force Rare; if pity epic is also at threshold, prefer Epic.
    if (featured && ritual.pityCounterEpic >= PITY.featuredEpic - 1) {
      rarity = 'epic';
      flags.pityEpic = true;
    } else {
      rarity = 'rare';
    }
    flags.bundleGuarantee = true;
  } else if (featured && ritual.pityCounterEpic >= PITY.featuredEpic - 1) {
    rarity = 'epic';
    flags.pityEpic = true;
  } else if (ritual.pityCounterRare >= rareCapFor(banner) - 1) {
    rarity = 'rare';
    flags.pityRare = true;
  } else if (ritual.commonStreak >= PITY.antiStreakCommons) {
    rarity = 'rare';
    flags.antiStreak = true;
  }

  // ── 2. Otherwise roll using base rates ──
  // The cascade walks here — both for naturally rolled rarities AND
  // for forced ones (pity / bundle / anti-streak / FRG). Without
  // this, a pity-forced rare with all rares already owned would
  // pick a duplicate thrall and show its portrait again instead of
  // routing to a Cinder Ceremony.
  if (rarity === null) {
    rarity = rollRarity(banner);
  }
  const intendedRarity = rarity;
  const climbed = walkCascadeForUnowned(rarity);
  if (climbed === null) {
    // Whole cascade is saturated → Cinder Ceremony at the originally
    // intended rarity (whether rolled or forced by pity / bundle).
    return resolveCinder(intendedRarity, ritual, banner, flags);
  }
  rarity = climbed;

  // ── 3. Pick a thrall id within that rarity ──
  let thrallId = pickThrallId(banner, rarity, flags);

  // ── 4. Duplicate protection (silent reroll into un-owned) ──
  if (gameState.isThrallOwned(thrallId)) {
    const unowned = unownedOf(rarity);
    if (unowned.length > 0 && rng() < DUPLICATE_PROTECTION_REROLL) {
      thrallId = unowned[Math.floor(rng() * unowned.length)].id;
      flags.duplicateProtection = true;
    }
  }

  // ── 5. Apply ──
  const wasDupe = gameState.isThrallOwned(thrallId);
  let essenceGained = 0;
  if (wasDupe) {
    essenceGained = ESSENCE_PER_DUPE[rarity];
    gameState.grantEssence(rarity, essenceGained);
  } else {
    gameState.obtainThrall(thrallId);
  }

  // First Rare Guarantee is a lifetime flag — flip it after the very
  // first pull regardless of result (the spec: "tout premier pull").
  if (!gameState.hasUsedFirstRareGuarantee()) {
    gameState.markFirstRareGuaranteeUsed();
  }

  // Pity / streak bookkeeping.
  ritual.totalPulls += 1;
  if (rarity === 'common') {
    ritual.commonStreak += 1;
    ritual.pityCounterRare += 1;
    if (featured) ritual.pityCounterEpic += 1;
  } else if (rarity === 'rare') {
    ritual.commonStreak = 0;
    ritual.pityCounterRare = 0;
    if (featured) ritual.pityCounterEpic += 1;
  } else if (rarity === 'epic') {
    ritual.commonStreak = 0;
    ritual.pityCounterRare = 0;
    if (featured) ritual.pityCounterEpic = 0;
  }

  // History (keep last 50, oldest at index 0 dropped).
  gameState.pushPullEntry({
    ts: Date.now(),
    banner,
    thrallId,
    rarity,
    wasDupe,
    essenceGained,
    flags: { ...flags },
  });

  return { thrallId, rarity, wasDupe, essenceGained, isCinder: false, flags };
}

/**
 * Walk the cascade: if `start` has un-owned thralls, return it as-is.
 * Otherwise climb to the next higher rarity until we find one with
 * un-owned thralls. Return null if the whole chain is saturated —
 * that's the trigger for a Cinder Ceremony.
 */
function walkCascadeForUnowned(start: ThrallRarity): ThrallRarity | null {
  const order: readonly ThrallRarity[] = ['common', 'rare', 'epic', 'legendary'];
  const idx = order.indexOf(start);
  for (let i = idx; i < order.length; i += 1) {
    const tier = order[i];
    if (!hasAnyOfRarity(tier)) continue; // skip rarities with no roster (legendary in v1.0)
    if (!allOwned(tier)) return tier;
  }
  return null;
}

function hasAnyOfRarity(rarity: ThrallRarity): boolean {
  for (const t of THRALLS) {
    if (t.rarity === rarity) return true;
  }
  return false;
}

/**
 * Resolve a Cinder Ceremony: a rite where the rarity rolled is fully
 * saturated and there's no higher tier to climb. Yields essence
 * tokens of the rolled rarity, no portrait, no thrall_obtained event.
 * Pity/streak counters still advance based on the roll's rarity so
 * the player isn't punished by the saturation.
 */
function resolveCinder(
  rolled: ThrallRarity,
  ritual: ReturnType<typeof ritualStateFor>,
  banner: BannerId,
  flags: PullFlags,
): PullResult {
  const featured = banner === 'featured';

  // Lifetime FRG — still considered "used" if the first lifetime pull
  // ever lands on a saturated roster (extreme edge case but possible
  // via cheats / future selectors).
  if (!gameState.hasUsedFirstRareGuarantee()) {
    gameState.markFirstRareGuaranteeUsed();
  }

  // Grant the essence pile.
  const essenceGained = ESSENCE_PER_DUPE[rolled];
  if (essenceGained > 0) {
    gameState.grantEssence(rolled, essenceGained);
  }

  // Pity/streak still ticks as if a normal roll of this rarity landed.
  ritual.totalPulls += 1;
  if (rolled === 'common') {
    ritual.commonStreak += 1;
    ritual.pityCounterRare += 1;
    if (featured) ritual.pityCounterEpic += 1;
  } else if (rolled === 'rare') {
    ritual.commonStreak = 0;
    ritual.pityCounterRare = 0;
    if (featured) ritual.pityCounterEpic += 1;
  } else if (rolled === 'epic') {
    ritual.commonStreak = 0;
    ritual.pityCounterRare = 0;
    if (featured) ritual.pityCounterEpic = 0;
  }

  gameState.pushPullEntry({
    ts: Date.now(),
    banner,
    thrallId: null,
    rarity: rolled,
    wasDupe: true,
    essenceGained,
    flags: { ...flags },
  });

  return {
    thrallId: null,
    rarity: rolled,
    wasDupe: true,
    essenceGained,
    isCinder: true,
    flags: { ...flags },
  };
}

function rareCapFor(banner: BannerId): number {
  return banner === 'featured' ? PITY.featuredRare : PITY.standardRare;
}

/**
 * Roll a rarity from the BANNER'S BASE RATES — no redistribution.
 * The cascade runs separately in `walkCascadeForUnowned` so a fully
 * saturated player gets a Cinder Ceremony at the rolled rarity
 * (giving 82/15/3 visual variety) instead of 100% epic spam.
 */
function rollRarity(banner: BannerId): ThrallRarity {
  const base = banner === 'featured' ? FEATURED_RATES : STANDARD_RATES;
  const r = rng();
  let acc = 0;
  // Iterate rarest → commonest so the early-exit lands cleanly when
  // r falls in the small epic / rare buckets.
  for (const rarity of ['epic', 'rare', 'common'] as const) {
    acc += base[rarity];
    if (r < acc) return rarity;
  }
  // Floating-point drift safety net.
  return 'common';
}

/**
 * Pick a thrall id within a given rarity, honouring the Featured
 * banner's rate-up split. The featured share is sampled INSIDE the
 * already-decided rarity bucket (i.e. once we know we're rolling a
 * Rare on Featured, we then split between rate-up Rares and the
 * remaining Rares).
 */
function pickThrallId(
  banner: BannerId,
  rarity: ThrallRarity,
  flags: { featuredRateUp: boolean },
): ThrallId {
  const banDef = BANNERS[banner];
  const candidates = THRALLS.filter((t) => t.rarity === rarity);
  if (candidates.length === 0) {
    // Shouldn't happen with the v1.0 roster (every C/R/E rarity has at
    // least 2 entries), but if a rarity is empty we fall back one tier.
    const fallback =
      rarity === 'epic' ? 'rare' : rarity === 'rare' ? 'common' : 'common';
    return pickThrallId(banner, fallback, flags);
  }

  const featuredHere = banDef.featuredIds.filter((id) =>
    candidates.some((t) => t.id === id),
  );

  if (banner === 'featured' && featuredHere.length > 0) {
    const share = FEATURED_RATE_UP_SHARE[rarity];
    if (rng() < share) {
      flags.featuredRateUp = true;
      return featuredHere[Math.floor(rng() * featuredHere.length)];
    }
    const nonFeatured = candidates.filter((t) => !featuredHere.includes(t.id));
    if (nonFeatured.length > 0) {
      return nonFeatured[Math.floor(rng() * nonFeatured.length)].id;
    }
    // Edge case: all of this rarity ARE featured → fall through to
    // uniform pick. Won't happen in v1.0 (Mirella is the only
    // featured Epic, paired with Velmor).
  }

  return candidates[Math.floor(rng() * candidates.length)].id;
}

function unownedOf(rarity: ThrallRarity): readonly Thrall[] {
  return THRALLS.filter((t) => t.rarity === rarity && !gameState.isThrallOwned(t.id));
}

function allOwned(rarity: ThrallRarity): boolean {
  for (const t of THRALLS) {
    if (t.rarity === rarity && !gameState.isThrallOwned(t.id)) return false;
  }
  return true;
}

function ritualStateFor(banner: BannerId) {
  return gameState.getRitualState()[banner];
}

// ─────────── UI helpers ───────────

export function getBannerProgress(banner: BannerId): BannerProgress {
  const r = ritualStateFor(banner);
  return {
    pityRare: r.pityCounterRare,
    pityRareCap: rareCapFor(banner),
    pityEpic: banner === 'featured' ? r.pityCounterEpic : null,
    pityEpicCap: banner === 'featured' ? PITY.featuredEpic : null,
    totalPulls: r.totalPulls,
  };
}
