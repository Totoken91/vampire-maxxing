// M3 — integration tests for the online/offline blood split and its
// effect on projected Dread gain. The split's only reason to exist is
// to prevent offline-overnight runs from snowballing prestige, so
// that's exactly what we assert.

import { beforeEach, describe, expect, it } from 'vitest';
import { gameState } from '../src/game/state';
import { BALANCE } from '../src/game/config/balance';

function snap(): {
  totalRunBlood: number;
  totalRunBloodOnline: number;
  stats: { totalAscends: number };
} {
  return gameState.get() as unknown as {
    totalRunBlood: number;
    totalRunBloodOnline: number;
    stats: { totalAscends: number };
  };
}

describe('M3 — run blood online/offline split', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('starts both counters at 0', () => {
    expect(snap().totalRunBlood).toBe(0);
    expect(snap().totalRunBloodOnline).toBe(0);
  });

  it('offline gain increments totalRunBlood but NOT totalRunBloodOnline', () => {
    gameState.applyOfflineGain(5_000_000);
    expect(snap().totalRunBlood).toBe(5_000_000);
    expect(snap().totalRunBloodOnline).toBe(0);
  });

  it('offline-only progress past ascend threshold → 0 projected Dread', () => {
    // An 8h offline at a high rate that crushes the threshold. Online
    // tracker stays at 0, so projected Dread is also 0 — the player
    // earned a run worth of Blood but not rank.
    gameState.applyOfflineGain(BALANCE.ASCEND_THRESHOLD * 10);
    expect(snap().totalRunBlood).toBeGreaterThanOrEqual(
      BALANCE.ASCEND_THRESHOLD,
    );
    expect(snap().totalRunBloodOnline).toBe(0);
    expect(gameState.projectedDreadGain()).toBe(0);
  });

  it('online blood still feeds Dread gain (sanity)', () => {
    // Use the cheats-style direct mutation to simulate tap/tick accrual
    // without running the full loop. Hit ASCEND_THRESHOLD exactly on
    // the online tracker.
    const s = snap();
    s.totalRunBlood = BALANCE.ASCEND_THRESHOLD;
    s.totalRunBloodOnline = BALANCE.ASCEND_THRESHOLD;
    expect(gameState.projectedDreadGain()).toBeGreaterThan(0);
  });

  it('ascend zeroes both counters', () => {
    // Seed a winnable state (both counters high enough for ascend).
    const s = snap();
    s.totalRunBlood = BALANCE.ASCEND_THRESHOLD * 4;
    s.totalRunBloodOnline = BALANCE.ASCEND_THRESHOLD * 4;
    expect(gameState.ascend()).toBe(true);
    expect(snap().totalRunBlood).toBe(0);
    expect(snap().totalRunBloodOnline).toBe(0);
  });
});
