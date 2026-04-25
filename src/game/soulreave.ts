// V1.3 SOULREAVE — Second-layer prestige engine.
//
// The Soulreave is the meta-prestige. Where Ascend resets a single
// run for Dread (axis 1: rate via mult), Soulreave resets the entire
// progression — Dread, totalAscends, current run state — in exchange
// for Soul Shards (axis 3: structure via permanent perks).
//
// Why a second axis: the V1.2-HF1 hard cap makes the multiplier curve
// plateau at ×10. Without a fresh spending sink, late-game retention
// dies. Soulreave gives the player a long-term goal (clear the
// meta-tree, 52 SS over ~15-20 reaves) and reframes the second
// Methuselah grind as "I'm earning Soul Shards", not "I'm doing the
// same form I already did".
//
// Reset scope:
//   RESET   → blood, totalRunBlood, dread, totalAscends, servants.owned,
//             current run boost, runHistory, lastMilestoneExp,
//             pendingCurseMult, equippedSlots (unless ETERNAL_BOND).
//   PRESERVE → lifetimeDread, soulShards (this gain ADDS), metaTree,
//             ichor + ledger + flags, essences, playerThralls roster,
//             packsFirstTimeBought, spendingLog, settings, daily,
//             ageConfirmation, ritualState (pity counters, FRG flag,
//             history — kept per the gacha-systems audit so a
//             Soulreave doesn't reset a near-pity'd Legendary).
//
// Form consequence: highestFormReached is reset to NEWBORN. The form
// derivation in `forms.ts` reads from `stats.totalAscends` so resetting
// totalAscends → 0 automatically returns the player to NEWBORN.

import { BALANCE } from './config/balance';
import { SERVANTS } from './config/servants';
import { events } from './events';
import { gameState } from './state';
import { META_NODES_BY_ID, type MetaNode, type MetaNodeId } from './config/meta-tree';

/** Lifetime Dread → Soul Shards. Diminishing returns via sqrt. */
export function projectedSoulShards(lifetimeDread: number): number {
  if (lifetimeDread < BALANCE.SOULREAVE_THRESHOLD_DREAD) return 0;
  const ratio = lifetimeDread / BALANCE.SOULREAVE_GAIN_DIVISOR;
  return Math.floor(BALANCE.SOULREAVE_GAIN_COEF * Math.sqrt(ratio));
}

/** Whether the player has crossed both gates: Methuselah-tier
 *  (totalAscends ≥ 7) AND lifetimeDread ≥ threshold. */
export function canSoulreave(): boolean {
  const snap = gameState.get();
  if (snap.stats.totalAscends < BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS) {
    return false;
  }
  if (snap.lifetimeDread < BALANCE.SOULREAVE_THRESHOLD_DREAD) return false;
  return projectedSoulShards(snap.lifetimeDread) >= 1;
}

/** Whether the Soulreave system itself has been unlocked (UI shows
 *  the button). Distinct from `canSoulreave()` — a player at
 *  Methuselah but below the Dread threshold sees a locked-with-
 *  preview state, not a hidden one. */
export function soulreaveUnlocked(): boolean {
  return (
    gameState.get().stats.totalAscends >=
    BALANCE.SOULREAVE_UNLOCK_TOTAL_ASCENDS
  );
}

/** Whether the player owns a given meta-tree node. */
export function ownsMetaNode(id: MetaNodeId): boolean {
  return gameState.get().metaTree[id] === true;
}

/** Whether a node is currently purchasable: not owned, prereq owned
 *  (or no prereq), and player has enough Soul Shards. */
export function canPurchaseMetaNode(id: MetaNodeId): boolean {
  const node = META_NODES_BY_ID[id];
  if (!node) return false;
  if (ownsMetaNode(id)) return false;
  if (node.requires && !ownsMetaNode(node.requires)) return false;
  return gameState.get().soulShards >= node.cost;
}

/** Spend Soul Shards on a meta-tree node. Mutates state directly +
 *  emits 'meta-node-purchased' and 'soul-shards-changed'. Returns
 *  true on success. */
export function purchaseMetaNode(id: MetaNodeId): boolean {
  if (!canPurchaseMetaNode(id)) return false;
  const node = META_NODES_BY_ID[id];
  // Reach into state via a bespoke accessor — we don't expose
  // arbitrary mutation, so the engine writes through dedicated
  // helpers on GameState (registered below).
  gameState._spendSoulShards(node.cost);
  gameState._setMetaNodeOwned(id, true);
  events.emit('meta-node-purchased', { id, cost: node.cost });
  // Hook the perk's runtime effect (modifier registry / engine flag).
  applyMetaNodeEffect(node);
  return true;
}

/** Perform a Soulreave. Caller MUST gate on `canSoulreave()` first.
 *  Returns the Soul Shards gained, or 0 on failure. */
export function performSoulreave(): number {
  if (!canSoulreave()) return 0;
  const snap = gameState.get();
  const gained = projectedSoulShards(snap.lifetimeDread);

  gameState._applySoulreave(gained);
  // V1.3 — arm Welcome Tribute on every Soulreave (no-op at use time
  // if the node isn't owned; ritual.ts checks before consuming).
  if (ownsMetaNode('WELCOME_TRIBUTE')) {
    gameState._setWelcomeTributeArmed(true);
  }
  events.emit('soulreaved', {
    index: gameState.get().totalSoulreaves,
    soulShardsGained: gained,
  });
  return gained;
}

/** Apply the runtime effect of a meta-tree node. Call once at
 *  purchase time AND once at boot (after applySave) so legacy nodes
 *  re-publish their modifiers. */
export function applyMetaNodeEffect(node: MetaNode): void {
  switch (node.id) {
    case 'ETERNAL_FLAME':
      // +50% rate on the Stray Rat servant only. Published as a
      // standard servantRate mult — the existing rate pipeline will
      // multiply Rat's contribution by 1.5×.
      // NOTE: a per-servant rate isn't supported by the current
      // registry shape (which is global). For MVP we publish a
      // general servantRate mult of 1.5 ONLY when only Rats are
      // owned — but that's brittle. Instead we apply the bonus at
      // tick time via a dedicated flag the rate computation reads.
      // See state.getTotalRate() patch.
      break;
    case 'IRON_WILL':
      // Effect applied at Soulreave time inside `_applySoulreave`.
      // No runtime modifier needed — checking `metaTree.IRON_WILL`
      // there is enough.
      break;
    case 'WELCOME_TRIBUTE':
      // Effect handled at Soulreave fire time + ritual.ts
      // consumption. No modifier registry entry.
      break;
    case 'AUTO_BUY':
      // Polled by the auto-buy loop module each tick.
      break;
    case 'AUTO_ASCEND_PRO':
      // Polled by the auto-ascend module: skip the form-bump pause
      // when this node is owned.
      break;
    case 'ETERNAL_BOND':
      // Effect at Soulreave time (preserve equippedSlots).
      break;
  }
}

/** Boot-time pass: re-apply every owned meta-node's runtime effect.
 *  Called by main.ts after applySave. */
export function reapplyOwnedMetaNodes(): void {
  const snap = gameState.get();
  for (const [id, owned] of Object.entries(snap.metaTree)) {
    if (!owned) continue;
    const node = META_NODES_BY_ID[id as MetaNodeId];
    if (node) applyMetaNodeEffect(node);
  }
}

/** Test-only / cheat support — wipe Soulreave state. NOT exposed
 *  to gameplay, used by the dev cheat panel. */
export function _devResetSoulreave(): void {
  gameState._devWipeSoulreave();
}

// Re-export so cheats can iterate
export { SERVANTS };
