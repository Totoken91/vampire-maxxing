// Rates, costs and pity thresholds for the Ritual / pull system.
// Source of truth — exposed publicly via the legal disclosure screen
// (L9). Any change here MUST be reflected on that screen and tracked
// in tests/ritual.test.ts so CI fails if a tweak slips through review.

import type { ThrallRarity } from './thralls';

export const RITUAL_COST_SINGLE = 10;
/** 10-pull bundle — 5 Ichor discount, mirrors the HoYo-standard "ten
 *  for slightly less than ten singles". */
export const RITUAL_COST_BUNDLE_10 = 95;

/** Base rates per banner. Sum to 1.0 within rounding. */
export const STANDARD_RATES: Readonly<Record<ThrallRarity, number>> = {
  common: 0.82,
  rare: 0.15,
  epic: 0.03,
  legendary: 0,
};

export const FEATURED_RATES: Readonly<Record<ThrallRarity, number>> = {
  common: 0.8,
  rare: 0.17,
  epic: 0.03,
  legendary: 0,
};

/** Within Featured, this share of a rolled rarity routes to the
 *  featured pool (rate-up). The remainder is split across non-featured
 *  thralls of the same rarity. */
export const FEATURED_RATE_UP_SHARE: Readonly<Record<ThrallRarity, number>> = {
  common: 0,
  rare: 0.5,
  epic: 0.75,
  legendary: 0.75,
};

export const PITY = {
  /** Standard banner — Rare guaranteed every 10 pulls. */
  standardRare: 10,
  /** Featured — same Rare cadence. */
  featuredRare: 10,
  /** Featured — Epic guaranteed every 40 pulls. Persists across
   *  banners (in v1.0 there's only one Featured anyway). */
  featuredEpic: 40,
  /** 5 Commons in a row → next pull forced Rare+. Silent (not
   *  surfaced in UI; just a softener). */
  antiStreakCommons: 5,
} as const;

/** When a pull would land a thrall the player already owns AND there's
 *  still an un-owned thrall of the same rarity, this is the chance to
 *  reroll into one of those un-owned. Silent. Lifts perceived
 *  collection rate ~40% per the V1.2 brief. */
export const DUPLICATE_PROTECTION_REROLL = 0.5;

/** Essences awarded per duplicate, by rarity. Accumulate now (L5);
 *  spent on awakening in L6. */
export const ESSENCE_PER_DUPE: Readonly<Record<ThrallRarity, number>> = {
  common: 1,
  rare: 3,
  epic: 10,
  legendary: 25,
};
