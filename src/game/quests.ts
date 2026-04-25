// L_QUESTS — quest engine. Tracks per-day metric counters, gates
// claim on completion, grants Ichor through grantIchor() so the
// ledger + ichor-earned event fire normally.
//
// State lives in `gameState.snapshot.questState`. The state layer
// owns persistence; this module just mutates it via accessors.

import { events } from './events';
import { gameState } from './state';
import { grantIchor } from './ichor';
import { localDateKey } from './config/daily';
import {
  QUESTS_BY_ID,
  questForDate,
  type QuestDef,
  type QuestMetric,
} from './config/quests';
import { emptyMetrics } from './quests-types';

export type { QuestState } from './quests-types';
export { emptyMetrics, emptyQuestState } from './quests-types';

/** Rotate to today's quest if the date changed. Resets metrics +
 *  claim flag. Idempotent — safe to call on every UI render. */
export function rotateIfNeeded(): void {
  const today = localDateKey();
  const qs = gameState.getQuestState();
  if (qs.date === today && qs.activeId) return;
  const next = questForDate(today);
  qs.date = today;
  qs.activeId = next.id;
  qs.progress = 0;
  qs.claimed = false;
  qs.metrics = emptyMetrics();
}

/** The active quest definition for today. May rotate on access if
 *  the date crossed midnight while the player was idle. */
export function getActiveQuest(): QuestDef {
  rotateIfNeeded();
  const qs = gameState.getQuestState();
  return QUESTS_BY_ID[qs.activeId] ?? questForDate(qs.date);
}

/** Increment a metric counter by `delta`, then re-evaluate the
 *  active quest's progress. Engine-facing — UI shouldn't call this
 *  directly. */
export function recordMetric(metric: QuestMetric, delta: number): void {
  if (delta <= 0) return;
  rotateIfNeeded();
  const qs = gameState.getQuestState();
  qs.metrics[metric] += delta;

  const active = QUESTS_BY_ID[qs.activeId];
  if (!active) return;
  if (active.metric !== metric) return;
  if (qs.progress >= active.target) return;
  const before = qs.progress;
  qs.progress = Math.min(active.target, qs.metrics[metric]);
  if (qs.progress >= active.target && before < active.target) {
    events.emit('quest-completed', { id: active.id });
  }
}

/** True iff today's quest is at target AND not yet claimed. */
export function canClaimQuest(): boolean {
  rotateIfNeeded();
  const qs = gameState.getQuestState();
  if (qs.claimed) return false;
  const active = QUESTS_BY_ID[qs.activeId];
  if (!active) return false;
  return qs.progress >= active.target;
}

/** Claim the active quest's reward. Returns the granted Ichor amount
 *  on success, 0 if not claimable. */
export function claimQuest(): number {
  if (!canClaimQuest()) return 0;
  const qs = gameState.getQuestState();
  const active = QUESTS_BY_ID[qs.activeId];
  if (!active) return 0;
  qs.claimed = true;
  const credited = grantIchor(active.reward.ichor, 'daily_quest');
  events.emit('quest-claimed', { id: active.id, ichor: credited });
  return credited;
}

/** Seconds until midnight local time — drives the "Rotates in Xh Ym"
 *  countdown on the quest header. Returns 0 if the day already
 *  rolled over (caller is expected to trigger a rotate before
 *  re-rendering). */
export function secondsUntilRotate(): number {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}
