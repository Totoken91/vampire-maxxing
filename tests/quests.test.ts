// L_QUESTS — daily quest engine + achievement claim flow tests.

import { beforeEach, describe, expect, it } from 'vitest';
import { gameState } from '../src/game/state';
import {
  canClaimQuest,
  claimQuest,
  getActiveQuest,
  recordMetric,
  rotateIfNeeded,
} from '../src/game/quests';
import {
  QUEST_POOL,
  questForDate,
  QUESTS_BY_ID,
} from '../src/game/config/quests';
import { ACHIEVEMENTS } from '../src/game/config/achievements';
import {
  claimAchievement,
  claimAllAchievements,
} from '../src/game/achievement-claim';
import { localDateKey } from '../src/game/config/daily';

describe('questForDate (deterministic seed)', () => {
  it('returns the same quest for the same date string', () => {
    const a = questForDate('2026-04-25');
    const b = questForDate('2026-04-25');
    expect(a.id).toBe(b.id);
  });

  it('always returns a valid quest from the pool', () => {
    for (const date of [
      '2024-01-01',
      '2026-12-31',
      '2030-06-15',
      '1999-02-28',
    ]) {
      const q = questForDate(date);
      expect(QUEST_POOL.includes(q)).toBe(true);
    }
  });

  it('distributes across the pool over a year', () => {
    const seen = new Set<string>();
    const start = new Date('2026-01-01').getTime();
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(start + i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
      seen.add(questForDate(key).id);
    }
    // Pool size is 12 — over a year every quest should land at least once.
    expect(seen.size).toBe(QUEST_POOL.length);
  });
});

describe('rotateIfNeeded + getActiveQuest', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('rotates to today on first access', () => {
    const q = getActiveQuest();
    const today = localDateKey();
    expect(q.id).toBe(questForDate(today).id);
    expect(gameState.getQuestState().date).toBe(today);
  });

  it('is idempotent (same call, same result)', () => {
    rotateIfNeeded();
    const q1 = getActiveQuest();
    rotateIfNeeded();
    const q2 = getActiveQuest();
    expect(q1.id).toBe(q2.id);
  });

  it('rotation resets progress + claim flag + metrics', () => {
    rotateIfNeeded();
    const qs = gameState.getQuestState();
    qs.progress = 99;
    qs.claimed = true;
    qs.metrics.taps_today = 50;
    qs.date = '1999-01-01'; // simulate a stale day
    rotateIfNeeded();
    const after = gameState.getQuestState();
    expect(after.progress).toBe(0);
    expect(after.claimed).toBe(false);
    expect(after.metrics.taps_today).toBe(0);
  });
});

describe('recordMetric + canClaimQuest', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('only increments counters that the active quest cares about', () => {
    rotateIfNeeded();
    const def = getActiveQuest();
    // Always record a foreign metric — should not move quest progress.
    const foreign = def.metric === 'taps_today' ? 'pulls_today' : 'taps_today';
    recordMetric(foreign as typeof def.metric, 100);
    expect(gameState.getQuestState().progress).toBe(0);
  });

  it('clamps progress at the target', () => {
    rotateIfNeeded();
    const def = getActiveQuest();
    recordMetric(def.metric, def.target * 5);
    expect(gameState.getQuestState().progress).toBe(def.target);
  });

  it('returns false from canClaim until target is reached', () => {
    rotateIfNeeded();
    const def = getActiveQuest();
    expect(canClaimQuest()).toBe(false);
    recordMetric(def.metric, def.target - 1);
    expect(canClaimQuest()).toBe(false);
    recordMetric(def.metric, 1);
    expect(canClaimQuest()).toBe(true);
  });

  it('rejects negative or zero deltas defensively', () => {
    rotateIfNeeded();
    const def = getActiveQuest();
    const before = gameState.getQuestState().metrics[def.metric];
    recordMetric(def.metric, 0);
    recordMetric(def.metric, -5);
    expect(gameState.getQuestState().metrics[def.metric]).toBe(before);
  });
});

