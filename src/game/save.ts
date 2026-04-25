// Save serialization, migration, and validation.
// Versioned so format changes are non-destructive — any change bumps
// SAVE_VERSION and adds a migrateV{N-1}toV{N} function.

import { FORMS_BY_ID, type VampireForm } from './config/forms';
import { SERVANTS, type ServantId } from './config/servants';
import { kvGet, kvRemove, kvSet } from '../platform/storage';

export const SAVE_VERSION = 5 as const;

export const SAVE_KEY = 'vampire_maxxing_save';
export const SAVE_KEY_BACKUP = 'vampire_maxxing_save_bak';

/** v1 save. Kept around for migration reference only. */
export interface SaveV1 {
  v: 1;
  ts: number;
  blood: number;
  totalRunBlood: number;
  totalLifetimeBlood: number;
  dread: number;
  /** The 8 generators. Renamed "servants" in v3. */
  thralls: Record<ServantId, { owned: number; totalPurchased: number }>;
  baseClickPower: number;
  boost: {
    active: boolean;
    endTime: number;
    cooldownEnd: number;
    isRewarded: boolean;
  };
  stats: {
    totalTaps: number;
    totalCrits: number;
    totalAscends: number;
    firstLaunch: number;
    totalPlayTime: number;
    highestFormReached: VampireForm;
  };
  unlockedAchievements: string[];
  skin: string;
  ownedSkins: string[];
  isFounder: boolean;
  pendingCurseMult: number;
  ritesLastUsed: Record<string, number>;
  unseenAchievements: string[];
  settings: {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    lang: string;
    notifEnabled: boolean;
  };
}

/** v2 save. Kept around for migration reference only. */
export interface SaveV2 extends Omit<SaveV1, 'v'> {
  v: 2;
  upgrades: Record<string, number>;
  unlockedServantLore?: string[];
  unlockedFormLore?: string[];
  runHistory?: Array<{
    ts: number;
    maxBlood: number;
    dreadGained: number;
    form: string;
    formChanged: boolean;
  }>;
  daily?: {
    streakDay: number;
    lastClaimedDate: string;
  };
}

/** v3 save. Kept around for migration reference only. */
export interface SaveV3 extends Omit<SaveV2, 'v' | 'thralls'> {
  v: 3;
  /** The 8 generators (formerly "thralls"). Keyed by ServantId. */
  servants: Record<ServantId, { owned: number; totalPurchased: number }>;
  /** L2 — per-thrall roster state. Absent on pre-L2 saves means
   * "everybody locked"; state.ts rebuilds the full map from defaults
   * then overlays saved entries. Optional for back-compat; no version
   * bump. */
  playerThralls?: Record<
    string,
    {
      owned: boolean;
      level: number;
      xp: number;
      stars: number;
      firstObtainedAt: number;
      isNew: boolean;
    }
  >;
}

/** v4 save. Kept around for migration reference only. Structurally
 * identical to v3 — the migration's only job is to drop the 4
 * deprecated upgrade keys from `upgrades` and reclaim their spent
 * Dread as rank (M1 refactor, 2026-04-24). Dread is now a pure
 * monotonically-increasing rank. */
