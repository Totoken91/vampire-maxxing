// Balance tuning knobs. Source of truth: docs/04-BALANCE.md.
// Change here, re-run balance sims before release.

export const BALANCE = {
  COST_MULTIPLIER: 1.15,
  /**
   * Coefficient in the Dread-driven globalMult formula:
   *   globalMult = 1 + DREAD_MULT_COEF * log2(1 + dreadLevel)
   * Log curve (M1, 2026-04-24) replaces the linear `1 + 0.1 × d` which
   * produced a runaway feedback loop (Kenny observed 3375 Dread in 2
   * days of light play). With coef=1: d=10 → ×4.5, d=100 → ×7.7,
   * d=1000 → ×11.0 — meaningful early, tamed late.
   */
  DREAD_MULT_COEF: 1.0,
  ASCEND_THRESHOLD: 1e6,
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
   * NEWBORN can never farm more than 10 Dread per run no matter how
   * long they grind. Makes form bumps a real promotion (doubling the
   * cap each tier) and tames overnight-offline runaway.
   *
   * THIRST (endgame) has no cap — players who reached it deserve
   * uncapped rewards.
   */
  DREAD_GAIN_CAP_PER_FORM: {
    NEWBORN: 10,
    ELDER: 25,
    LORD_OF_NIGHT: 50,
    METHUSELAH: 100,
    PROGENITOR: 200,
    TERA_OVERLORD: 400,
    HORROR_INCARNATE: 800,
    THIRST: Infinity,
  },
} as const;
