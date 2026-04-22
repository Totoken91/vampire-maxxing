// Save serialization, migration, and validation.
// Versioned so format changes are non-destructive — any change bumps
// SAVE_VERSION and adds a migrateV{N-1}toV{N} function.

import { FORMS_BY_ID, type VampireForm } from './config/forms';
import { THRALLS, type ThrallId } from './config/thralls';
import { kvGet, kvRemove, kvSet } from '../platform/storage';

export const SAVE_VERSION = 2 as const;

export const SAVE_KEY = 'vampire_maxxing_save';
export const SAVE_KEY_BACKUP = 'vampire_maxxing_save_bak';

/** Kept around for migration reference — v1 saves in the wild are upgraded
 * in-place to v2 at load time via the migrate() function. */
export interface SaveV1 {
  v: 1;
  ts: number;
  blood: number;
  totalRunBlood: number;
  totalLifetimeBlood: number;
  dread: number;
  thralls: Record<ThrallId, { owned: number; totalPurchased: number }>;
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

/** Current save shape. Extends the v1 fields with permanent upgrade levels
 * plus optional lore + run history added incrementally. The newer fields
 * are optional so saves written before they existed still load cleanly —
 * state.applySave() falls back to empty collections. */
export interface SaveV2 extends Omit<SaveV1, 'v'> {
  v: 2;
  /** Level per UpgradeId; missing keys default to 0. */
  upgrades: Record<string, number>;
  /** Thrall ids whose Bestiary lore has been revealed. */
  unlockedThrallLore?: string[];
  /** Form ids whose Histories lore has been revealed. */
  unlockedFormLore?: string[];
  /** Last 10 runs (newest first). */
  runHistory?: Array<{
    ts: number;
    maxBlood: number;
    dreadGained: number;
    form: string;
    formChanged: boolean;
  }>;
}

export type AnySave = Partial<SaveV2> & { v?: number };

/** Escape hatch for corrupted saves: returns null and the caller starts fresh. */
export function parseSave(raw: string): SaveV2 | null {
  try {
    const data = JSON.parse(raw) as AnySave;
    const migrated = migrate(data);
    if (!validate(migrated)) return null;
    return migrated;
  } catch {
    return null;
  }
}

export function serializeSave(save: SaveV2): string {
  return JSON.stringify(save);
}

export async function loadSave(): Promise<SaveV2 | null> {
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

export async function writeSave(save: SaveV2): Promise<void> {
  const existing = await kvGet(SAVE_KEY);
  if (existing) await kvSet(SAVE_KEY_BACKUP, existing);
  await kvSet(SAVE_KEY, serializeSave(save));
}

export async function wipeSave(): Promise<void> {
  await kvRemove(SAVE_KEY);
  await kvRemove(SAVE_KEY_BACKUP);
}

// ─────────── Migration ───────────

function migrate(data: AnySave): SaveV2 {
  const v = data.v ?? 0;
  let migrated: AnySave = data;

  // v0 → v1: wrap an unversioned save into the v1 shape, filling defaults
  // for missing fields and deep-merging nested objects. We skip straight to
  // v2 defaults (v1 and v2 share everything except the new `upgrades` key)
  // so the subsequent v1 → v2 step is effectively a no-op for this path.
  if (v < 1) {
    const base = defaultV2();
    const d = data as Partial<SaveV2>;
    migrated = {
      ...base,
      ...d,
      v: 1,
      thralls: { ...base.thralls, ...(d.thralls ?? {}) },
      stats: { ...base.stats, ...(d.stats ?? {}) },
      boost: { ...base.boost, ...(d.boost ?? {}) },
      settings: { ...base.settings, ...(d.settings ?? {}) },
    } as unknown as AnySave;
  }

  // v1 → v2: add `upgrades: {}` (all levels start at 0). No other changes.
  if ((migrated.v ?? 0) <= 1) {
    migrated = {
      ...defaultV2(),
      ...migrated,
      v: 2,
      upgrades: {},
    } as unknown as AnySave;
  }

  if (migrated.v === 2) return migrated as SaveV2;
  throw new Error(`Unknown save version: ${migrated.v}`);
}

/** Back-compat alias — old callers still use defaultV1(), which now
 * returns the current (v2) default shape. */
export function defaultV1(): SaveV2 {
  return defaultV2();
}

export function defaultV2(): SaveV2 {
  const thralls = {} as Record<ThrallId, { owned: number; totalPurchased: number }>;
  for (const t of THRALLS) {
    thralls[t.id] = { owned: 0, totalPurchased: 0 };
  }
  return {
    v: 2,
    ts: Date.now(),
    blood: 0,
    totalRunBlood: 0,
    totalLifetimeBlood: 0,
    dread: 0,
    thralls,
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

function validate(save: SaveV2): boolean {
  if (save.v !== SAVE_VERSION) return false;
  if (!Number.isFinite(save.blood) || save.blood < 0) return false;
  if (!Number.isFinite(save.dread) || save.dread < 0) return false;
  if (!Number.isFinite(save.stats.totalAscends) || save.stats.totalAscends < 0) {
    return false;
  }
  if (!(save.stats.highestFormReached in FORMS_BY_ID)) return false;
  if (!save.thralls) return false;
  for (const t of THRALLS) {
    const row = save.thralls[t.id];
    if (!row || row.owned < 0 || row.totalPurchased < 0) return false;
  }
  const allowedSkins = new Set(['default', 'nosferatu', 'crimson', 'void']);
  for (const skin of save.ownedSkins) {
    if (!allowedSkins.has(skin)) return false;
  }
  if (!allowedSkins.has(save.skin)) return false;
  return true;
}
