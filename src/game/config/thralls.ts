// Phase L — unique Thrall roster (V1.2 brief + V1.2-EXT 2026-04-25).
//
// These are COLLECTIBLE characters (not generators — those live in
// servants.ts). Roster v1.2-EXT = 6 Commons + 4 Rares + 2 Epics + 3
// Legendaries = 15 total. The 3 Legendaries (Aldric the Reaper,
// Cassian Lord of the Night, Maris the Blood Countess) doubled the
// Epic baseline per the idle-expert audit and ship behind 0.5% rate
// + 80-pull pity per gacha-systems-expert.
//
// Balance scale (multipliers):
//   Common    1.06–1.12
//   Rare      1.22–1.30
//   Epic      1.60–1.80
//   Legendary 2.00–2.40   (≈ ×2 Epic — the "wow" tier, by design)
//
// ID policy: kebab-case, SAVE-STABLE (do not rename). If you need to
// reshape a thrall, add a migration in save.ts.

export type ThrallId =
  // Commons (6)
  | 'ash-the-wretched'
  | 'mira-the-watcher'
  | 'roderick-the-tracker'
  | 'iron-maw'
  | 'crypt-warden'
  | 'gravebound'
  // Rares (4)
  | 'nox-the-hunger'
  | 'lilith-whisper'
  | 'duskward'
  | 'ashen-vale'
  // Epics (2)
  | 'mirella'
  | 'velmor-the-dread'
  // Legendaries (3) — V1.2-EXT
  | 'aldric-volkov'
  | 'cassian-vale'
  | 'maris-vale';

export type ThrallRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Mechanical role. Used for filter tabs and card accent. */
export type ThrallArchetype =
  | 'harvester' // blood generation
  | 'nocturne' // offline gains
  | 'predator' // active / tap gains
  | 'hybrid'; // mixed

/** Effect shape. `value` is a multiplier (1.25 = +25%) applied to the
 * archetype-specific modifier target once the thrall is equipped. */
export interface ThrallEffect {
  readonly type: 'blood_gen' | 'offline_gain' | 'active_gain' | 'tap_mult' | 'hybrid';
  readonly value: number;
}

/**
 * L6 / Pattern A — bespoke per-thrall mechanic. Sits on top of the
 * primary + secondary ThrallEffects to give each thrall a unique
 * identity (so two Harvesters aren't just "more or less blood gen").
 *
 * Discriminated union: each `kind` maps to a specific runtime
 * behaviour wired in `awakening.ts` / `state.ts`. Add new kinds
 * sparingly — every new kind is a touchpoint in the engine.
 */
export type BespokeMechanic =
  /** +N hours to the offline cap (additive). */
  | { readonly kind: 'offline_cap_h'; readonly value: number }
  /** ×N multiplier on click power (multiplicative). */
  | { readonly kind: 'click_power_mult'; readonly value: number }
  /** +N additive on the crit damage multiplier (default 1.5). */
  | { readonly kind: 'crit_damage'; readonly value: number }
  /** +Nx% blood gen per ascension (stats.totalAscends). Capped. */
  | { readonly kind: 'per_ascend_blood'; readonly value: number; readonly cap: number }
  /** +N% blood gen per OTHER equipped thrall of `per` archetype. */
  | { readonly kind: 'cross_archetype_blood'; readonly value: number; readonly per: ThrallArchetype }
  /** +N% to other equipped thralls' primary effective values. */
  | { readonly kind: 'amplify_others_primary'; readonly value: number }
  /** Floor on offline efficiency (clamped to max(default, this)). */
  | { readonly kind: 'offline_efficiency_floor'; readonly value: number }
  /** Per-tap RNG chance of a free "echo" tap that fires the same gain. */
  | { readonly kind: 'echo_tap_chance'; readonly value: number };

export interface Thrall {
  readonly id: ThrallId;
  readonly name: string;
  readonly rarity: ThrallRarity;
  readonly archetype: ThrallArchetype;
  readonly lore: string;
  readonly portraitPath: string;
  readonly primaryEffect: ThrallEffect;
  readonly secondaryEffect?: ThrallEffect;
  /** L6 / Pattern A — unique kit-defining mechanic that distinguishes
   *  this thrall from others in the same archetype. May contain
   *  multiple mechanics (e.g. Velmor combos cap + efficiency floor). */
  readonly bespoke?: readonly BespokeMechanic[];
  /** Short flavoured caption for the bespoke effect, shown in the
   *  thrall detail modal under the primary "gift of the pact" line. */
  readonly bespokeCaption?: string;
}

/** Target roster count for the "Collected: X/15" display. */
export const THRALL_ROSTER_TARGET = 15;

