import { describe, expect, it } from 'vitest';
import {
  ascendThresholdFor,
  clickPower,
  dreadGain,
  globalMult,
  isGlobalMultPeaked,
  isMilestoneCrossing,
  isServantUnlocked,
  nextServantMilestone,
  offlineGain,
  servantCost,
  servantMilestoneMult,
  servantRate,
} from '../src/game/math';
import { SERVANTS_BY_ID } from '../src/game/config/servants';
import { BALANCE } from '../src/game/config/balance';

describe('V1.2-HF1 — globalMult hard cap', () => {
  it('caps the multiplier at 10 even at extreme dread', () => {
    expect(globalMult(1e6, false)).toBeLessThanOrEqual(10);
    expect(globalMult(1e6, true)).toBeLessThanOrEqual(10);
  });

  it('is below the cap at moderate dread (no behavior change for early game)', () => {
    expect(globalMult(50, false)).toBeLessThan(10);
    expect(globalMult(100, false)).toBeLessThan(10);
  });

  it('isGlobalMultPeaked flags when the cap is hit', () => {
    expect(isGlobalMultPeaked(1e6, false)).toBe(true);
    expect(isGlobalMultPeaked(50, false)).toBe(false);
  });
});

describe('V1.2-HF1 — ascendThresholdFor (per-form scaling)', () => {
  it('NEWBORN keeps the base 1× threshold', () => {
    expect(ascendThresholdFor('NEWBORN')).toBe(BALANCE.ASCEND_THRESHOLD);
  });

  it('threshold scales monotonically across forms', () => {
    const order = [
      'NEWBORN',
      'ELDER',
      'LORD_OF_NIGHT',
      'METHUSELAH',
      'PROGENITOR',
      'TERA_OVERLORD',
      'HORROR_INCARNATE',
      'THIRST',
    ] as const;
    for (let i = 0; i < order.length - 1; i += 1) {
      expect(ascendThresholdFor(order[i + 1])).toBeGreaterThan(
        ascendThresholdFor(order[i]),
      );
    }
  });

  it('METHUSELAH is 60× the base (recalibrated anti-treadmill anchor)', () => {
    // 2026-04-25 recalibration: was ×20 (gave 25-50s ascends, treadmill
    // alive). ×60 lands ~2m30s entry-of-form / ~30s end-of-form once
    // milestones + mult-cap saturate.
    expect(ascendThresholdFor('METHUSELAH')).toBe(BALANCE.ASCEND_THRESHOLD * 60);
  });

  it('form bumps land in the ×6-×8 range for peaks-and-valleys cadence', () => {
    const meth = BALANCE.ASCEND_THRESHOLD_FORM_MULT.METHUSELAH;
    const prog = BALANCE.ASCEND_THRESHOLD_FORM_MULT.PROGENITOR;
    const tera = BALANCE.ASCEND_THRESHOLD_FORM_MULT.TERA_OVERLORD;
    const horror = BALANCE.ASCEND_THRESHOLD_FORM_MULT.HORROR_INCARNATE;
    expect(prog / meth).toBeGreaterThanOrEqual(6);
    expect(prog / meth).toBeLessThanOrEqual(9);
    expect(tera / prog).toBeGreaterThanOrEqual(6);
    expect(tera / prog).toBeLessThanOrEqual(9);
    expect(horror / tera).toBeGreaterThanOrEqual(6);
    expect(horror / tera).toBeLessThanOrEqual(9);
  });

  it('THIRST is 200000× the base (endgame infinite runway)', () => {
    expect(ascendThresholdFor('THIRST')).toBe(BALANCE.ASCEND_THRESHOLD * 200000);
  });
});

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

