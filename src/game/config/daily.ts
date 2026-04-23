// K5 — daily login gift. A 7-day cycle with escalating rewards.
// Consecutive-day claims advance through the cycle; missing a day
// resets to day 1. After day 7 is claimed, the cycle restarts at day 1
// (no ever-climbing meta-streak for MVP — keeps it simple and fair).
//
// Reward scales with the player's CURRENT rate so the gift stays
// relevant at every form tier. DAILY_MIN_BLOOD floors it for very
// fresh players whose rate is near-zero.

export interface DailyDay {
  /** Minutes-of-production equivalent, multiplied by current rate. */
  minutes: number;
  /** Flat dread reward, added on top. */
  dread: number;
  /** Short caps label shown under the chain for this day. */
  label: string;
}

export const DAILY_CYCLE: readonly DailyDay[] = [
  { minutes: 1, dread: 0, label: 'A SMALL MERCY' },
  { minutes: 3, dread: 0, label: 'THE HUNGER STIRS' },
  { minutes: 10, dread: 1, label: 'A TASTE OF DREAD' },
  { minutes: 20, dread: 1, label: 'THE COURT NOTICES' },
  { minutes: 30, dread: 2, label: 'A FAMILIAR WEIGHT' },
  { minutes: 60, dread: 3, label: 'THE MOON BOWS' },
  { minutes: 120, dread: 5, label: 'THE SABBATH' },
];

export const DAILY_MIN_BLOOD = 1000;

export interface DailyReward {
  blood: number;
  dread: number;
}

/** Reward for `dayIndex` (0-based, so 0 = day 1) at a given rate. */
export function rewardFor(dayIndex: number, rate: number): DailyReward {
  const clamped = Math.max(0, Math.min(DAILY_CYCLE.length - 1, dayIndex));
  const spec = DAILY_CYCLE[clamped]!;
  const blood = Math.max(DAILY_MIN_BLOOD, Math.floor(rate * 60 * spec.minutes));
  return { blood, dread: spec.dread };
}

/**
 * Local-date string "YYYY-MM-DD" used to identify a calendar day in
 * the player's timezone. Two claims on the same local day resolve to
 * the same key even if they straddle a UTC boundary, which is what we
 * want (the player experiences "days" in their local time).
 */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** True iff `prev` is exactly the local day immediately before `today`. */
export function isConsecutiveDay(prev: string, today: string): boolean {
  if (!prev) return false;
  const prevDate = new Date(prev + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  if (Number.isNaN(prevDate.getTime()) || Number.isNaN(todayDate.getTime())) {
    return false;
  }
  const diffDays = Math.round(
    (todayDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diffDays === 1;
}
