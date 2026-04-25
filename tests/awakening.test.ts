// L6 — Awakening + equip system. Covers cost lookup, multiplier
// math, awaken success/failure paths, downward essence conversion,
// equip slot transitions, and modifier publication into the registry.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  awaken,
  canAwaken,
  convertEssence,
  effectivePrimary,
  effectiveValue,
  nextAwakenCost,
  publishThrallModifiers,
  rehydrateEquippedModifiers,
  starMultiplier,
  withdrawThrallModifiers,
} from '../src/game/awakening';
import {
  AWAKEN_COST_PER_RARITY,
  DOWNWARD_CONVERSION_RATE,
  STAR_MAX_PER_RARITY,
  STAR_MULTIPLIERS_PER_RARITY,
} from '../src/game/config/awakening';
import { gameState } from '../src/game/state';
import { events } from '../src/game/events';
import { modifierRegistry } from '../src/game/modifiers';
import { THRALLS_BY_ID } from '../src/game/config/thralls';

beforeEach(() => {
  gameState.reset();
  modifierRegistry.clear();
});

describe('starMultiplier', () => {
  it('returns 1.0 at base star tier 0 for every rarity', () => {
    expect(starMultiplier(0, 'common')).toBe(1.0);
    expect(starMultiplier(0, 'rare')).toBe(1.0);
    expect(starMultiplier(0, 'epic')).toBe(1.0);
    expect(starMultiplier(0, 'legendary')).toBe(1.0);
  });

  it('returns the max table value at the highest star tier', () => {
    expect(starMultiplier(4, 'common')).toBe(2.0);
    expect(starMultiplier(4, 'rare')).toBe(2.5);
    expect(starMultiplier(4, 'epic')).toBe(3.0);
    expect(starMultiplier(5, 'legendary')).toBe(4.0);
  });

  it('clamps stars beyond the table to the max value', () => {
    expect(starMultiplier(99, 'common')).toBe(2.0);
  });
});

describe('effectiveValue', () => {
  it('multiplies the BONUS percentage, not the raw value', () => {
    // Iron Maw base 1.06 (+6%) at 5★ common (×2.0):
    //   effective = 1 + 0.06 * 2.0 = 1.12 (+12%)
    expect(effectiveValue(1.06, 4, 'common')).toBeCloseTo(1.12);
  });

  it('leaves a neutral 1.0 base un-amplified', () => {
    expect(effectiveValue(1.0, 4, 'epic')).toBe(1.0);
  });
});

describe('nextAwakenCost', () => {
  it('returns the configured cost for the next tier', () => {
    gameState.obtainThrall('iron-maw'); // common
    const cost = nextAwakenCost('iron-maw');
    expect(cost).toEqual({ amount: AWAKEN_COST_PER_RARITY.common[0], rarity: 'common' });
  });

  it('returns null at max stars', () => {
    gameState.obtainThrall('iron-maw');
    // Force to max.
    const player = gameState.get().playerThralls['iron-maw'];
    player.stars = STAR_MAX_PER_RARITY.common - 1;
    expect(nextAwakenCost('iron-maw')).toBeNull();
  });
});

describe('canAwaken', () => {
  it('refuses when the thrall is locked', () => {
    expect(canAwaken('iron-maw')).toBe(false);
  });

  it('refuses when essences are insufficient', () => {
    gameState.obtainThrall('iron-maw');
    expect(canAwaken('iron-maw')).toBe(false);
    gameState.grantEssence('common', 2); // need 3
    expect(canAwaken('iron-maw')).toBe(false);
  });

  it('accepts at exactly the cost threshold', () => {
    gameState.obtainThrall('iron-maw');
    gameState.grantEssence('common', 3);
    expect(canAwaken('iron-maw')).toBe(true);
  });
});

describe('awaken', () => {
  it('spends essences, bumps stars, emits event', () => {
    gameState.obtainThrall('iron-maw');
    gameState.grantEssence('common', 10);

    const fired: number[] = [];
    const off = events.on('thrall-awakened', ({ stars }) => fired.push(stars));

    expect(awaken('iron-maw')).toBe(true);
    expect(gameState.getPlayerThrall('iron-maw').stars).toBe(1);
    expect(gameState.getEssence('common')).toBe(7); // 10 - 3
    expect(fired).toEqual([1]);

    off();
  });

  it('refreshes the modifier registry when the thrall is equipped', () => {
    gameState.obtainThrall('iron-maw');
    gameState.equipThrall(0, 'iron-maw');
    publishThrallModifiers('iron-maw');

    const before = modifierRegistry.getMultiplier('servantRate');
    gameState.grantEssence('common', 100);
    awaken('iron-maw');
    const after = modifierRegistry.getMultiplier('servantRate');
    expect(after).toBeGreaterThan(before);
  });

  it('refuses past max', () => {
    gameState.obtainThrall('iron-maw');
    const player = gameState.get().playerThralls['iron-maw'];
    player.stars = STAR_MAX_PER_RARITY.common - 1;
    gameState.grantEssence('common', 1000);
    expect(awaken('iron-maw')).toBe(false);
  });
});

