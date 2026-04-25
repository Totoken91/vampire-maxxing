// Central game state. Holds all persistent numbers + exposes actions.
// No UI references. Emits events for listeners (UI + analytics later).

import { BALANCE } from './config/balance';
import { SERVANTS, SERVANTS_BY_ID, type ServantId } from './config/servants';
import { THRALLS, THRALLS_BY_ID, type ThrallId, type ThrallRarity } from './config/thralls';
import type { BannerId } from './config/banners';
import type { PullFlags } from './ritual';
import type { VampireForm } from './config/forms';
import { events } from './events';
import {
  clickPower,
  dreadGain,
  globalMult,
  offlineGain,
  servantRate,
} from './math';
import { getCurrentForm, getCenturyInForm } from './forms';
import { hasUnlock } from './config/prestige-unlocks';
import { modifierRegistry } from './modifiers';
import {
  isConsecutiveDay,
  localDateKey,
  rewardFor,
  type DailyReward,
} from './config/daily';
import { defaultV1, loadSave, writeSave, type SaveV4 } from './save';

interface ServantOwnership {
  owned: number;
  totalPurchased: number;
}

/** Per-thrall player state for the collectible roster. Tracks whether
 * the player has unlocked it, current level/xp, awakening star count
 * (raised by collecting duplicates), and the "new" flag that drives
 * the tab-bar dot + card highlight until the player opens the detail
 * modal. */
export interface PlayerThrallState {
  owned: boolean;
  level: number;
  xp: number;
  stars: number;
  firstObtainedAt: number;
  /** Pulled/granted this session and not yet acknowledged by the
   * player opening the thrall detail modal. */
  isNew: boolean;
}

interface BoostState {
  active: boolean;
  endTime: number;
  cooldownEnd: number;
  isRewarded: boolean;
}

interface StatsState {
  totalTaps: number;
  totalCrits: number;
  totalAscends: number;
  firstLaunch: number;
  totalPlayTime: number;
  highestFormReached: VampireForm;
}

export interface GameSnapshot {
  blood: number;
  /**
   * Total Blood earned this run (online + offline combined). Drives
   * milestone toasts + UI display — it's the "how much this run felt
   * productive" number. Reset on ascend.
   */
  totalRunBlood: number;
  /**
   * M3 — Subset of totalRunBlood earned strictly online (taps + passive
   * tick while the app was open). Offline gain is EXCLUDED so players
   * can't weaponize an overnight sleep + pre-bought generators into a
   * massive Dread payout on ascend. Reset on ascend.
   */
  totalRunBloodOnline: number;
  totalLifetimeBlood: number;
  dread: number;
  /** Phase L3 — Ichor pull currency. Plate, soft-capped at 1000. */
  ichor: number;
  /** Phase L3 — rolling ledger of Ichor transactions (earn + spend)
   * with source + earned/paid flag. Rolling window of 100 entries. */
  ichorLedger: import('./ichor').IchorTransaction[];
  /** Phase L3 — flags for one-shot Ichor rewards so re-ascends /
   * re-pulls don't re-grant the same milestone. Indexed by a stable
   * string tag (e.g. "prestige:5", "first:rare", "collection"). */
  ichorFlags: Record<string, boolean>;
  servants: Record<ServantId, ServantOwnership>;
  boost: BoostState;
  stats: StatsState;
  unlockedAchievements: Set<string>;
  /** Mutliplier applied to the next ascend's dread gain. Reset to 1 after
   * ascend. Set to 2 by the INVOKE THE CURSE rite on successful rewarded ad. */
  pendingCurseMult: number;
  /** Timestamp (Date.now()) of the last successful use for each rite.
   * Used to gate cooldowns (e.g. Offering has a 4h cooldown). */
  ritesLastUsed: Record<string, number>;
  /** Achievement ids that have been unlocked but not yet acknowledged by the
   * user opening the Tome. Drives the Tome tab's notification dot. */
  unseenAchievements: Set<string>;
  /** Level of each permanent upgrade. Keyed by UpgradeId, defaults to 0. */
  upgrades: Record<string, number>;
  /** Thrall ids whose Bestiary lore has been revealed (1st purchase). */
  unlockedServantLore: Set<string>;
  /** Form ids whose Histories lore has been revealed (reached that form). */
  unlockedFormLore: Set<string>;
  /** Last 10 runs, pushed on ascend. Rolling window. */
  runHistory: RunEntry[];
  /** K4 — the highest 10^N milestone already fired THIS RUN. -1 before
   * any fires. Reset to -1 on ascend; backfilled on load from
   * totalRunBlood so reopening the app doesn't re-trigger past ones. */
  lastMilestoneExp: number;
  /** K5 — daily gift streak. streakDay is the last day of the 7-cycle
   * the player claimed (0 = never claimed, 1-7 after claims).
   * lastClaimedDate is the local "YYYY-MM-DD" at claim time — an empty
   * string means no prior claim exists. */
  daily: {
    streakDay: number;
    lastClaimedDate: string;
  };
  /** L2 — per-thrall ownership/level/stars. All ids present; owned
   * flag flips to true on acquisition (welcome summon, milestone,
   * pull, etc.). */
  playerThralls: Record<ThrallId, PlayerThrallState>;
  /** L5 — per-banner pity / streak counters + lifetime FRG flag +
   * rolling pull history. The engine in ritual.ts mutates this in
   * place; the UI reads via `getRitualState()` / `getBannerProgress()`. */
  ritualState: RitualStateSnapshot;
  /** L5 — essence counts per rarity. Dupe pulls credit these; L6's
   * awakening screen will spend them. Plate (no cap, no scaling). */
  essences: PlayerEssences;
  /** L6 — active equip slots. Length = EQUIP_SLOT_COUNT (3 in v1.0).
   * `null` means empty. Equipped thralls publish their star-amplified
   * primary + secondary effects into modifierRegistry. */
  equippedSlots: (ThrallId | null)[];
}

