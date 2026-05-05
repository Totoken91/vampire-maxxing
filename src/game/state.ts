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
  ascendThresholdFor,
  clickPower,
  dreadGain,
  globalMult,
  isMilestoneCrossing,
  offlineGain,
  servantMilestoneMult,
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
import { defaultV1, loadSave, writeSave, type SaveV5 } from './save';
import { ACHIEVEMENTS_BY_ID } from './config/achievements';
import {
  emptyMetrics as emptyQuestMetrics,
  emptyQuestState,
  type QuestState,
} from './quests-types';

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
  /** L12 — Frisson du Destin pending buff. When true, the next
   * Common pull bumps the standard rare pity counter +1 (player
   * gets to a Rare 1 pull sooner). Cleared on use. */
  pendingFrissonBuff: boolean;
  /** L12 — last `stats.totalAscends` value at which the Frisson rite
   * fired. Caps the rite at 1×/prestige: re-armable iff
   * `totalAscends > lastFrissonPrestige`. */
  lastFrissonPrestige: number;
  /** L12 — Offrande du Soir cap state. 3 Ichor ad-rewards/day max;
   * resets when localDateKey() changes. */
  dailyIchorAds: { date: string; count: number };
  /** L13 — age confirmation state. Required (per RGPD + KR/EU
   * compliance) before any IAP can fire. 'unconfirmed' = first
   * launch, 'over13' = self-attested adult/minor-13+, 'under13' =
   * blocks IAP entirely. */
  ageConfirmation: 'unconfirmed' | 'over13' | 'under13';
  /** L13 — opt-in daily spending cap in EUR. null = no cap. When
   * set, IAP attempts past the cap return false and surface a
   * clear "cap reached" message. */
  dailySpendCapEur: number | null;
  /** L13 — purchase ledger fed by the IAP layer (L10+). Each entry
   * records ts (epoch ms), amountEur, productId. Spending dashboard
   * reads sums from this; daily cap reads `today's` window. */
  spendingLog: SpendingEntry[];
  /** L_QUESTS — daily quest state. Active id, progress, claim flag,
   * and the per-metric counters that reset at midnight local. */
  questState: QuestState;
  /** L_QUESTS — achievement ids whose Ichor reward has been earned
   * (predicate satisfied) but not yet collected. Drives the per-card
   * CLAIM CTA + the Tome tab red-dot. Cleared per-id on claim. */
  unclaimedAchievements: Set<string>;
  /** L10 — packs whose First-Time Double bonus has been consumed.
   *  An sku enters this set on first successful purchase; subsequent
   *  buys credit only the base Ichor (no FT bonus). */
  packsFirstTimeBought: Set<string>;
  /** L11 — timestamp (Date.now()) at which the player obtained their
   *  first Rare-or-better thrall (any source: FRG, pull, pack,
   *  milestone). null = not yet earned. Drives the Pacte Fondateur
   *  trigger window: the pack jumps to the FEATURED hero slot for
   *  `featuredDays` after this timestamp, then settles into the regular
   *  shop list with the FT bonus retained until claimed once. */
  welcomePackFirstRareAt: number | null;
  /** L15 — User-mutable preferences (Settings panel toggles). Save
   *  V1 already persisted these; the snapshot now mirrors them so
   *  reads/writes don't need to walk through the save layer.
   *  V1.2-HF1 added `autoAscend` for the Methuselah-Century-III auto
   *  ascension toggle. */
  settings: {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    lang: string;
    notifEnabled: boolean;
    autoAscend: boolean;
  };
  /** V1.3 — Soulreave meta-currency. Earned by performing a
   *  Soulreave (second-layer prestige); spent on the meta-tree.
   *  Persists across Soulreaves — only meta-tree purchases drop it. */
  soulShards: number;
  /** V1.3 — cumulative Dread across the player's lifetime. Drives
   *  `projectedSoulShards()` (sqrt formula). Only ever grows. */
  lifetimeDread: number;
  /** V1.3 — owned meta-tree node ids (presence + true = purchased).
   *  Linear-unlock order is enforced at purchase time. */
  metaTree: Record<string, boolean>;
  /** V1.3 — total Soulreaves performed. Drives the cinematic title
   *  (Soulreave I / II / III...) + Tome stats display. */
  totalSoulreaves: number;
  /** V1.3 — set true the moment a Soulreave fires while
   *  WELCOME_TRIBUTE is owned. The next Standard ritual pull
   *  consumes the buff and forces Rare+. One-shot per Soulreave. */
  welcomeTributeArmed: boolean;
}

export interface SpendingEntry {
  /** Unix ms at purchase time. */
  ts: number;
  /** Charged amount in EUR (Play Console converts on fulfillment). */
  amountEur: number;
  /** SKU / product id from the IAP layer. */
  productId: string;
}

