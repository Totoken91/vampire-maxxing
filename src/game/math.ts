// Pure math for Vampire Maxxing. No DOM, no state mutation, no I/O.
// All formulas are documented in docs/04-BALANCE.md.

import { BALANCE } from './config/balance';
import type { Servant } from './config/servants';
import type { VampireForm } from './config/forms';

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

/**
 * Global multiplier applied to all rates + click, based on Dread Level.
 *
 * Log curve: `1 + DREAD_MULT_COEF × log2(1 + dread)`. Replaces the
 * linear `1 + 0.1 × d` which let each prestige snowball the next run's
 * ceiling exponentially (M1 fix, 2026-04-24). V1.1 (2026-04-25)
 * tuned the coefficient down 1.0 → 0.5 per idle-game-expert audit
 * — the original coef was producing a ×4.46 first-prestige multiplier
 * which compressed 5 prestiges of progression into the first ascend.
 *
 * Reference points at coef=0.5:
 *   d=0     → ×1.00
 *   d=5     → ×2.29
 *   d=10    → ×2.73
 *   d=100   → ×4.33
 *   d=1000  → ×6.00
 *   d=10000 → ×7.65
 *
 * `dread` here is the permanent rank (monotonically increasing). It is
 * never decremented — the upgrade "spend" pattern was removed in M1.
 */
export function globalMult(dread: number, progenitorBonusActive: boolean): number {
  const safeDread = Math.max(0, dread);
  const base = 1 + BALANCE.DREAD_MULT_COEF * Math.log2(1 + safeDread);
  const withProgenitor = progenitorBonusActive
    ? base * BALANCE.GLOBAL_MULT_BONUS_PROGENITOR
    : base;
  // V1.2-HF1 — Hard cap on the multiplier to break the ascend spiral.
  // Beyond this point, additional Dread accumulates toward the V1.3
  // Soulreave but doesn't push the per-run mult higher.
  return Math.min(withProgenitor, BALANCE.GLOBAL_MULT_HARD_CAP);
}

/**
 * V1.2-HF1 — Form-scaled ascend threshold. The total run blood needed
 * to unlock ASCEND, multiplied by the current form factor. Each form
 * holds a stable 3-5 min ascend cadence under typical mid-game
 * multipliers, replacing the runaway sub-second ascends that emerged
 * post-Methuselah Century I.
 */
export function ascendThresholdFor(
  form: keyof typeof BALANCE.ASCEND_THRESHOLD_FORM_MULT,
): number {
  return BALANCE.ASCEND_THRESHOLD * BALANCE.ASCEND_THRESHOLD_FORM_MULT[form];
}

/** True when the dread-driven multiplier has hit the hard cap. UI uses
 *  this to surface the "MULT PEAKED" badge + Soulreave teaser. */
export function isGlobalMultPeaked(
  dread: number,
  progenitorBonusActive: boolean,
): boolean {
  const safeDread = Math.max(0, dread);
  const base = 1 + BALANCE.DREAD_MULT_COEF * Math.log2(1 + safeDread);
  const withProgenitor = progenitorBonusActive
    ? base * BALANCE.GLOBAL_MULT_BONUS_PROGENITOR
    : base;
  return withProgenitor >= BALANCE.GLOBAL_MULT_HARD_CAP;
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

/**
 * Dread gained by ASCENDing the bloodline now.
 *
 * M2 (2026-04-24) — the raw sqrt result is capped by the current form's
 * entry in `DREAD_GAIN_CAP_PER_FORM`. This gates prestige power behind
 * form advancement: a player can't snowball an overnight-offline run
 * into hundreds of Dread. They have to ascend their FORM to claim
 * bigger payouts. THIRST (endgame) has no cap.
 */
export function dreadGain(totalRunBlood: number, form: VampireForm): number {
  if (totalRunBlood < BALANCE.ASCEND_THRESHOLD) return 0;
  const raw = Math.floor(
    Math.sqrt(totalRunBlood / BALANCE.DREAD_GAIN_DIVISOR) * BALANCE.DREAD_GAIN_COEF,
  );
  const cap = BALANCE.DREAD_GAIN_CAP_PER_FORM[form];
  return Math.min(raw, cap);
}

/** The hard cap that would apply if the player ascended right now in
 * `form`. Exposed so UI can display "{gain} / {cap}" and drive the
 * "ascend your form to claim more" narrative hint. */
export function dreadGainCap(form: VampireForm): number {
  return BALANCE.DREAD_GAIN_CAP_PER_FORM[form];
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