/** Per-banner pity counters, streak, totals + global lifetime flags
 * and rolling pull history. Lives inside GameSnapshot; ritual.ts
 * mutates it directly via `gameState.getRitualState()`. */
export interface RitualBannerState {
  /** Pulls since the last Rare+ on this banner. Resets on Rare or Epic. */
  pityCounterRare: number;
  /** Featured-only — pulls since last Epic. Standard ignores this. */
  pityCounterEpic: number;
  /** Anti-streak — Commons in a row. Resets on Rare+. */
  commonStreak: number;
  /** Lifetime pulls performed on this banner. */
  totalPulls: number;
}

export interface RitualStateSnapshot {
  standard: RitualBannerState;
  featured: RitualBannerState;
  /** Set true the moment the very first lifetime pull resolves; the
   * resolved pull is forced to Rare. Persists across ascends/wipes. */
  firstRareGuaranteeUsed: boolean;
  /** Rolling window of the last 50 pulls — drives the transparent
   * history strip on the Rituals screen + future analytics. */
  history: PullEntry[];
}

export interface PullEntry {
  ts: number;
  banner: BannerId;
  /** null on a Cinder Ceremony entry. */
  thrallId: ThrallId | null;
  rarity: ThrallRarity;
  wasDupe: boolean;
  essenceGained: number;
  flags: PullFlags;
}

export interface PlayerEssences {
  common: number;
  rare: number;
  epic: number;
  legendary: number;
}

export interface RunEntry {
  /** Unix ms when the run ended (ascend time). */
  ts: number;
  /** Total run blood at ascend. */
  maxBlood: number;
  /** Dread gained (after curse + modifiers). */
  dreadGained: number;
  /** Form the player was in when they ascended. */
  form: VampireForm;
  /** Whether ascending bumped the form. */
  formChanged: boolean;
}

function emptyServants(): Record<ServantId, ServantOwnership> {
  const acc = {} as Record<ServantId, ServantOwnership>;
  for (const t of SERVANTS) {
    acc[t.id] = { owned: 0, totalPurchased: 0 };
  }
  return acc;
}

function emptyPlayerThralls(): Record<ThrallId, PlayerThrallState> {
  const acc = {} as Record<ThrallId, PlayerThrallState>;
  for (const t of THRALLS) {
    acc[t.id] = {
      owned: false,
      level: 1,
      xp: 0,
      stars: 0,
      firstObtainedAt: 0,
      isNew: false,
    };
  }
  return acc;
}

function emptyRitualBannerState(): RitualBannerState {
  return {
    pityCounterRare: 0,
    pityCounterEpic: 0,
    commonStreak: 0,
    totalPulls: 0,
  };
}

function emptyRitualState(): RitualStateSnapshot {
  return {
    standard: emptyRitualBannerState(),
    featured: emptyRitualBannerState(),
    firstRareGuaranteeUsed: false,
    history: [],
  };
}

function emptyEssences(): PlayerEssences {
  return { common: 0, rare: 0, epic: 0, legendary: 0 };
}

function emptyEquipSlots(): (ThrallId | null)[] {
  // Three slots in v1.0 (EQUIP_SLOT_COUNT). Future expansion happens
  // by growing this array on save load with default-null entries.
  return [null, null, null];
}

function emptySnapshot(): GameSnapshot {
  return {
    blood: 0,
    totalRunBlood: 0,
    totalRunBloodOnline: 0,
    totalLifetimeBlood: 0,
    dread: 0,
    ichor: 0,
    ichorLedger: [],
    ichorFlags: {},
    servants: emptyServants(),
    boost: { active: false, endTime: 0, cooldownEnd: 0, isRewarded: false },
    stats: {
      totalTaps: 0,
      totalCrits: 0,
      totalAscends: 0,
      firstLaunch: Date.now(),
      totalPlayTime: 0,
      highestFormReached: 'NEWBORN',
    },
    unlockedAchievements: new Set<string>(),
    pendingCurseMult: 1,
    ritesLastUsed: {},
    unseenAchievements: new Set<string>(),
    upgrades: {},
    unlockedServantLore: new Set<string>(),
    unlockedFormLore: new Set<string>(),
    runHistory: [],
    lastMilestoneExp: -1,
    daily: { streakDay: 0, lastClaimedDate: '' },
    playerThralls: emptyPlayerThralls(),
    ritualState: emptyRitualState(),
    essences: emptyEssences(),
    equippedSlots: emptyEquipSlots(),
  };
}

// K4 — minimum exponent that triggers a milestone toast. 10^4 = 10,000.
// Smaller numbers reach a player too quickly and read as noise; 10K is
// the first "that felt like something" threshold in the early curve.
const MIN_MILESTONE_EXP = 4;

export interface OfflineReport {
  elapsedSec: number;
  blood: number;
  bloodWithRewarded: number;
  efficiency: number;
  capHours: number;
  capHoursRewarded: number;
}

export class GameState {
  private snapshot: GameSnapshot = emptySnapshot();

  get(): Readonly<GameSnapshot> {
    return this.snapshot;
  }

  /** Load a persisted save (if any). Must be called before startLoop.
   *  When there's no save (first-ever session), silently consume the
   *  daily streak's day 1 — the player arrives with empty hands and
   *  the streak's first visible reward lands on day 2 (j+1). Removes
   *  the "+1000 blood on launch" gift Kenny found out-of-character. */
  async loadFromStorage(): Promise<OfflineReport | null> {
    const save = await loadSave();
    if (!save) {
      this.snapshot.daily.streakDay = 1;
      this.snapshot.daily.lastClaimedDate = localDateKey();
      return null;
    }
    this.applySave(save);
    return this.computeOfflineReport(save.ts);
  }