describe('convertEssence (downward only)', () => {
  it('converts epic → rare at the configured rate', () => {
    gameState.grantEssence('epic', 5);
    expect(convertEssence('epic', 2)).toBe(true);
    expect(gameState.getEssence('epic')).toBe(3);
    expect(gameState.getEssence('rare')).toBe(2 * DOWNWARD_CONVERSION_RATE);
  });

  it('refuses common → anything (nothing below)', () => {
    gameState.grantEssence('common', 10);
    expect(convertEssence('common', 1)).toBe(false);
    expect(gameState.getEssence('common')).toBe(10);
  });

  it('refuses insufficient balance', () => {
    expect(convertEssence('epic', 1)).toBe(false);
  });
});

describe('equip slots', () => {
  it('places a thrall and emits thrall-equipped', () => {
    gameState.obtainThrall('iron-maw');
    const fired: Array<{ slot: number; nextId: string | null }> = [];
    const off = events.on('thrall-equipped', ({ slot, nextId }) => {
      fired.push({ slot, nextId });
    });
    expect(gameState.equipThrall(0, 'iron-maw')).toBe(true);
    expect(gameState.getEquippedSlots()[0]).toBe('iron-maw');
    expect(fired.length).toBe(1);
    expect(fired[0]!.nextId).toBe('iron-maw');
    off();
  });

  it('moves a thrall when re-equipped to a different slot', () => {
    gameState.obtainThrall('iron-maw');
    gameState.equipThrall(0, 'iron-maw');
    gameState.equipThrall(2, 'iron-maw');
    expect(gameState.getEquippedSlots()[0]).toBeNull();
    expect(gameState.getEquippedSlots()[2]).toBe('iron-maw');
  });

  it('replaces the previous occupant on collision', () => {
    gameState.obtainThrall('iron-maw');
    gameState.obtainThrall('ash-the-wretched');
    gameState.equipThrall(0, 'iron-maw');
    gameState.equipThrall(0, 'ash-the-wretched');
    expect(gameState.getEquippedSlots()[0]).toBe('ash-the-wretched');
    expect(gameState.findEquippedSlot('iron-maw')).toBe(-1);
  });

  it('rejects equipping a non-owned thrall', () => {
    expect(gameState.equipThrall(0, 'mirella')).toBe(false);
    expect(gameState.getEquippedSlots()[0]).toBeNull();
  });

  it('unequip clears the slot', () => {
    gameState.obtainThrall('iron-maw');
    gameState.equipThrall(0, 'iron-maw');
    expect(gameState.unequipSlot(0)).toBe(true);
    expect(gameState.getEquippedSlots()[0]).toBeNull();
  });
});

describe('modifier publication', () => {
  it('publishes a multiplier on servantRate for blood_gen thralls', () => {
    gameState.obtainThrall('iron-maw'); // base 1.06
    publishThrallModifiers('iron-maw');
    const mult = modifierRegistry.getMultiplier('servantRate');
    // capLog applies but with a single 1.06 factor it stays close to 1.06
    expect(mult).toBeCloseTo(1.06, 1);
  });

  it('withdraws cleanly', () => {
    gameState.obtainThrall('iron-maw');
    publishThrallModifiers('iron-maw');
    expect(modifierRegistry.getMultiplier('servantRate')).toBeGreaterThan(1);
    withdrawThrallModifiers('iron-maw');
    expect(modifierRegistry.getMultiplier('servantRate')).toBe(1);
  });

  it('rehydrate publishes every equipped thrall', () => {
    gameState.obtainThrall('iron-maw');
    gameState.obtainThrall('ash-the-wretched');
    gameState.equipThrall(0, 'iron-maw');
    gameState.equipThrall(1, 'ash-the-wretched');
    modifierRegistry.clear();
    rehydrateEquippedModifiers();
    // Both contribute to servantRate.
    expect(modifierRegistry.getMultiplier('servantRate')).toBeGreaterThan(1.06);
  });

  it('amplified value reflects star tier', () => {
    gameState.obtainThrall('iron-maw');
    const player = gameState.get().playerThralls['iron-maw'];
    player.stars = STAR_MAX_PER_RARITY.common - 1; // ×2.0
    const eff = effectivePrimary(THRALLS_BY_ID['iron-maw']);
    // base 1.06 → effective 1 + 0.06 * 2.0 = 1.12
    expect(eff.value).toBeCloseTo(1.12);
  });
});

describe('config sanity', () => {
  it('cost arrays length = max stars - 1 for every rarity', () => {
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      expect(AWAKEN_COST_PER_RARITY[rarity].length).toBe(
        STAR_MAX_PER_RARITY[rarity] - 1,
      );
    }
  });

  it('star multiplier table length = max stars for every rarity', () => {
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      expect(STAR_MULTIPLIERS_PER_RARITY[rarity].length).toBe(
        STAR_MAX_PER_RARITY[rarity],
      );
    }
  });
});
