// L_QUESTS — Daily quest pool + types.
//
// Pool of 12 quests; one is selected per day via a deterministic seed
// (FNV-1a hash on date string) so every player on the same local day
// sees the same quest. Reward sizing — V1.2 calibrated against HoYo
// daily commission economy (Genshin daily ≈ 60 primogems ≈ 0.4 pull):
//
//   - 2 Ichor → quêtes "easy" et "normal" (single rite, awakening,
//     equip, twin rites, marathon de 200 taps, 50 servants, 5 Ichor
//     earned). Le baseline.
//   - 3 Ichor → quêtes "hardcore" qui demandent une vraie session
//     (10-pull, 500 taps, 150 servants, 3 ascensions). Slight bump
//     pour rester proportionné à l'effort.
//
// On NE GIVE PAS 4 Ichor — c'est volontairement plafonné à 3 pour
// éviter d'inflater le drumbeat F2P (login 1-3 + ad 3 + quest 2-3
// + achievements one-shots étalés ≈ 6-8 Ichor/jour). Soft pity 80
// est atteignable tous les ~10-13 jours en F2P pur.

export type QuestMetric =
  | 'taps_today'
  | 'servants_bought_today'
  | 'pulls_today'
  | 'awakenings_today'
  | 'ascends_today'
  | 'ichor_earned_today'
  | 'equips_today'
  | 'rites_used_today';

export interface QuestDef {
  readonly id: string;
  readonly title: string;
  /** One-line italic flavor visible on the quest card. */
  readonly description: string;
  readonly metric: QuestMetric;
  readonly target: number;
  readonly reward: { ichor: number };
}

/** The full pool. v1.2 = these 12 only. */
export const QUEST_POOL: readonly QuestDef[] = [
  {
    id: 'patient-hand',
    title: 'A Patient Hand',
    description: 'Tap two hundred times before dawn.',
    metric: 'taps_today',
    target: 200,
    reward: { ichor: 2 },
  },
  {
    id: 'lesser-bound',
    title: 'The Lesser Bound',
    description: 'Bind fifty servants to your bloodline.',
    metric: 'servants_bought_today',
    target: 50,
    reward: { ichor: 2 },
  },
  {
    id: 'a-single-rite',
    title: 'A Single Rite',
    description: 'Perform one invocation tonight.',
    metric: 'pulls_today',
    target: 1,
    reward: { ichor: 2 },
  },
  {
    id: 'court-of-ten',
    title: 'Court of Ten',
    description: 'Hold ten rites in one night — a moonlit binge.',
    metric: 'pulls_today',
    target: 10,
    reward: { ichor: 3 },
  },
  {
    id: 'awakening-hour',
    title: 'Awakening Hour',
    description: 'Ascend a thrall to a new star.',
    metric: 'awakenings_today',
    target: 1,
    reward: { ichor: 2 },
  },
  {
    id: 'first-blood',
    title: 'First Blood',
    description: 'Complete a single ascension before sleep.',
    metric: 'ascends_today',
    target: 1,
    reward: { ichor: 2 },
  },
  {
    id: 'three-ascensions',
    title: 'Three Communions',
    description: 'Three ascensions in a single night.',
    metric: 'ascends_today',
    target: 3,
    reward: { ichor: 3 },
  },
  {
    id: 'nectar-five',
    title: 'A Nectar of Five',
    description: 'Earn five Ichor through any path.',
    metric: 'ichor_earned_today',
    target: 5,
    reward: { ichor: 2 },
  },
  {
    id: 'binding-rotation',
    title: 'Binding Rotation',
    description: 'Place a thrall into an active slot.',
    metric: 'equips_today',
    target: 1,
    reward: { ichor: 2 },
  },
  {
    id: 'twin-rites',
    title: 'Twin Rites',
    description: 'Use two rites in the same night.',
    metric: 'rites_used_today',
    target: 2,
    reward: { ichor: 2 },
  },
  {
    id: 'tap-marathon',
    title: 'A Marathon of Hunger',
    description: 'Five hundred taps, all yours.',
    metric: 'taps_today',
    target: 500,
    reward: { ichor: 3 },
  },
  {
    id: 'servant-spree',
    title: 'A Servant Spree',
    description: 'Bind one hundred fifty servants in one night.',
    metric: 'servants_bought_today',
    target: 150,
    reward: { ichor: 3 },
  },
];

export const QUESTS_BY_ID: Readonly<Record<string, QuestDef>> = Object.freeze(
  QUEST_POOL.reduce(
    (acc, q) => {
      acc[q.id] = q;
      return acc;
    },
    {} as Record<string, QuestDef>,
  ),
);

/** Deterministic per-date selection — every player on the same
 *  local day sees the same quest. Hash = simple FNV-1a over the
 *  date string. Mod the pool length to get the index. */
export function questForDate(date: string): QuestDef {
  let hash = 2166136261;
  for (let i = 0; i < date.length; i += 1) {
    hash ^= date.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return QUEST_POOL[hash % QUEST_POOL.length];
}