  /** Serialize current state to storage. Called by auto-save hooks. */
  async saveToStorage(): Promise<void> {
    const save = this.toSave();
    await writeSave(save);
  }

  getBlood(): number {
    return this.snapshot.blood;
  }

  /**
   * Current Dread Level — the permanent prestige rank that drives
   * globalMult (log curve). Monotonically increasing as of M1: never
   * decremented by upgrade purchases anymore. Name kept as `getDread`
   * for back-compat; the value IS the rank.
   */
  getDread(): number {
    return this.snapshot.dread;
  }

  /** Explicit alias for API clarity post-M1. */
  getDreadLevel(): number {
    return this.snapshot.dread;
  }

  /** Phase L preview — Ichor balance. Full ledger in L3. */
  getIchor(): number {
    return this.snapshot.ichor;
  }

  getForm(): VampireForm {
    return getCurrentForm(this.snapshot.stats.totalAscends);
  }

  getPrestigeCount(): number {
    return this.snapshot.stats.totalAscends;
  }

  /** True if the player has never tapped nor ascended. Drives FTUE cues. */
  isFirstSession(): boolean {
    return (
      this.snapshot.stats.totalTaps === 0 && this.snapshot.stats.totalAscends === 0
    );
  }

  /** Current boost multiplier (1 if no boost active). */
  getBoostMult(): number {
    return this.snapshot.boost.active ? BALANCE.BOOST_MULTIPLIER : 1;
  }

  getGlobalMult(): number {
    const hasProgenitorBonus = hasUnlock(this.snapshot.stats.totalAscends, 'globalMultBonus');
    const base = globalMult(this.snapshot.dread, hasProgenitorBonus);
    // External sources (upgrades/regions/awakenings) stack on top. The
    // registry applies a log cap on globalMult so combined bonuses don't
    // explode into scientific notation.
    return base * modifierRegistry.getMultiplier('globalMult');
  }

  /** Sum of per-second production across all owned thralls. */
  getTotalRate(): number {
    const gMult = this.getGlobalMult();
    const boost = this.getBoostMult();
    const rateMult = modifierRegistry.getMultiplier('servantRate');
    let sum = 0;
    for (const t of SERVANTS) {
      const owned = this.snapshot.servants[t.id].owned;
      if (owned > 0) {
        sum += servantRate(t, owned, gMult, boost);
      }
    }
    return sum * rateMult;
  }

  getServantRate(id: ServantId): number {
    const owned = this.snapshot.servants[id].owned;
    if (owned <= 0) return 0;
    const rateMult = modifierRegistry.getMultiplier('servantRate');
    return (
      servantRate(SERVANTS_BY_ID[id], owned, this.getGlobalMult(), this.getBoostMult()) *
      rateMult
    );
  }

  getServantCost(id: ServantId): number {
    const owned = this.snapshot.servants[id].owned;
    // Scholar-type upgrades tweak the cost multiplier via an additive
    // delta on 'servantCost' (e.g. -0.01 per level → 1.15 → 1.10 max).
    const baseMult = BALANCE.COST_MULTIPLIER;
    const adjustedMult = Math.max(1.01, baseMult + modifierRegistry.getAdditive('servantCost'));
    return Math.floor(SERVANTS_BY_ID[id].baseCost * adjustedMult ** owned);
  }

  isServantAffordable(id: ServantId): boolean {
    return this.snapshot.blood >= this.getServantCost(id);
  }

  canAscend(): boolean {
    return this.snapshot.totalRunBlood >= BALANCE.ASCEND_THRESHOLD;
  }

  projectedDreadGain(): number {
    // M3: only online-earned blood counts for Dread gain. Offline
    // progress keeps the run alive but can't snowball prestige.
    const base = dreadGain(this.snapshot.totalRunBloodOnline, this.getForm());
    return Math.floor(base * modifierRegistry.getMultiplier('dreadGain'));
  }

  /** Whether the projected Dread gain is already at the current form's
   * cap. Drives the "ascend your form to claim more" hint in the Ascend
   * modal. Uses online blood (M3). */
  isDreadGainCapped(): boolean {
    if (this.snapshot.totalRunBloodOnline < BALANCE.ASCEND_THRESHOLD) return false;
    const raw = Math.floor(
      Math.sqrt(this.snapshot.totalRunBloodOnline / BALANCE.DREAD_GAIN_DIVISOR) *
        BALANCE.DREAD_GAIN_COEF,
    );
    const cap = BALANCE.DREAD_GAIN_CAP_PER_FORM[this.getForm()];
    return raw >= cap && cap !== Infinity;
  }

  // ─────────── Actions ───────────

  /** Register a manual tap. Emits tapped + blood-changed. May
   * trigger a free echo tap if any equipped thrall (Gravebound)
   * publishes echoTapChance. */
  tap(x: number, y: number): void {
    const crit = Math.random() < BALANCE.CRIT_CHANCE;
    const totalRate = this.getTotalRate();
    const clickMult = modifierRegistry.getMultiplier('clickPower');
    // L6 — crit damage = base BALANCE multiplier + additive bonus
    // contributed by equipped thralls (Duskward +0.5).
    const critMult =
      BALANCE.CRIT_MULTIPLIER + modifierRegistry.getAdditive('critDamage');
    const base =
      clickPower(totalRate, this.getGlobalMult(), this.getBoostMult()) * clickMult;
    const gain = crit ? base * critMult : base;

    this.addBlood(gain);
    this.snapshot.stats.totalTaps += 1;
    if (crit) this.snapshot.stats.totalCrits += 1;

    events.emit('tapped', { x, y, crit, gain });

    // L6 — echo tap (Gravebound bespoke). Fires AFTER the main tap
    // so gain stacks with the same calculation (no recursion). The
    // echo doesn't increment totalTaps (it's free, not the player's
    // input) but it DOES award blood + emits a tapped event so the
    // FX layer can render a duplicate float number.
    const echoChance = modifierRegistry.getAdditive('echoTapChance');
    if (echoChance > 0 && Math.random() < echoChance) {
      this.addBlood(gain);
      events.emit('tapped', { x, y, crit, gain });
    }
  }