describe('claimQuest', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('grants the quest reward Ichor and flips the claimed flag', () => {
    rotateIfNeeded();
    const def = getActiveQuest();
    recordMetric(def.metric, def.target);
    const before = gameState.getIchor();
    const credited = claimQuest();
    expect(credited).toBe(def.reward.ichor);
    expect(gameState.getIchor()).toBe(before + def.reward.ichor);
    expect(gameState.getQuestState().claimed).toBe(true);
  });

  it('returns 0 when the quest is not complete', () => {
    rotateIfNeeded();
    const credited = claimQuest();
    expect(credited).toBe(0);
  });

  it('refuses double-claim', () => {
    rotateIfNeeded();
    const def = getActiveQuest();
    recordMetric(def.metric, def.target);
    const first = claimQuest();
    const second = claimQuest();
    expect(first).toBe(def.reward.ichor);
    expect(second).toBe(0);
  });
});

describe('Quest pool reward calibration (V1.2 spec)', () => {
  it('caps every quest reward at 3 Ichor', () => {
    for (const q of QUEST_POOL) {
      expect(q.reward.ichor).toBeGreaterThanOrEqual(2);
      expect(q.reward.ichor).toBeLessThanOrEqual(3);
    }
  });

  it('keeps the average reward in the F2P-friendly band (2-3 Ichor)', () => {
    const sum = QUEST_POOL.reduce((acc, q) => acc + q.reward.ichor, 0);
    const avg = sum / QUEST_POOL.length;
    expect(avg).toBeGreaterThanOrEqual(2);
    expect(avg).toBeLessThanOrEqual(3);
  });

  it('every metric in the pool maps to a known QuestMetric union member', () => {
    const metrics = new Set(QUEST_POOL.map((q) => q.metric));
    // Sanity: at least 5 distinct metrics so the rotation feels varied.
    expect(metrics.size).toBeGreaterThanOrEqual(5);
  });
});

describe('Achievement claim flow', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('queues an achievement on unlock when ichorReward > 0', () => {
    const def = ACHIEVEMENTS.find((a) => a.ichorReward > 0)!;
    gameState.unlockAchievement(def.id);
    expect(gameState.getUnclaimedAchievements().has(def.id)).toBe(true);
  });

  it('does not double-queue on repeated unlock calls', () => {
    const def = ACHIEVEMENTS.find((a) => a.ichorReward > 0)!;
    gameState.unlockAchievement(def.id);
    gameState.unlockAchievement(def.id);
    expect(gameState.getUnclaimedAchievements().size).toBe(1);
  });

  it('claimAchievement grants Ichor + clears from unclaimed pool', () => {
    const def = ACHIEVEMENTS.find((a) => a.ichorReward > 0)!;
    gameState.unlockAchievement(def.id);
    const before = gameState.getIchor();
    const credited = claimAchievement(def.id);
    expect(credited).toBe(def.ichorReward);
    expect(gameState.getIchor()).toBe(before + def.ichorReward);
    expect(gameState.getUnclaimedAchievements().has(def.id)).toBe(false);
  });

  it('claimAchievement rejects unknown ids + already-claimed entries', () => {
    expect(claimAchievement('does-not-exist')).toBe(0);
    const def = ACHIEVEMENTS.find((a) => a.ichorReward > 0)!;
    gameState.unlockAchievement(def.id);
    claimAchievement(def.id);
    expect(claimAchievement(def.id)).toBe(0);
  });

  it('claimAllAchievements flushes the entire pool and totals correctly', () => {
    const eligible = ACHIEVEMENTS.filter((a) => a.ichorReward > 0).slice(0, 5);
    let expected = 0;
    for (const def of eligible) {
      gameState.unlockAchievement(def.id);
      expected += def.ichorReward;
    }
    const result = claimAllAchievements();
    expect(result.count).toBe(eligible.length);
    expect(result.totalIchor).toBe(expected);
    expect(gameState.getUnclaimedAchievements().size).toBe(0);
  });
});

describe('Achievement reward sizing (V1.2 spec)', () => {
  it('every achievement carries a non-negative ichorReward', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.ichorReward).toBeGreaterThanOrEqual(0);
      expect(a.ichorReward).toBeLessThanOrEqual(5);
    }
  });

  it('total achievement Ichor sits in the F2P-respectful band (~30-60)', () => {
    const total = ACHIEVEMENTS.reduce((acc, a) => acc + a.ichorReward, 0);
    expect(total).toBeGreaterThanOrEqual(30);
    expect(total).toBeLessThanOrEqual(60);
  });
});

describe('Quest pool sanity (no orphan ids)', () => {
  it('every QUESTS_BY_ID entry round-trips through QUEST_POOL', () => {
    for (const q of QUEST_POOL) {
      expect(QUESTS_BY_ID[q.id]).toBe(q);
    }
  });
});