export const THRALLS: readonly Thrall[] = [
  // ─────────── Commons (6) ───────────
  {
    id: 'ash-the-wretched',
    name: 'Ash the Wretched',
    rarity: 'common',
    archetype: 'harvester',
    lore: 'He still remembers his own name. The others pretend they have forgotten theirs.',
    portraitPath: '/assets/thralls/ash-the-wretched.webp',
    primaryEffect: { type: 'blood_gen', value: 1.08 },
    bespoke: [{ kind: 'per_ascend_blood', value: 0.02, cap: 0.30 }],
    bespokeCaption: 'every Century deepens his hunger',
  },
  {
    id: 'mira-the-watcher',
    name: 'Mira the Watcher',
    rarity: 'common',
    archetype: 'nocturne',
    lore: 'She sleeps with one eye open. The other is watching you.',
    portraitPath: '/assets/thralls/mira-the-watcher.webp',
    primaryEffect: { type: 'offline_gain', value: 1.12 },
    bespoke: [{ kind: 'offline_cap_h', value: 0.5 }],
    bespokeCaption: 'she keeps the lamp lit a half-hour longer',
  },
  {
    id: 'roderick-the-tracker',
    name: 'Roderick the Tracker',
    rarity: 'common',
    archetype: 'predator',
    lore: 'He does not chase. The quarry always comes to him, eventually.',
    portraitPath: '/assets/thralls/roderick-the-tracker.webp',
    primaryEffect: { type: 'active_gain', value: 1.10 },
    bespoke: [{ kind: 'click_power_mult', value: 1.05 }],
    bespokeCaption: 'every blow lands a little heavier',
  },
  {
    id: 'iron-maw',
    name: 'Iron Maw',
    rarity: 'common',
    archetype: 'harvester',
    lore: 'What she bites, she keeps. What she keeps, she breaks.',
    portraitPath: '/assets/thralls/iron-maw.webp',
    primaryEffect: { type: 'blood_gen', value: 1.06 },
    secondaryEffect: { type: 'tap_mult', value: 1.05 },
    bespokeCaption: 'her teeth do half the work of the harvest',
  },
  {
    id: 'crypt-warden',
    name: 'Crypt Warden',
    rarity: 'common',
    archetype: 'nocturne',
    lore: 'His lantern has not been lit since the mortals stopped coming.',
    portraitPath: '/assets/thralls/crypt-warden.webp',
    primaryEffect: { type: 'offline_gain', value: 1.10 },
    bespoke: [{ kind: 'offline_cap_h', value: 1 }],
    bespokeCaption: 'an hour more of vigil before the dawn',
  },
  {
    id: 'gravebound',
    name: 'Gravebound',
    rarity: 'common',
    archetype: 'predator',
    lore: 'The soil remembers her even when she forgets herself.',
    portraitPath: '/assets/thralls/gravebound.webp',
    primaryEffect: { type: 'active_gain', value: 1.08 },
    secondaryEffect: { type: 'tap_mult', value: 1.10 },
    bespoke: [{ kind: 'echo_tap_chance', value: 0.07 }],
    bespokeCaption: 'every seventh strike echoes from the grave',
  },

  // ─────────── Rares (4) ───────────
  {
    id: 'nox-the-hunger',
    name: 'Nox the Hunger',
    rarity: 'rare',
    archetype: 'harvester',
    lore: 'She feeds not on blood but on memory of blood — and grows fat where others starve.',
    portraitPath: '/assets/thralls/nox-the-hunger.webp',
    primaryEffect: { type: 'blood_gen', value: 1.25 },
    bespoke: [{ kind: 'click_power_mult', value: 1.10 }],
    bespokeCaption: 'her hands recall every kill before yours',
  },
  {
    id: 'lilith-whisper',
    name: "Lilith's Whisper",
    rarity: 'rare',
    archetype: 'nocturne',
    lore: 'Her voice arrives in dreams three nights before she does. By then it is already too late.',
    portraitPath: '/assets/thralls/lilith-whisper.webp',
    primaryEffect: { type: 'offline_gain', value: 1.30 },
    bespoke: [{ kind: 'click_power_mult', value: 1.08 }],
    bespokeCaption: 'her dream echoes still strike on waking',
  },
  {
    id: 'duskward',
    name: 'Duskward',
    rarity: 'rare',
    archetype: 'predator',
    lore: 'He walks the last hour of daylight without flinching. He has made peace with it.',
    portraitPath: '/assets/thralls/duskward.webp',
    primaryEffect: { type: 'active_gain', value: 1.22 },
    bespoke: [{ kind: 'crit_damage', value: 0.5 }],
    bespokeCaption: 'his strikes find the artery, never the bone',
  },
  {
    id: 'ashen-vale',
    name: 'Ashen Vale',
    rarity: 'rare',
    archetype: 'hybrid',
    lore: 'Twice buried, thrice returned. The ash on his shoulders is from his own pyre.',
    portraitPath: '/assets/thralls/ashen-vale.webp',
    primaryEffect: { type: 'hybrid', value: 1.15 },
    bespoke: [{ kind: 'amplify_others_primary', value: 1.15 }],
    bespokeCaption: 'his presence lengthens every other shadow in the coven',
  },

  // ─────────── Epics (2) ───────────
  {
    id: 'mirella',
    name: 'Mirella, Thorn of the Court',
    rarity: 'epic',
    archetype: 'harvester',
    lore: 'A courtier with no court left. She smiles like a wound remembering.',
    portraitPath: '/assets/thralls/mirella.webp',
    primaryEffect: { type: 'blood_gen', value: 1.60 },
    bespoke: [{ kind: 'cross_archetype_blood', value: 0.10, per: 'predator' }],
    bespokeCaption: 'her court welcomes the hunters; bind them and she rewards both',
  },
  {
    id: 'velmor-the-dread',
    name: 'Velmor the Dread',
    rarity: 'epic',
    archetype: 'nocturne',
    lore: 'Sleeps an age between breaths. Even his absence collects interest.',
    portraitPath: '/assets/thralls/velmor-the-dread.webp',
    primaryEffect: { type: 'offline_gain', value: 1.80 },
    bespoke: [
      { kind: 'offline_cap_h', value: 3 },
      { kind: 'offline_efficiency_floor', value: 0.75 },
    ],
    bespokeCaption: 'his sleep does not waste — three more hours, never below three-quarters',
  },

  // ─────────── Legendaries (3) — V1.2-EXT 2026-04-25 ───────────
  // The "wow" tier. Each Legendary doubles an Epic's primary
  // multiplier and lands a unique signature kit:
  //   - Aldric (Reaper / predator)  → solo-DPS, ascend-scaling
  //   - Cassian (Lord / hybrid)     → court amplifier, team-builder
  //   - Maris (Countess / nocturne) → best-in-slot offline queen
  // Gated behind 0.5% Featured rate + 80-pull pity. F2P expected
  // first Legendary at ~10-13 days of active play.
  {
    id: 'aldric-volkov',
    name: 'Aldric Volkov, the Crimson Reaper',
    rarity: 'legendary',
    archetype: 'predator',
    lore: 'They say he stopped counting his kills the night the moon turned red. The tally now keeps itself, in the rust on his blade.',
    portraitPath: '/assets/thralls/aldric-volkov.png',
    primaryEffect: { type: 'active_gain', value: 2.20 },
    bespoke: [
      { kind: 'click_power_mult', value: 1.40 },
      { kind: 'crit_damage', value: 1.0 },
      { kind: 'per_ascend_blood', value: 0.005, cap: 0.50 },
    ],
    bespokeCaption: 'every Century rusts the blade further; every blade rusts deeper',
  },
  {
    id: 'cassian-vale',
    name: 'Cassian Vale, Lord of the Night',
    rarity: 'legendary',
    archetype: 'hybrid',
    lore: 'He inherited the night the way other lords inherit estates: by outlasting every claimant who came before. The chandeliers still bow when he enters.',
    portraitPath: '/assets/thralls/cassian-vale.png',
    primaryEffect: { type: 'hybrid', value: 2.00 },
    bespoke: [{ kind: 'amplify_others_primary', value: 1.30 }],
    bespokeCaption: 'his court magnifies every gift bound beside him',
  },
  {
    id: 'maris-vale',
    name: 'Maris Vale, the Blood Countess',
    rarity: 'legendary',
    archetype: 'nocturne',
    lore: 'She holds vigil from a cathedral that no longer prays. The rose window remembers her before any saint, and the candles burn six hours longer in her presence.',
    portraitPath: '/assets/thralls/maris-vale.png',
    primaryEffect: { type: 'offline_gain', value: 2.40 },
    bespoke: [
      { kind: 'offline_cap_h', value: 6 },
      { kind: 'offline_efficiency_floor', value: 1.0 },
    ],
    bespokeCaption: 'six more hours of vigil — and not a drop wasted',
  },
];

export const THRALLS_BY_ID: Readonly<Record<ThrallId, Thrall>> = Object.freeze(
  THRALLS.reduce(
    (acc, t) => {
      acc[t.id] = t;
      return acc;
    },
    {} as Record<ThrallId, Thrall>,
  ),
);

/** Lowercase label used in the filter tabs + card corner. */
export function archetypeLabel(a: ThrallArchetype): string {
  switch (a) {
    case 'harvester':
      return 'harvester';
    case 'nocturne':
      return 'nocturne';
    case 'predator':
      return 'predator';
    case 'hybrid':
      return 'hybrid';
  }
}

/** Rarity rank for sorting. Higher = rarer. */
export function rarityRank(r: ThrallRarity): number {
  switch (r) {
    case 'common':
      return 0;
    case 'rare':
      return 1;
    case 'epic':
      return 2;
    case 'legendary':
      return 3;
  }
}