  /** Attempt to buy one of a thrall. Returns true on success. */
  buyServant(id: ServantId): boolean {
    const cost = this.getServantCost(id);
    if (this.snapshot.blood < cost) return false;

    this.snapshot.blood -= cost;
    const t = this.snapshot.servants[id];
    t.owned += 1;
    t.totalPurchased += 1;

    // First-ever purchase of this thrall reveals its Bestiary lore.
    if (!this.snapshot.unlockedServantLore.has(id)) {
      this.snapshot.unlockedServantLore.add(id);
      events.emit('lore-unlocked', { kind: 'servant', id });
    }

    events.emit('servant-bought', { id, owned: t.owned });
    events.emit('blood-changed', { blood: this.snapshot.blood, delta: -cost });
    events.emit('rate-changed', { totalRate: this.getTotalRate() });
    return true;
  }

  /** Apply dt seconds of passive production. Called by the game loop. */
  tickPassive(dt: number): void {
    if (dt <= 0) return;
    const clamped = Math.min(dt, 1); // throttle background tabs
    const rate = this.getTotalRate();
    if (rate > 0) {
      this.addBlood(rate * clamped);
    }
    this.snapshot.stats.totalPlayTime += clamped;

    const now = performance.now();
    if (this.snapshot.boost.active && now >= this.snapshot.boost.endTime) {
      this.snapshot.boost.active = false;
      events.emit('rate-changed', { totalRate: this.getTotalRate() });
    }

    events.emit('tick', { dt: clamped });
  }

  /** Trigger ascension if eligible. Emits form-changed if the form bumps.
   * `rewardedMultiplier` is an optional extra (used for ad-boosted ascends);
   * it stacks with `pendingCurseMult` (consumed and reset on ascend). */
  ascend(rewardedMultiplier: number = 1): boolean {
    if (!this.canAscend()) return false;

    const curseMult = this.snapshot.pendingCurseMult;
    const previousForm = this.getForm();
    // M2: cap based on the form DURING the run (the one about to end).
    // M3: only online-earned blood feeds the sqrt — offline can't
    // snowball prestige. Apply cap BEFORE external multipliers so
    // curse/rewarded stack on top of the capped base.
    const baseGain = dreadGain(this.snapshot.totalRunBloodOnline, previousForm);
    const dreadMult = modifierRegistry.getMultiplier('dreadGain');
    const gain = Math.floor(baseGain * dreadMult * rewardedMultiplier * curseMult);
    // Capture the run's peak blood BEFORE zeroing it — the Run log needs
    // the pre-reset value.
    const peakBlood = this.snapshot.totalRunBlood;

    this.snapshot.dread += gain;
    events.emit('dread-changed', { level: this.snapshot.dread });
    this.snapshot.stats.totalAscends += 1;
    this.snapshot.blood = 0;
    this.snapshot.totalRunBlood = 0;
    this.snapshot.totalRunBloodOnline = 0;
    this.snapshot.pendingCurseMult = 1;
    this.snapshot.lastMilestoneExp = -1;
    for (const t of SERVANTS) {
      this.snapshot.servants[t.id].owned = 0;
    }
    this.snapshot.boost = { active: false, endTime: 0, cooldownEnd: 0, isRewarded: false };

    const newForm = this.getForm();
    const formChanged = newForm !== previousForm;
    if (formChanged) {
      this.snapshot.stats.highestFormReached = newForm;
      events.emit('form-changed', { form: newForm });
      // Reveal the Histories lore for the newly reached form.
      if (!this.snapshot.unlockedFormLore.has(newForm)) {
        this.snapshot.unlockedFormLore.add(newForm);
        events.emit('lore-unlocked', { kind: 'form', id: newForm });
      }
    }

    // Push run entry. Capped at 10 most recent; oldest drops off.
    this.snapshot.runHistory.unshift({
      ts: Date.now(),
      maxBlood: peakBlood,
      dreadGained: gain,
      form: previousForm,
      formChanged,
    });
    if (this.snapshot.runHistory.length > 10) {
      this.snapshot.runHistory.length = 10;
    }

    // Always-fires sibling event — form-changed only triggers on threshold
    // bumps, but every ascend bumps the Century counter and UI needs to know.
    events.emit('ascended', {
      form: newForm,
      century: getCenturyInForm(this.snapshot.stats.totalAscends),
      formChanged,
    });

    events.emit('blood-changed', { blood: 0, delta: -gain });
    events.emit('rate-changed', { totalRate: 0 });
    return true;
  }

  // ─────────── Rites ───────────

  /** Read-only projection of the extra dread mult active on the next ascend. */
  getPendingCurseMult(): number {
    return this.snapshot.pendingCurseMult;
  }

  /** Mark the curse as armed (×2 dread on next ascend). Set only after a
   * successful rewarded ad. */
  armCurse(mult: number = 2): void {
    this.snapshot.pendingCurseMult = mult;
  }

