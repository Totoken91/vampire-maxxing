// Pure pull engine — server-side authoritative version of src/game/ritual.ts.
//
// Takes (state, banner, count, rng) and returns (newState, results). No
// side effects: no DB calls, no event bus, no logging. Caller (index.ts)
// reads the state from player_state.state_blob, runs this, persists the
// new state, and inserts the gacha_pulls log row.
//
// Decision priority for the rolled rarity (top wins):
//   1. First Rare Guarantee (lifetime, first pull ever → Rare)
//   2. Welcome Tribute (V1.3, Standard banner only, post-Soulreave)
//   3. 10-pull bundle guarantee (≥1 Rare+ in any 10-pull)
//   4. Legendary hard pity (every 80 pulls)
//   5. Featured Epic pity (every 40 pulls, Featured only)
//   6. Banner Rare pity (every 10 pulls)
//   7. Anti-streak softener (5 Commons in a row → Rare+)
//   8. Base rates with Legendary soft-pity ramp from pull 70

import {
  BANNERS,
  CINDER_ESSENCE_PER_RARITY,
  DUPLICATE_PROTECTION_REROLL,
  ESSENCE_PER_DUPE,
  FEATURED_RATES,
  FEATURED_RATE_UP_SHARE,
  PITY,
  PULL_HISTORY_MAX,
  STANDARD_RATES,
  THRALLS,
  type BannerId,
  type ThrallRarity,
} from './config.ts';

export interface RitualBannerState {
  pityCounterRare: number;
  pityCounterEpic: number;
  pityCounterLegendary: number;
  commonStreak: number;
  totalPulls: number;
}

export interface RitualState {
  standard: RitualBannerState;
  featured: RitualBannerState;
  firstRareGuaranteeUsed: boolean;
  history: PullHistoryEntry[];
}

export interface PullHistoryEntry {
  ts: number;
  banner: BannerId;
  thrallId: string | null;
  rarity: ThrallRarity;
  wasDupe: boolean;
  essenceGained: number;
  flags: Record<string, boolean>;
}

export interface PullState {
  ichor: number;
  ritualState: RitualState;
  /** Set of owned thrall ids. Engine treats it as immutable internally
   *  but `runEngine` returns a new Set (or mutates a clone). */
  ownedThrallIds: Set<string>;
  /** Map of thrall id -> first-obtained timestamp. Engine adds entries
   *  here for newly obtained thralls so the caller can mirror them
   *  into state_blob.playerThralls. */
  newlyObtained: Map<string, number>;
  essences: { common: number; rare: number; epic: number; legendary: number };
  welcomeTributeArmed: boolean;
  /** V1.3 — V1.2-EXT — Frisson du Destin pending pity bump. Mirrors
   *  client behaviour. Optional in state since older saves may not
   *  have it. */
  pendingFrissonBuff: boolean;
}

export interface PullResult {
  thrallId: string | null;
  rarity: ThrallRarity;
  wasDupe: boolean;
  essenceGained: number;
  isCinder: boolean;
  flags: PullFlags;
}

export interface PullFlags {
  frg: boolean;
  pityRare: boolean;
  pityEpic: boolean;
  pityLegendary: boolean;
  bundleGuarantee: boolean;
  antiStreak: boolean;
  duplicateProtection: boolean;
  featuredRateUp: boolean;
  welcomeTribute: boolean;
}

function emptyFlags(): PullFlags {
  return {
    frg: false,
    pityRare: false,
    pityEpic: false,
    pityLegendary: false,
    bundleGuarantee: false,
    antiStreak: false,
    duplicateProtection: false,
    featuredRateUp: false,
    welcomeTribute: false,
  };
}

export function rareCapFor(banner: BannerId): number {
  return banner === 'featured' ? PITY.featuredRare : PITY.standardRare;
}

export function costFor(count: 1 | 10): number {
  return count === 10 ? 95 : 10;
}

export interface EngineInput {
  state: PullState;
  banner: BannerId;
  count: 1 | 10;
  rng: () => number;
  /** Wall-clock ms used for history entries + newlyObtained timestamps.
   *  Injected so tests can pin it. Production passes Date.now(). */
  now: number;
}

export interface EngineOutput {
  state: PullState;
  results: PullResult[];
}

/** Run `count` pulls and return the diff. Throws if ichor is insufficient
 *  (caller must validate first to give a clean 402 response). */
