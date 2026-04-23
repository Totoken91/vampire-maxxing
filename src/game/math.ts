// Pure math for Vampire Maxxing. No DOM, no state mutation, no I/O.
// All formulas are documented in docs/04-BALANCE.md.

import { BALANCE } from './config/balance';
import type { Servant } from './config/servants';

/** Cost of the next purchase of a servant, given how many are already owned. */
export function servantCost(baseCost: number, owned: number): number {
  return Math.floor(baseCost * BALANCE.COST_MULTIPLIER ** owned);
}

/**
 * Cumulative milestone multiplier for a servant based on how many are owned.
 * Thresholds: 10/25/50/100/200/300/400 → ×1080 at 400 owned.
 */
export function servantMilestoneMult(owned: number): number {
  let m = 1;
  if (owned >= 10) m *= 2;
  if (owned >= 25) m *= 2;
  if (owned >= 50) m *= 2;
  if (owned >= 100) m *= 3;
  if (owned >= 200) m *= 3;
  if (owned >= 300) m *= 3;
  if (owned >= 400) m *= 5;
  return m;
}

/** Per-second rate of a single servant type. */
export function servantRate(
  servant: Pick<Servant, 'baseRate'>,
  owned: number,
  globalMult: number,
  boost: number,
): number {
  if (owned <= 0) return 0;
  return owned * servant.baseRate * servantMilestoneMult(owned) * globalMult * boost;
}

/** Global multiplier applied to all rates + click, based on accumulated Dread. */
export function globalMult(dread: number, progenitorBonusActive: boolean): number {
  const base = 1 + dread * BALANCE.DREAD_MULT_PER_UNIT;
  return progenitorBonusActive ? base * BALANCE.GLOBAL_MULT_BONUS_PROGENITOR : base;
}

/**
 * Blood gained per manual tap. Scales with current total rate so tap remains
 * relevant through the whole progression (~1.5s of passive production).
 */
export function clickPower(currentTotalRate: number, mult: number, boost: number): number {
  const base = Math.max(
    BALANCE.BASE_CLICK_POWER,
    currentTotalRate * BALANCE.CLICK_SCALING_RATIO,
  );
  return base * mult * boost;
}

/** Dread gained by ASCENDing the bloodline now. */
export function dreadGain(totalRunBlood: number): number {
  if (totalRunBlood < BALANCE.ASCEND_THRESHOLD) return 0;
  return Math.floor(
    Math.sqrt(totalRunBlood / BALANCE.DREAD_GAIN_DIVISOR) * BALANCE.DREAD_GAIN_COEF,
  );
}

/** Blood gained offline, capped by hours and scaled by efficiency. */
export function offlineGain(
  currentTotalRate: number,
  elapsedSec: number,
  efficiency: number,
  capHours: number,
): number {
  const capSec = capHours * 3600;
  const sec = Math.min(Math.max(elapsedSec, 0), capSec);
  return currentTotalRate * sec * efficiency;
}

/** Whether a servant tier is visually unlocked based on total lifetime blood. */
export function isServantUnlocked(unlockTotal: number, totalLifetimeBlood: number): boolean {
  return totalLifetimeBlood >= unlockTotal;
}