  /** Seconds remaining on a rite's cooldown; 0 when ready. */
  riteCooldownSec(id: string, cooldownSec: number): number {
    const last = this.snapshot.ritesLastUsed[id] ?? 0;
    const remaining = Math.ceil((last + cooldownSec * 1000 - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  }

  /** Stamp a rite as just-used so its cooldown starts ticking. */
  markRiteUsed(id: string): void {
    this.snapshot.ritesLastUsed[id] = Date.now();
  }

  // ─────────── Tab gating ───────────

  isTabUnlocked(tab: 'bloodline' | 'sanctum' | 'rites' | 'tome' | 'shop'): boolean {
    switch (tab) {
      case 'bloodline':
        return true;
      case 'sanctum':
        // MVP: always visible — the roster shows silhouettes for locked
        // thralls so there's always something to read. Gating will move
        // to "has at least 1 thrall" once acquisition lands in Phase L.
        return true;
      case 'rites':
        return this.snapshot.stats.totalAscends >= 1;
      case 'tome':
        return this.snapshot.unlockedAchievements.size >= 3;
      case 'shop':
        return (
          this.snapshot.stats.totalAscends >= 3 ||
          this.snapshot.stats.totalPlayTime >= 3600
        );
    }
  }

  /** Activate a boost for its standard duration (or rewarded variant). */
  activateBoost(rewarded: boolean): boolean {
    const now = performance.now();
    const ascends = this.snapshot.stats.totalAscends;
    const cooldownSec = hasUnlock(ascends, 'reducedBoostCooldown')
      ? BALANCE.BOOST_COOLDOWN_SEC_LORD_OF_NIGHT
      : BALANCE.BOOST_COOLDOWN_SEC;

    if (!rewarded && now < this.snapshot.boost.cooldownEnd) return false;

    const durationSec = rewarded
      ? BALANCE.BOOST_DURATION_REWARDED_SEC
      : BALANCE.BOOST_DURATION_SEC;

    this.snapshot.boost.active = true;
    this.snapshot.boost.endTime = now + durationSec * 1000;
    this.snapshot.boost.cooldownEnd = rewarded ? 0 : now + cooldownSec * 1000;
    this.snapshot.boost.isRewarded = rewarded;

    events.emit('rate-changed', { totalRate: this.getTotalRate() });
    return true;
  }

  /** Reset everything (used by tests and the eventual "wipe save" debug). */
  reset(): void {
    this.snapshot = emptySnapshot();
    // The registry is a module-level singleton that gets re-populated by
    // each source on load; wiping state must wipe the registry too.
    modifierRegistry.clear();
  }

  /** Apply an offline blood gain. Called after the user claims the
   * modal. M3: flagged as offline so it does NOT increment
   * totalRunBloodOnline — keeps prestige gate honest. */
  applyOfflineGain(amount: number): void {
    if (amount <= 0) return;
    this.addBlood(amount, { offline: true });
  }

  // ─────────── Achievements ───────────

  hasAchievement(id: string): boolean {
    return this.snapshot.unlockedAchievements.has(id);
  }

  unlockAchievement(id: string): void {
    this.snapshot.unlockedAchievements.add(id);
    this.snapshot.unseenAchievements.add(id);
  }

  getUnlockedAchievements(): ReadonlySet<string> {
    return this.snapshot.unlockedAchievements;
  }

  hasUnseenAchievements(): boolean {
    return this.snapshot.unseenAchievements.size > 0;
  }

  markAchievementsSeen(): void {
    this.snapshot.unseenAchievements.clear();
  }

  // ─────────── Upgrades ───────────

  getUpgradeLevel(id: string): number {
    return this.snapshot.upgrades[id] ?? 0;
  }

  setUpgradeLevel(id: string, level: number): void {
    this.snapshot.upgrades[id] = level;
  }
  // spendDread removed in M1 — Dread is now a pure rank (monotonically
  // increasing). Meta-upgrades migrated to auto-milestones (see
  // milestones.ts) or absorbed by Phase L thralls.

  // ─────────── L2 Thralls roster ───────────

  getPlayerThrall(id: ThrallId): Readonly<PlayerThrallState> {
    return this.snapshot.playerThralls[id];
  }

  isThrallOwned(id: ThrallId): boolean {
    return this.snapshot.playerThralls[id].owned;
  }

  /** Count of thralls the player currently has unlocked. */
  ownedThrallCount(): number {
    let n = 0;
    for (const t of THRALLS) {
      if (this.snapshot.playerThralls[t.id].owned) n += 1;
    }
    return n;
  }

  /** True if there's at least one owned-but-unacknowledged thrall.
   * Drives the Sanctum tab dot. */
  hasUnseenThralls(): boolean {
    for (const t of THRALLS) {
      if (this.snapshot.playerThralls[t.id].isNew) return true;
    }
    return false;
  }

  /**
   * Grant a thrall. First grant sets owned=true + firstObtainedAt +
   * isNew=true and emits 'thrall-obtained'. Subsequent grants (same
   * thrall re-pulled) will eventually bump stars via the awakening
   * system — for L2 they're a no-op so the welcome summon flow can
   * ship first. Returns true on first-time acquisition.
   */
  obtainThrall(id: ThrallId): boolean {
    const state = this.snapshot.playerThralls[id];
    if (state.owned) return false;
    state.owned = true;
    state.firstObtainedAt = Date.now();
    state.isNew = true;
    events.emit('thrall-obtained', { id, firstTime: true });
    return true;
  }

  /** Clear the `isNew` badge after the player has seen the detail
   * modal or acknowledged the card. */
  acknowledgeThrall(id: ThrallId): void {
    const state = this.snapshot.playerThralls[id];
    if (state.isNew) state.isNew = false;
  }

  // ─────────── L5 Rituals — engine-facing accessors ───────────

  /** Mutable handle so the ritual engine can bump pity / streak /
   * totals in place. The engine is the only intended caller; the UI
   * reads via `getBannerProgress()` from ritual.ts. */
  getRitualState(): RitualStateSnapshot {
    return this.snapshot.ritualState;
  }

  hasUsedFirstRareGuarantee(): boolean {
    return this.snapshot.ritualState.firstRareGuaranteeUsed;
  }

  markFirstRareGuaranteeUsed(): void {
    this.snapshot.ritualState.firstRareGuaranteeUsed = true;
  }

  /** Append a pull entry; rolling window of 50 (oldest drops). */
  pushPullEntry(entry: PullEntry): void {
    this.snapshot.ritualState.history.push(entry);
    if (this.snapshot.ritualState.history.length > 50) {
      this.snapshot.ritualState.history.splice(
        0,
        this.snapshot.ritualState.history.length - 50,
      );
    }
  }

  getPullHistory(): readonly PullEntry[] {
    return this.snapshot.ritualState.history;
  }

  // ─────────── L5 Essences (counters; awakening lands in L6) ───────────

  getEssence(rarity: ThrallRarity): number {
    return this.snapshot.essences[rarity];
  }

  getAllEssences(): Readonly<PlayerEssences> {
    return this.snapshot.essences;
  }

  /** Add to the per-rarity essence balance. Emits `essence-gained` so
   * future toasts and the L6 awakening UI can react. */
  grantEssence(rarity: ThrallRarity, amount: number): void {
    if (amount <= 0) return;
    this.snapshot.essences[rarity] += amount;
    events.emit('essence-gained', {
      rarity,
      amount,
      balance: this.snapshot.essences[rarity],
    });
  }

  /** Spend essences (returns true on success). Used by L6 awakening. */
  spendEssence(rarity: ThrallRarity, amount: number): boolean {
    if (amount <= 0) return false;
    if (this.snapshot.essences[rarity] < amount) return false;
    this.snapshot.essences[rarity] -= amount;
    return true;
  }

  // ─────────── L6 Awakening / equip ───────────

  /** Increment a thrall's star tier by 1. Caller (awakening engine)
   * is responsible for paying the essence cost AND for re-publishing
   * the modifier registry if the thrall is equipped. */
  bumpThrallStars(id: ThrallId): void {
    const state = this.snapshot.playerThralls[id];
    state.stars += 1;
  }

  getEquippedSlots(): readonly (ThrallId | null)[] {
    return this.snapshot.equippedSlots;
  }

  isThrallEquipped(id: ThrallId): boolean {
    return this.snapshot.equippedSlots.includes(id);
  }

  /** Slot index (0..N-1) the thrall occupies, or -1 if not equipped. */
  findEquippedSlot(id: ThrallId): number {
    return this.snapshot.equippedSlots.indexOf(id);
  }

  /**
   * Place `id` into `slot`. If the thrall is already equipped in
   * another slot, that source slot becomes empty (move semantics —
   * a single thrall can't double up). Returns true on a state change.
   */
  equipThrall(slot: number, id: ThrallId): boolean {
    if (slot < 0 || slot >= this.snapshot.equippedSlots.length) return false;
    if (!this.snapshot.playerThralls[id]?.owned) return false;
    const slots = this.snapshot.equippedSlots;
    const prev = slots[slot];
    if (prev === id) return false;

    // If thrall is already in another slot, vacate that one first.
    const existingSlot = slots.indexOf(id);
    if (existingSlot !== -1) {
      slots[existingSlot] = null;
      events.emit('thrall-equipped', {
        slot: existingSlot,
        prevId: id,
        nextId: null,
      });
    }
    slots[slot] = id;
    events.emit('thrall-equipped', { slot, prevId: prev, nextId: id });
    return true;
  }

  /** Clear a slot. Returns true if it changed. */
  unequipSlot(slot: number): boolean {
    if (slot < 0 || slot >= this.snapshot.equippedSlots.length) return false;
    const prev = this.snapshot.equippedSlots[slot];
    if (prev === null) return false;
    this.snapshot.equippedSlots[slot] = null;
    events.emit('thrall-equipped', { slot, prevId: prev, nextId: null });
    return true;
  }

  /** Convenience — clear whatever slot a thrall sits in. */
  unequipThrall(id: ThrallId): boolean {
    const slot = this.findEquippedSlot(id);
    if (slot === -1) return false;
    return this.unequipSlot(slot);
  }

  // ─────────── K5 Daily gift ───────────

  /** True iff the local calendar day changed since the last claim. */
  canClaimDaily(): boolean {
    return this.snapshot.daily.lastClaimedDate !== localDateKey();
  }

  /**
   * Preview of the next claim — the day-of-cycle it will land on and
   * the reward amounts. Does NOT mutate state. `isNewStreak` is true
   * when today's claim restarts the cycle (either after a gap or
   * because the previous claim was day 7).
   */
  getPendingDailyReward(): {
    day: number;
    reward: DailyReward;
    isNewStreak: boolean;
  } {
    const today = localDateKey();
    const { streakDay, lastClaimedDate } = this.snapshot.daily;
    const consecutive = isConsecutiveDay(lastClaimedDate, today);
    let day: number;
    let isNewStreak: boolean;
    if (consecutive && streakDay >= 1 && streakDay < 7) {
      day = streakDay + 1;
      isNewStreak = false;
    } else if (consecutive && streakDay === 7) {
      day = 1;
      isNewStreak = true;
    } else {
      day = 1;
      isNewStreak = lastClaimedDate !== '';
    }
    return { day, reward: rewardFor(day - 1, this.getTotalRate()), isNewStreak };
  }

  /**
   * Apply the pending daily gift. Caller MUST gate on canClaimDaily().
   * Returns the amounts granted so the UI can display them.
   */
  claimDaily(): { day: number; reward: DailyReward } {
    const pending = this.getPendingDailyReward();
    this.snapshot.daily.streakDay = pending.day;
    this.snapshot.daily.lastClaimedDate = localDateKey();
    this.addBlood(pending.reward.blood);
    if (pending.reward.dread > 0) {
      this.snapshot.dread += pending.reward.dread;
      events.emit('dread-changed', { level: this.snapshot.dread });
    }
    if (pending.reward.ichor > 0) {
      // Funnel through grantIchor so the ledger + toast fire. The
      // daily modal still shows the reward inline, which is fine —
      // players will see both the modal line and the Ichor toast.
      // Lazy import to avoid a circular dep at module init.
      void import('./ichor').then(({ grantIchor }) => {
        grantIchor(pending.reward.ichor, 'daily_login');
      });
    }
    return { day: pending.day, reward: pending.reward };
  }

  // ─────────── Persistence helpers ───────────

  private toSave(): SaveV4 {
    const base = defaultV1();
    return {
      ...base,
      ts: Date.now(),
      blood: this.snapshot.blood,
      totalRunBlood: this.snapshot.totalRunBlood,
      totalRunBloodOnline: this.snapshot.totalRunBloodOnline,
      ichor: this.snapshot.ichor,
      ichorLedger: [...this.snapshot.ichorLedger],
      ichorFlags: { ...this.snapshot.ichorFlags },
      totalLifetimeBlood: this.snapshot.totalLifetimeBlood,
      dread: this.snapshot.dread,
      servants: this.snapshot.servants,
      boost: this.snapshot.boost,
      stats: this.snapshot.stats,
      unlockedAchievements: Array.from(this.snapshot.unlockedAchievements),
      pendingCurseMult: this.snapshot.pendingCurseMult,
      ritesLastUsed: { ...this.snapshot.ritesLastUsed },
      unseenAchievements: Array.from(this.snapshot.unseenAchievements),
      upgrades: { ...this.snapshot.upgrades },
      unlockedServantLore: Array.from(this.snapshot.unlockedServantLore),
      unlockedFormLore: Array.from(this.snapshot.unlockedFormLore),
      runHistory: [...this.snapshot.runHistory],
      daily: { ...this.snapshot.daily },
      playerThralls: { ...this.snapshot.playerThralls },
      ritualState: {
        standard: { ...this.snapshot.ritualState.standard },
        featured: { ...this.snapshot.ritualState.featured },
        firstRareGuaranteeUsed: this.snapshot.ritualState.firstRareGuaranteeUsed,
        history: this.snapshot.ritualState.history.map((e) => ({
          ts: e.ts,
          banner: e.banner,
          thrallId: e.thrallId,
          rarity: e.rarity,
          wasDupe: e.wasDupe,
          essenceGained: e.essenceGained,
          flags: { ...e.flags },
        })),
      },
      essences: { ...this.snapshot.essences },
      equippedSlots: [...this.snapshot.equippedSlots],
    };
  }

  private applySave(save: SaveV4): void {
    this.snapshot.blood = save.blood;
    this.snapshot.totalRunBlood = save.totalRunBlood;
    // M3 — grandfather: saves from before the online/offline split
    // don't have this field. Initialise online = current run total, so
    // the first post-upgrade ascend is lenient (we don't know how much
    // of the old total was offline vs online, so we give the benefit
    // of the doubt). Going forward the two diverge as offline gains
    // land without incrementing online.
    this.snapshot.totalRunBloodOnline =
      save.totalRunBloodOnline ?? save.totalRunBlood;
    this.snapshot.totalLifetimeBlood = save.totalLifetimeBlood;
    this.snapshot.dread = save.dread;
    // L3 — Ichor. All three fields optional on pre-L3 saves. Source
    // is stored as a loose string in the save (no coupling to the
    // IchorSource enum) and narrowed back here; unknown sources pass
    // through — they just won't match any runtime filter.
    this.snapshot.ichor = save.ichor ?? 0;
    this.snapshot.ichorLedger = Array.isArray(save.ichorLedger)
      ? save.ichorLedger.map((tx) => ({
          amount: tx.amount,
          source: tx.source as import('./ichor').IchorSource,
          earnedNotPaid: tx.earnedNotPaid,
          ts: tx.ts,
        }))
      : [];
    this.snapshot.ichorFlags = { ...(save.ichorFlags ?? {}) };
    // Rebuild thralls to guarantee every id exists (new tier added later).
    for (const t of SERVANTS) {
      const saved = save.servants[t.id];
      this.snapshot.servants[t.id] = saved
        ? { owned: saved.owned, totalPurchased: saved.totalPurchased }
        : { owned: 0, totalPurchased: 0 };
    }
    this.snapshot.boost = { ...save.boost };
    this.snapshot.stats = { ...save.stats };
    this.snapshot.unlockedAchievements = new Set(save.unlockedAchievements ?? []);
    this.snapshot.pendingCurseMult = save.pendingCurseMult ?? 1;
    this.snapshot.ritesLastUsed = { ...(save.ritesLastUsed ?? {}) };
    this.snapshot.unseenAchievements = new Set(save.unseenAchievements ?? []);
    this.snapshot.upgrades = { ...(save.upgrades ?? {}) };
    this.snapshot.unlockedServantLore = new Set(save.unlockedServantLore ?? []);
    this.snapshot.unlockedFormLore = new Set(save.unlockedFormLore ?? []);
    // Save stores `form` as a loose string; narrow it back into RunEntry.
    this.snapshot.runHistory = Array.isArray(save.runHistory)
      ? save.runHistory.map((r) => ({
          ts: r.ts,
          maxBlood: r.maxBlood,
          dreadGained: r.dreadGained,
          form: r.form as VampireForm,
          formChanged: r.formChanged,
        }))
      : [];
    // K4 — derive the milestone watermark from the saved run total so
    // re-opening the app doesn't re-fire the toast for a threshold
    // already crossed earlier in the same run. Not persisted directly;
    // inferred from totalRunBlood.
    this.snapshot.lastMilestoneExp =
      this.snapshot.totalRunBlood > 0
        ? Math.floor(Math.log10(this.snapshot.totalRunBlood))
        : -1;
    // K5 — daily streak; absent on older saves means "never claimed".
    this.snapshot.daily = save.daily
      ? { streakDay: save.daily.streakDay, lastClaimedDate: save.daily.lastClaimedDate }
      : { streakDay: 0, lastClaimedDate: '' };
    // L2 — roster state. Absent on pre-L2 saves → fresh empty map
    // (everyone locked). Present but missing an id → default locked
    // entry so adding thralls in future versions doesn't crash load.
    const base = emptyPlayerThralls();
    if (save.playerThralls) {
      for (const t of THRALLS) {
        const saved = save.playerThralls[t.id];
        if (saved) base[t.id] = { ...saved };
      }
    }
    this.snapshot.playerThralls = base;
    // L5 — ritual state + essences. Both optional on pre-L5 saves so
    // existing 1.0.x players land on a clean default (no FRG used,
    // empty pity, zero essences). History entries' loose-string banner
    // / rarity fields are narrowed back here.
    if (save.ritualState) {
      this.snapshot.ritualState = {
        standard: { ...save.ritualState.standard },
        featured: { ...save.ritualState.featured },
        firstRareGuaranteeUsed: save.ritualState.firstRareGuaranteeUsed,
        history: save.ritualState.history.map((e) => ({
          ts: e.ts,
          banner: e.banner as BannerId,
          thrallId: e.thrallId === null ? null : (e.thrallId as ThrallId),
          rarity: e.rarity as ThrallRarity,
          wasDupe: e.wasDupe,
          essenceGained: e.essenceGained,
          flags: {
            frg: !!e.flags.frg,
            pityRare: !!e.flags.pityRare,
            pityEpic: !!e.flags.pityEpic,
            bundleGuarantee: !!e.flags.bundleGuarantee,
            antiStreak: !!e.flags.antiStreak,
            duplicateProtection: !!e.flags.duplicateProtection,
            featuredRateUp: !!e.flags.featuredRateUp,
          },
        })),
      };
    } else {
      this.snapshot.ritualState = emptyRitualState();
    }
    this.snapshot.essences = save.essences
      ? { ...save.essences }
      : emptyEssences();
    // L6 — equipped slots. Optional on pre-L6 saves (defaults all-null).
    // Length is capped at the current EQUIP_SLOT_COUNT; future expansions
    // grow the array with null entries.
    const fresh = emptyEquipSlots();
    if (Array.isArray(save.equippedSlots)) {
      for (let i = 0; i < fresh.length; i += 1) {
        const id = save.equippedSlots[i];
        // Validate: the saved id must exist in the current roster AND
        // be marked owned (otherwise an old save with a removed thrall
        // would dangle a phantom equip).
        if (
          id &&
          (THRALLS_BY_ID as Record<string, unknown>)[id] !== undefined &&
          this.snapshot.playerThralls[id as ThrallId]?.owned
        ) {
          fresh[i] = id as ThrallId;
        }
      }
    }
    this.snapshot.equippedSlots = fresh;
  }

  /** Compute offline gain since the save's timestamp, capped and scaled. */
  private computeOfflineReport(savedAt: number): OfflineReport {
    const elapsedSec = Math.max(0, (Date.now() - savedAt) / 1000);
    const offlineBonus = modifierRegistry.getAdditive('offlineCap');
    const capHours =
      (hasUnlock(this.snapshot.stats.totalAscends, 'extendedOfflineCap')
        ? BALANCE.OFFLINE_CAP_HOURS_METHUSELAH
        : BALANCE.OFFLINE_CAP_HOURS) + offlineBonus;
    const capHoursRewarded =
      (hasUnlock(this.snapshot.stats.totalAscends, 'extendedOfflineCap')
        ? BALANCE.OFFLINE_CAP_HOURS_METHUSELAH_REWARDED
        : BALANCE.OFFLINE_CAP_HOURS_REWARDED) + offlineBonus;
    // Rates use current multipliers — not the ones at save time. Acceptable
    // for an idle game; true precision isn't worth the complexity.
    const rate = this.getTotalRate();
    // L6 — Velmor's bespoke `offline_efficiency_floor` clamps offline
    // efficiency so very long sessions don't decay below a threshold.
    // Default OFFLINE_EFFICIENCY (0.6) wins iff no thrall publishes a
    // higher floor.
    const floor = modifierRegistry.getAdditive('offlineEfficiencyFloor');
    const efficiency = Math.max(BALANCE.OFFLINE_EFFICIENCY, floor);
    const blood = offlineGain(rate, elapsedSec, efficiency, capHours);
    const bloodWithRewarded = offlineGain(
      rate,
      elapsedSec,
      1.0,
      capHoursRewarded,
    );
    return {
      elapsedSec,
      blood,
      bloodWithRewarded,
      efficiency,
      capHours,
      capHoursRewarded,
    };
  }

  // ─────────── Internals ───────────

  /**
   * Internal blood accrual. `opts.offline=true` skips incrementing
   * `totalRunBloodOnline` so the offline report can't feed Dread
   * gain (M3). Everything else (tap, tick, daily gift, rewarded
   * boosts) counts as online.
   */
  private addBlood(delta: number, opts: { offline?: boolean } = {}): void {
    this.snapshot.blood += delta;
    this.snapshot.totalRunBlood += delta;
    if (!opts.offline) {
      this.snapshot.totalRunBloodOnline += delta;
    }
    this.snapshot.totalLifetimeBlood += delta;
    events.emit('blood-changed', { blood: this.snapshot.blood, delta });
    this.checkMilestone();
  }

  /**
   * K4 — fire a 'milestone-reached' event when totalRunBlood crosses
   * a 10^N threshold we haven't seen yet this run. One emission per
   * crossing (if the delta skips multiple thresholds, only the highest
   * fires, which avoids toast spam on rare giant ticks).
   */
  private checkMilestone(): void {
    if (this.snapshot.totalRunBlood < 10) return;
    const exp = Math.floor(Math.log10(this.snapshot.totalRunBlood));
    if (exp < MIN_MILESTONE_EXP) return;
    if (exp <= this.snapshot.lastMilestoneExp) return;
    this.snapshot.lastMilestoneExp = exp;
    events.emit('milestone-reached', {
      threshold: 10 ** exp,
      exponent: exp,
    });
  }
}

export const gameState = new GameState();
