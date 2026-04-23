import { beforeEach, describe, expect, it } from 'vitest';
import {
  UPGRADES_BY_ID,
  altarClaimAmount,
  altarIntervalSec,
  nextCost,
} from '../src/game/config/upgrades';
import {
  buyUpgrade,
  canAffordUpgrade,
  getUpgradeLevel,
  getUpgradeNextCost,
  publishUpgradeModifier,
  republishAllUpgradeModifiers,
} from '../src/game/upgrades';
import { gameState } from '../src/game/state';
import { modifierRegistry } from '../src/game/modifiers';

function giveDread(amount: number): void {
  // Test helper: bump dread via the escape hatch in state.
  (gameState.get() as unknown as { dread: number }).dread = amount;
}

describe('upgrade config helpers', () => {
  it('returns Infinity for nextCost past maxLevel', () => {
    const def = UPGRADES_BY_ID.offline_keeper; // maxLevel = 3
    expect(nextCost(def, 0)).toBe(20);
    expect(nextCost(def, 2)).toBe(200);
    expect(nextCost(def, 3)).toBe(Infinity);
  });

  it('altar dormant at level 0', () => {
    expect(altarIntervalSec(0)).toBe(0);
    expect(altarClaimAmount(0, 100)).toBe(0);
  });

  it('altar interval shrinks 4h → 1h with levels', () => {
    expect(altarIntervalSec(1)).toBe(4 * 3600);
    expect(altarIntervalSec(5)).toBe(3600);
  });

  it('altar claim amount scales with level and current rate', () => {
    // lv 1 = 60s of production
    expect(altarClaimAmount(1, 10)).toBe(600);
    // lv 3 = +40% → 60s × 1.4 × rate
    expect(altarClaimAmount(3, 10)).toBe(Math.floor(10 * 60 * 1.4));
  });
});

describe('buyUpgrade', () => {
  beforeEach(() => {
    gameState.reset();
    modifierRegistry.clear();
  });

  it('rejects if dread insufficient', () => {
    // servant_loyalty first level costs 5
    giveDread(3);
    expect(buyUpgrade('servant_loyalty')).toBe(false);
    expect(getUpgradeLevel('servant_loyalty')).toBe(0);
  });

  it('spends dread, bumps level, publishes modifier on success', () => {
    giveDread(100);
    expect(buyUpgrade('servant_loyalty')).toBe(true);
    expect(getUpgradeLevel('servant_loyalty')).toBe(1);
    expect(gameState.getDread()).toBe(95); // 100 - 5
    // +5% raw, then log-capped (raw ≤ 1.05 → passes through)
    const mult = modifierRegistry.getMultiplier('servantRate');
    // capLog kicks in above 1; 1.05 raw becomes 1 + log10(1.05)*4 ≈ 1.0847
    expect(mult).toBeGreaterThan(1.05);
  });

  it('rejects when already at max level', () => {
    giveDread(1_000_000);
    const def = UPGRADES_BY_ID.dread_amplifier; // maxLevel = 3
    for (let i = 0; i < def.maxLevel; i++) {
      expect(buyUpgrade('dread_amplifier')).toBe(true);
    }
    expect(getUpgradeLevel('dread_amplifier')).toBe(3);
    expect(buyUpgrade('dread_amplifier')).toBe(false);
    expect(getUpgradeNextCost('dread_amplifier')).toBe(Infinity);
  });

  it('canAffordUpgrade reflects current dread', () => {
    giveDread(0);
    expect(canAffordUpgrade('servant_loyalty')).toBe(false);
    giveDread(5);
    expect(canAffordUpgrade('servant_loyalty')).toBe(true);
  });
});

describe('publishUpgradeModifier', () => {
  beforeEach(() => {
    gameState.reset();
    modifierRegistry.clear();
  });

  it('registers the current level as a modifier', () => {
    giveDread(10_000);
    buyUpgrade('servant_loyalty');
    buyUpgrade('servant_loyalty');
    // Level 2 → +10% raw servantRate
    const entries = modifierRegistry.list().filter((m) => m.source === 'upgrade:servant_loyalty');
    expect(entries.length).toBe(1);
    expect(entries[0]!.target).toBe('servantRate');
    expect(entries[0]!.value).toBeCloseTo(1.1, 5);
  });

  it('unregisters when level drops to 0', () => {
    giveDread(100);
    buyUpgrade('servant_loyalty');
    expect(
      modifierRegistry.list().filter((m) => m.source === 'upgrade:servant_loyalty').length,
    ).toBe(1);
    gameState.setUpgradeLevel('servant_loyalty', 0);
    publishUpgradeModifier('servant_loyalty');
    expect(
      modifierRegistry.list().filter((m) => m.source === 'upgrade:servant_loyalty').length,
    ).toBe(0);
  });

  it('republishAllUpgradeModifiers rebuilds the registry from state', () => {
    giveDread(10_000);
    buyUpgrade('dread_amplifier');
    buyUpgrade('offline_keeper');
    modifierRegistry.clear();
    expect(modifierRegistry.list().length).toBe(0);

    republishAllUpgradeModifiers();
    // 2 active upgrades → 2 modifiers
    expect(modifierRegistry.list().length).toBe(2);
  });

  it('Blood Altar has no static modifier', () => {
    giveDread(1000);
    buyUpgrade('blood_altar');
    const entries = modifierRegistry.list().filter((m) => m.source === 'upgrade:blood_altar');
    expect(entries.length).toBe(0);
  });
});

describe('bloodline_scholar additive cost modifier', () => {
  beforeEach(() => {
    gameState.reset();
    modifierRegistry.clear();
  });

  it('reduces thrall cost multiplier by -0.01 per level', () => {
    giveDread(10_000);
    buyUpgrade('bloodline_scholar');
    buyUpgrade('bloodline_scholar');
    // Level 2 → -0.02 additive on servantCost
    expect(modifierRegistry.getAdditive('servantCost')).toBeCloseTo(-0.02, 5);
  });
});
