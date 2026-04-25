import { beforeEach, describe, expect, it } from 'vitest';
import { gameState } from '../src/game/state';
import {
  canSoulreave,
  performSoulreave,
  projectedSoulShards,
  canPurchaseMetaNode,
  purchaseMetaNode,
  ownsMetaNode,
  soulreaveUnlocked,
} from '../src/game/soulreave';
import { BALANCE } from '../src/game/config/balance';
import {
  META_NODES,
  META_NODES_BY_ID,
  META_TREE_TOTAL_COST,
} from '../src/game/config/meta-tree';
import { defaultV5, parseSave, serializeSave, SAVE_VERSION } from '../src/game/save';

// Reset the live game state to a clean snapshot between tests. The
// engine is a singleton so any mutation in one test leaks into the
// next without this scrub.
function resetState(): void {
  // Re-create empty snapshot — accesses the public API where possible
  // and falls back to the internal `_dev` helpers for the Soulreave
  // layer (the layer doesn't expose a public reset).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (gameState as any).snapshot = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameState as any).constructor.prototype as any
  ).constructor === undefined
    ? null
    : null;
  // Easier: just call the internal applySave with a fresh defaultV5.
  // applySave is private; access via the cheat-style cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (gameState as any).snapshot = (gameState as any).snapshot ?? null;
  // Cleanest: call applySave through `loadFromStorage` mock.
  // For a unit test we just emulate the relevant fields by hand.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snap = (gameState as any).snapshot ?? {};
  Object.assign(snap, {
    blood: 0,
    totalRunBlood: 0,
    totalRunBloodOnline: 0,
    totalLifetimeBlood: 0,
    dread: 0,
    lifetimeDread: 0,
    soulShards: 0,
    metaTree: {},
    totalSoulreaves: 0,
    welcomeTributeArmed: false,
    stats: {
      totalTaps: 0,
      totalCrits: 0,
      totalAscends: 0,
      firstLaunch: Date.now(),
      totalPlayTime: 0,
      highestFormReached: 'NEWBORN',
    },
    runHistory: [],
    boost: { active: false, endTime: 0, cooldownEnd: 0, isRewarded: false },
    pendingCurseMult: 1,
    lastMilestoneExp: -1,
    servants: snap.servants ?? {
      rat: { owned: 0, totalPurchased: 0 },
      ghoul: { owned: 0, totalPurchased: 0 },
      fledgling: { owned: 0, totalPurchased: 0 },
      thrall: { owned: 0, totalPurchased: 0 },
      blade: { owned: 0, totalPurchased: 0 },
      courtesan: { owned: 0, totalPurchased: 0 },
      elder: { owned: 0, totalPurchased: 0 },
      cardinal: { owned: 0, totalPurchased: 0 },
    },
    equippedSlots: [null, null, null],
  });
  // Fully zero each servant
  for (const k of Object.keys(snap.servants)) {
    snap.servants[k] = { owned: 0, totalPurchased: 0 };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (gameState as any).snapshot = snap;
}