export interface SaveV4 extends Omit<SaveV3, 'v'> {
  v: 4;
  /**
   * M3 — Blood earned online during the current run (tap + tick only,
   * no offline). Drives `dreadGain()` so offline progress can't
   * snowball prestige. Optional for back-compat with pre-M3 saves
   * which are grandfathered at load: online := totalRunBlood.
   */
  totalRunBloodOnline?: number;
  /**
   * Phase L3 — Ichor pull currency. Optional for back-compat with
   * pre-L3 saves; the state layer defaults to 0 when absent.
   */
  ichor?: number;
  /** L3 — rolling ledger of Ichor earn/spend transactions. Optional;
   * empty array on pre-L3 saves. Window capped at 100 by grantIchor. */
  ichorLedger?: Array<{
    amount: number;
    source: string;
    earnedNotPaid: boolean;
    ts: number;
  }>;
  /** L3 — one-shot reward flags (prestige milestones, first Rare,
   * collection complete) to prevent re-granting the same Ichor drop. */
  ichorFlags?: Record<string, boolean>;
  /**
   * Phase L5 — ritual / pull state. Per-banner pity counters, the
   * lifetime First-Rare-Guarantee flag, and a rolling history. Optional
   * for back-compat with pre-L5 saves which the state layer rebuilds
   * to defaults (no FRG used yet) when absent.
   */
  ritualState?: {
    standard: {
      pityCounterRare: number;
      pityCounterEpic: number;
      commonStreak: number;
      totalPulls: number;
    };
    featured: {
      pityCounterRare: number;
      pityCounterEpic: number;
      commonStreak: number;
      totalPulls: number;
    };
    firstRareGuaranteeUsed: boolean;
    history: Array<{
      ts: number;
      banner: string;
      /** null on Cinder Ceremony entries (saturation outcome). */
      thrallId: string | null;
      rarity: string;
      wasDupe: boolean;
      essenceGained: number;
      flags: Record<string, boolean>;
    }>;
  };
  /** L5 — essence counts per rarity (dupe conversion). Spent in L6
   * by the awakening screen. Optional; defaults to all-zero. */
  essences?: { common: number; rare: number; epic: number; legendary: number };
  /** L6 — equipped slot ids. Length must match the runtime
   * EQUIP_SLOT_COUNT (3 in v1.0). Optional on pre-L6 saves. Stored
   * as loose strings; the state layer validates each id against the
   * current roster + ownership before applying. */
  equippedSlots?: (string | null)[];
  /** L12 — Frisson du Destin pending pity bump (set by the rite,
   *  consumed by the next Common pull). Optional; defaults false. */
  pendingFrissonBuff?: boolean;
  /** L12 — last `stats.totalAscends` value at which the Frisson
   *  rite fired. Used for the 1×/prestige cap. Defaults -1. */
  lastFrissonPrestige?: number;
  /** L12 — Offrande du Soir daily cap state. Resets on date
   *  change. Optional; defaults to fresh empty. */
  dailyIchorAds?: { date: string; count: number };
  /** L13 — RGPD/KR-2024 compliance. Age gate confirmation state +
   *  optional spending cap + purchase ledger. Optional on pre-L13
   *  saves: defaults to 'unconfirmed' (player will be asked on
   *  next launch), no cap, empty ledger. */
  ageConfirmation?: 'unconfirmed' | 'over13' | 'under13';
  dailySpendCapEur?: number | null;
  spendingLog?: Array<{ ts: number; amountEur: number; productId: string }>;
  /** L_QUESTS — daily quest state. Optional on pre-L_QUESTS saves;
   *  the state layer rotates a fresh quest on first access. The
   *  metrics record uses loose string keys at the save boundary so
   *  adding a new QuestMetric in a later patch doesn't crash old
   *  saves (state.ts re-merges against emptyMetrics()). */
  questState?: {
    date: string;
    activeId: string;
    progress: number;
    claimed: boolean;
    metrics: Record<string, number>;
  };
  /** L_QUESTS — achievement ids whose Ichor reward has been earned
   *  but not yet claimed by the player. Absent on pre-L_QUESTS saves
   *  triggers a backfill (every already-unlocked achievement with an
   *  ichorReward queues itself in the claim pool). */
  unclaimedAchievements?: string[];
  /** L10 — IAP pack SKUs whose First-Time Double bonus has been
   *  consumed. Absent on pre-L10 saves means "no pack ever bought" (no
   *  FT consumed for any sku, all packs still show the ×2 ribbon). */
  packsFirstTimeBought?: string[];
  /** L11 — Welcome / Pacte Fondateur trigger timestamp (Unix ms). null
   *  = player hasn't earned a first Rare yet. Absent on pre-L11 saves
   *  → null. The trigger is one-shot: once stamped, never resets. */
  welcomePackFirstRareAt?: number | null;
}

