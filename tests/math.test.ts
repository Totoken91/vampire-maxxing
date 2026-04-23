import { describe, expect, it } from 'vitest';
import {
  clickPower,
  dreadGain,
  globalMult,
  isServantUnlocked,
  offlineGain,
  servantCost,
  servantMilestoneMult,
  servantRate,
} from '../src/game/math';
import { SERVANTS_BY_ID } from '../src/game/config/servants';
import { BALANCE } from '../src/game/config/balance';

describe('servantCost', () => {
  it('returns baseCost when owned = 0', () => {
    expect(servantCost(10, 0)).toBe(10);
  });

  it('follows 1.15^owned growth, floored', () => {
    expect(servantCost(10, 1)).toBe(Math.floor(10 * 1.15));
    expect(servantCost(10, 5)).toBe(Math.floor(10 * 1.15 ** 5));
    expect(servantCost(100, 10)).toBe(Math.floor(100 * 1.15 ** 10));
  });

  it('first Stray Rat costs exactly 10', () => {
    expect(servantCost(SERVANTS_BY_ID.rat.baseCost, 0)).toBe(10);
  });
});

describe('servantMilestoneMult', () => {
  it('is 1 below 10 owned', () => {
    expect(servantMilestoneMult(0)).toBe(1);
    expect(servantMilestoneMult(9)).toBe(1);
  });

  it('hits the documented multipliers', () => {
    expect(servantMilestoneMult(10)).toBe(2);
    expect(servantMilestoneMult(25)).toBe(4);
    expect(servantMilestoneMult(50)).toBe(8);
    expect(servantMilestoneMult(100)).toBe(24);
    expect(servantMilestoneMult(200)).toBe(72);
    expect(servantMilestoneMult(300)).toBe(216);
    expect(servantMilestoneMult(400)).toBe(1080);
  });

  it('stays on the last tier above 400', () => {
    expect(servantMilestoneMult(500)).toBe(1080);
    expect(servantMilestoneMult(10_000)).toBe(1080);
  });
});

describe('servantRate', () => {
  it('is 0 when owned = 0', () => {
    expect(servantRate({ baseRate: 0.5 }, 0, 1, 1)).toBe(0);
  });

  it('scales linearly with owned below milestone', () => {
    expect(servantRate({ baseRate: 0.5 }, 5, 1, 1)).toBeCloseTo(2.5);
  });

  it('applies milestone and mult correctly', () => {
    // owned=10 → x2, globalMult=2 → total = 10 * 0.5 * 2 * 2 * 1 = 20
    expect(servantRate({ baseRate: 0.5 }, 10, 2, 1)).toBeCloseTo(20);
  });

  it('applies boost multiplicatively', () => {
    expect(servantRate({ baseRate: 1 }, 1, 1, 2)).toBeCloseTo(2);
  });
});

describe('globalMult', () => {
  it('returns 1 at dread = 0', () => {
    expect(globalMult(0, false)).toBe(1);
  });

  it('matches doc table', () => {
    expect(globalMult(10, false)).toBeCloseTo(2);
    expect(globalMult(50, false)).toBeCloseTo(6);
    expect(globalMult(100, false)).toBeCloseTo(11);
  });

  it('applies progenitor bonus when active', () => {
    expect(globalMult(10, true)).toBeCloseTo(2 * BALANCE.GLOBAL_MULT_BONUS_PROGENITOR);
  });
});

describe('clickPower', () => {
  it('falls back to BASE_CLICK_POWER when rate is 0', () => {
    expect(clickPower(0, 1, 1)).toBe(BALANCE.BASE_CLICK_POWER);
  });

  it('scales with rate once rate exceeds base threshold', () => {
    const rate = 100_000;
    expect(clickPower(rate, 1, 1)).toBeCloseTo(rate * BALANCE.CLICK_SCALING_RATIO);
  });

  it('applies mult and boost', () => {
    expect(clickPower(0, 2, 3)).toBeCloseTo(BALANCE.BASE_CLICK_POWER * 6);
  });
});

describe('dreadGain', () => {
  it('returns 0 below the threshold', () => {
    expect(dreadGain(0)).toBe(0);
    expect(dreadGain(BALANCE.ASCEND_THRESHOLD - 1)).toBe(0);
  });

  it('matches doc table within floor tolerance', () => {
    expect(dreadGain(1e6)).toBe(2);
    expect(dreadGain(1e7)).toBe(Math.floor(Math.sqrt(10) * 2));
    expect(dreadGain(1e8)).toBe(Math.floor(Math.sqrt(100) * 2));
  });
});

describe('offlineGain', () => {
  it('is 0 with 0 rate', () => {
    expect(offlineGain(0, 3600, 0.5, 4)).toBe(0);
  });

  it('respects the cap', () => {
    const rate = 10;
    const elapsedSec = 10 * 3600; // 10h
    const cap = 4;
    const expected = rate * cap * 3600 * 0.5;
    expect(offlineGain(rate, elapsedSec, 0.5, cap)).toBeCloseTo(expected);
  });

  it('uses actual elapsed below cap', () => {
    const rate = 10;
    const elapsedSec = 1800; // 30 min
    expect(offlineGain(rate, elapsedSec, 0.5, 4)).toBeCloseTo(rate * elapsedSec * 0.5);
  });

  it('handles negative elapsed gracefully', () => {
    expect(offlineGain(10, -5, 0.5, 4)).toBe(0);
  });
});

describe('isServantUnlocked', () => {
  it('false when lifetime below unlockTotal', () => {
    expect(isServantUnlocked(30, 29)).toBe(false);
  });

  it('true at or above unlockTotal', () => {
    expect(isServantUnlocked(30, 30)).toBe(true);
    expect(isServantUnlocked(30, 1_000_000)).toBe(true);
  });
});
