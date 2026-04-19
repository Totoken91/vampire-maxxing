import { beforeEach, describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  defaultV1,
  parseSave,
  serializeSave,
  type SaveV1,
} from '../src/game/save';

describe('save v1 round-trip', () => {
  let base: SaveV1;

  beforeEach(() => {
    base = defaultV1();
  });

  it('serializes + re-parses without drift', () => {
    base.blood = 12345;
    base.dread = 4;
    base.thralls.rat.owned = 17;
    base.thralls.rat.totalPurchased = 17;
    base.stats.totalAscends = 2;
    base.stats.highestFormReached = 'ELDER';
    const raw = serializeSave(base);
    const parsed = parseSave(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.blood).toBe(12345);
    expect(parsed!.dread).toBe(4);
    expect(parsed!.thralls.rat.owned).toBe(17);
    expect(parsed!.stats.highestFormReached).toBe('ELDER');
  });

  it('returns null for corrupt JSON', () => {
    expect(parseSave('not json at all')).toBeNull();
    expect(parseSave('{broken')).toBeNull();
  });

  it('returns null for invalid shape', () => {
    const broken = { ...base, blood: -5 };
    expect(parseSave(JSON.stringify(broken))).toBeNull();
  });

  it('returns null for unknown highestFormReached', () => {
    const broken = { ...base, stats: { ...base.stats, highestFormReached: 'WAT' } };
    expect(parseSave(JSON.stringify(broken))).toBeNull();
  });

  it('returns null for unknown skin', () => {
    const broken = { ...base, skin: 'phantom' };
    expect(parseSave(JSON.stringify(broken))).toBeNull();
  });
});

describe('save migration', () => {
  it('wraps a v0 (unversioned) save into v1', () => {
    const legacy = {
      blood: 42,
      dread: 1,
      thralls: { rat: { owned: 3, totalPurchased: 3 } },
    };
    const migrated = parseSave(JSON.stringify(legacy));
    expect(migrated).not.toBeNull();
    expect(migrated!.v).toBe(SAVE_VERSION);
    expect(migrated!.blood).toBe(42);
    expect(migrated!.thralls.rat.owned).toBe(3);
    // Other thrall ids filled with defaults
    expect(migrated!.thralls.ghoul.owned).toBe(0);
  });
});