/** Current save shape (v5). V1.3 SOULREAVE — adds the second-layer
 * prestige currency + meta-tree state. All five new fields are
 * optional so a v4 save migrates by default-fill (no destructive
 * changes). The migration is pure: existing run state is preserved
 * untouched; the new fields just appear with 0 / empty defaults. */
export interface SaveV5 extends Omit<SaveV4, 'v'> {
  v: 5;
  /** V1.3 — meta-currency earned by Soulreaving. Persists across
   *  Soulreaves (only spending in the meta-tree depletes it). */
  soulShards?: number;
  /** V1.3 — cumulative Dread earned across the player's lifetime.
   *  Only ever grows; never decreased on ascend or Soulreave. Drives
   *  `projectedSoulShards()` (formula: floor(2 * sqrt(lifetimeDread /
   *  1000))). Backfilled on v4→v5 migration to current Dread (the
   *  best lower-bound we can derive — anyone who already prestiged
   *  contributed at least their current Dread to lifetime). */
  lifetimeDread?: number;
  /** V1.3 — owned meta-tree node ids. Keys are MetaNodeId strings;
   *  presence + true = node purchased. Linear-unlock order is
   *  enforced at purchase time, not at save load. */
  metaTree?: Record<string, boolean>;
  /** V1.3 — total Soulreaves performed (counts the cinematic, not
   *  intermediate ascends). Used by the Tome stats screen + the
   *  reveal copy ("Soulreave I", "Soulreave II"...). */
  totalSoulreaves?: number;
  /** V1.3 — set true on Soulreave when WELCOME_TRIBUTE is owned, so
   *  the next Standard pull after the cinematic guarantees a Rare+.
   *  One-shot: cleared the moment the buff fires. Lives in save (not
   *  ephemeral) so it survives an immediate close-relaunch. */
  welcomeTributeArmed?: boolean;
}

export type AnySave = Partial<SaveV5> &
  Partial<Pick<SaveV2, 'thralls'>> & { v?: number };

/** Escape hatch for corrupted saves: returns null and the caller starts fresh. */
export function parseSave(raw: string): SaveV5 | null {
  try {
    const data = JSON.parse(raw) as AnySave;
    const migrated = migrate(data);
    if (!validate(migrated)) return null;
    return migrated;
  } catch {
    return null;
  }
}

export function serializeSave(save: SaveV5): string {
  return JSON.stringify(save);
}

export async function loadSave(): Promise<SaveV5 | null> {
  const raw = await kvGet(SAVE_KEY);
  if (raw) {
    const parsed = parseSave(raw);
    if (parsed) return parsed;
  }
  // Fall back to the backup slot if the primary is corrupt.
  const bak = await kvGet(SAVE_KEY_BACKUP);
  if (bak) {
    const parsed = parseSave(bak);
    if (parsed) return parsed;
  }
  return null;
}

export async function writeSave(save: SaveV5): Promise<void> {
  const existing = await kvGet(SAVE_KEY);
  if (existing) await kvSet(SAVE_KEY_BACKUP, existing);
  await kvSet(SAVE_KEY, serializeSave(save));
}

export async function wipeSave(): Promise<void> {
  await kvRemove(SAVE_KEY);
  await kvRemove(SAVE_KEY_BACKUP);
}

// ─────────── Migration ───────────

/**
 * Cumulative cost lookup for the 5 meta-upgrades that lived in v1.0.0
 * to v1.0.x and were removed in M1 (v4). Used to reclaim spent Dread
 * as rank during migration, grandfathering existing players.
 * Source of truth: archived config/upgrades.ts before removal.
 */