describe('V1.3 Soulreave — projectedSoulShards', () => {
  it('returns 0 below the threshold', () => {
    expect(projectedSoulShards(0)).toBe(0);
    expect(projectedSoulShards(BALANCE.SOULREAVE_THRESHOLD_DREAD - 1)).toBe(0);
  });

  it('matches the sqrt formula at the reference points', () => {
    // floor(2 * sqrt(lifetime/1000))
    expect(projectedSoulShards(1000)).toBe(2);
    expect(projectedSoulShards(4000)).toBe(4);
    expect(projectedSoulShards(10000)).toBe(6);
    expect(projectedSoulShards(40000)).toBe(12);
  });

  it('is monotonically non-decreasing in lifetimeDread', () => {
    let prev = -1;
    for (let d = 0; d < 100000; d += 137) {
      const v = projectedSoulShards(d);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('V1.3 Soulreave — canSoulreave gating', () => {
  beforeEach(resetState);

  it('false below Methuselah even with high lifetimeDread', () => {
    gameState._devAddLifetimeDread(100000);
    expect(canSoulreave()).toBe(false);
    expect(soulreaveUnlocked()).toBe(false);
  });

  it('false at Methuselah but below Dread threshold', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameState as any).snapshot.stats.totalAscends =
      BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS;
    gameState._devAddLifetimeDread(BALANCE.SOULREAVE_THRESHOLD_DREAD - 1);
    expect(canSoulreave()).toBe(false);
    expect(soulreaveUnlocked()).toBe(true); // system visible, gate not crossed
  });

  it('true at Methuselah + threshold crossed', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameState as any).snapshot.stats.totalAscends =
      BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS;
    gameState._devAddLifetimeDread(BALANCE.SOULREAVE_THRESHOLD_DREAD);
    expect(canSoulreave()).toBe(true);
  });
});

describe('V1.3 Soulreave — performSoulreave reset scope', () => {
  beforeEach(resetState);

  it('credits Soul Shards equal to projection', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameState as any).snapshot.stats.totalAscends =
      BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS;
    gameState._devAddLifetimeDread(4000); // → 4 shards
    const gained = performSoulreave();
    expect(gained).toBe(4);
    expect(gameState.getSoulShards()).toBe(4);
    expect(gameState.getTotalSoulreaves()).toBe(1);
  });

  it('resets dread + totalAscends but PRESERVES lifetimeDread', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameState as any).snapshot.stats.totalAscends = 30;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (gameState as any).snapshot.dread = 8000;
    gameState._devAddLifetimeDread(8000);
    performSoulreave();
    expect(gameState.getDread()).toBe(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((gameState as any).snapshot.stats.totalAscends).toBe(0);
    expect(gameState.getLifetimeDread()).toBe(8000); // PRESERVED
  });

  it('IRON_WILL keeps 1 of each tier the player owned', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (gameState as any).snapshot;
    s.stats.totalAscends = BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS;
    gameState._devAddLifetimeDread(BALANCE.SOULREAVE_THRESHOLD_DREAD);
    s.servants.rat.owned = 47;
    s.servants.ghoul.owned = 11;
    // Award the IRON_WILL node directly (skip the cost gate).
    gameState._setMetaNodeOwned('IRON_WILL', true);
    performSoulreave();
    expect(s.servants.rat.owned).toBe(1);
    expect(s.servants.ghoul.owned).toBe(1);
    expect(s.servants.fledgling.owned).toBe(0); // wasn't owned, stays at 0
  });

  it('ETERNAL_BOND preserves equippedSlots', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (gameState as any).snapshot;
    s.stats.totalAscends = BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS;
    gameState._devAddLifetimeDread(BALANCE.SOULREAVE_THRESHOLD_DREAD);
    s.equippedSlots = ['nox', null, 'mirella'];
    gameState._setMetaNodeOwned('ETERNAL_BOND', true);
    performSoulreave();
    expect(s.equippedSlots).toEqual(['nox', null, 'mirella']);
  });

  it('without ETERNAL_BOND, equippedSlots are wiped', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (gameState as any).snapshot;
    s.stats.totalAscends = BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS;
    gameState._devAddLifetimeDread(BALANCE.SOULREAVE_THRESHOLD_DREAD);
    s.equippedSlots = ['nox', null, 'mirella'];
    performSoulreave();
    expect(s.equippedSlots).toEqual([null, null, null]);
  });
});

describe('V1.3 Soulreave — meta-tree linear unlock', () => {
  beforeEach(resetState);

  it('first node (ETERNAL_FLAME) is purchasable with no prereqs', () => {
    gameState._devAddSoulShards(2);
    expect(canPurchaseMetaNode('ETERNAL_FLAME')).toBe(true);
    expect(canPurchaseMetaNode('IRON_WILL')).toBe(false); // requires Eternal Flame
  });

  it('purchasing a node spends Soul Shards + marks owned', () => {
    gameState._devAddSoulShards(5);
    const ok = purchaseMetaNode('ETERNAL_FLAME');
    expect(ok).toBe(true);
    expect(gameState.getSoulShards()).toBe(3); // 5 - 2
    expect(ownsMetaNode('ETERNAL_FLAME')).toBe(true);
    // IRON_WILL now affordable IF player has 3 shards (cost 3) — yes
    expect(canPurchaseMetaNode('IRON_WILL')).toBe(true);
  });

  it('cannot re-purchase an owned node', () => {
    gameState._devAddSoulShards(20);
    purchaseMetaNode('ETERNAL_FLAME');
    expect(canPurchaseMetaNode('ETERNAL_FLAME')).toBe(false);
    expect(purchaseMetaNode('ETERNAL_FLAME')).toBe(false);
  });

  it('cannot purchase mid-chain without prereqs', () => {
    gameState._devAddSoulShards(50);
    expect(canPurchaseMetaNode('AUTO_BUY')).toBe(false);
    expect(canPurchaseMetaNode('ETERNAL_BOND')).toBe(false);
  });

  it('full clear consumes META_TREE_TOTAL_COST shards', () => {
    gameState._devAddSoulShards(META_TREE_TOTAL_COST);
    // Buy in dependency order (the META_NODES array is already
    // sorted by Fibonacci cost, which matches the prereq chain).
    for (const node of META_NODES) {
      const ok = purchaseMetaNode(node.id);
      expect(ok, `should buy ${node.id}`).toBe(true);
    }
    expect(gameState.getSoulShards()).toBe(0);
    for (const node of META_NODES) {
      expect(ownsMetaNode(node.id)).toBe(true);
    }
  });
});

