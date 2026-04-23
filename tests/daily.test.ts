import { describe, expect, test } from 'vitest';
import {
  DAILY_CYCLE,
  DAILY_MIN_BLOOD,
  isConsecutiveDay,
  localDateKey,
  rewardFor,
} from '../src/game/config/daily';

describe('localDateKey', () => {
  test('formats as YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 5); // April 5 2026 local
    expect(localDateKey(d)).toBe('2026-04-05');
  });

  test('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 3);
    expect(localDateKey(d)).toBe('2026-01-03');
  });
});

describe('isConsecutiveDay', () => {
  test('returns true for exactly one day apart', () => {
    expect(isConsecutiveDay('2026-04-04', '2026-04-05')).toBe(true);
  });

  test('returns false when same day', () => {
    expect(isConsecutiveDay('2026-04-05', '2026-04-05')).toBe(false);
  });

  test('returns false when two days apart', () => {
    expect(isConsecutiveDay('2026-04-03', '2026-04-05')).toBe(false);
  });

  test('returns false when prev is empty', () => {
    expect(isConsecutiveDay('', '2026-04-05')).toBe(false);
  });

  test('handles month boundary', () => {
    expect(isConsecutiveDay('2026-03-31', '2026-04-01')).toBe(true);
  });

  test('handles year boundary', () => {
    expect(isConsecutiveDay('2025-12-31', '2026-01-01')).toBe(true);
  });
});

describe('rewardFor', () => {
  test('day 1 at zero rate still grants the floor', () => {
    const r = rewardFor(0, 0);
    expect(r.blood).toBe(DAILY_MIN_BLOOD);
    expect(r.dread).toBe(0);
  });

  test('day 1 at rate 100 grants 100 * 60 * 1 min = 6000', () => {
    expect(rewardFor(0, 100).blood).toBe(6000);
  });

  test('day 7 (climax) grants 120 min of production + 5 dread', () => {
    const r = rewardFor(6, 100);
    expect(r.dread).toBe(5);
    expect(r.blood).toBe(100 * 60 * 120);
  });

  test('clamps out-of-range dayIndex to the cycle bounds', () => {
    // Negative falls to day 1, past-end falls to day 7.
    expect(rewardFor(-5, 10).blood).toBe(rewardFor(0, 10).blood);
    expect(rewardFor(99, 10).blood).toBe(rewardFor(6, 10).blood);
  });
});

describe('DAILY_CYCLE', () => {
  test('has exactly 7 days', () => {
    expect(DAILY_CYCLE).toHaveLength(7);
  });

  test('minutes strictly increase across the cycle', () => {
    for (let i = 1; i < DAILY_CYCLE.length; i += 1) {
      expect(DAILY_CYCLE[i]!.minutes).toBeGreaterThan(DAILY_CYCLE[i - 1]!.minutes);
    }
  });

  test('dread is monotonic non-decreasing', () => {
    for (let i = 1; i < DAILY_CYCLE.length; i += 1) {
      expect(DAILY_CYCLE[i]!.dread).toBeGreaterThanOrEqual(
        DAILY_CYCLE[i - 1]!.dread,
      );
    }
  });
});
