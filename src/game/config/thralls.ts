// Phase L — unique Thrall roster v1.0 (V1.2 brief, 2026-04-24).
//
// These are COLLECTIBLE characters (not generators — those live in
// servants.ts). The launch roster is 6 Commons + 4 Rares + 2 Epics =
// 12 total. Zero Legendaries at launch; Lord of Night, Blood Countess
// and Crimson Reaper are planned for v1.1+ and documented in
// docs/10-THRALL-ROSTER-V1.md — not in code yet.
//
// Balance note: bonuses follow the V1.2 brief (Common +6-12%, Rare
// +22-30%, Epic +60-80%). The Scholar-style cost reduction is now
// milestone-driven (see milestones.ts) so we don't stack it here.
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
  | 'velmor-the-dread';

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

export interface Thrall {
  readonly id: ThrallId;
  readonly name: string;
  readonly rarity: ThrallRarity;
  readonly archetype: ThrallArchetype;
  readonly lore: string;
  readonly portraitPath: string;
  readonly primaryEffect: ThrallEffect;
  readonly secondaryEffect?: ThrallEffect;
}

/** Target roster count for the "Collected: X/12" display. */
export const THRALL_ROSTER_TARGET = 12;

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
  },
  {
    id: 'mira-the-watcher',
    name: 'Mira the Watcher',
    rarity: 'common',
    archetype: 'nocturne',
    lore: 'She sleeps with one eye open. The other is watching you.',
    portraitPath: '/assets/thralls/mira-the-watcher.webp',
    primaryEffect: { type: 'offline_gain', value: 1.12 },
  },
  {
    id: 'roderick-the-tracker',
    name: 'Roderick the Tracker',
    rarity: 'common',
    archetype: 'predator',
    lore: 'He does not chase. The quarry always comes to him, eventually.',
    portraitPath: '/assets/thralls/roderick-the-tracker.webp',
    primaryEffect: { type: 'active_gain', value: 1.10 },
  },
  {
    id: 'iron-maw',
    name: 'Iron Maw',
    rarity: 'common',
    archetype: 'harvester',
    lore: 'What she bites, she keeps. What she keeps, she breaks.',
    portraitPath: '/assets/thralls/iron-maw.webp',
    primaryEffect: { type: 'blood_gen', value: 1.06 },
  },
  {
    id: 'crypt-warden',
    name: 'Crypt Warden',
    rarity: 'common',
    archetype: 'nocturne',
    lore: 'His lantern has not been lit since the mortals stopped coming.',
    portraitPath: '/assets/thralls/crypt-warden.webp',
    primaryEffect: { type: 'offline_gain', value: 1.10 },
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
  },
  {
    id: 'lilith-whisper',
    name: "Lilith's Whisper",
    rarity: 'rare',
    archetype: 'nocturne',
    lore: 'Her voice arrives in dreams three nights before she does. By then it is already too late.',
    portraitPath: '/assets/thralls/lilith-whisper.webp',
    primaryEffect: { type: 'offline_gain', value: 1.30 },
  },
  {
    id: 'duskward',
    name: 'Duskward',
    rarity: 'rare',
    archetype: 'predator',
    lore: 'He walks the last hour of daylight without flinching. He has made peace with it.',
    portraitPath: '/assets/thralls/duskward.webp',
    primaryEffect: { type: 'active_gain', value: 1.22 },
  },
  {
    id: 'ashen-vale',
    name: 'Ashen Vale',
    rarity: 'rare',
    archetype: 'hybrid',
    lore: 'Twice buried, thrice returned. The ash on his shoulders is from his own pyre.',
    portraitPath: '/assets/thralls/ashen-vale.webp',
    primaryEffect: { type: 'hybrid', value: 1.15 },
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
  },
  {
    id: 'velmor-the-dread',
    name: 'Velmor the Dread',
    rarity: 'epic',
    archetype: 'nocturne',
    lore: 'Sleeps an age between breaths. Even his absence collects interest.',
    portraitPath: '/assets/thralls/velmor-the-dread.webp',
    primaryEffect: { type: 'offline_gain', value: 1.80 },
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
