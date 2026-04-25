// Balance tuning knobs. Source of truth: docs/04-BALANCE.md.
// Change here, re-run balance sims before release.

export const BALANCE = {
  COST_MULTIPLIER: 1.15,
  /**
   * Coefficient in the Dread-driven globalMult formula:
   *   globalMult = 1 + DREAD_MULT_COEF * log2(1 + dreadLevel)
   *
   * History:
   *   - Pre-M1 (2026-04-23): linear `1 + 0.1 × d` → runaway loop
   *     (Kenny observed 3375 Dread × ×338 mult in 2 days).
   *   - M1 (2026-04-24): log curve at coef=1.0 → tamed late game
   *     but compressed first prestige to ×4.46 (industry sweet
   *     spot 1.5-2.5).
   *   - V1.1 (2026-04-25): coef → 0.5 per idle-game-expert audit.
   *     First prestige (Dread 5) → ×2.13, prestige 5 (Dread 35)
   *     → ×3.55, late (d=1000) → ×6.0. Curve stays meaningful
   *     across all tiers without collapsing the early game.
   *
   * Reference points at coef=0.5:
   *   d=5    → ×2.29
   *   d=10   → ×2.73
   *   d=100  → ×4.33
   *   d=1000 → ×6.00
   *   d=10000→ ×7.65
   */
  DREAD_MULT_COEF: 0.5,
  /** V1.2-HF1 — Hard cap on the dread-driven globalMult. Without this,
   *  every ascend pushes the mult higher → next ascend takes less
   *  time → spiral. Capped at ×10 to plateau the multiplier and
   *  redirect player progression toward Soulreave (V1.3). */
  GLOBAL_MULT_HARD_CAP: 10,
  /** Base ascend threshold — multiplied by `ASCEND_THRESHOLD_FORM_MULT`
   *  per current form so each form has a stable 3-5 min/ascend rhythm
   *  instead of converging to sub-second ascends in late game. */
  ASCEND_THRESHOLD: 1e6,
  /**
   * V1.2-HF1 — Anti-treadmill scaling. The base threshold is multiplied
   * by this factor based on the player's current Form. Prevents the
   * "ascend → ascend faster → ascend faster" exponential spiral that
   * killed Methuselah+ retention.
   *
   * Recalibrated 2026-04-25 (idle-expert audit): the original ×20 at
   * Methuselah gave 25-50s ascends (treadmill alive). True FORM_THRESHOLDS
   * are tight (NEWBORN→THIRST in 100 ascends), so each form lasts
   * 2-50 ascends. With the globalMult hard cap ×10, post-cap rate
   * plateaus and the per-form mult only sets the form's *entry*
   * cadence — within a form, growth (servant rebuy + milestones +
   * mult ramp) naturally accelerates ascends from ~3-5 min start
   * to ~30s end-of-form. Form bumps (×6-8) reset the cadence,
   * creating peaks-and-valleys instead of a treadmill.
   *
   *   NEWBORN     ×1       — base, early game untouched
   *   ELDER       ×3       — breathing entry into the rank system
   *   LORD        ×10      — first meaningful gate
   *   METHUSELAH  ×60      — real anti-treadmill anchor (was ×20)
   *   PROGENITOR  ×400     — form-bump factor ×6.7
   *   TERA        ×3000    — ×7.5
   *   HORROR      ×25000   — ×8.3
   *   THIRST      ×200000  — endgame ceiling, infinite-form runway
   */
  ASCEND_THRESHOLD_FORM_MULT: {
    NEWBORN: 1,
    ELDER: 3,
    LORD_OF_NIGHT: 10,
    METHUSELAH: 60,
    PROGENITOR: 400,
    TERA_OVERLORD: 3000,
    HORROR_INCARNATE: 25000,
    THIRST: 200000,
  } as const,
  DREAD_GAIN_DIVISOR: 1e6,
  DREAD_GAIN_COEF: 2,

  OFFLINE_EFFICIENCY: 0.5,
  OFFLINE_CAP_HOURS: 4,
  OFFLINE_CAP_HOURS_REWARDED: 6,
  OFFLINE_CAP_HOURS_METHUSELAH: 6,
  OFFLINE_CAP_HOURS_METHUSELAH_REWARDED: 8,

  BASE_CLICK_POWER: 1,
  CLICK_SCALING_RATIO: 0.0015,
  CRIT_CHANCE: 0.08,
  CRIT_MULTIPLIER: 5,
  CRIT_CHANCE_FRENZY: 0.24,

  BOOST_DURATION_SEC: 15,
  BOOST_COOLDOWN_SEC: 60,
  BOOST_COOLDOWN_SEC_LORD_OF_NIGHT: 30,
  BOOST_DURATION_REWARDED_SEC: 120,
  BOOST_MULTIPLIER: 2,
  FRENZY_DURATION_SEC: 30,

  AUTO_CLAIM_INTERVAL_SEC: 5,
  DAILY_BOOST_CHARGES: 3,
  GLOBAL_MULT_BONUS_PROGENITOR: 1.5,

  UNLOCK_THRESHOLD_RATIO: 0.3,

  FORM_THRESHOLDS: {
    ELDER: 1,
    LORD_OF_NIGHT: 3,
    METHUSELAH: 7,
    PROGENITOR: 15,
    TERA_OVERLORD: 30,
    HORROR_INCARNATE: 50,
    THIRST: 100,
  },

  /**
   * M2 — Maximum Dread gained per Ascend, keyed by the current form.
   * Gates prestige gain behind form advancement: a player stuck at
   * NEWBORN can never farm more than 5 Dread per run. Form bumps
   * are the real progression milestone (cap roughly doubles each
   * tier).
   *
   * V1.1 (2026-04-25) tightened the table per idle-game-expert
   * audit. Old NEWBORN cap 10 forced a 25M-blood pre-ascend grind
   * that compressed the early curve. New caps land first prestige
   * at ~6.25M blood (5-10 min) and reward form advancement with
   * meaningful jumps (5 → 15 → 35 → 75 → 150 → 300 → 600 → ∞).
   *
   * THIRST (endgame) has no cap — players who reached it deserve
   * uncapped rewards.
   */
  DREAD_GAIN_CAP_PER_FORM: {
    NEWBORN: 5,
    ELDER: 15,
    LORD_OF_NIGHT: 35,
    METHUSELAH: 75,
    PROGENITOR: 150,
    TERA_OVERLORD: 300,
    HORROR_INCARNATE: 600,
    THIRST: Infinity,
  },

  /**
   * V1.3 SOULREAVE — Second-layer prestige.
   *
   * Soul Shards are the meta-currency. Players can perform a Soulreave
   * once they reach Methuselah (totalAscends ≥ 7) AND lifetimeDread
   * crosses the threshold below. The formula awards diminishing
   * returns to keep peaks-and-valleys honest:
   *
   *   shards = floor(SOULREAVE_GAIN_COEF * sqrt(lifetimeDread / SOULREAVE_GAIN_DIVISOR))
   *
   * Reference points:
   *   lifetimeDread 1000  →  2 shards (first Soulreave near Methuselah)
   *   lifetimeDread 4000  →  4 shards
   *   lifetimeDread 10000 →  6 shards
   *   lifetimeDread 40000 → 12 shards
   *
   * Full meta-tree clear costs 52 SS, so a typical Methuselah-tier
   * player completes the tree across ~15-20 Soulreaves — sized to
   * hold engagement until V2.0 Combat opens a new spending sink.
   *
   * Soulreave RESETS: Dread → 0, totalAscends → 0, current run
   * blood/servants → 0, equipped slots cleared (unless ETERNAL_BOND).
   * Soulreave PRESERVES: lifetimeDread, soulShards, metaTree, ichor,
   * essences, playerThralls (acquired roster), packsFirstTimeBought,
   * spendingLog, settings.
   */
  SOULREAVE_THRESHOLD_DREAD: 1000,
  SOULREAVE_GAIN_DIVISOR: 1000,
  SOULREAVE_GAIN_COEF: 2,
  /**
   * V1.3 — Soulreave is gated behind Methuselah (totalAscends ≥ 7) so
   * the player has felt the full V1.2-HF1 form bump cadence at least
   * once before the second-layer prestige unlocks. Avoids overload at
   * first-prestige time.
   */
  SOULREAVE_UNLOCK_TOTAL_ASCENDS: 7,
} as const;
