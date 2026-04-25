// V1.3 SOULREAVE — Auto-Buy meta-tree node engine.
//
// Once AUTO_BUY is owned, the loop fires this tick every 3 seconds.
// The strategy is "cheapest affordable, highest-tier first" — among
// the servants the player can currently afford, pick the
// highest-tier one and buy a single copy. If no high tier is
// affordable, fall back to the next tier down.
//
// Why "highest-tier first" instead of "cheapest": the cheapest
// servant is almost always Stray Rats, which the player already
// owns hundreds of and which auto-buying further would feel
// pointless. The high-tier-first heuristic mirrors what an engaged
// player does manually — push the unlock curve forward — so auto-
// buy actually frees up attention rather than burning Blood.

import { gameState } from './state';
import { SERVANTS } from './config/servants';
import { isServantUnlocked } from './math';

const AUTO_BUY_INTERVAL_SEC = 3;

let accum = 0;

export function autoBuyEnabled(): boolean {
  return gameState.getMetaTree()['AUTO_BUY'] === true;
}

/** Frame-level hook. Cheap (single boolean check most calls). */
export function tickAutoBuy(dt: number): void {
  if (!autoBuyEnabled()) return;
  accum += dt;
  if (accum < AUTO_BUY_INTERVAL_SEC) return;
  accum = 0;

  // Walk highest-tier → lowest. Buy 1 copy of the highest tier the
  // player can afford. Returning early after one purchase keeps the
  // pace gentle — auto-buy is a quality-of-life perk, not a cheat.
  const lifetime = gameState.get().totalLifetimeBlood;
  for (let i = SERVANTS.length - 1; i >= 0; i -= 1) {
    const s = SERVANTS[i];
    if (
      isServantUnlocked(s.unlockTotal, lifetime) &&
      gameState.isServantAffordable(s.id)
    ) {
      if (gameState.buyServant(s.id)) {
        // buyServant already emits 'servant-bought'; no double-emit.
        return;
      }
    }
  }
}

/** Reset internal accumulator — called from cheats or hot-reload
 *  paths so the next purchase doesn't fire instantly after a state
 *  rebuild. */
export function resetAutoBuyAccum(): void {
  accum = 0;
}
