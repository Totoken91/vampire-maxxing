// L14 — analytics dispatcher. Provider-neutral by design; the
// stub is no-op until a sink is set. Tests verify the contract:
// (1) calls without a sink don't throw; (2) sink receives every
// event with the right name + payload; (3) sink errors don't
// break the caller.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setAnalyticsSink, track } from '../src/analytics/events';

afterEach(() => {
  setAnalyticsSink(() => undefined);
});

describe('analytics track()', () => {
  it('does not throw when no sink is registered', () => {
    expect(() =>
      track('session_started', {
        resumed: false,
        ichor: 0,
        thrallsOwned: 0,
        totalAscends: 0,
        daysSinceFirstLaunch: 0,
      }),
    ).not.toThrow();
  });

  it('forwards events to the registered sink', () => {
    const sink = vi.fn();
    setAnalyticsSink(sink);

    track('ichor_earned', {
      source: 'tutorial_gift',
      amount: 25,
      balance: 25,
    });

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith('ichor_earned', {
      source: 'tutorial_gift',
      amount: 25,
      balance: 25,
    });
  });

  it('swallows sink errors so analytics cannot break gameplay', () => {
    setAnalyticsSink(() => {
      throw new Error('mock provider crash');
    });

    expect(() =>
      track('rite_used', { id: 'offrande-du-soir' }),
    ).not.toThrow();
  });

  it('handles every typed event without compile or runtime issue', () => {
    const sink = vi.fn();
    setAnalyticsSink(sink);

    track('session_started', {
      resumed: true,
      ichor: 50,
      thrallsOwned: 3,
      totalAscends: 1,
      daysSinceFirstLaunch: 2,
    });
    track('pull_performed', {
      banner: 'standard',
      count: 10,
      rareCount: 1,
      epicCount: 0,
      dupeCount: 2,
      cinderCount: 0,
      frgFired: false,
      pityRareFired: false,
      pityEpicFired: false,
      bundleGuaranteeFired: true,
    });
    track('thrall_obtained', {
      id: 'mirella',
      rarity: 'epic',
      archetype: 'harvester',
    });
    track('age_gate_answered', { confirmation: 'over13' });
    track('rates_disclosure_viewed', {});
    track('spending_cap_set', { value: 10 });
    track('spending_cap_set', { value: null });

    expect(sink).toHaveBeenCalledTimes(7);
  });
});
