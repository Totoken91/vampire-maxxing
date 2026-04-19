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
  thrallCost,
  thrallRate,
} from './math';
import { getCurrentForm } from './forms';
import { hasUnlock } from './config/prestige-unlocks';
import { defaultV1, loadSave, writeSave, type SaveV1 } from './save';

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
  };
}

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
    return globalMult(this.snapshot.dread, hasProgenitorBonus);
  }

  /** Sum of per-second production across all owned thralls. */
  getTotalRate(): number {
    const gMult = this.getGlobalMult();
    const boost = this.getBoostMult();
    let sum = 0;
    for (const t of THRALLS) {
      const owned = this.snapshot.thralls[t.id].owned;
      if (owned > 0) {
        sum += thrallRate(t, owned, gMult, boost);
      }
    }
    return sum;
  }

  getThrallRate(id: ThrallId): number {
    const owned = this.snapshot.thralls[id].owned;
    if (owned <= 0) return 0;
    return thrallRate(THRALLS_BY_ID[id], owned, this.getGlobalMult(), this.getBoostMult());
  }

  getThrallCost(id: ThrallId): number {
    const owned = this.snapshot.thralls[id].owned;
    return thrallCost(THRALLS_BY_ID[id].baseCost, owned);
  }

  isThrallAffordable(id: ThrallId): boolean {
    return this.snapshot.blood >= this.getThrallCost(id);
  }

  canAscend(): boolean {
    return this.snapshot.totalRunBlood >= BALANCE.ASCEND_THRESHOLD;
  }

  projectedDreadGain(): number {
    return dreadGain(this.snapshot.totalRunBlood);
  }

  // ─────────── Actions ───────────

  /** Register a manual tap. Emits tapped + blood-changed. */
  tap(x: number, y: number): void {
    const crit = Math.random() < BALANCE.CRIT_CHANCE;
    const totalRate = this.getTotalRate();
    const base = clickPower(totalRate, this.getGlobalMult(), this.getBoostMult());
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

  /** Trigger ascension if eligible. Emits form-changed if the form bumps. */
  ascend(rewardedMultiplier: number = 1): boolean {
    if (!this.canAscend()) return false;

    const gain = dreadGain(this.snapshot.totalRunBlood) * rewardedMultiplier;
    const previousForm = this.getForm();

    this.snapshot.dread += gain;
    this.snapshot.stats.totalAscends += 1;
    this.snapshot.blood = 0;
    this.snapshot.totalRunBlood = 0;
    for (const t of THRALLS) {
      this.snapshot.thralls[t.id].owned = 0;
    }
    this.snapshot.boost = { active: false, endTime: 0, cooldownEnd: 0, isRewarded: false };

    const newForm = this.getForm();
    if (newForm !== previousForm) {
      this.snapshot.stats.highestFormReached = newForm;
      events.emit('form-changed', { form: newForm });
    }

    events.emit('blood-changed', { blood: 0, delta: -gain });
    events.emit('rate-changed', { totalRate: 0 });
    return true;
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
  }

  /** Apply an offline blood gain. Called after the user claims the modal. */
  applyOfflineGain(amount: number): void {
    if (amount <= 0) return;
    this.addBlood(amount);
  }

  // ─────────── Persistence helpers ───────────

  private toSave(): SaveV1 {
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
    };
  }

  private applySave(save: SaveV1): void {
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
  }

  /** Compute offline gain since the save's timestamp, capped and scaled. */
  private computeOfflineReport(savedAt: number): OfflineReport {
    const elapsedSec = Math.max(0, (Date.now() - savedAt) / 1000);
    const capHours = hasUnlock(this.snapshot.stats.totalAscends, 'extendedOfflineCap')
      ? BALANCE.OFFLINE_CAP_HOURS_METHUSELAH
      : BALANCE.OFFLINE_CAP_HOURS;
    const capHoursRewarded = hasUnlock(
      this.snapshot.stats.totalAscends,
      'extendedOfflineCap',
    )
      ? BALANCE.OFFLINE_CAP_HOURS_METHUSELAH_REWARDED
      : BALANCE.OFFLINE_CAP_HOURS_REWARDED;
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
  }
}

export const gameState = new GameState();
