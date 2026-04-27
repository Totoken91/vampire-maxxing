// Server-side mirror of src/game/config/packs.ts. Keep in sync.
//
// Drift policy: when the client packs catalog changes (new SKU, price
// edit, FT bonus tweak), copy the new values here AND bump the version
// comment. The edge function is the AUTHORITATIVE source on grant —
// the client's packs.ts only drives display + first-time-bonus visual
// hints.
//
// Roster version: V1.2 — 2026-04-25 (7 packs).

export type PackTier = 'bronze' | 'silver' | 'gold';

export type PackBonus =
  | { kind: 'none' }
  | { kind: 'guaranteed_thrall'; thrallId: string }
  | { kind: 'guaranteed_rare' };

export interface PackDef {
  sku: string;
  priceEur: number;
  baseIchor: number;
  firstTimeBonusIchor: number;
  bonus: PackBonus;
  tier: PackTier;
}

export const PACKS: readonly PackDef[] = [
  {
    sku: 'vm_ichor_modest',
    priceEur: 0.99,
    baseIchor: 15,
    firstTimeBonusIchor: 15,
    bonus: { kind: 'none' },
    tier: 'bronze',
  },
  {
    sku: 'vm_founder_pact',
    priceEur: 2.99,
    baseIchor: 50,
    firstTimeBonusIchor: 50,
    bonus: { kind: 'guaranteed_thrall', thrallId: 'nox-the-hunger' },
    tier: 'silver',
  },
  {
    sku: 'vm_ichor_substantial',
    priceEur: 4.99,
    baseIchor: 100,
    firstTimeBonusIchor: 100,
    bonus: { kind: 'none' },
    tier: 'bronze',
  },
  {
    sku: 'vm_starter_coven',
    priceEur: 9.99,
    baseIchor: 200,
    firstTimeBonusIchor: 200,
    bonus: { kind: 'guaranteed_rare' },
    tier: 'silver',
  },
  {
    sku: 'vm_ichor_major',
    priceEur: 9.99,
    baseIchor: 250,
    firstTimeBonusIchor: 250,
    bonus: { kind: 'none' },
    tier: 'silver',
  },
  {
    sku: 'vm_ichor_royal',
    priceEur: 19.99,
    baseIchor: 600,
    firstTimeBonusIchor: 600,
    bonus: { kind: 'none' },
    tier: 'gold',
  },
  {
    sku: 'vm_ichor_cataclysm',
    priceEur: 49.99,
    baseIchor: 1800,
    firstTimeBonusIchor: 900,
    bonus: { kind: 'none' },
    tier: 'gold',
  },
];

const PACKS_BY_SKU: Readonly<Record<string, PackDef>> = Object.freeze(
  PACKS.reduce((acc, p) => {
    acc[p.sku] = p;
    return acc;
  }, {} as Record<string, PackDef>),
);

export function packForSku(sku: string): PackDef | undefined {
  return PACKS_BY_SKU[sku];
}

// Rare thralls — used for the `guaranteed_rare` bonus path. Mirrors
// the rarity table in src/game/config/thralls.ts (V1.2-EXT 4 rares).
export const RARE_THRALL_IDS: readonly string[] = [
  'nox-the-hunger',
  'lilith-whisper',
  'duskward',
  'ashen-vale',
];
