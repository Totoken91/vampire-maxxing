import { beforeEach, describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  defaultV1,
  parseSave,
  serializeSave,
  type SaveV5,
} from '../src/game/save';

describe('save round-trip', () => {
  let base: SaveV5;

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

  it('renames v2 thralls field to servants (v2 → v4 chain)', () => {
    // Build a realistic v2 payload: start from the current default, bump
    // rat's count, then rename the field back to the legacy name so we
    // exercise the v2→v3→v4 path.
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

  it('v3 → v4 reclaims Dread spent on deprecated upgrades into rank', () => {
    // A v3 player who maxed Scholar (1005 spent) + bought Altar lv 2 (35
    // spent) should recover 1040 Dread as rank; their current dread
    // balance 800 + 1040 reclaimed = 1840 rank post-migration.
    const base = defaultV1();
    const v3Payload = {
      ...base,
      v: 3,
      dread: 800,
      upgrades: {
        bloodline_scholar: 5, // cumulative cost 15+40+100+250+600 = 1005
        blood_altar: 2, // cumulative cost 10+25 = 35
      },
    };
    const migrated = parseSave(JSON.stringify(v3Payload));
    expect(migrated).not.toBeNull();
    expect(migrated!.v).toBe(SAVE_VERSION);
    expect(migrated!.dread).toBe(800 + 1005 + 35);
    // Upgrade map is cleared — the system was removed.
    expect(migrated!.upgrades).toEqual({});
  });

  it('v3 → v4 with no upgrades is a no-op on dread', () => {
    const base = defaultV1();
    const v3Payload = {
      ...base,
      v: 3,
      dread: 42,
      upgrades: {},
    };
    const migrated = parseSave(JSON.stringify(v3Payload));
    expect(migrated).not.toBeNull();
    expect(migrated!.v).toBe(SAVE_VERSION);
    expect(migrated!.dread).toBe(42);
  });

  it('v3 → v4 ignores upgrade levels beyond max without crashing', () => {
    // Safety: a corrupt save with inflated level values shouldn't
    // reclaim more than the real max cumulative cost.
    const base = defaultV1();
    const v3Payload = {
      ...base,
      v: 3,
      dread: 0,
      upgrades: {
        dread_amplifier: 99, // real max is 3 levels = 25+80+250 = 355
      },
    };
    const migrated = parseSave(JSON.stringify(v3Payload));
    expect(migrated).not.toBeNull();
    expect(migrated!.dread).toBe(355);
  });

  it('v3 → v4 ignores unknown upgrade ids gracefully', () => {
    const base = defaultV1();
    const v3Payload = {
      ...base,
      v: 3,
      dread: 10,
      upgrades: {
        ghost_of_christmas_past: 5,
      },
    };
    const migrated = parseSave(JSON.stringify(v3Payload));
    expect(migrated).not.toBeNull();
    expect(migrated!.dread).toBe(10);
    expect(migrated!.upgrades).toEqual({});
  });

  it('pre-M3 save without totalRunBloodOnline round-trips safely', () => {
    // Even a current-v4 save may lack the M3 field if written before
    // the refactor shipped. It's optional → the state layer falls back
    // to totalRunBlood on load.
    const base = defaultV1();
    const sansOnline = {
      ...base,
      totalRunBlood: 500_000,
    };
    delete (sansOnline as { totalRunBloodOnline?: number }).totalRunBloodOnline;
    const raw = JSON.stringify(sansOnline);
    const parsed = parseSave(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.totalRunBlood).toBe(500_000);
    // Field absent → undefined, consumer grandfathers it.
    expect(parsed!.totalRunBloodOnline).toBeUndefined();
  });
});
