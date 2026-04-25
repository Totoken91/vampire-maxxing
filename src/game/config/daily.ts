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
  /** Floor blood reward — used when current rate × minutes is lower
   *  (fresh players whose generators don't produce yet). 0 on day 1
   *  preserves the "empty hands" symbolism of the first arrival. */
  minBlood: number;
  /** Flat dread reward, added on top. */
  dread: number;
  /** L3 — Ichor reward, ramping over the 7-day cycle so a steady
   * daily login compounds toward a Rite pull (~1-3/day). */
  ichor: number;
  /** Short caps label shown under the chain for this day. */
  label: string;
}

/**
 * Day 1 is never visually shown — it's silently marked claimed on
 * the very first session so the player starts with empty hands. The
 * cycle's first reward landing on the player's screen is day 2's
 * THE HUNGER STIRS at 10K floor, growing from there. Per-day floors
 * scale exponentially (×5 per day) so a fresh player has a
 * meaningful gift at every tier even if their rate is near-zero.
 */
export const DAILY_CYCLE: readonly DailyDay[] = [
  { minutes: 0,  minBlood: 0,        dread: 0, ichor: 0, label: 'A QUIET ARRIVAL' },
  { minutes: 3,  minBlood: 10_000,   dread: 0, ichor: 1, label: 'THE HUNGER STIRS' },
  { minutes: 10, minBlood: 25_000,   dread: 1, ichor: 2, label: 'A TASTE OF DREAD' },
  { minutes: 20, minBlood: 75_000,   dread: 1, ichor: 2, label: 'THE COURT NOTICES' },
  { minutes: 30, minBlood: 150_000,  dread: 2, ichor: 2, label: 'A FAMILIAR WEIGHT' },
  { minutes: 60, minBlood: 400_000,  dread: 3, ichor: 3, label: 'THE MOON BOWS' },
  { minutes: 120, minBlood: 600_000, dread: 5, ichor: 3, label: 'THE SABBATH' },
];

export interface DailyReward {
  blood: number;
  dread: number;
  ichor: number;
}

/** Reward for `dayIndex` (0-based, so 0 = day 1) at a given rate. */
export function rewardFor(dayIndex: number, rate: number): DailyReward {
  const clamped = Math.max(0, Math.min(DAILY_CYCLE.length - 1, dayIndex));
  const spec = DAILY_CYCLE[clamped]!;
  const blood = Math.max(spec.minBlood, Math.floor(rate * 60 * spec.minutes));
  return { blood, dread: spec.dread, ichor: spec.ichor };
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
