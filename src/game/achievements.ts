// Achievement check loop. Cheap: 20 predicates, each a single property
// read. Runs on the events that could actually flip a predicate
// (thrall-bought, form-changed, tick) plus once on boot after the save
// is restored to catch anything the first run skipped.

import { ACHIEVEMENTS } from './config/achievements';
import { events } from './events';
import { gameState } from './state';

/** Run every predicate once. Unlock and emit for any that flipped. */
export function checkAchievements(): string[] {
  const snap = gameState.get();
  const newly: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (gameState.hasAchievement(def.id)) continue;
    if (def.predicate(snap)) {
      gameState.unlockAchievement(def.id);
      newly.push(def.id);
      events.emit('achievement-unlocked', { id: def.id });
    }
  }
  return newly;
}

/**
 * Install checks on the events that can move a predicate. tick is
 * throttled to once per second so time-based achievements still fire
 * without running every rAF.
 */
export function installAchievementChecks(): void {
  events.on('servant-bought', () => checkAchievements());
  events.on('form-changed', () => checkAchievements());

  let tickAccum = 0;
  events.on('tick', ({ dt }) => {
    tickAccum += dt;
    if (tickAccum >= 1) {
      tickAccum = 0;
      checkAchievements();
    }
  });
}
