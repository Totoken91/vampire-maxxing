// L6 — Awakening config. Star tier multipliers, essence costs per
// awakening step, downward conversion rate, equip slot count.
//
// Stars are stored as 0..maxStars-1 (0 = base 1★, 4 = max 5★ for C/R/E,
// 5 = max 6★ for Legendary). The multiplier at stars=0 is always 1.0
// so a freshly obtained thrall has its base value un-modified.
//
// Source of truth — exposed via the legal disclosure screen (L9) and
// referenced by tests/awakening.test.ts.

import type { ThrallRarity } from './thralls';

/** Max awakening level by rarity (1★ start, ★ count INCLUSIVE of base). */
export const STAR_MAX_PER_RARITY: Readonly<Record<ThrallRarity, number>> = {
  common: 5,
  rare: 5,
  epic: 5,
  legendary: 6,
};

/** Multiplier on the thrall's bonus percentage at each star tier.
 *  Index 0 = 1★ (just obtained, no boost), index N-1 = max star. */
export const STAR_MULTIPLIERS_PER_RARITY: Readonly<Record<ThrallRarity, readonly number[]>> = {
  common:    [1.0, 1.25,  1.5,   1.75,  2.0],
  rare:      [1.0, 1.375, 1.75,  2.125, 2.5],
  epic:      [1.0, 1.5,   2.0,   2.5,   3.0],
  legendary: [1.0, 1.6,   2.2,   2.8,   3.4,  4.0],
};

/** Essences required to go from star tier N → N+1. Index 0 covers
 *  the 1→2★ jump. Same length as `STAR_MAX_PER_RARITY[rarity] - 1`.
 *  Cost ramps ×2 per tier — late awakening is the long pole. */
export const AWAKEN_COST_PER_RARITY: Readonly<Record<ThrallRarity, readonly number[]>> = {
  common:    [3, 6, 12, 24],
  rare:      [2, 4, 8,  16],
  epic:      [1, 2, 4,  8],
  legendary: [1, 2, 4,  8, 16],
};

/** Downward conversion rate (1 epic essence → N rare essences, etc.).
 *  Upward conversion is forbidden (would let F2P trick into power). */
export const DOWNWARD_CONVERSION_RATE = 3;

/** Number of active equip slots in v1.0. Will scale with Dread tier
 *  in v1.1+ (slot 4 at Dread XXX, slot 5 at Dread C). */
export const EQUIP_SLOT_COUNT = 3;

/** Empty equip array (3 nulls). Save layer reads the length to grow
 *  to future slot counts without breaking back-compat. */
export function emptyEquipSlots(): (string | null)[] {
  return new Array(EQUIP_SLOT_COUNT).fill(null);
}
