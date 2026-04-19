// The 8 thralls (generators). Values from docs/04-BALANCE.md.

export type ThrallId =
  | 'rat'
  | 'ghoul'
  | 'fledgling'
  | 'thrall'
  | 'blade'
  | 'courtesan'
  | 'elder'
  | 'cardinal';

export interface Thrall {
  readonly id: ThrallId;
  readonly tier: number;
  readonly name: string;
  readonly baseCost: number;
  readonly baseRate: number;
  readonly unlockTotal: number;
}

export const THRALLS: readonly Thrall[] = [
  { id: 'rat',       tier: 1, name: 'Stray Rat',             baseCost: 10,          baseRate: 0.5,     unlockTotal: 0 },
  { id: 'ghoul',     tier: 2, name: 'Feral Ghoul',           baseCost: 100,         baseRate: 4,       unlockTotal: 30 },
  { id: 'fledgling', tier: 3, name: 'Fledgling',             baseCost: 1_200,       baseRate: 32,      unlockTotal: 360 },
  { id: 'thrall',    tier: 4, name: 'Thrall',                baseCost: 14_000,      baseRate: 240,     unlockTotal: 4_200 },
  { id: 'blade',     tier: 5, name: 'Nightblade',            baseCost: 180_000,     baseRate: 1_800,   unlockTotal: 54_000 },
  { id: 'courtesan', tier: 6, name: 'Blood Courtesan',       baseCost: 2_500_000,   baseRate: 14_000,  unlockTotal: 750_000 },
  { id: 'elder',     tier: 7, name: 'Elder',                 baseCost: 40_000_000,  baseRate: 110_000, unlockTotal: 12_000_000 },
  { id: 'cardinal',  tier: 8, name: 'Cardinal of the Night', baseCost: 700_000_000, baseRate: 900_000, unlockTotal: 210_000_000 },
] as const;

export const THRALLS_BY_ID: Readonly<Record<ThrallId, Thrall>> = Object.freeze(
  THRALLS.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<ThrallId, Thrall>,
  ),
);