/** Per-banner pity counters, streak, totals + global lifetime flags
 * and rolling pull history. Lives inside GameSnapshot; ritual.ts
 * mutates it directly via `gameState.getRitualState()`. */
export interface RitualBannerState {
  /** Pulls since the last Rare+ on this banner. Resets on Rare or Epic. */
  pityCounterRare: number;
  /** Featured-only — pulls since last Epic. Standard ignores this. */
  pityCounterEpic: number;
  /** Pulls since the last Legendary on this banner. Resets on Legendary.
   *  Drives soft pity (rate ramp from pull `legendarySoftStart`) and
   *  hard pity (forced Legendary at pull `legendary`). V1.2-EXT. */
  pityCounterLegendary: number;
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
  /** V1.2-EXT — populated by Legendary dupes + Cinder Ceremony at
   *  Legendary saturation. Spent on awakening the 3 Legendaries
   *  through their 5 stars. Save-stable. */
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
    pityCounterLegendary: 0,
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

// `legendary` was already declared in the type above; safety-net the
// load path in case a pre-V1.2-EXT save lacks the field.

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
    pendingFrissonBuff: false,
    lastFrissonPrestige: -1,
    dailyIchorAds: { date: '', count: 0 },
    ageConfirmation: 'unconfirmed',
    dailySpendCapEur: null,
    spendingLog: [],
    questState: emptyQuestState(),
    unclaimedAchievements: new Set<string>(),
    packsFirstTimeBought: new Set<string>(),
    welcomePackFirstRareAt: null,
    settings: {
      soundEnabled: false,
      hapticsEnabled: true,
      lang: typeof navigator !== 'undefined' &&
        navigator.language?.startsWith('fr')
        ? 'fr'
        : 'en',
      notifEnabled: false,
      autoAscend: false,
    },
    soulShards: 0,
    lifetimeDread: 0,
    metaTree: {},
    totalSoulreaves: 0,
    welcomeTributeArmed: false,
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

  /** Return a fresh SaveV5 snapshot. Used by cloud-sync to push to
   *  Supabase without going through localStorage. The returned object is
   *  a new structuredClone-equivalent — caller can mutate freely. */
  getSaveSnapshot(): SaveV5 {
    return this.toSave();
  }

  /** Replace the entire running state from a SaveV5 received from the
   *  cloud. The legacy events ('blood-changed', 'rate-changed',
   *  'form-changed') are emitted so the UI fully re-renders.
   *  Returns the offline report (so the offline-modal can fire after
   *  a cloud-pulled sign-in if the cloud snapshot is stale). */
  applyCloudSnapshot(save: SaveV5): OfflineReport | null {
    this.applySave(save);
    return this.computeOfflineReport(save.ts);
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
    // V1.3 — ETERNAL_FLAME adds +50% to the Stray Rat tier only.
    // Implemented inline (not via the registry) because the registry
    // is global; per-servant publishes would require a target shape
    // change. Cheap to read each call (just a record lookup).
    const ratBonus = this.snapshot.metaTree['ETERNAL_FLAME'] ? 1.5 : 1;
    let sum = 0;
    for (const t of SERVANTS) {
      const owned = this.snapshot.servants[t.id].owned;
      if (owned > 0) {
        const r = servantRate(t, owned, gMult, boost);
        sum += t.id === 'rat' ? r * ratBonus : r;
      }
    }
    return sum * rateMult;
  }

