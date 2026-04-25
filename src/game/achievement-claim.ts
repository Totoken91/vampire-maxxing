// L_QUESTS — achievement claim flow. Replaces the silent unlock with
// a "earned → queued → claimed" goal-gradient cycle. Players hit
// CLAIM in the Tome to actually pocket the Ichor; CLAIM ALL flushes
// the entire queue with one batched grant so the patch backfill
// doesn't feel like a chore list.

import { events } from './events';
import { gameState } from './state';
import { grantIchor } from './ichor';
import { ACHIEVEMENTS_BY_ID } from './config/achievements';

/** Claim a single achievement by id. Returns the granted Ichor amount,
 *  or 0 if the id wasn't claimable (already claimed, unknown id, or
 *  zero reward). */
export function claimAchievement(id: string): number {
  const def = ACHIEVEMENTS_BY_ID[id];
  if (!def || def.ichorReward <= 0) return 0;
  if (!gameState.getUnclaimedAchievements().has(id)) return 0;
  gameState.markAchievementClaimed(id);
  const credited = grantIchor(def.ichorReward, 'achievement_claim');
  events.emit('achievement-claimed', { id, ichor: credited });
  return credited;
}

/** Flush the entire unclaimed-achievement queue. Returns the total
 *  Ichor actually credited (clipped at the soft cap). Used by the
 *  CLAIM ALL CTA — the most common path for the patch backfill, since
 *  legacy players will land with a queue of ≥10 entries on first
 *  launch. */
export function claimAllAchievements(): {
  count: number;
  totalIchor: number;
  ids: string[];
} {
  const ids = Array.from(gameState.getUnclaimedAchievements());
  let totalIchor = 0;
  let count = 0;
  for (const id of ids) {
    const got = claimAchievement(id);
    if (got > 0) {
      totalIchor += got;
      count += 1;
    }
  }
  return { count, totalIchor, ids };
}
