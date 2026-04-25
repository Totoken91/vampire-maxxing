// L10 — IAP pack catalog (Vampire Maxxing V1.2).
//
// Pricing ladder calibrated against gacha-systems-expert + monetization-shark
// audits (2026-04-25):
//   - Standard ladder $0.99 / $2.99 / $4.99 / $9.99 / $19.99 / $49.99 — global
//     Western mobile convention. Skip $99.99 for V1.2 (V1.3 if data warrants).
//   - Each higher tier improves Ichor/€ ratio so the value ladder rewards
//     deeper commitment without breaking the F2P baseline.
//   - First-Time Double on every pack EXCEPT Cataclysmique which is capped at
//     +50% (1800 base + 900 FT bonus = 2700 total). Reason: full +1800 FT
//     would credit ~3600 Ichor = ~45 pity flushes in a single purchase, which
//     trivializes the 12-thrall collection at V1.2 scope.
//   - Pacte Fondateur is the welcome-pack hook: triggered by the first Rare+
//     pull (any source), 7-day soft availability window, then stays in shop
//     after the window at the base price (no FT). Founder pack pattern, the
//     OPTIMAL first-purchase moment per monetization-shark Playbook 1.
//
// Plumbing notes:
//   - SKUs match Google Play Console product ids exactly. Don't rename
//     post-launch — that's a save breakage + Play Console reconfigure.
//   - `bonusKind` is a discriminated union so the grant engine in
//     src/game/iap.ts can dispatch deterministically on each pack's bespoke
//     payload (Nox guarantee, random Rare guarantee, pure-Ichor).

import type { ThrallId } from './thralls';

export type PackTier = 'bronze' | 'silver' | 'gold';

/** Discriminated bonus payload. `none` = pure Ichor pack. */
export type PackBonus =
  | { kind: 'none' }
  | { kind: 'guaranteed_thrall'; thrallId: ThrallId }
  | { kind: 'guaranteed_rare' };

export interface PackDef {
  /** Google Play Console product id. Save-stable — never rename. */
  readonly sku: string;
  /** Player-facing title (Cinzel, italic). */
  readonly title: string;
  /** One-line italic flavor on the card. */
  readonly description: string;
  /** Display price (EUR for global/EU; the Play sheet localizes). */
  readonly priceEur: number;
  /** Base Ichor amount. Always granted on every purchase. */
  readonly baseIchor: number;
  /**
   * Extra Ichor on the first-ever purchase of this SKU. Set to 0 on packs
   * that should never offer FT-Double (none in v1.2 — every pack has FT,
   * but the Cataclysmique tier is capped at +50% of base for economy
   * safety per the gacha audit).
   */
  readonly firstTimeBonusIchor: number;
  /** Extra non-Ichor reward (guaranteed thrall, guaranteed-Rare pull, …). */
  readonly bonus: PackBonus;
  /** Visual tier — drives card frame, glow density, particle count. */
  readonly tier: PackTier;
  /**
   * Whether this pack is a triggered welcome offer (Pacte Fondateur).
   * Triggered packs are hidden in Shop until their trigger fires; once
   * fired, they show with the "FEATURED" hero treatment for `featuredDays`,
   * then stay in shop afterwards at the base price (FT bonus retained
   * once if not yet purchased).
   */
  readonly triggered?: {
    /** Days the pack is in the FEATURED hero slot after trigger. */
    featuredDays: number;
  };
}

/**
 * The 7-tier ladder. Order = display order in shop (Pacte Fondateur jumps
 * to the FEATURED hero slot when active; otherwise this array drives a
 * flat scrollable list).
 */
export const PACKS: readonly PackDef[] = [
  {
    sku: 'vm_ichor_modest',
    title: 'Modest Offering',
    description: 'A small libation. Test the waters.',
    priceEur: 0.99,
    baseIchor: 15,
    firstTimeBonusIchor: 15,
    bonus: { kind: 'none' },
    tier: 'bronze',
  },
  {
    sku: 'vm_founder_pact',
    title: "Founder's Pact",
    description: 'A welcome from the Ancients — Nox bound, your bloodline begins.',
    priceEur: 2.99,
    baseIchor: 50,
    firstTimeBonusIchor: 50,
    bonus: { kind: 'guaranteed_thrall', thrallId: 'nox-the-hunger' },
    tier: 'silver',
    triggered: { featuredDays: 7 },
  },
  {
    sku: 'vm_ichor_substantial',
    title: 'Substantial Offering',
    description: 'A weighted vial. The hunger will sing for nights.',
    priceEur: 4.99,
    baseIchor: 100,
    firstTimeBonusIchor: 100,
    bonus: { kind: 'none' },
    tier: 'bronze',
  },
  {
    sku: 'vm_starter_coven',
    title: 'Starter Coven',
    description: 'A summoned thrall and the means to call more.',
    priceEur: 9.99,
    baseIchor: 200,
    firstTimeBonusIchor: 200,
    bonus: { kind: 'guaranteed_rare' },
    tier: 'silver',
  },
  {
    sku: 'vm_ichor_major',
    title: 'Greater Offering',
    description: 'A ritual chalice. The Ancients lean in.',
    priceEur: 9.99,
    baseIchor: 250,
    firstTimeBonusIchor: 250,
    bonus: { kind: 'none' },
    tier: 'silver',
  },
  {
    sku: 'vm_ichor_royal',
    title: 'Royal Offering',
    description: 'A king’s ransom in blood.',
    priceEur: 19.99,
    baseIchor: 600,
    firstTimeBonusIchor: 600,
    bonus: { kind: 'none' },
    tier: 'gold',
  },
  {
    sku: 'vm_ichor_cataclysm',
    title: 'Cataclysmic Offering',
    description: 'An offering that bends fate. Dynasties remember it.',
    priceEur: 49.99,
    baseIchor: 1800,
    // Capped at +50% (not +100%) — full FT-Double would credit ~45 pity
    // flushes in a single purchase, breaking the 12-thrall V1.2 economy.
    firstTimeBonusIchor: 900,
    bonus: { kind: 'none' },
    tier: 'gold',
  },
];

export const PACKS_BY_SKU: Readonly<Record<string, PackDef>> = Object.freeze(
  PACKS.reduce(
    (acc, p) => {
      acc[p.sku] = p;
      return acc;
    },
    {} as Record<string, PackDef>,
  ),
);

/** Lookup by sku. Returns undefined for unknown skus (caller should fail
 *  the purchase rather than silently pretend it succeeded). */
export function packForSku(sku: string): PackDef | undefined {
  return PACKS_BY_SKU[sku];
}

/** SKU of the welcome / founder pack — referenced by the trigger logic
 *  in src/game/iap.ts so it stays a single source of truth. */
export const FOUNDER_PACK_SKU = 'vm_founder_pact' as const;
