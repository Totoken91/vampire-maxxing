// Save serialization, migration, and validation.
// Versioned so format changes are non-destructive — any change bumps
// SAVE_VERSION and adds a migrateV{N-1}toV{N} function.

import { FORMS_BY_ID, type VampireForm } from './config/forms';
import { SERVANTS, type ServantId } from './config/servants';
import { kvGet, kvRemove, kvSet } from '../platform/storage';

export const SAVE_VERSION = 3 as const;

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

/** Current save shape (v3). Renames v2's `thralls` field to `servants` to
 * make room for the new collectible Thrall roster (Phase L). String IDs
 * of the 8 generators are SAVE-STABLE and unchanged. */
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

export type AnySave = Partial<SaveV3> &
  Partial<Pick<SaveV2, 'thralls'>> & { v?: number };

/** Escape hatch for corrupted saves: returns null and the caller starts fresh. */
export function parseSave(raw: string): SaveV3 | null {
  try {
    const data = JSON.parse(raw) as AnySave;
    const migrated = migrate(data);
    if (!validate(migrated)) return null;
    return migrated;
  } catch {
    return null;
  }
}

export function serializeSave(save: SaveV3): string {
  return JSON.stringify(save);
}

export async function loadSave(): Promise<SaveV3 | null> {
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

export async function writeSave(save: SaveV3): Promise<void> {
  const existing = await kvGet(SAVE_KEY);
  if (existing) await kvSet(SAVE_KEY_BACKUP, existing);
  await kvSet(SAVE_KEY, serializeSave(save));
}

export async function wipeSave(): Promise<void> {
  await kvRemove(SAVE_KEY);
  await kvRemove(SAVE_KEY_BACKUP);
}

// ─────────── Migration ───────────

function migrate(data: AnySave): SaveV3 {
  const v = data.v ?? 0;
  let migrated: AnySave = data;

  // v0 → v1: wrap an unversioned save into the v1 shape, filling defaults
  // for missing fields and deep-merging nested objects.
  if (v < 1) {
    const base = defaultV3();
    const d = data as Partial<SaveV3> & Partial<Pick<SaveV2, 'thralls'>>;
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

  if (migrated.v === 3) return migrated as SaveV3;
  throw new Error(`Unknown save version: ${migrated.v}`);
}

/** Back-compat alias — old callers still use defaultV1(), which now
 * returns the current default shape. */
export function defaultV1(): SaveV3 {
  return defaultV3();
}

/** @deprecated Returns a v3 save under this legacy name. */
export function defaultV2(): SaveV3 {
  return defaultV3();
}

export function defaultV3(): SaveV3 {
  const servants = {} as Record<ServantId, { owned: number; totalPurchased: number }>;
  for (const t of SERVANTS) {
    servants[t.id] = { owned: 0, totalPurchased: 0 };
  }
  return {
    v: 3,
    ts: Date.now(),
    blood: 0,
    totalRunBlood: 0,
    totalLifetimeBlood: 0,
    dread: 0,
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

function validate(save: SaveV3): boolean {
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
