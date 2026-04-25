// 20 achievements, grouped by flavor. As of L_QUESTS (V1.2) each
// achievement carries an `ichorReward` — earned on unlock but
// granted only on player CLAIM (manual collect through the Tome).
// The claim mechanic mirrors HoYo's commission/achievement screen:
// the "you earned" → "you collected" gap is a goal-gradient hit
// and turns the Tome into a daily check-in surface.
//
// Backfill on patch push: players who already unlocked entries
// get them queued as claimable — a CLAIM ALL CTA in the Tome
// flushes them in a single batched modal so it feels like a gift
// drop, not a chore list.
//
// Gen Z meme titles are deliberately not localized — they carry their
// Internet-native voice (sigma, based, mewing, looksmaxxed) that would die
// in translation. Descriptions are translated via i18n later.

import type { VampireForm } from './forms';
import type { GameSnapshot } from '../state';

export type AchievementCategory = 'progression' | 'prestige' | 'meme' | 'time';

export interface AchievementDef {
  readonly id: string;
  readonly category: AchievementCategory;
  readonly title: string;
  readonly desc: string;
  readonly predicate: (s: Readonly<GameSnapshot>) => boolean;
  /** Ichor granted on CLAIM. Total across all 20 = ~45 Ichor —
   * a generous but spread-out F2P drumbeat. */
  readonly ichorReward: number;
}

const FORM_ORDER: readonly VampireForm[] = [
  'NEWBORN',
  'ELDER',
  'LORD_OF_NIGHT',
  'METHUSELAH',
  'PROGENITOR',
  'TERA_OVERLORD',
  'HORROR_INCARNATE',
  'THIRST',
];

