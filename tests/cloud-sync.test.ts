import { describe, expect, it } from 'vitest';
import { decideSync, snapshotHasProgress } from '../src/game/cloud-sync';
import { defaultV1, type SaveV5 } from '../src/game/save';

function withProgress(overrides: Partial<SaveV5> = {}): SaveV5 {
  const s = defaultV1();
  s.stats.totalAscends = 3;
  s.totalLifetimeBlood = 50_000;
  s.stats.totalTaps = 200;
  s.dread = 12;
  return { ...s, ...overrides };
}

function fresh(): SaveV5 {
  return defaultV1();
}

describe('snapshotHasProgress', () => {
  it('returns false on a brand-new defaultV1 save', () => {
    expect(snapshotHasProgress(fresh())).toBe(false);
  });

  it('returns true once the player has ascended at least once', () => {
    const s = fresh();
    s.stats.totalAscends = 1;
    expect(snapshotHasProgress(s)).toBe(true);
  });

  it('returns true with > 1000 lifetime blood', () => {
    const s = fresh();
    s.totalLifetimeBlood = 1500;
    expect(snapshotHasProgress(s)).toBe(true);
  });

  it('returns true past 50 taps', () => {
    const s = fresh();
    s.stats.totalTaps = 51;
    expect(snapshotHasProgress(s)).toBe(true);
  });

  it('keeps returning false at exactly the boundary values', () => {
    const s = fresh();
    s.stats.totalAscends = 0;
    s.totalLifetimeBlood = 1000;
    s.stats.totalTaps = 50;
    expect(snapshotHasProgress(s)).toBe(false);
  });
});

describe('decideSync', () => {
  it('no local + no cloud → no-op', () => {
    expect(decideSync(null, null)).toEqual({ kind: 'no-op' });
  });

  it('local has progress + no cloud row → push-local', () => {
    expect(decideSync(withProgress(), null)).toEqual({ kind: 'push-local' });
  });

  it('cloud has progress + no local → pull-cloud', () => {
    expect(decideSync(null, withProgress())).toEqual({ kind: 'pull-cloud' });
  });

  it('both fresh (no progress on either side) → push-local so the row exists', () => {
    // The conflict branch only fires when BOTH sides have meaningful
    // progress. Two fresh saves fall through to push-local — we want
    // the cloud row to exist even before the player has done anything,
    // so subsequent sign-ins can pull-cloud cleanly on a 2nd device.
    const a = fresh();
    const b = fresh();
    expect(decideSync(a, b)).toEqual({ kind: 'push-local' });
  });

  it('local fresh + cloud has progress → pull-cloud', () => {
    expect(decideSync(fresh(), withProgress())).toEqual({ kind: 'pull-cloud' });
  });

  it('local has progress + cloud fresh → push-local', () => {
    expect(decideSync(withProgress(), fresh())).toEqual({ kind: 'push-local' });
  });

  it('both have progress + identical → no-op (avoid redundant write)', () => {
    const a = withProgress();
    const b = withProgress();
    a.ts = b.ts = 12345;
    a.stats.firstLaunch = b.stats.firstLaunch;
    expect(decideSync(a, b)).toEqual({ kind: 'no-op' });
  });

  it('both have progress + divergent → conflict', () => {
    const local = withProgress({ ts: 100 });
    const cloud = withProgress({ ts: 200 });
    cloud.dread = 22;
    cloud.stats.totalAscends = 5;
    expect(decideSync(local, cloud)).toEqual({ kind: 'conflict' });
  });
});
