// Save serialization, migration, and validation.
// Versioned so format changes are non-destructive — any change bumps
// SAVE_VERSION and adds a migrateV{N-1}toV{N} function.

import { FORMS_BY_ID, type VampireForm } from './config/forms';
import { SERVANTS, type ServantId } from './config/servants';
import { kvGet, kvRemove, kvSet } from '../platform/storage';

export const SAVE_VERSION = 4 as const;

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

/** Current save shape (v4). Structurally identical to v3 — the
 * migration's only job is to drop the 4 deprecated upgrade keys from
 * `upgrades` and reclaim their spent Dread as rank (M1 refactor,
 * 2026-04-24). Dread is now a pure monotonically-increasing rank. */
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
}

export type AnySave = Partial<SaveV4> &
  Partial<Pick<SaveV2, 'thralls'>> & { v?: number };

/** Escape hatch for corrupted saves: returns null and the caller starts fresh. */
export function parseSave(raw: string): SaveV4 | null {
  try {
    const data = JSON.parse(raw) as AnySave;
    const migrated = migrate(data);
    if (!validate(migrated)) return null;
    return migrated;
  } catch {
    return null;
  }
}

export function serializeSave(save: SaveV4): string {
  return JSON.stringify(save);
}

export async function loadSave(): Promise<SaveV4 | null> {
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

export async function writeSave(save: SaveV4): Promise<void> {
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

function migrate(data: AnySave): SaveV4 {
  const v = data.v ?? 0;
  let migrated: AnySave = data;

  // v0 → v1: wrap an unversioned save into the v1 shape, filling defaults
  // for missing fields and deep-merging nested objects.
  if (v < 1) {
    const base = defaultV4();
    const d = data as Partial<SaveV4> & Partial<Pick<SaveV2, 'thralls'>>;
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

  if (migrated.v === 4) return migrated as SaveV4;
  throw new Error(`Unknown save version: ${migrated.v}`);
}

/** Back-compat alias — old callers still use defaultV1(), which now
 * returns the current default shape. */
export function defaultV1(): SaveV4 {
  return defaultV4();
}

/** @deprecated Returns a v4 save under this legacy name. */
export function defaultV2(): SaveV4 {
  return defaultV4();
}

/** @deprecated Returns a v4 save under this legacy name. */
export function defaultV3(): SaveV4 {
  return defaultV4();
}

export function defaultV4(): SaveV4 {
  const servants = {} as Record<ServantId, { owned: number; totalPurchased: number }>;
  for (const t of SERVANTS) {
    servants[t.id] = { owned: 0, totalPurchased: 0 };
  }
  return {
    v: 4,
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
  };
}

// ─────────── Validation ───────────

function validate(save: SaveV4): boolean {
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