export function runEngine(input: EngineInput): EngineOutput {
  const cost = costFor(input.count);
  if (input.state.ichor < cost) {
    throw new Error(`insufficient ichor: have ${input.state.ichor}, need ${cost}`);
  }

  const state = cloneState(input.state);
  state.ichor -= cost;

  const results: PullResult[] = [];
  let bundleHasRarePlus = false;
  for (let i = 0; i < input.count; i += 1) {
    const isLastOfBundle = input.count === 10 && i === input.count - 1;
    const result = rollOne(state, input.banner, input.rng, input.now, {
      bundleGuaranteeNeeded: isLastOfBundle && !bundleHasRarePlus,
    });
    if (result.rarity !== 'common') bundleHasRarePlus = true;
    results.push(result);
  }

  return { state, results };
}

function cloneState(state: PullState): PullState {
  return {
    ichor: state.ichor,
    ritualState: {
      standard: { ...state.ritualState.standard },
      featured: { ...state.ritualState.featured },
      firstRareGuaranteeUsed: state.ritualState.firstRareGuaranteeUsed,
      history: [...state.ritualState.history],
    },
    ownedThrallIds: new Set(state.ownedThrallIds),
    newlyObtained: new Map(state.newlyObtained),
    essences: { ...state.essences },
    welcomeTributeArmed: state.welcomeTributeArmed,
    pendingFrissonBuff: state.pendingFrissonBuff,
  };
}