describe('V1.3 Soulreave — Welcome Tribute arming', () => {
  beforeEach(resetState);

  it('arms welcomeTributeArmed when Soulreaving with the node owned', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (gameState as any).snapshot;
    s.stats.totalAscends = BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS;
    gameState._devAddLifetimeDread(BALANCE.SOULREAVE_THRESHOLD_DREAD);
    gameState._setMetaNodeOwned('WELCOME_TRIBUTE', true);
    expect(gameState.isWelcomeTributeArmed()).toBe(false);
    performSoulreave();
    expect(gameState.isWelcomeTributeArmed()).toBe(true);
  });

  it('does NOT arm when the node is not owned', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (gameState as any).snapshot;
    s.stats.totalAscends = BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS;
    gameState._devAddLifetimeDread(BALANCE.SOULREAVE_THRESHOLD_DREAD);
    performSoulreave();
    expect(gameState.isWelcomeTributeArmed()).toBe(false);
  });
});

describe('V1.3 Soulreave — save migration v4 → v5', () => {
  it('current SAVE_VERSION is 5', () => {
    expect(SAVE_VERSION).toBe(5);
  });

  it('parses a hand-rolled v4 save and backfills v5 fields', () => {
    // Build a minimal v4 shape with valid required fields.
    const v4 = {
      v: 4,
      ts: Date.now(),
      blood: 0,
      totalRunBlood: 0,
      totalLifetimeBlood: 0,
      dread: 50,
      servants: {
        rat: { owned: 0, totalPurchased: 0 },
        ghoul: { owned: 0, totalPurchased: 0 },
        fledgling: { owned: 0, totalPurchased: 0 },
        thrall: { owned: 0, totalPurchased: 0 },
        blade: { owned: 0, totalPurchased: 0 },
        courtesan: { owned: 0, totalPurchased: 0 },
        elder: { owned: 0, totalPurchased: 0 },
        cardinal: { owned: 0, totalPurchased: 0 },
      },
      baseClickPower: 1,
      boost: { active: false, endTime: 0, cooldownEnd: 0, isRewarded: false },
      stats: {
        totalTaps: 0,
        totalCrits: 0,
        totalAscends: 5,
        firstLaunch: Date.now(),
        totalPlayTime: 0,
        highestFormReached: 'ELDER',
      },
      unlockedAchievements: [],
      skin: 'default',
      ownedSkins: ['default'],
      isFounder: false,
      pendingCurseMult: 1,
      ritesLastUsed: {},
      unseenAchievements: [],
      upgrades: {},
      settings: {
        soundEnabled: false,
        hapticsEnabled: true,
        lang: 'en',
        notifEnabled: false,
      },
    };
    const parsed = parseSave(JSON.stringify(v4));
    expect(parsed).not.toBeNull();
    expect(parsed!.v).toBe(5);
    // lifetimeDread backfilled to current dread (lower-bound).
    expect(parsed!.lifetimeDread).toBe(50);
    expect(parsed!.soulShards).toBe(0);
    expect(parsed!.metaTree).toEqual({});
    expect(parsed!.totalSoulreaves).toBe(0);
    expect(parsed!.welcomeTributeArmed).toBe(false);
  });

  it('round-trips a v5 save through serialize → parse', () => {
    const base = defaultV5();
    base.soulShards = 7;
    base.totalSoulreaves = 3;
    base.metaTree = { ETERNAL_FLAME: true, IRON_WILL: true };
    base.lifetimeDread = 12345;
    const parsed = parseSave(serializeSave(base));
    expect(parsed).not.toBeNull();
    expect(parsed!.soulShards).toBe(7);
    expect(parsed!.totalSoulreaves).toBe(3);
    expect(parsed!.metaTree).toEqual({ ETERNAL_FLAME: true, IRON_WILL: true });
    expect(parsed!.lifetimeDread).toBe(12345);
  });
});

describe('V1.3 Soulreave — meta-tree config integrity', () => {
  it('every node except the first has a valid prereq', () => {
    let seenFirst = false;
    for (const node of META_NODES) {
      if (node.requires === null) {
        expect(seenFirst, `multiple root nodes (only ETERNAL_FLAME should be root)`).toBe(false);
        seenFirst = true;
      } else {
        expect(META_NODES_BY_ID[node.requires]).toBeDefined();
      }
    }
    expect(seenFirst).toBe(true);
  });

  it('costs are strictly increasing (Fibonacci-ish)', () => {
    for (let i = 1; i < META_NODES.length; i += 1) {
      expect(META_NODES[i].cost).toBeGreaterThan(META_NODES[i - 1].cost);
    }
  });

  it('total cost matches the constant', () => {
    const sum = META_NODES.reduce((s, n) => s + n.cost, 0);
    expect(sum).toBe(META_TREE_TOTAL_COST);
  });
});