describe('nextServantMilestone', () => {
  it('targets the first threshold from zero', () => {
    const m = nextServantMilestone(0);
    expect(m).toEqual({ prev: 0, next: 10, bonus: 2, progress: 0, reached: 0 });
  });

  it('reports progress within the current band', () => {
    const m = nextServantMilestone(5);
    expect(m.next).toBe(10);
    expect(m.prev).toBe(0);
    expect(m.progress).toBeCloseTo(0.5);
    expect(m.reached).toBe(0);
  });

  it('walks into the next band on threshold hit', () => {
    const m = nextServantMilestone(10);
    expect(m.prev).toBe(10);
    expect(m.next).toBe(25);
    expect(m.bonus).toBe(2);
    expect(m.reached).toBe(1);
    expect(m.progress).toBe(0);
  });

  it('exposes the ×3 bonus band beyond 50', () => {
    expect(nextServantMilestone(50).bonus).toBe(3);
    expect(nextServantMilestone(99).next).toBe(100);
  });

  it('exposes the ×5 bonus band beyond 300', () => {
    expect(nextServantMilestone(300).bonus).toBe(5);
    expect(nextServantMilestone(300).next).toBe(400);
  });

  it('saturates at 400 owned', () => {
    const m = nextServantMilestone(400);
    expect(m.next).toBeNull();
    expect(m.progress).toBe(1);
    expect(m.reached).toBe(7);
  });

  it('stays saturated above 400', () => {
    const m = nextServantMilestone(10_000);
    expect(m.next).toBeNull();
    expect(m.reached).toBe(7);
  });
});

describe('isMilestoneCrossing', () => {
  it('detects a single-step crossing onto a threshold', () => {
    expect(isMilestoneCrossing(9, 10)).toBe(true);
    expect(isMilestoneCrossing(24, 25)).toBe(true);
    expect(isMilestoneCrossing(399, 400)).toBe(true);
  });

  it('returns false when staying inside a band', () => {
    expect(isMilestoneCrossing(11, 12)).toBe(false);
    expect(isMilestoneCrossing(0, 1)).toBe(false);
    expect(isMilestoneCrossing(401, 402)).toBe(false);
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

  it('follows 1 + COEF × log2(1 + d) curve — first prestige sweet spot', () => {
    // V1.1 (2026-04-25) retuned coef 1.0 → 0.5 to land first prestige
    // (Dread 5) at ×2.29 — industry sweet spot for idle/incremental
    // first prestige (1.5-2.5x). Earlier coef=1.0 produced ×4.46 at
    // d=10 which compressed 5 prestiges of progression into the first.
    const k = BALANCE.DREAD_MULT_COEF;
    expect(globalMult(10, false)).toBeCloseTo(1 + k * Math.log2(11), 5);
    expect(globalMult(100, false)).toBeCloseTo(1 + k * Math.log2(101), 5);
    expect(globalMult(1000, false)).toBeCloseTo(1 + k * Math.log2(1001), 5);
    expect(globalMult(10000, false)).toBeCloseTo(1 + k * Math.log2(10001), 5);
  });

  it('keeps d=3375 well under runaway territory', () => {
    // The old linear formula gave ×338.5 here — unplayable ceiling
    // jump per ascend. The log curve at coef=0.5 caps the same Dread
    // at ~×6.86 (was ×12.72 at coef=1.0). Generous floor + ceiling.
    const mult = globalMult(3375, false);
    expect(mult).toBeGreaterThan(5);
    expect(mult).toBeLessThan(8);
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
    // V1.1 retuned to 0.5 per idle-game-expert audit. Sample
    // assertions above derive from BALANCE.DREAD_MULT_COEF so a
    // future tweak only needs to edit this pin.
    expect(BALANCE.DREAD_MULT_COEF).toBe(0.5);
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

  it('caps at NEWBORN 5 — V1.1 tightened first-prestige grind', () => {
    // Old NEWBORN cap was 10 (forced 25M-blood pre-ascend grind +
    // ×4.46 first-prestige mult — too generous). V1.1 lowered to 5
    // so first ascend lands at 6.25M blood + ×2.29 mult — sweet spot.
    expect(dreadGain(1e14, 'NEWBORN')).toBe(5);
  });

  it('cap roughly doubles at each form (V1.1 tightened table)', () => {
    // Huge blood → sqrt is absurd, so we always hit the cap for non-THIRST.
    expect(dreadGain(1e20, 'NEWBORN')).toBe(5);
    expect(dreadGain(1e20, 'ELDER')).toBe(15);
    expect(dreadGain(1e20, 'LORD_OF_NIGHT')).toBe(35);
    expect(dreadGain(1e20, 'METHUSELAH')).toBe(75);
    expect(dreadGain(1e20, 'PROGENITOR')).toBe(150);
    expect(dreadGain(1e20, 'TERA_OVERLORD')).toBe(300);
    expect(dreadGain(1e20, 'HORROR_INCARNATE')).toBe(600);
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
