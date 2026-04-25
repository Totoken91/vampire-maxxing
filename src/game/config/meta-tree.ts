// V1.3 SOULREAVE — Meta-tree configuration.
//
// Six permanent nodes purchased with Soul Shards earned from Soulreaving
// (second-layer prestige). Linear unlock order: each node requires the
// previous one. Picked over branched/free-form because the early
// Soulreave economy yields 2-4 SS/Soulreave and the player needs a
// clear "next purchase" target — branching would dilute the goal
// gradient.
//
// Cost progression (2 → 3 → 5 → 8 → 13 → 21, Fibonacci-ish):
// totals 52 SS for full clear. At ~3 SS/Soulreave that's ~17 Soulreaves
// to top out — sized to fill the V1.3-V1.4 gap until the Combat Layer
// (V2.0) opens a new spending sink. Scaling by 1.5x per node keeps each
// purchase feeling earned without making the late nodes a Lacanian
// torture device.

export type MetaNodeId =
  | 'IRON_WILL'
  | 'WELCOME_TRIBUTE'
  | 'AUTO_BUY'
  | 'AUTO_ASCEND_PRO'
  | 'ETERNAL_BOND'
  | 'ETERNAL_FLAME';

export interface MetaNode {
  id: MetaNodeId;
  /** Display name (English). */
  name: string;
  /** One-line flavour for the tap-confirmation modal. */
  flavour: string;
  /** Mechanical effect (player-facing). */
  effect: string;
  /** Cost in Soul Shards. */
  cost: number;
  /** Linear-unlock parent. null = first node, no prereq. */
  requires: MetaNodeId | null;
  /** Layout coords on the meta-tree canvas (0-1 normalised, origin
   *  top-left). The renderer reads these to position the hexagonal
   *  nodes; SVG branches are drawn between (parent, child). */
  layout: { x: number; y: number };
}

/**
 * Tree shape (top-down):
 *
 *                 [ETERNAL_BOND]      ← top, endgame anchor
 *                       │
 *                 [AUTO_ASCEND_PRO]
 *                       │
 *           [AUTO_BUY] ─────── [WELCOME_TRIBUTE]
 *                  \           /
 *                  [IRON_WILL]
 *                       │
 *                 [ETERNAL_FLAME]    ← bottom, first purchase
 *
 * Linear chain by `requires`: ETERNAL_FLAME → IRON_WILL → WELCOME_TRIBUTE
 * → AUTO_BUY → AUTO_ASCEND_PRO → ETERNAL_BOND. Visually we put the two
 * mid-chain nodes on a horizontal split for variety, but the player
 * still needs to buy WELCOME_TRIBUTE before AUTO_BUY (they're a chain,
 * not parallel). The split is purely cosmetic — the dotted SVG branch
 * connects them via IRON_WILL → both, but only WELCOME_TRIBUTE is
 * tappable until owned.
 */
export const META_NODES: readonly MetaNode[] = [
  {
    id: 'ETERNAL_FLAME',
    name: 'Eternal Flame',
    flavour: 'A spark that survives every Soulreave.',
    effect: 'Start each run with +50% Blood/sec from Stray Rats.',
    cost: 2,
    requires: null,
    layout: { x: 0.5, y: 0.85 },
  },
  {
    id: 'IRON_WILL',
    name: 'Iron Will',
    flavour: 'Memory that defies the cycle.',
    effect: 'Keep 1 Servant of each tier on Soulreave (resets to 1 owned, not 0).',
    cost: 3,
    requires: 'ETERNAL_FLAME',
    layout: { x: 0.5, y: 0.65 },
  },
  {
    id: 'WELCOME_TRIBUTE',
    name: 'Welcome Tribute',
    flavour: 'The first feast is owed.',
    effect: 'Next Standard pull after each Soulreave is a guaranteed Rare+.',
    cost: 5,
    requires: 'IRON_WILL',
    layout: { x: 0.7, y: 0.5 },
  },
  {
    id: 'AUTO_BUY',
    name: 'Auto-Buy',
    flavour: 'Hands of dust.',
    effect: 'Auto-purchase the cheapest affordable Servant every 3s.',
    cost: 8,
    requires: 'WELCOME_TRIBUTE',
    layout: { x: 0.3, y: 0.5 },
  },
  {
    id: 'AUTO_ASCEND_PRO',
    name: 'Auto-Ascend Pro',
    flavour: 'Tireless transcendence.',
    effect: 'Removes the form-bump pause. Auto-Ascend never stops.',
    cost: 13,
    requires: 'AUTO_BUY',
    layout: { x: 0.5, y: 0.3 },
  },
  {
    id: 'ETERNAL_BOND',
    name: 'Eternal Bond',
    flavour: 'A name remembered through deaths.',
    effect: 'Equipped Thralls retain their bonuses through Soulreave.',
    cost: 21,
    requires: 'AUTO_ASCEND_PRO',
    layout: { x: 0.5, y: 0.1 },
  },
];

export const META_NODES_BY_ID: Readonly<Record<MetaNodeId, MetaNode>> =
  Object.freeze(
    META_NODES.reduce(
      (acc, n) => {
        acc[n.id] = n;
        return acc;
      },
      {} as Record<MetaNodeId, MetaNode>,
    ),
  );

/** Total Soul Shards required for full meta-tree completion. */
export const META_TREE_TOTAL_COST = META_NODES.reduce(
  (sum, n) => sum + n.cost,
  0,
);

/** Threshold (≥) at which a Soul Shards confirmation modal fires
 *  before purchase. Below this we still call it cheap enough to
 *  one-tap; above we want the "are you sure?" friction. */
export const META_NODE_CONFIRM_THRESHOLD = 10;