  getServantRate(id: ServantId): number {
    const owned = this.snapshot.servants[id].owned;
    if (owned <= 0) return 0;
    const rateMult = modifierRegistry.getMultiplier('servantRate');
    const ratBonus =
      id === 'rat' && this.snapshot.metaTree['ETERNAL_FLAME'] ? 1.5 : 1;
    return (
      servantRate(SERVANTS_BY_ID[id], owned, this.getGlobalMult(), this.getBoostMult()) *
      rateMult *
      ratBonus
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
    // V1.2-HF1 — threshold scales by the current form so each tier
    // holds a stable 3-5 min/ascend cadence. NEWBORN keeps the base
    // 1× threshold (no behavior change for early game); each higher
    // form bumps the threshold significantly.
    return this.snapshot.totalRunBlood >= ascendThresholdFor(this.getForm());
  }

  /** V1.2-HF1 — Exposed so the Ascend modal can show "X / Y" progress
   *  with the form-scaled threshold instead of the legacy fixed value. */
  ascendThreshold(): number {
    return ascendThresholdFor(this.getForm());
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
    if (this.snapshot.totalRunBloodOnline < ascendThresholdFor(this.getForm())) {
      return false;
    }
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
    const prevOwned = t.owned;
    t.owned += 1;
    t.totalPurchased += 1;

    // First-ever purchase of this thrall reveals its Bestiary lore.
    if (!this.snapshot.unlockedServantLore.has(id)) {
      this.snapshot.unlockedServantLore.add(id);
      events.emit('lore-unlocked', { kind: 'servant', id });
    }

    events.emit('servant-bought', { id, owned: t.owned });
    if (isMilestoneCrossing(prevOwned, t.owned)) {
      const cumulativeMult = servantMilestoneMult(t.owned);
      const previousMult = servantMilestoneMult(prevOwned);
      events.emit('servant-milestone-reached', {
        id,
        threshold: t.owned,
        bonus: cumulativeMult / previousMult,
        cumulativeMult,
      });
    }
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
    // V1.3 — lifetime cumulative Dread feeds the Soulreave currency
    // formula. Only ever grows; the run-resetting `dread` field
    // tracks current rank, this one tracks total ever earned.
    this.snapshot.lifetimeDread += gain;
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

    // V1.2-HF1 — A successful ascend (manual OR auto) re-arms the
    // auto-ascend pause. If this was the form-bump ascend the player
    // saw the cinematic; if it wasn't, the pause flag was already
    // false. Either way, clear it so the loop can resume firing.
    void import('./auto-ascend').then(({ resumeAutoAscend }) =>
      resumeAutoAscend(),
    );
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

  /** Stamp a rite as just-used so its cooldown starts ticking.
   *  Emits `rite-used` so daily quest metrics + analytics can react. */
  markRiteUsed(id: string): void {
    this.snapshot.ritesLastUsed[id] = Date.now();
    events.emit('rite-used', { id });
  }

  // ─────────── V1.3 Soulreave plumbing ───────────
  //
  // These mutators are prefixed `_` to signal "engine-only — not for
  // UI". The Soulreave module in `soulreave.ts` is the sole intended
  // caller; gating + side-effects (events, applyMetaNodeEffect) live
  // there. Centralising the writes here keeps the snapshot's
  // invariants in one place.

  /** Subtract Soul Shards (used by purchaseMetaNode). Caller has
   *  already gated on affordability. Emits 'soul-shards-changed'. */
  _spendSoulShards(amount: number): void {
    this.snapshot.soulShards = Math.max(0, this.snapshot.soulShards - amount);
    events.emit('soul-shards-changed', {
      balance: this.snapshot.soulShards,
      delta: -amount,
    });
  }

  /** Mark a meta-tree node as owned (or owned-cleared in dev cheats). */
  _setMetaNodeOwned(id: string, owned: boolean): void {
    if (owned) {
      this.snapshot.metaTree[id] = true;
    } else {
      delete this.snapshot.metaTree[id];
    }
  }

  /** Set the Welcome Tribute armed flag — cleared by ritual.ts on
   *  the next Standard pull. */
  _setWelcomeTributeArmed(armed: boolean): void {
    this.snapshot.welcomeTributeArmed = armed;
  }

  /** Read the current Welcome Tribute flag (ritual.ts consumer). */
  isWelcomeTributeArmed(): boolean {
    return this.snapshot.welcomeTributeArmed;
  }

  /** The actual reset. Called from `performSoulreave()` after the
   *  cinematic. Lifetime fields PRESERVED, run/rank fields RESET,
   *  Soul Shards CREDITED. ETERNAL_BOND keeps the equipped slots,
   *  IRON_WILL keeps 1 of each owned servant. */
  _applySoulreave(soulShardsGained: number): void {
    const hasIronWill = this.snapshot.metaTree['IRON_WILL'] === true;
    const hasEternalBond = this.snapshot.metaTree['ETERNAL_BOND'] === true;

    // Capture pre-reset ownership so Iron Will's "keep 1" only
    // applies to tiers the player actually had.
    const ownedTiers = new Set<ServantId>();
    for (const t of SERVANTS) {
      if (this.snapshot.servants[t.id].owned > 0) ownedTiers.add(t.id);
    }

    // Currency + run state RESET
    this.snapshot.blood = 0;
    this.snapshot.totalRunBlood = 0;
    this.snapshot.totalRunBloodOnline = 0;
    this.snapshot.dread = 0;
    this.snapshot.pendingCurseMult = 1;
    this.snapshot.lastMilestoneExp = -1;
    this.snapshot.boost = {
      active: false,
      endTime: 0,
      cooldownEnd: 0,
      isRewarded: false,
    };

    // Servants RESET (modulo Iron Will)
    for (const t of SERVANTS) {
      const keep = hasIronWill && ownedTiers.has(t.id) ? 1 : 0;
      this.snapshot.servants[t.id] = { owned: keep, totalPurchased: keep };
    }

    // Stats: form derivation reads totalAscends, so resetting it
    // returns the player to NEWBORN automatically.
    this.snapshot.stats.totalAscends = 0;
    this.snapshot.stats.highestFormReached = 'NEWBORN';
    this.snapshot.runHistory = [];

    // Equipped slots: cleared unless ETERNAL_BOND is owned. The
    // playerThralls roster (acquired thralls + their stars) is
    // ALWAYS preserved — losing collection progress on Soulreave
    // would be punitive (gacha-systems audit decision).
    if (!hasEternalBond) {
      this.snapshot.equippedSlots = [null, null, null];
    }

    // Soul Shards CREDITED (additive — preserves prior balance)
    this.snapshot.soulShards += soulShardsGained;
    this.snapshot.totalSoulreaves += 1;

    // Refresh modifier-driven downstream consumers. The modifier
    // registry isn't persisted, so any servant-publish modifiers
    // need to re-publish from the new owned counts. Simplest: emit
    // the same events ascend() does so listeners (UI, modifiers)
    // refresh.
    events.emit('blood-changed', { blood: 0, delta: 0 });
    events.emit('rate-changed', { totalRate: 0 });
    events.emit('dread-changed', { level: 0 });
    events.emit('soul-shards-changed', {
      balance: this.snapshot.soulShards,
      delta: soulShardsGained,
    });
    events.emit('form-changed', { form: 'NEWBORN' });

    // Auto-ascend pause is per-form-bump and re-arms next time the
    // player crosses a Form threshold; nothing to clear here, but
    // we re-import to keep the side-effect predictable on rare
    // edge cases (e.g., player Soulreaves DURING a paused state).
    void import('./auto-ascend').then(({ resumeAutoAscend }) =>
      resumeAutoAscend(),
    );
  }

  /** Read-only view of Soul Shards (avoids requiring callers to
   *  walk through `get().soulShards`). */
  getSoulShards(): number {
    return this.snapshot.soulShards;
  }

  /** Read-only view of lifetime Dread. */
  getLifetimeDread(): number {
    return this.snapshot.lifetimeDread;
  }

  /** Read-only view of total Soulreaves. Drives the cinematic title
   *  (Soulreave I/II/III). */
  getTotalSoulreaves(): number {
    return this.snapshot.totalSoulreaves;
  }

  /** Read-only view of meta-tree ownership. Returns the inner
   *  record by reference; callers MUST NOT mutate. */
  getMetaTree(): Readonly<Record<string, boolean>> {
    return this.snapshot.metaTree;
  }

  /** Dev-only — clear the Soulreave layer for testing. Wipes
   *  soulShards, metaTree, totalSoulreaves, welcomeTributeArmed.
   *  lifetimeDread is preserved (it's a stat, not a currency). */
  _devWipeSoulreave(): void {
    this.snapshot.soulShards = 0;
    this.snapshot.metaTree = {};
    this.snapshot.totalSoulreaves = 0;
    this.snapshot.welcomeTributeArmed = false;
    events.emit('soul-shards-changed', { balance: 0, delta: 0 });
  }

  /** Dev-only — credit Soul Shards (cheat). */
  _devAddSoulShards(amount: number): void {
    this.snapshot.soulShards += amount;
    events.emit('soul-shards-changed', {
      balance: this.snapshot.soulShards,
      delta: amount,
    });
  }

  /** Dev-only — credit lifetime Dread (cheat) so you can test
   *  Soulreave gating without grinding. */
  _devAddLifetimeDread(amount: number): void {
    this.snapshot.lifetimeDread += amount;
  }

  /** L8 FTUE — true while the tutorial Ichor gift has been
   *  delivered but the player hasn't completed the first equip yet
   *  AND hasn't burned the FRG (legacy returning saves). Drives the
   *  red dot on the Sanctum tab so the next-step affordance reads
   *  even when overlays cover the legacy glow filter. */
  isFtueSanctumPending(): boolean {
    const flags = this.snapshot.ichorFlags;
    if (!flags['tutorial_gift']) return false;
    if (flags['ftue:bind_done']) return false;
    if (this.hasUsedFirstRareGuarantee()) return false;
    return true;
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
        // L11 — first Rare+ thrall arms the Pacte Fondateur, which
        // surfaces a "go to Shop" CTA. Without this third disjunction
        // the CTA dead-ends because the legacy gates (3 ascends or 1h
        // playtime) trigger long after the first Rare. Earning a Rare
        // is itself a meaningful progression beat, so unlocking Shop
        // at that moment fits the founder-pack narrative.
        return (
          this.snapshot.stats.totalAscends >= 3 ||
          this.snapshot.stats.totalPlayTime >= 3600 ||
          this.snapshot.welcomePackFirstRareAt !== null
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
    // K5 — Mirror the loadFromStorage no-save path: silently consume
    // day 1 of the streak so a wiped player doesn't see "A QUIET
    // ARRIVAL" (0 blood / 0 ichor) on next reload. The cycle's first
    // visible reward lands on day 2 (THE HUNGER STIRS, 10K + 1 ichor).
    // Without this, the post-wipe autosave persists `lastClaimedDate
    // = ''` and the next boot pops the day-1 modal.
    this.snapshot.daily.streakDay = 1;
    this.snapshot.daily.lastClaimedDate = localDateKey();
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
    if (this.snapshot.unlockedAchievements.has(id)) return;
    this.snapshot.unlockedAchievements.add(id);
    this.snapshot.unseenAchievements.add(id);
    // L_QUESTS — claim-driven Ichor reward. The reward sits in the
    // unclaimed pool until the player taps CLAIM in the Tome (or
    // CLAIM ALL). Achievements with no ichorReward (or 0) never
    // enter the queue.
    const def = ACHIEVEMENTS_BY_ID[id];
    if (def && def.ichorReward > 0) {
      this.snapshot.unclaimedAchievements.add(id);
    }
  }

  /** L_QUESTS — read-only set of achievements that have been earned
   *  but not yet collected by the player. */
  getUnclaimedAchievements(): ReadonlySet<string> {
    return this.snapshot.unclaimedAchievements;
  }

  /** L_QUESTS — whether any achievement is sitting in the claim
   *  queue. Drives the Tome-tab red-dot in conjunction with quest
   *  claimability. */
  hasUnclaimedAchievements(): boolean {
    return this.snapshot.unclaimedAchievements.size > 0;
  }

  /** L_QUESTS — drop a single achievement out of the unclaimed pool
   *  (caller is expected to grant the Ichor reward separately). */
  markAchievementClaimed(id: string): void {
    this.snapshot.unclaimedAchievements.delete(id);
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

  // ─────────── L13 Age gate + Spending dashboard ───────────

  /** Whether the player has answered the age gate. Drives whether
   * the gate modal needs to show on boot AND whether IAPs (L10+)
   * can fire. 'unconfirmed' means we never asked; 'under13' means
   * the player is below the IAP age threshold and should never
   * see paid offers. */
  getAgeConfirmation(): 'unconfirmed' | 'over13' | 'under13' {
    return this.snapshot.ageConfirmation;
  }

  setAgeConfirmation(value: 'over13' | 'under13'): void {
    this.snapshot.ageConfirmation = value;
  }

  /** Quick accessor used by the Settings panel + IAP gating. */
  isUnder13(): boolean {
    return this.snapshot.ageConfirmation === 'under13';
  }

  /** Daily spending cap in EUR, or null when no cap is set. */
  getDailySpendCap(): number | null {
    return this.snapshot.dailySpendCapEur;
  }

  setDailySpendCap(value: number | null): void {
    if (value !== null && (value < 0 || !Number.isFinite(value))) return;
    this.snapshot.dailySpendCapEur = value;
  }

  /** Sum of every recorded purchase, lifetime. */
  getLifetimeSpent(): number {
    let total = 0;
    for (const e of this.snapshot.spendingLog) total += e.amountEur;
    return total;
  }

  /** Spend in the rolling 30-day window before now. */
  getLast30DaysSpent(): number {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let total = 0;
    for (const e of this.snapshot.spendingLog) {
      if (e.ts >= cutoff) total += e.amountEur;
    }
    return total;
  }

  /** Spend on the current local calendar day (for cap enforcement). */
  getTodaySpent(): number {
    const today = localDateKey();
    let total = 0;
    for (const e of this.snapshot.spendingLog) {
      if (localDateKey(new Date(e.ts)) === today) total += e.amountEur;
    }
    return total;
  }

  /** Whether a purchase of `amountEur` is allowed right now.
   * Centralised so the L10 IAP layer + the UI both read the same
   * predicate. Returns null on success, reason string on block. */
  blockReasonForPurchase(amountEur: number): string | null {
    if (this.isUnder13()) {
      return 'Purchases are disabled for accounts under 13.';
    }
    const cap = this.getDailySpendCap();
    if (cap !== null && this.getTodaySpent() + amountEur > cap) {
      return `Daily spending cap reached ($${cap.toFixed(2)}).`;
    }
    return null;
  }

  /** Append a fulfilled purchase to the ledger. Called by the L10
   * IAP layer post-grant so the spending dashboard stays accurate.
   * Does NOT validate the cap — that's `blockReasonForPurchase`'s job
   * before the purchase fires. */
  recordPurchase(amountEur: number, productId: string): void {
    if (amountEur <= 0) return;
    this.snapshot.spendingLog.push({
      ts: Date.now(),
      amountEur,
      productId,
    });
  }

  // ─────────── L12 Rewarded ad rites ───────────

  /** Cap state for the daily Ichor rewarded ad (Offrande du Soir).
   *  Resets at midnight local time. */
  getDailyIchorAdsCount(): number {
    const today = localDateKey();
    if (this.snapshot.dailyIchorAds.date !== today) return 0;
    return this.snapshot.dailyIchorAds.count;
  }

  /** Returns the cap (default 3); centralised so the UI + engine
   *  read the same constant. */
  getDailyIchorAdsCap(): number {
    return 3;
  }

  /** True iff the player can claim another Offrande du Soir today. */
  canClaimOffrandeIchor(): boolean {
    return this.getDailyIchorAdsCount() < this.getDailyIchorAdsCap();
  }

  /** Increment the daily counter and return the new total. Caller is
   *  expected to grant the Ichor itself via grantIchor() so the
   *  ledger / events fire. */
  recordOffrandeClaim(): number {
    const today = localDateKey();
    if (this.snapshot.dailyIchorAds.date !== today) {
      this.snapshot.dailyIchorAds = { date: today, count: 0 };
    }
    this.snapshot.dailyIchorAds.count += 1;
    return this.snapshot.dailyIchorAds.count;
  }

  /** Frisson du Destin — re-armable iff the player has prestiged
   *  since the last firing (1×/prestige cap). The rite uses
   *  `getPrestigeCount()` (totalAscends) as the gate. */
  canArmFrisson(): boolean {
    if (this.snapshot.pendingFrissonBuff) return false;
    return this.snapshot.stats.totalAscends > this.snapshot.lastFrissonPrestige;
  }

  armFrissonBuff(): void {
    this.snapshot.pendingFrissonBuff = true;
    this.snapshot.lastFrissonPrestige = this.snapshot.stats.totalAscends;
  }

  hasFrissonBuff(): boolean {
    return this.snapshot.pendingFrissonBuff;
  }

  /** Consume the Frisson buff. Engine calls this after applying the
   *  +1 pity bump on a Common pull. */
  consumeFrissonBuff(): void {
    this.snapshot.pendingFrissonBuff = false;
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

  /** Apply a server-daily envelope returned by the daily-claim edge
   *  function. Mirrors the mutations gameState.claimDaily would do
   *  locally (addBlood + dread bump + ichorLedger entry + daily
   *  metadata) but reads the credited values straight from the
   *  envelope so the local state ends up identical to the cloud row.
   *  The ichor portion is granted via grantIchor (lazy import) so the
   *  L3 ledger toast + downstream achievements fire just like the
   *  local path. */
  applyServerDailyEnvelope(env: {
    reward: { blood: number; dread: number; ichor: number };
    newState: {
      blood: number;
      dread: number;
      lifetimeDread: number;
      ichor: number;
      daily: { streakDay: number; lastClaimedDate: string };
    };
  }): void {
    const bloodDelta = env.newState.blood - this.snapshot.blood;
    if (bloodDelta > 0) {
      this.addBlood(bloodDelta);
    }
    if (env.reward.dread > 0) {
      this.snapshot.dread = env.newState.dread;
      this.snapshot.lifetimeDread = env.newState.lifetimeDread;
      events.emit('dread-changed', { level: this.snapshot.dread });
    }
    this.snapshot.daily.streakDay = env.newState.daily.streakDay;
    this.snapshot.daily.lastClaimedDate = env.newState.daily.lastClaimedDate;
    if (env.reward.ichor > 0) {
      // Lazy import mirrors the pattern in claimDaily — avoids a
      // circular dep at module init.
      void import('./ichor').then(({ grantIchor }) => {
        grantIchor(env.reward.ichor, 'daily_login');
      });
    }
  }

  /** Apply a server-pull envelope returned by the gacha-pull edge
   *  function. Replaces ritual-related fields (ichor, ritualState,
   *  essences, welcomeTributeArmed, pendingFrissonBuff) with the
   *  server's authoritative copy and emits the same events the local
   *  performPull would so downstream UI / achievement checks fire
   *  identically. The diff (new owners, essence deltas, ichor delta)
   *  drives the events. Anything else (blood, dread, form…) is left
   *  alone since the server doesn't touch those fields. */
  applyServerPullEnvelope(env: {
    newState: {
      ichor: number;
      ritualState: RitualStateSnapshot;
      essences: PlayerEssences;
      welcomeTributeArmed: boolean;
      pendingFrissonBuff: boolean;
      newlyObtained: ReadonlyArray<{ id: string; ts: number }>;
    };
  }): void {
    const oldIchor = this.snapshot.ichor;
    const oldEssences: PlayerEssences = { ...this.snapshot.essences };

    this.snapshot.ichor = env.newState.ichor;
    this.snapshot.essences = { ...env.newState.essences };
    this.snapshot.ritualState = env.newState.ritualState;
    this.snapshot.welcomeTributeArmed = env.newState.welcomeTributeArmed;
    this.snapshot.pendingFrissonBuff = env.newState.pendingFrissonBuff;

    if (oldIchor !== env.newState.ichor) {
      events.emit('ichor-changed', { balance: env.newState.ichor });
    }
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      const delta = env.newState.essences[rarity] - oldEssences[rarity];
      if (delta > 0) {
        events.emit('essence-gained', {
          rarity,
          amount: delta,
          balance: env.newState.essences[rarity],
        });
      }
    }
    for (const newly of env.newState.newlyObtained) {
      const id = newly.id as ThrallId;
      const ps = this.snapshot.playerThralls[id];
      if (ps && !ps.owned) {
        ps.owned = true;
        ps.firstObtainedAt = newly.ts;
        ps.isNew = true;
        events.emit('thrall-obtained', { id, firstTime: true });
      }
    }
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
      this.snapshot.lifetimeDread += pending.reward.dread;
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

  // ─────────── L_QUESTS Daily quest state ───────────

  /** Mutable handle so the quest engine (`src/game/quests.ts`) can
   *  rotate, increment metrics, and flip the claim flag in place.
   *  The UI reads via `getActiveQuest()` from the engine. */
  getQuestState(): QuestState {
    return this.snapshot.questState;
  }

  // ─────────── L10/L11 IAP packs ───────────

  /** Has the FT-Double bonus already been consumed for this SKU? */
  hasConsumedFirstTime(sku: string): boolean {
    return this.snapshot.packsFirstTimeBought.has(sku);
  }

  /** Mark a pack's FT bonus as consumed. The grant engine in
   *  src/game/iap.ts calls this after a successful first purchase. */
  markFirstTimeConsumed(sku: string): void {
    this.snapshot.packsFirstTimeBought.add(sku);
  }

  /** Snapshot of the FT-bought set — read-only view for the UI to
   *  decide whether to show the "×2 PREMIÈRE FOIS" ribbon. */
  getPacksFirstTimeBought(): ReadonlySet<string> {
    return this.snapshot.packsFirstTimeBought;
  }

  /** Stamp the welcome-pack trigger window. Called once, on the
   *  player's first Rare+ acquisition (any source). Idempotent — a
   *  second call leaves the original timestamp intact. */
  markWelcomeFirstRareEarned(): void {
    if (this.snapshot.welcomePackFirstRareAt === null) {
      this.snapshot.welcomePackFirstRareAt = Date.now();
    }
  }

  /** Read-only access to the welcome-pack timestamp. null = the player
   *  hasn't earned their first Rare yet. */
  getWelcomeFirstRareAt(): number | null {
    return this.snapshot.welcomePackFirstRareAt;
  }

  // ─────────── Persistence helpers ───────────

  private toSave(): SaveV5 {
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
      pendingFrissonBuff: this.snapshot.pendingFrissonBuff,
      lastFrissonPrestige: this.snapshot.lastFrissonPrestige,
      dailyIchorAds: { ...this.snapshot.dailyIchorAds },
      ageConfirmation: this.snapshot.ageConfirmation,
      dailySpendCapEur: this.snapshot.dailySpendCapEur,
      spendingLog: this.snapshot.spendingLog.map((e) => ({ ...e })),
      questState: {
        date: this.snapshot.questState.date,
        activeId: this.snapshot.questState.activeId,
        progress: this.snapshot.questState.progress,
        claimed: this.snapshot.questState.claimed,
        metrics: { ...this.snapshot.questState.metrics },
      },
      unclaimedAchievements: Array.from(this.snapshot.unclaimedAchievements),
      packsFirstTimeBought: Array.from(this.snapshot.packsFirstTimeBought),
      welcomePackFirstRareAt: this.snapshot.welcomePackFirstRareAt,
      settings: { ...this.snapshot.settings },
      soulShards: this.snapshot.soulShards,
      lifetimeDread: this.snapshot.lifetimeDread,
      metaTree: { ...this.snapshot.metaTree },
      totalSoulreaves: this.snapshot.totalSoulreaves,
      welcomeTributeArmed: this.snapshot.welcomeTributeArmed,
    };
  }

  private applySave(save: SaveV5): void {
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
      // V1.2-EXT — pre-Legendary saves lack `pityCounterLegendary`.
      // Spread the empty defaults first so missing fields fall back
      // to 0 even after the saved state spreads on top.
      const legacyDefaults = emptyRitualBannerState();
      this.snapshot.ritualState = {
        standard: { ...legacyDefaults, ...save.ritualState.standard },
        featured: { ...legacyDefaults, ...save.ritualState.featured },
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
            pityLegendary: !!e.flags.pityLegendary,
            bundleGuarantee: !!e.flags.bundleGuarantee,
            antiStreak: !!e.flags.antiStreak,
            duplicateProtection: !!e.flags.duplicateProtection,
            featuredRateUp: !!e.flags.featuredRateUp,
            welcomeTribute: !!e.flags.welcomeTribute,
          },
        })),
      };
    } else {
      this.snapshot.ritualState = emptyRitualState();
    }
    // V1.2-EXT — pre-Legendary saves lack `legendary` essence. Merge
    // over the empty defaults so the field always exists post-load.
    this.snapshot.essences = save.essences
      ? { ...emptyEssences(), ...save.essences }
      : emptyEssences();
    // L12 — rewarded-ad rite state. Optional on pre-L12 saves.
    this.snapshot.pendingFrissonBuff = save.pendingFrissonBuff ?? false;
    this.snapshot.lastFrissonPrestige = save.lastFrissonPrestige ?? -1;
    this.snapshot.dailyIchorAds = save.dailyIchorAds
      ? { ...save.dailyIchorAds }
      : { date: '', count: 0 };
    // L13 — age gate + spending dashboard. Optional on pre-L13
    // saves: returning players get the gate prompt next launch.
    this.snapshot.ageConfirmation = save.ageConfirmation ?? 'unconfirmed';
    this.snapshot.dailySpendCapEur = save.dailySpendCapEur ?? null;
    this.snapshot.spendingLog = Array.isArray(save.spendingLog)
      ? save.spendingLog.map((e) => ({ ...e }))
      : [];
    // L_QUESTS — daily quest state. Absent on pre-L_QUESTS saves: a
    // fresh empty quest state is rotated on first access. Backfill
    // for unclaimed achievements: every already-unlocked achievement
    // with an ichorReward queues itself in the claim pool so legacy
    // players get the rewards they were silently denied. The CLAIM
    // ALL flow flushes them in one batched modal — no chore feel.
    if (save.questState) {
      this.snapshot.questState = {
        date: save.questState.date,
        activeId: save.questState.activeId,
        progress: save.questState.progress,
        claimed: save.questState.claimed,
        metrics: {
          ...emptyQuestMetrics(),
          ...save.questState.metrics,
        },
      };
    } else {
      this.snapshot.questState = emptyQuestState();
    }
    // L10/L11 — IAP state. Optional on pre-L10 saves.
    this.snapshot.packsFirstTimeBought = new Set(
      Array.isArray(save.packsFirstTimeBought) ? save.packsFirstTimeBought : [],
    );
    this.snapshot.welcomePackFirstRareAt =
      save.welcomePackFirstRareAt ?? null;
    // L15 — User settings. The save layer has carried these from
    // v1, but the snapshot didn't mirror them until L15. Merge over
    // the empty defaults so missing keys (older saves) fall back.
    if (save.settings) {
      this.snapshot.settings = {
        soundEnabled: save.settings.soundEnabled ?? false,
        hapticsEnabled: save.settings.hapticsEnabled ?? true,
        lang: save.settings.lang ?? this.snapshot.settings.lang,
        notifEnabled: save.settings.notifEnabled ?? false,
        autoAscend:
          (save.settings as { autoAscend?: boolean }).autoAscend ?? false,
      };
    }
    if (Array.isArray(save.unclaimedAchievements)) {
      this.snapshot.unclaimedAchievements = new Set(save.unclaimedAchievements);
    } else {
      // Backfill — first launch post-patch. Re-queue every existing
      // unlocked achievement that carries an ichorReward.
      const queue = new Set<string>();
      for (const id of this.snapshot.unlockedAchievements) {
        const def = ACHIEVEMENTS_BY_ID[id];
        if (def && def.ichorReward > 0) queue.add(id);
      }
      this.snapshot.unclaimedAchievements = queue;
    }
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
    // V1.3 — Soulreave state. All five fields optional on pre-V1.3
    // saves (the migration backfills them, but the post-migration
    // shape may still pass through `applySave` from a runtime that
    // serialised pre-bump). lifetimeDread defaults to current dread
    // as a lower-bound (the migration does this; we re-apply here
    // defensively for the in-memory path).
    this.snapshot.soulShards = save.soulShards ?? 0;
    this.snapshot.lifetimeDread = save.lifetimeDread ?? this.snapshot.dread;
    this.snapshot.metaTree = { ...(save.metaTree ?? {}) };
    this.snapshot.totalSoulreaves = save.totalSoulreaves ?? 0;
    this.snapshot.welcomeTributeArmed = save.welcomeTributeArmed ?? false;
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
