// L_QUESTS — type & default-state helpers split out of quests.ts to
// dodge the state.ts ⇄ quests.ts circular import (state needs the
// shape, quests needs the engine which needs state).

import type { QuestMetric } from './config/quests';

export interface QuestState {
  /** Local date the active quest was selected for; rolls over at
   *  midnight local time. */
  date: string;
  /** Currently active quest's id (one quest/day). */
  activeId: string;
  /** Progress toward the quest's target. Capped at target. */
  progress: number;
  /** Whether the player has claimed today's reward. */
  claimed: boolean;
  /** Per-metric counters reset each local day. */
  metrics: Record<QuestMetric, number>;
}

export function emptyMetrics(): Record<QuestMetric, number> {
  return {
    taps_today: 0,
    servants_bought_today: 0,
    pulls_today: 0,
    awakenings_today: 0,
    ascends_today: 0,
    ichor_earned_today: 0,
    equips_today: 0,
    rites_used_today: 0,
  };
}

export function emptyQuestState(): QuestState {
  return {
    date: '',
    activeId: '',
    progress: 0,
    claimed: false,
    metrics: emptyMetrics(),
  };
}