function rollOne(
  state: PullState,
  banner: BannerId,
  rng: () => number,
  now: number,
  ctx: { bundleGuaranteeNeeded: boolean },
): PullResult {
  const ritual = state.ritualState[banner];
  const featured = banner === 'featured';
  const flags = emptyFlags();

  // ── Resolve forced rarity ──
  let rarity: ThrallRarity | null = null;

  if (!state.ritualState.firstRareGuaranteeUsed) {
    rarity = 'rare';
    flags.frg = true;
  } else if (banner === 'standard' && state.welcomeTributeArmed) {
    rarity = 'rare';
    flags.welcomeTribute = true;
    state.welcomeTributeArmed = false;
  } else if (ctx.bundleGuaranteeNeeded) {
    if (ritual.pityCounterLegendary >= PITY.legendary - 1) {
      rarity = 'legendary';
      flags.pityLegendary = true;
    } else if (featured && ritual.pityCounterEpic >= PITY.featuredEpic - 1) {
      rarity = 'epic';
      flags.pityEpic = true;
    } else {
      rarity = 'rare';
    }
    flags.bundleGuarantee = true;
  } else if (ritual.pityCounterLegendary >= PITY.legendary - 1) {
    rarity = 'legendary';
    flags.pityLegendary = true;
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

  // Roll the rest naturally with soft-pity ramp.
  if (rarity === null) {
    rarity = rollRarity(banner, ritual.pityCounterLegendary, rng);
  }
  const intendedRarity = rarity;

  // Cascade walk: climb past saturated tiers; null = full saturation.
  const climbed = walkCascadeForUnowned(state.ownedThrallIds, rarity);
  if (climbed === null) {
    return resolveCinder(state, intendedRarity, ritual, featured, flags, banner, now);
  }
  rarity = climbed;

  // Pick a thrall id within that rarity.
  let thrallId = pickThrallId(banner, rarity, rng, flags);

  // Duplicate protection.
  if (state.ownedThrallIds.has(thrallId)) {
    const unowned = unownedOf(rarity, state.ownedThrallIds);
    if (unowned.length > 0 && rng() < DUPLICATE_PROTECTION_REROLL) {
      thrallId = unowned[Math.floor(rng() * unowned.length)];
      flags.duplicateProtection = true;
    }
  }

  const wasDupe = state.ownedThrallIds.has(thrallId);
  let essenceGained = 0;
  if (wasDupe) {
    essenceGained = ESSENCE_PER_DUPE[rarity];
    state.essences[rarity] += essenceGained;
  } else {
    state.ownedThrallIds.add(thrallId);
    state.newlyObtained.set(thrallId, now);
  }

  // FRG flips after the first lifetime pull regardless of result.
  if (!state.ritualState.firstRareGuaranteeUsed) {
    state.ritualState.firstRareGuaranteeUsed = true;
  }

  // Pity / streak bookkeeping.
  ritual.totalPulls += 1;
  applyPityAdvance(state, ritual, rarity, featured);

  pushHistory(state.ritualState, {
    ts: now,
    banner,
    thrallId,
    rarity,
    wasDupe,
    essenceGained,
    flags: { ...flags },
  });

  return { thrallId, rarity, wasDupe, essenceGained, isCinder: false, flags };
}

function resolveCinder(
  state: PullState,
  rolled: ThrallRarity,
  ritual: RitualBannerState,
  featured: boolean,
  flags: PullFlags,
  banner: BannerId,
  now: number,
): PullResult {
  if (!state.ritualState.firstRareGuaranteeUsed) {
    state.ritualState.firstRareGuaranteeUsed = true;
  }
  const essenceGained = CINDER_ESSENCE_PER_RARITY[rolled];
  if (essenceGained > 0) {
    state.essences[rolled] += essenceGained;
  }
  ritual.totalPulls += 1;
  applyPityAdvance(state, ritual, rolled, featured);
  pushHistory(state.ritualState, {
    ts: now,
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

function applyPityAdvance(
  state: PullState,
  ritual: RitualBannerState,
  rarity: ThrallRarity,
  featured: boolean,
): void {
  if (rarity === 'common') {
    ritual.commonStreak += 1;
    ritual.pityCounterRare += 1;
    ritual.pityCounterLegendary += 1;
    if (featured) ritual.pityCounterEpic += 1;
    if (state.pendingFrissonBuff) {
      ritual.pityCounterRare += 1;
      state.pendingFrissonBuff = false;
    }
  } else if (rarity === 'rare') {
    ritual.commonStreak = 0;
    ritual.pityCounterRare = 0;
    ritual.pityCounterLegendary += 1;
    if (featured) ritual.pityCounterEpic += 1;
  } else if (rarity === 'epic') {
    ritual.commonStreak = 0;
    ritual.pityCounterRare = 0;
    ritual.pityCounterLegendary += 1;
    if (featured) ritual.pityCounterEpic = 0;
  } else if (rarity === 'legendary') {
    ritual.commonStreak = 0;
    ritual.pityCounterRare = 0;
    ritual.pityCounterLegendary = 0;
    if (featured) ritual.pityCounterEpic = 0;
  }
}

function rollRarity(
  banner: BannerId,
  pityLegendary: number,
  rng: () => number,
): ThrallRarity {
  const base = banner === 'featured' ? FEATURED_RATES : STANDARD_RATES;
  let legendaryRate = base.legendary;
  if (pityLegendary >= PITY.legendarySoftStart) {
    const overshoot = pityLegendary - PITY.legendarySoftStart + 1;
    legendaryRate = Math.min(1, base.legendary + overshoot * PITY.legendarySoftRamp);
  }
  const epicRate = base.epic;
  const rareRate = base.rare;
  const commonRate = Math.max(0, 1 - legendaryRate - epicRate - rareRate);

  const r = rng();
  let acc = 0;
  for (const [rarity, rate] of [
    ['legendary', legendaryRate] as const,
    ['epic', epicRate] as const,
    ['rare', rareRate] as const,
    ['common', commonRate] as const,
  ]) {
    acc += rate;
    if (r < acc) return rarity;
  }
  return 'common';
}

function pickThrallId(
  banner: BannerId,
  rarity: ThrallRarity,
  rng: () => number,
  flags: PullFlags,
): string {
  const candidates = THRALLS.filter((t) => t.rarity === rarity);
  if (candidates.length === 0) {
    const fallback: ThrallRarity =
      rarity === 'epic' ? 'rare' : rarity === 'rare' ? 'common' : 'common';
    return pickThrallId(banner, fallback, rng, flags);
  }
  const featuredIds = BANNERS[banner].featuredIds;
  const featuredHere = featuredIds.filter((id) =>
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
  }
  return candidates[Math.floor(rng() * candidates.length)].id;
}

function walkCascadeForUnowned(
  ownedIds: Set<string>,
  start: ThrallRarity,
): ThrallRarity | null {
  const order: readonly ThrallRarity[] = ['common', 'rare', 'epic', 'legendary'];
  const idx = order.indexOf(start);
  for (let i = idx; i < order.length; i += 1) {
    const tier = order[i];
    if (!hasAnyOfRarity(tier)) continue;
    if (!allOwned(tier, ownedIds)) return tier;
  }
  return null;
}

function hasAnyOfRarity(rarity: ThrallRarity): boolean {
  return THRALLS.some((t) => t.rarity === rarity);
}
function allOwned(rarity: ThrallRarity, ownedIds: Set<string>): boolean {
  for (const t of THRALLS) {
    if (t.rarity === rarity && !ownedIds.has(t.id)) return false;
  }
  return true;
}
function unownedOf(rarity: ThrallRarity, ownedIds: Set<string>): string[] {
  return THRALLS.filter((t) => t.rarity === rarity && !ownedIds.has(t.id)).map(
    (t) => t.id,
  );
}

function pushHistory(rs: RitualState, entry: PullHistoryEntry): void {
  rs.history.push(entry);
  if (rs.history.length > PULL_HISTORY_MAX) {
    rs.history.splice(0, rs.history.length - PULL_HISTORY_MAX);
  }
}
