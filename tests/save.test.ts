import { beforeEach, describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  defaultV1,
  parseSave,
  serializeSave,
  type SaveV3,
} from '../src/game/save';

describe('save round-trip', () => {
  let base: SaveV3;

  beforeEach(() => {
    base = defaultV1();
  });

  it('serializes + re-parses without drift', () => {
    base.blood = 12345;
    base.dread = 4;
    base.servants.rat.owned = 17;
    base.servants.rat.totalPurchased = 17;
    base.stats.totalAscends = 2;
    base.stats.highestFormReached = 'ELDER';
    const raw = serializeSave(base);
    const parsed = parseSave(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.blood).toBe(12345);
    expect(parsed!.dread).toBe(4);
    expect(parsed!.servants.rat.owned).toBe(17);
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
  it('wraps a v0 (unversioned) save into the current version', () => {
    const legacy = {
      blood: 42,
      dread: 1,
      servants: { rat: { owned: 3, totalPurchased: 3 } },
    };
    const migrated = parseSave(JSON.stringify(legacy));
    expect(migrated).not.toBeNull();
    expect(migrated!.v).toBe(SAVE_VERSION);
    expect(migrated!.blood).toBe(42);
    expect(migrated!.servants.rat.owned).toBe(3);
    // Other thrall ids filled with defaults
    expect(migrated!.servants.ghoul.owned).toBe(0);
    // v2 adds upgrades — must default to empty map for legacy saves.
    expect(migrated!.upgrades).toEqual({});
  });

  it('upgrades a v1 save in-place to the current version with empty upgrades map', () => {
    // Minimal hand-crafted v1 payload (no `upgrades` key, v:1).
    const v1Payload = {
      ...defaultV1(),
      v: 1,
    };
    // Strip the field so we simulate a real v1 save on disk.
    delete (v1Payload as { upgrades?: unknown }).upgrades;

    const migrated = parseSave(JSON.stringify(v1Payload));
    expect(migrated).not.toBeNull();
    expect(migrated!.v).toBe(SAVE_VERSION);
    expect(migrated!.upgrades).toEqual({});
  });

  it('renames v2 thralls field to servants in v3', () => {
    // Build a realistic v2 payload: start from the current default, bump
    // rat's count, then rename the field back to the legacy name so we
    // exercise the v2→v3 path.
    const base = defaultV1();
    base.servants.rat.owned = 5;
    base.servants.rat.totalPurchased = 5;
    const v2Payload = {
      ...base,
      v: 2,
      thralls: base.servants,
    };
    delete (v2Payload as { servants?: unknown }).servants;

    const migrated = parseSave(JSON.stringify(v2Payload));
    expect(migrated).not.toBeNull();
    expect(migrated!.v).toBe(SAVE_VERSION);
    expect(migrated!.servants.rat.owned).toBe(5);
    expect((migrated as unknown as { thralls?: unknown }).thralls).toBeUndefined();
  });
});
