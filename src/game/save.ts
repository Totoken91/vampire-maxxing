// Save serialization, migration, and validation.
// Versioned so format changes are non-destructive — any change bumps
// SAVE_VERSION and adds a migrateV{N-1}toV{N} function.

import { FORMS_BY_ID, type VampireForm } from './config/forms';
import { THRALLS, type ThrallId } from './config/thralls';
import { kvGet, kvRemove, kvSet } from '../platform/storage';

export const SAVE_VERSION = 1 as const;

export const SAVE_KEY = 'vampire_maxxing_save';
export const SAVE_KEY_BACKUP = 'vampire_maxxing_save_bak';

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

export type AnySave = Partial<SaveV1> & { v?: number };

/** Escape hatch for corrupted saves: returns null and the caller starts fresh. */
export function parseSave(raw: string): SaveV1 | null {
  try {
    const data = JSON.parse(raw) as AnySave;
    const migrated = migrate(data);
    if (!validate(migrated)) return null;
    return migrated;
  } catch {
    return null;
  }
}

export function serializeSave(save: SaveV1): string {
  return JSON.stringify(save);
}

export async function loadSave(): Promise<SaveV1 | null> {
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

export async function writeSave(save: SaveV1): Promise<void> {
  const existing = await kvGet(SAVE_KEY);
  if (existing) await kvSet(SAVE_KEY_BACKUP, existing);
  await kvSet(SAVE_KEY, serializeSave(save));
}

export async function wipeSave(): Promise<void> {
  await kvRemove(SAVE_KEY);
  await kvRemove(SAVE_KEY_BACKUP);
}

// ─────────── Migration ───────────

function migrate(data: AnySave): SaveV1 {
  const v = data.v ?? 0;
  // v0 → v1: wrap an unversioned save into the v1 shape, filling defaults
  // for missing fields and deep-merging nested objects.
  if (v < 1) {
    const base = defaultV1();
    const d = data as Partial<SaveV1>;
    return {
      ...base,
      ...d,
      v: 1,
      thralls: { ...base.thralls, ...(d.thralls ?? {}) },
      stats: { ...base.stats, ...(d.stats ?? {}) },
      boost: { ...base.boost, ...(d.boost ?? {}) },
      settings: { ...base.settings, ...(d.settings ?? {}) },
    };
  }
  if (v === 1) return data as SaveV1;
  throw new Error(`Unknown save version: ${v}`);
}

export function defaultV1(): SaveV1 {
  const thralls = {} as Record<ThrallId, { owned: number; totalPurchased: number }>;
  for (const t of THRALLS) {
    thralls[t.id] = { owned: 0, totalPurchased: 0 };
  }
  return {
    v: 1,
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
    settings: {
      soundEnabled: false,
      hapticsEnabled: true,
      lang: navigator.language.startsWith('fr') ? 'fr' : 'en',
      notifEnabled: false,
    },
  };
}

// ─────────── Validation ───────────

function validate(save: SaveV1): boolean {
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
