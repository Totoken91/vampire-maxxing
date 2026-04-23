// The 5 permanent dread sinks that give the meta-loop a proper endgame.
// Bought with Dread, never reset. Each publishes its effect through
// the ModifierRegistry (B0a) — no direct state writes or formula hacks.
//
// Balance targets (sim'd against a 30-50h sustainable grind):
//   Full-upgrade total cost ≈ 6,075 Dread across all 5 tracks
//   Earliest first purchase reachable ≈ mid-second run (Elder form)

import type { ModifierOp, ModifierTarget } from '../modifiers';

export type UpgradeId =
  | 'blood_altar'
  | 'servant_loyalty'
  | 'bloodline_scholar'
  | 'dread_amplifier'
  | 'offline_keeper';

export interface UpgradeEffect {
  readonly target: ModifierTarget;
  readonly op: ModifierOp;
  /** Value produced by this level. 0 at level 0 (no-op). */
  readonly valueAtLevel: (level: number) => number;
}

export interface UpgradeDef {
  readonly id: UpgradeId;
  readonly title: string;
  readonly description: string;
  readonly flavor: string;
  readonly icon: string;
  readonly maxLevel: number;
  /** Cost of buying the level at index N (zero-based). Array length = maxLevel. */
  readonly costs: readonly number[];
  /** Effect applied via the ModifierRegistry. Blood Altar has no modifier
   * (it runs a separate auto-claim timer) so its effect is null. */
  readonly effect: UpgradeEffect | null;
}

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'blood_altar',
    title: 'Blood Altar',
    description: 'Auto-claim a tribute of blood on a timer. 4h → 1h at max.',
    flavor: 'The altar drinks while you sleep.',
    icon: '\u26EB',
    maxLevel: 5,
    costs: [10, 25, 60, 150, 400],
    // Blood Altar is driven by a ticking timer elsewhere (intervalSecByLevel
    // + claimAmount helpers below), not a static modifier.
    effect: null,
  },
  {
    id: 'servant_loyalty',
    title: 'Servant Loyalty',
    description: '+5% thrall production per level. Up to +50%.',
    flavor: 'Your name on every tongue. Devotion compounded.',
    icon: '\u26B7',
    maxLevel: 10,
    costs: [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2500],
    effect: {
      target: 'servantRate',
      op: 'mult',
      valueAtLevel: (level) => 1 + level * 0.05,
    },
  },
  {
    id: 'bloodline_scholar',
    title: 'Bloodline Scholar',
    description: 'Servant cost multiplier −0.01 per level. 1.15 → 1.10 at max.',
    flavor: 'You study the economy of eternity.',
    icon: '\u2692',
    maxLevel: 5,
    costs: [15, 40, 100, 250, 600],
    effect: {
      target: 'servantCost',
      op: 'add',
      valueAtLevel: (level) => -level * 0.01,
    },
  },
  {
    id: 'dread_amplifier',
    title: 'Dread Amplifier',
    description: '+10% Dread on every Ascend per level.',
    flavor: 'The echo of each return rings louder than the last.',
    icon: '\u26B0',
    maxLevel: 3,
    costs: [25, 80, 250],
    effect: {
      target: 'dreadGain',
      op: 'mult',
      valueAtLevel: (level) => 1 + level * 0.1,
    },
  },
  {
    id: 'offline_keeper',
    title: 'Offline Keeper',
    description: '+1h offline cap per level (4h → 7h).',
    flavor: 'Even absent, the hunger reaps.',
    icon: '\u263D',
    maxLevel: 3,
    costs: [20, 60, 200],
    effect: {
      target: 'offlineCap',
      op: 'add',
      valueAtLevel: (level) => level,
    },
  },
];

export const UPGRADES_BY_ID: Readonly<Record<UpgradeId, UpgradeDef>> = Object.freeze(
  UPGRADES.reduce(
    (acc, u) => {
      acc[u.id] = u;
      return acc;
    },
    {} as Record<UpgradeId, UpgradeDef>,
  ),
);

// ─────────── Helpers ───────────

/**
 * Cost of upgrading from `level` to `level + 1`. Returns Infinity when the
 * upgrade is already maxed so callers don't need a special case.
 */
export function nextCost(def: UpgradeDef, level: number): number {
  if (level >= def.maxLevel) return Infinity;
  return def.costs[level];
}

/**
 * Blood Altar: interval between auto-claims at the given level. 0 when the
 * altar is dormant (level 0).
 *   lv 1 = 4h, lv 2 = 3h, lv 3 = 2h, lv 4 = 1.5h, lv 5 = 1h
 */
export function altarIntervalSec(level: number): number {
  const hoursByLevel = [0, 4, 3, 2, 1.5, 1];
  const h = hoursByLevel[level] ?? 0;
  return h * 3600;
}

/**
 * Blood Altar: amount auto-claimed each tick, scaled with current rate and
 * slightly boosted by level. Equivalent to 60s of production + (level−1)×20%.
 */
export function altarClaimAmount(level: number, currentRate: number): number {
  if (level <= 0) return 0;
  return Math.floor(currentRate * 60 * (1 + (level - 1) * 0.2));
}