const DEPRECATED_UPGRADE_COSTS: Readonly<Record<string, readonly number[]>> = {
  blood_altar: [10, 25, 60, 150, 400],
  servant_loyalty: [5, 10, 20, 40, 80, 160, 320, 640, 1280, 2500],
  bloodline_scholar: [15, 40, 100, 250, 600],
  dread_amplifier: [25, 80, 250],
  offline_keeper: [20, 60, 200],
};

function reclaimedDreadFromUpgrades(upgrades: Record<string, number> | undefined): number {
  if (!upgrades) return 0;
  let reclaimed = 0;
  for (const [id, level] of Object.entries(upgrades)) {
    const costs = DEPRECATED_UPGRADE_COSTS[id];
    if (!costs) continue;
    const capped = Math.min(Math.max(0, level), costs.length);
    for (let i = 0; i < capped; i += 1) {
      reclaimed += costs[i];
    }
  }
  return reclaimed;
}

function migrate(data: AnySave): SaveV5 {
  const v = data.v ?? 0;
  let migrated: AnySave = data;

  // v0 → v1: wrap an unversioned save into the v1 shape, filling defaults
  // for missing fields and deep-merging nested objects.
  if (v < 1) {
    const base = defaultV5();
    const d = data as unknown as Partial<SaveV4> &
      Partial<Pick<SaveV2, 'thralls'>>;
    migrated = {
      ...base,
      ...d,
      v: 1,
      // At v<1 the legacy field name was `thralls` — deep-merge under that
      // name; v2→v3 below will rename it.
      thralls: { ...base.servants, ...(d.thralls ?? d.servants ?? {}) },
      stats: { ...base.stats, ...(d.stats ?? {}) },
      boost: { ...base.boost, ...(d.boost ?? {}) },
      settings: { ...base.settings, ...(d.settings ?? {}) },
    } as unknown as AnySave;
  }

  // v1 → v2: add `upgrades: {}` (all levels start at 0). No other changes.
  if ((migrated.v ?? 0) <= 1) {
    migrated = {
      ...migrated,
      v: 2,
      upgrades: (migrated as unknown as Partial<SaveV2>).upgrades ?? {},
    } as unknown as AnySave;
  }

  // v2 → v3: rename `thralls` → `servants`. Field content is identical —
  // same Record<ServantId, ...> shape, only the key changed. Cast
  // through unknown because TS's narrow migration types disagree on the
  // `v` literal, but structurally the data is sound.
  if ((migrated.v ?? 0) <= 2) {
    const legacy = (migrated as unknown as SaveV2).thralls;
    const next = { ...migrated, v: 3 } as AnySave;
    if (legacy) next.servants = legacy;
    delete (next as unknown as { thralls?: unknown }).thralls;
    migrated = next;
  }

  // v3 → v4 (M1): Dread becomes a pure rank. Reclaim every Dread that
  // was spent on the 5 deprecated meta-upgrades and add it back to
  // `dread`. Then clear the upgrades map — the 5 effects either (a)
  // got absorbed by Phase L thralls (Velmor=auto-collect, Nox/Mirella=
  // blood gen, Lilith/Crypt Warden=offline cap) or (b) were removed
  // outright (dread_amplifier conflicted with M2 form-gated cap).
  // Bloodline Scholar's effect is re-granted automatically via the
  // new milestone system (see src/game/milestones.ts).
  if ((migrated.v ?? 0) <= 3) {
    const legacyUpgrades =
      (migrated as unknown as Partial<SaveV3>).upgrades ?? {};
    const reclaimed = reclaimedDreadFromUpgrades(legacyUpgrades);
    migrated = {
      ...migrated,
      v: 4,
      dread: (migrated.dread ?? 0) + reclaimed,
      upgrades: {},
    } as unknown as AnySave;
  }

  // v4 → v5 (V1.3 SOULREAVE): pure additive migration. The five new
  // fields all default to "first-time Soulreave-ready" state. We
  // backfill `lifetimeDread` to the current `dread` value as a
  // lower-bound — pre-V1.3 we never tracked the cumulative, but a
  // player's current Dread rank IS the lifetime Dread for them
  // (Dread never resets pre-V1.3). After the upgrade, `lifetimeDread`
  // continues to grow with every dreadGain credit.
  if ((migrated.v ?? 0) <= 4) {
    migrated = {
      ...migrated,
      v: 5,
      soulShards: (migrated as Partial<SaveV5>).soulShards ?? 0,
      lifetimeDread:
        (migrated as Partial<SaveV5>).lifetimeDread ?? (migrated.dread ?? 0),
      metaTree: (migrated as Partial<SaveV5>).metaTree ?? {},
      totalSoulreaves: (migrated as Partial<SaveV5>).totalSoulreaves ?? 0,
      welcomeTributeArmed:
        (migrated as Partial<SaveV5>).welcomeTributeArmed ?? false,
    } as unknown as AnySave;
  }

  if (migrated.v === 5) return migrated as SaveV5;
  throw new Error(`Unknown save version: ${migrated.v}`);
}

