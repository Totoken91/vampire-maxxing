// Server-side mirror of the client gacha config. Keep in sync with:
//   src/game/config/banners.ts
//   src/game/config/thralls.ts (id + rarity)
//   src/game/config/ritual-rates.ts
//
// We intentionally don't share files via symlink — Deno's runtime can't
// import directly from the Vite/TS sources without a build step. When
// the client config changes (new thrall, rate tweak), copy the new
// values here AND bump a roster version comment so reviewers can spot
// drift quickly.
//
// Roster version: V1.2-EXT 2026-04-25 (15 thralls: 6C/4R/2E/3L).

export type BannerId = 'standard' | 'featured';
export type ThrallRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ThrallEntry {
  id: string;
  rarity: ThrallRarity;
}

export const THRALLS: readonly ThrallEntry[] = [
  // Commons (6)
  { id: 'ash-the-wretched', rarity: 'common' },
  { id: 'mira-the-watcher', rarity: 'common' },
  { id: 'roderick-the-tracker', rarity: 'common' },
  { id: 'iron-maw', rarity: 'common' },
  { id: 'crypt-warden', rarity: 'common' },
  { id: 'gravebound', rarity: 'common' },
  // Rares (4)
  { id: 'nox-the-hunger', rarity: 'rare' },
  { id: 'lilith-whisper', rarity: 'rare' },
  { id: 'duskward', rarity: 'rare' },
  { id: 'ashen-vale', rarity: 'rare' },
  // Epics (2)
  { id: 'mirella', rarity: 'epic' },
  { id: 'velmor-the-dread', rarity: 'epic' },
  // Legendaries (3) — V1.2-EXT
  { id: 'aldric-volkov', rarity: 'legendary' },
  { id: 'cassian-vale', rarity: 'legendary' },
  { id: 'maris-vale', rarity: 'legendary' },
];

export const BANNERS: Readonly<Record<BannerId, { featuredIds: readonly string[] }>> = {
  standard: { featuredIds: [] },
  featured: { featuredIds: ['mirella'] },
};

export const RITUAL_COST_SINGLE = 10;
export const RITUAL_COST_BUNDLE_10 = 95;

export const STANDARD_RATES: Readonly<Record<ThrallRarity, number>> = {
  common: 0.817,
  rare: 0.15,
  epic: 0.03,
  legendary: 0.003,
};
export const FEATURED_RATES: Readonly<Record<ThrallRarity, number>> = {
  common: 0.795,
  rare: 0.17,
  epic: 0.03,
  legendary: 0.005,
};

export const FEATURED_RATE_UP_SHARE: Readonly<Record<ThrallRarity, number>> = {
  common: 0,
  rare: 0.5,
  epic: 0.75,
  legendary: 0.75,
};

export const PITY = {
  standardRare: 10,
  featuredRare: 10,
  featuredEpic: 40,
  legendary: 80,
  legendarySoftStart: 70,
  legendarySoftRamp: 0.05,
  antiStreakCommons: 5,
} as const;

export const DUPLICATE_PROTECTION_REROLL = 0.5;

export const ESSENCE_PER_DUPE: Readonly<Record<ThrallRarity, number>> = {
  common: 1,
  rare: 3,
  epic: 10,
  legendary: 25,
};

export const CINDER_ESSENCE_PER_RARITY: Readonly<Record<ThrallRarity, number>> = {
  common: 2,
  rare: 5,
  epic: 15,
  legendary: 35,
};

export const PULL_HISTORY_MAX = 50;
