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

describe('globalMult (log curve — M1)', () => {
  it('returns 1 at dread = 0', () => {
    expect(globalMult(0, false)).toBe(1);
  });

  it('follows 1 + log2(1 + d) curve — agressive early, tamed late', () => {
    // Explicit sample points. The log curve is what fixes the runaway
    // feedback loop observed in v1.0.0 closed testing (Kenny hit 3375
    // Dread × 338 mult in 2 days of light play on the old linear formula).
    expect(globalMult(10, false)).toBeCloseTo(1 + Math.log2(11), 5);
    expect(globalMult(100, false)).toBeCloseTo(1 + Math.log2(101), 5);
    expect(globalMult(1000, false)).toBeCloseTo(1 + Math.log2(1001), 5);
    expect(globalMult(10000, false)).toBeCloseTo(1 + Math.log2(10001), 5);
  });

  it('keeps d=3375 under ×13 (regression guard vs runaway)', () => {
    // The old linear formula gave ×338.5 here — unplayable ceiling
    // jump per ascend. The log curve caps the same Dread at ~×12.72.
    const mult = globalMult(3375, false);
    expect(mult).toBeGreaterThan(12);
    expect(mult).toBeLessThan(13);
  });

  it('is monotonically non-decreasing in dread', () => {
    for (let d = 0; d < 1000; d += 37) {
      expect(globalMult(d + 37, false)).toBeGreaterThanOrEqual(globalMult(d, false));
    }
  });

  it('clamps negative dread to 0 (defensive)', () => {
    expect(globalMult(-5, false)).toBe(1);
  });

  it('applies progenitor bonus when active', () => {
    const base = globalMult(10, false);
    expect(globalMult(10, true)).toBeCloseTo(base * BALANCE.GLOBAL_MULT_BONUS_PROGENITOR, 5);
  });

  it('uses the configured DREAD_MULT_COEF', () => {
    // If this ever drifts from 1.0 the sample values above must be
    // recomputed — so pin the constant here.
    expect(BALANCE.DREAD_MULT_COEF).toBe(1);
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

describe('dreadGain (form-gated — M2)', () => {
  it('returns 0 below the threshold regardless of form', () => {
    expect(dreadGain(0, 'NEWBORN')).toBe(0);
    expect(dreadGain(BALANCE.ASCEND_THRESHOLD - 1, 'THIRST')).toBe(0);
  });

  it('matches sqrt formula when under the form cap', () => {
    // 1e6 → raw sqrt gives 2, well under any cap.
    expect(dreadGain(1e6, 'NEWBORN')).toBe(2);
    expect(dreadGain(1e7, 'ELDER')).toBe(Math.floor(Math.sqrt(10) * 2));
    expect(dreadGain(1e8, 'LORD_OF_NIGHT')).toBe(Math.floor(Math.sqrt(100) * 2));
  });

  it('caps at NEWBORN 10 — overnight-offline runaway fix', () => {
    // With the old formula, 1e14 blood would give ~2×10,000 = 20,000
    // Dread in NEWBORN. M2 caps that at the form's max = 10.
    expect(dreadGain(1e14, 'NEWBORN')).toBe(10);
  });

  it('cap doubles at each form', () => {
    // Huge blood → sqrt is absurd, so we always hit the cap for non-THIRST.
    expect(dreadGain(1e20, 'NEWBORN')).toBe(10);
    expect(dreadGain(1e20, 'ELDER')).toBe(25);
    expect(dreadGain(1e20, 'LORD_OF_NIGHT')).toBe(50);
    expect(dreadGain(1e20, 'METHUSELAH')).toBe(100);
    expect(dreadGain(1e20, 'PROGENITOR')).toBe(200);
    expect(dreadGain(1e20, 'TERA_OVERLORD')).toBe(400);
    expect(dreadGain(1e20, 'HORROR_INCARNATE')).toBe(800);
  });

  it('THIRST is uncapped (Infinity) — endgame freedom', () => {
    // At 1e20 blood, sqrt = 1e7 × 2 = 2×10^7. Should pass through.
    expect(dreadGain(1e20, 'THIRST')).toBe(Math.floor(Math.sqrt(1e14) * 2));
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
