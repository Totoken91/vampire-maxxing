// Content unlocked by prestige count. See docs/02-GAME-DESIGN.md § Prestige Transition Unlocks.
// Query via hasUnlock(prestigeCount, key).

export interface UnlockFlags {
  autoClaim: boolean;
  dailyBoostCharges: boolean;
  reducedBoostCooldown: boolean;
  dailyVows: boolean;
  frenzyBoost: boolean;
  extendedOfflineCap: boolean;
  autoPrestige: boolean;
  globalMultBonus: boolean;
  secondPrestigeLayer: boolean;
  endgameChallenges: boolean;
}

interface UnlockThreshold {
  readonly prestige: number;
  readonly key: keyof UnlockFlags;
}

const UNLOCK_TABLE: readonly UnlockThreshold[] = [
  { prestige: 1,  key: 'autoClaim' },
  { prestige: 2,  key: 'dailyBoostCharges' },
  { prestige: 3,  key: 'reducedBoostCooldown' },
  { prestige: 4,  key: 'dailyVows' },
  { prestige: 7,  key: 'frenzyBoost' },
  { prestige: 10, key: 'extendedOfflineCap' },
  { prestige: 15, key: 'autoPrestige' },
  { prestige: 20, key: 'globalMultBonus' },
  { prestige: 30, key: 'secondPrestigeLayer' },
  { prestige: 50, key: 'endgameChallenges' },
] as const;

const EMPTY_FLAGS: UnlockFlags = {
  autoClaim: false,
  dailyBoostCharges: false,
  reducedBoostCooldown: false,
  dailyVows: false,
  frenzyBoost: false,
  extendedOfflineCap: false,
  autoPrestige: false,
  globalMultBonus: false,
  secondPrestigeLayer: false,
  endgameChallenges: false,
};

export function getUnlocks(prestigeCount: number): UnlockFlags {
  const flags = { ...EMPTY_FLAGS };
  for (const t of UNLOCK_TABLE) {
    if (prestigeCount >= t.prestige) {
      flags[t.key] = true;
    }
  }
  return flags;
}

export function hasUnlock(prestigeCount: number, key: keyof UnlockFlags): boolean {
  for (const t of UNLOCK_TABLE) {
    if (t.key === key) return prestigeCount >= t.prestige;
  }
  return false;
}
