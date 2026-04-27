// Server-side mirror of src/game/config/daily.ts. Keep in sync.
//
// Cycle version: K5 + L3 (2026-04-25). 7 days, day 1 silent, blood
// floors per day with rate-multiplied bonus, dread + ichor rewards
// from day 3 onward.

export interface DailyDay {
  minutes: number;
  minBlood: number;
  dread: number;
  ichor: number;
  label: string;
}

export const DAILY_CYCLE: readonly DailyDay[] = [
  { minutes: 0, minBlood: 0, dread: 0, ichor: 0, label: 'A QUIET ARRIVAL' },
  { minutes: 3, minBlood: 10_000, dread: 0, ichor: 1, label: 'THE HUNGER STIRS' },
  { minutes: 10, minBlood: 25_000, dread: 1, ichor: 2, label: 'A TASTE OF DREAD' },
  { minutes: 20, minBlood: 75_000, dread: 1, ichor: 2, label: 'THE COURT NOTICES' },
  { minutes: 30, minBlood: 150_000, dread: 2, ichor: 2, label: 'A FAMILIAR WEIGHT' },
  { minutes: 60, minBlood: 400_000, dread: 3, ichor: 3, label: 'THE MOON BOWS' },
  { minutes: 120, minBlood: 600_000, dread: 5, ichor: 3, label: 'THE SABBATH' },
];

export interface DailyReward {
  blood: number;
  dread: number;
  ichor: number;
}

/** Reward for `dayIndex` (0-based, 0 = day 1 silent) at the given rate. */
export function rewardFor(dayIndex: number, rate: number): DailyReward {
  const clamped = Math.max(0, Math.min(DAILY_CYCLE.length - 1, dayIndex));
  const spec = DAILY_CYCLE[clamped]!;
  const blood = Math.max(
    spec.minBlood,
    Math.floor(rate * 60 * spec.minutes),
  );
  return { blood, dread: spec.dread, ichor: spec.ichor };
}

/** ISO date YYYY-MM-DD validated by regex. Anything else is rejected
 *  upstream so we can trust this format inside the engine. */
export function parseLocalDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  // Bounds-check: must be within ±2 days of UTC today to prevent
  // forward-rollback abuse. The 2-day window covers any legitimate
  // timezone offset (UTC-12 to UTC+14 spans ~26h).
  const today = new Date();
  const todayKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  const todayMs = Date.parse(`${todayKey}T00:00:00Z`);
  const claimMs = Date.parse(`${raw}T00:00:00Z`);
  if (Number.isNaN(claimMs)) return null;
  const diffDays = (claimMs - todayMs) / (24 * 60 * 60 * 1000);
  if (diffDays < -2 || diffDays > 2) return null;
  return raw;
}

/** True iff `prev` is exactly the local day immediately before `today`.
 *  Works on YYYY-MM-DD strings interpreted as local-noon UTC anchors so
 *  DST shifts don't shift the result. */
export function isConsecutiveDay(prev: string, today: string): boolean {
  if (!prev) return false;
  const prevMs = Date.parse(`${prev}T00:00:00Z`);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(prevMs) || Number.isNaN(todayMs)) return false;
  const diffDays = Math.round((todayMs - prevMs) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/** Decide the day_index (0-based, 0..6) of today's claim given the
 *  previous claim's day_index and date. Pure function — no DB.
 *
 *  Rules:
 *    - First lifetime claim → day 0 (silent).
 *    - Consecutive day + previous in 0..5 → previous + 1.
 *    - Consecutive day + previous == 6 (was day 7) → wrap to 0 (silent).
 *    - Gap > 1 day → reset to 0.
 *
 *  The "wrap to 0 silent" rule preserves Kenny's preference: day 1 is
 *  always empty-handed, even after completing a full cycle. The first
 *  meaningful reward of any new cycle is day 2 (10K floor + 1 ichor). */
export function decideDayIndex(
  prevDayIndex: number | null,
  prevDate: string | null,
  today: string,
): number {
  if (prevDayIndex === null || prevDate === null) return 0;
  if (!isConsecutiveDay(prevDate, today)) return 0;
  if (prevDayIndex >= 6) return 0;
  return prevDayIndex + 1;
}
