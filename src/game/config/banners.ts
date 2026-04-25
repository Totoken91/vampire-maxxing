// Banner definitions — Standard (permanent) + Featured (rotating).
// In v1.0 the Featured banner is fixed to Mirella per the V1.2 brief.
// Future rotations land here without touching the engine.

import type { ThrallId } from './thralls';

export type BannerId = 'standard' | 'featured';

export interface BannerDef {
  readonly id: BannerId;
  readonly name: string;
  readonly subtitle: string;
  readonly lore: string;
  /** Thralls in rate-up. Empty on Standard. */
  readonly featuredIds: readonly ThrallId[];
  /** Cosmetic accent — mapped to a CSS variable on the banner card. */
  readonly accent: string;
}

export const BANNERS: Readonly<Record<BannerId, BannerDef>> = {
  standard: {
    id: 'standard',
    name: 'Ancient Rite',
    subtitle: 'permanent',
    lore: 'The oldest summoning. All who answer may be bound.',
    featuredIds: [],
    accent: '#a88450',
  },
  featured: {
    id: 'featured',
    name: 'Summoned Rite',
    subtitle: 'Featuring · Mirella',
    lore: 'Tonight her thorns part the veil. Step closer.',
    featuredIds: ['mirella'],
    accent: '#c02838',
  },
};

// Featured first — it's the hero banner on the Rituals screen and
// reads as the primary CTA. Standard banner sits below as the
// always-on permanent option.
export const BANNER_LIST: readonly BannerDef[] = [BANNERS.featured, BANNERS.standard];