/** Back-compat alias — old callers still use defaultV1(), which now
 * returns the current default shape. */
export function defaultV1(): SaveV5 {
  return defaultV5();
}

/** @deprecated Returns a v5 save under this legacy name. */
export function defaultV2(): SaveV5 {
  return defaultV5();
}

/** @deprecated Returns a v5 save under this legacy name. */
export function defaultV3(): SaveV5 {
  return defaultV5();
}

/** @deprecated Returns a v5 save under this legacy name. */
export function defaultV4(): SaveV5 {
  return defaultV5();
}

export function defaultV5(): SaveV5 {
  const servants = {} as Record<ServantId, { owned: number; totalPurchased: number }>;
  for (const t of SERVANTS) {
    servants[t.id] = { owned: 0, totalPurchased: 0 };
  }
  return {
    v: 5,
    ts: Date.now(),
    blood: 0,
    totalRunBlood: 0,
    totalRunBloodOnline: 0,
    totalLifetimeBlood: 0,
    dread: 0,
    ichor: 0,
    ichorLedger: [],
    ichorFlags: {},
    servants,
    baseClickPower: 1,
    boost: { active: false, endTime: 0, cooldownEnd: 0, isRewarded: false },
    stats: {
      totalTaps: 0,
      totalCrits: 0,
      totalAscends: 0,
      firstLaunch: Date.now(),
      totalPlayTime: 0,
      highestFormReached: 'NEWBORN',
    },
    unlockedAchievements: [],
    skin: 'default',
    ownedSkins: ['default'],
    isFounder: false,
    pendingCurseMult: 1,
    ritesLastUsed: {},
    unseenAchievements: [],
    upgrades: {},
    settings: {
      soundEnabled: false,
      hapticsEnabled: true,
      lang: navigator.language.startsWith('fr') ? 'fr' : 'en',
      notifEnabled: false,
    },
    soulShards: 0,
    lifetimeDread: 0,
    metaTree: {},
    totalSoulreaves: 0,
    welcomeTributeArmed: false,
  };
}

// ─────────── Validation ───────────

function validate(save: SaveV5): boolean {
  if (save.v !== SAVE_VERSION) return false;
  if (!Number.isFinite(save.blood) || save.blood < 0) return false;
  if (!Number.isFinite(save.dread) || save.dread < 0) return false;
  if (!Number.isFinite(save.stats.totalAscends) || save.stats.totalAscends < 0) {
    return false;
  }
  if (!(save.stats.highestFormReached in FORMS_BY_ID)) return false;
  if (!save.servants) return false;
  for (const t of SERVANTS) {
    const row = save.servants[t.id];
    if (!row || row.owned < 0 || row.totalPurchased < 0) return false;
  }
  const allowedSkins = new Set(['default', 'nosferatu', 'crimson', 'void']);
  for (const skin of save.ownedSkins) {
    if (!allowedSkins.has(skin)) return false;
  }
  if (!allowedSkins.has(save.skin)) return false;
  return true;
}
