// Central game state. Holds all persistent numbers + exposes actions.
// No UI references. Emits events for listeners (UI + analytics later).

import { BALANCE } from './config/balance';
import { THRALLS, THRALLS_BY_ID, type ThrallId } from './config/thralls';
import type { VampireForm } from './config/forms';
import { events } from './events';
import {
  clickPower,
  dreadGain,
  globalMult,
  offlineGain,
  thrallRate,
} from './math';
import { getCurrentForm, getCenturyInForm } from './forms';
import { hasUnlock } from './config/prestige-unlocks';
import { modifierRegistry } from './modifiers';
import { defaultV1, loadSave, writeSave, type SaveV2 } from './save';

interface ThrallOwnership {
  owned: number;
  totalPurchased: number;
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
  totalRunBlood: number;
  totalLifetimeBlood: number;
  dread: number;
  thralls: Record<ThrallId, ThrallOwnership>;
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
  unlockedThrallLore: Set<string>;
  /** Form ids whose Histories lore has been revealed (reached that form). */
  unlockedFormLore: Set<string>;
  /** Last 10 runs, pushed on ascend. Rolling window. */
  runHistory: RunEntry[];
  /** K4 — the highest 10^N milestone already fired THIS RUN. -1 before
   * any fires. Reset to -1 on ascend; backfilled on load from
   * totalRunBlood so reopening the app doesn't re-trigger past ones. */
  lastMilestoneExp: number;
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

function emptyThralls(): Record<ThrallId, ThrallOwnership> {
  const acc = {} as Record<ThrallId, ThrallOwnership>;
  for (const t of THRALLS) {
    acc[t.id] = { owned: 0, totalPurchased: 0 };
  }
  return acc;
}

function emptySnapshot(): GameSnapshot {
  return {
    blood: 0,
    totalRunBlood: 0,
    totalLifetimeBlood: 0,
    dread: 0,
    thralls: emptyThralls(),
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
    unlockedThrallLore: new Set<string>(),
    unlockedFormLore: new Set<string>(),
    runHistory: [],
    lastMilestoneExp: -1,
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

  /** Load a persisted save (if any). Must be called before startLoop. */
  async loadFromStorage(): Promise<OfflineReport | null> {
    const save = await loadSave();
    if (!save) return null;
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

  getDread(): number {
    return this.snapshot.dread;
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
    const rateMult = modifierRegistry.getMultiplier('thrallRate');
    let sum = 0;
    for (const t of THRALLS) {
      const owned = this.snapshot.thralls[t.id].owned;
      if (owned > 0) {
        sum += thrallRate(t, owned, gMult, boost);
      }
    }
    return sum * rateMult;
  }

  getThrallRate(id: ThrallId): number {
    const owned = this.snapshot.thralls[id].owned;
    if (owned <= 0) return 0;
    const rateMult = modifierRegistry.getMultiplier('thrallRate');
    return (
      thrallRate(THRALLS_BY_ID[id], owned, this.getGlobalMult(), this.getBoostMult()) *
      rateMult
    );
  }

  getThrallCost(id: ThrallId): number {
    const owned = this.snapshot.thralls[id].owned;
    // Scholar-type upgrades tweak the cost multiplier via an additive
    // delta on 'thrallCost' (e.g. -0.01 per level → 1.15 → 1.10 max).
    const baseMult = BALANCE.COST_MULTIPLIER;
    const adjustedMult = Math.max(1.01, baseMult + modifierRegistry.getAdditive('thrallCost'));
    return Math.floor(THRALLS_BY_ID[id].baseCost * adjustedMult ** owned);
  }

  isThrallAffordable(id: ThrallId): boolean {
    return this.snapshot.blood >= this.getThrallCost(id);
  }

  canAscend(): boolean {
    return this.snapshot.totalRunBlood >= BALANCE.ASCEND_THRESHOLD;
  }

  projectedDreadGain(): number {
    const base = dreadGain(this.snapshot.totalRunBlood);
    return Math.floor(base * modifierRegistry.getMultiplier('dreadGain'));
  }

  // ─────────── Actions ───────────

  /** Register a manual tap. Emits tapped + blood-changed. */
  tap(x: number, y: number): void {
    const crit = Math.random() < BALANCE.CRIT_CHANCE;
    const totalRate = this.getTotalRate();
    const clickMult = modifierRegistry.getMultiplier('clickPower');
    const base =
      clickPower(totalRate, this.getGlobalMult(), this.getBoostMult()) * clickMult;
    const gain = crit ? base * BALANCE.CRIT_MULTIPLIER : base;

    this.addBlood(gain);
    this.snapshot.stats.totalTaps += 1;
    if (crit) this.snapshot.stats.totalCrits += 1;

    events.emit('tapped', { x, y, crit, gain });
  }

  /** Attempt to buy one of a thrall. Returns true on success. */
  buyThrall(id: ThrallId): boolean {
    const cost = this.getThrallCost(id);
    if (this.snapshot.blood < cost) return false;

    this.snapshot.blood -= cost;
    const t = this.snapshot.thralls[id];
    t.owned += 1;
    t.totalPurchased += 1;

    // First-ever purchase of this thrall reveals its Bestiary lore.
    if (!this.snapshot.unlockedThrallLore.has(id)) {
      this.snapshot.unlockedThrallLore.add(id);
      events.emit('lore-unlocked', { kind: 'thrall', id });
    }

    events.emit('thrall-bought', { id, owned: t.owned });
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
    const baseGain = dreadGain(this.snapshot.totalRunBlood);
    const dreadMult = modifierRegistry.getMultiplier('dreadGain');
    const gain = Math.floor(baseGain * dreadMult * rewardedMultiplier * curseMult);
    const previousForm = this.getForm();
    // Capture the run's peak blood BEFORE zeroing it — the Run log needs
    // the pre-reset value.
    const peakBlood = this.snapshot.totalRunBlood;

    this.snapshot.dread += gain;
    this.snapshot.stats.totalAscends += 1;
    this.snapshot.blood = 0;
    this.snapshot.totalRunBlood = 0;
    this.snapshot.pendingCurseMult = 1;
    this.snapshot.lastMilestoneExp = -1;
    for (const t of THRALLS) {
      this.snapshot.thralls[t.id].owned = 0;
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

  isTabUnlocked(tab: 'bloodline' | 'servants' | 'rites' | 'tome' | 'shop'): boolean {
    switch (tab) {
      case 'bloodline':
        return true;
      case 'servants':
        return Object.values(this.snapshot.thralls).some((t) => t.owned > 0);
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

  /** Apply an offline blood gain. Called after the user claims the modal. */
  applyOfflineGain(amount: number): void {
    if (amount <= 0) return;
    this.addBlood(amount);
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

  /** Internal: subtract N dread. Upgrade purchase only. */
  spendDread(amount: number): void {
    this.snapshot.dread = Math.max(0, this.snapshot.dread - amount);
  }

  // ─────────── Persistence helpers ───────────

  private toSave(): SaveV2 {
    const base = defaultV1();
    return {
      ...base,
      ts: Date.now(),
      blood: this.snapshot.blood,
      totalRunBlood: this.snapshot.totalRunBlood,
      totalLifetimeBlood: this.snapshot.totalLifetimeBlood,
      dread: this.snapshot.dread,
      thralls: this.snapshot.thralls,
      boost: this.snapshot.boost,
      stats: this.snapshot.stats,
      unlockedAchievements: Array.from(this.snapshot.unlockedAchievements),
      pendingCurseMult: this.snapshot.pendingCurseMult,
      ritesLastUsed: { ...this.snapshot.ritesLastUsed },
      unseenAchievements: Array.from(this.snapshot.unseenAchievements),
      upgrades: { ...this.snapshot.upgrades },
      unlockedThrallLore: Array.from(this.snapshot.unlockedThrallLore),
      unlockedFormLore: Array.from(this.snapshot.unlockedFormLore),
      runHistory: [...this.snapshot.runHistory],
    };
  }

  private applySave(save: SaveV2): void {
    this.snapshot.blood = save.blood;
    this.snapshot.totalRunBlood = save.totalRunBlood;
    this.snapshot.totalLifetimeBlood = save.totalLifetimeBlood;
    this.snapshot.dread = save.dread;
    // Rebuild thralls to guarantee every id exists (new tier added later).
    for (const t of THRALLS) {
      const saved = save.thralls[t.id];
      this.snapshot.thralls[t.id] = saved
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
    this.snapshot.unlockedThrallLore = new Set(save.unlockedThrallLore ?? []);
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
    const blood = offlineGain(rate, elapsedSec, BALANCE.OFFLINE_EFFICIENCY, capHours);
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
      efficiency: BALANCE.OFFLINE_EFFICIENCY,
      capHours,
      capHoursRewarded,
    };
  }

  // ─────────── Internals ───────────

  private addBlood(delta: number): void {
    this.snapshot.blood += delta;
    this.snapshot.totalRunBlood += delta;
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