function reachedForm(highest: VampireForm, target: VampireForm): boolean {
  return FORM_ORDER.indexOf(highest) >= FORM_ORDER.indexOf(target);
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ─── PROGRESSION (8) — owning thralls of each tier ───
  {
    id: 'first_bite',
    category: 'progression',
    title: 'First Bite',
    desc: 'Recruit your first thrall. The hunger remembers.',
    predicate: (s) => Object.values(s.servants).some((t) => t.owned > 0),
    ichorReward: 1,
  },
  {
    id: 'stray_pack',
    category: 'progression',
    title: 'Pack Mentality',
    desc: 'Command 10 Stray Rats. The gutter is yours.',
    predicate: (s) => s.servants.rat.owned >= 10,
    ichorReward: 1,
  },
  {
    id: 'feral_tide',
    category: 'progression',
    title: 'Feral Tide',
    desc: 'Gather 25 Feral Ghouls. The streets empty at your name.',
    predicate: (s) => s.servants.ghoul.owned >= 25,
    ichorReward: 1,
  },
  {
    id: 'first_coven',
    category: 'progression',
    title: 'First Coven',
    desc: 'Sire 10 Fledglings. The bloodline takes shape.',
    predicate: (s) => s.servants.fledgling.owned >= 10,
    ichorReward: 2,
  },
  {
    id: 'court_assembly',
    category: 'progression',
    title: 'Court Assembly',
    desc: 'Bind 10 Thralls. Your court convenes.',
    predicate: (s) => s.servants.thrall.owned >= 10,
    ichorReward: 2,
  },
  {
    id: 'shadow_guild',
    category: 'progression',
    title: 'Shadow Guild',
    desc: '10 Nightblades answer to you. The blade is drawn.',
    predicate: (s) => s.servants.blade.owned >= 10,
    ichorReward: 2,
  },
  {
    id: 'grand_salon',
    category: 'progression',
    title: 'Grand Salon',
    desc: '10 Blood Courtesans grace your halls.',
    predicate: (s) => s.servants.courtesan.owned >= 10,
    ichorReward: 2,
  },
  {
    id: 'eternal_council',
    category: 'progression',
    title: 'Eternal Council',
    desc: '5 Elders bow to you. The old ones kneel.',
    predicate: (s) => s.servants.elder.owned >= 5,
    ichorReward: 3,
  },

  // ─── PRESTIGE (6) — form progression ───
  {
    id: 'first_ascension',
    category: 'prestige',
    title: 'First Ascension',
    desc: 'Ascend for the first time. There is no going back.',
    predicate: (s) => s.stats.totalAscends >= 1,
    ichorReward: 2,
  },
  {
    id: 'elder_born',
    category: 'prestige',
    title: 'Elder Born',
    desc: 'Rise as an Elder. Mortals begin to look away.',
    predicate: (s) => reachedForm(s.stats.highestFormReached, 'ELDER'),
    ichorReward: 2,
  },
  {
    id: 'lord_risen',
    category: 'prestige',
    title: 'Lord Risen',
    desc: 'Take the title of Lord of Night.',
    predicate: (s) => reachedForm(s.stats.highestFormReached, 'LORD_OF_NIGHT'),
    ichorReward: 3,
  },
  {
    id: 'millennium',
    category: 'prestige',
    title: 'Millennium',
    desc: 'Become Methuselah. Empires rise and fall beneath you.',
    predicate: (s) => reachedForm(s.stats.highestFormReached, 'METHUSELAH'),
    ichorReward: 3,
  },
  {
    id: 'primordial',
    category: 'prestige',
    title: 'Primordial',
    desc: 'Awaken as Progenitor. Older than language itself.',
    predicate: (s) => reachedForm(s.stats.highestFormReached, 'PROGENITOR'),
    ichorReward: 4,
  },
  {
    id: 'tera_overlord',
    category: 'prestige',
    title: 'Tera Overlord',
    desc: 'Ascend to Tera Overlord. The night is a lease you signed.',
    predicate: (s) => reachedForm(s.stats.highestFormReached, 'TERA_OVERLORD'),
    ichorReward: 5,
  },

  // ─── MEME (4) — Gen Z dark academia easter eggs ───
  {
    id: 'sigma_arc',
    category: 'meme',
    title: 'sigma vampire arc',
    desc: 'Ascend 10 times. the grindset is eternal.',
    predicate: (s) => s.stats.totalAscends >= 10,
    ichorReward: 1,
  },
  {
    id: 'based_bloodpilled',
    category: 'meme',
    title: 'based and bloodpilled',
    desc: 'Accumulate 100 Dread. unserious about mortality, serious about power.',
    predicate: (s) => s.dread >= 100,
    ichorReward: 2,
  },
  {
    id: 'built_different',
    category: 'meme',
    title: 'built different',
    desc: 'Ascend 30 times. certified night creature.',
    predicate: (s) => s.stats.totalAscends >= 30,
    ichorReward: 2,
  },
  {
    id: 'mewing_success',
    category: 'meme',
    title: 'YOU HAVE LOOKSMAXXED (literally)',
    desc: 'Become Tera Overlord. the mewing worked. the fangs came in.',
    predicate: (s) => reachedForm(s.stats.highestFormReached, 'TERA_OVERLORD'),
    ichorReward: 3,
  },

  // ─── TIME (2) — grind recognition ───
  {
    id: 'night_shift',
    category: 'time',
    title: 'Night Shift',
    desc: 'Play for 1 hour. The dawn skipped you.',
    predicate: (s) => s.stats.totalPlayTime >= 3600,
    ichorReward: 2,
  },
  {
    id: 'immortal_grind',
    category: 'time',
    title: 'Immortal Grind',
    desc: '100 hours feeding the hunger. Time means nothing now.',
    predicate: (s) => s.stats.totalPlayTime >= 360000,
    ichorReward: 5,
  },
];

export const ACHIEVEMENTS_BY_ID: Readonly<Record<string, AchievementDef>> = Object.freeze(
  ACHIEVEMENTS.reduce(
    (acc, a) => {
      acc[a.id] = a;
      return acc;
    },
    {} as Record<string, AchievementDef>,
  ),
);
