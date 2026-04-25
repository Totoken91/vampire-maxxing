// L_QUESTS — wires every relevant gameplay event into the quest
// metric tracker. Call once at boot from main.ts.
//
// Mapping:
//   tapped               → taps_today
//   servant-bought       → servants_bought_today
//   ritual-pull-performed → pulls_today (count = results.length)
//   thrall-awakened      → awakenings_today
//   ascended             → ascends_today
//   ichor-earned         → ichor_earned_today (any source — the quest
//                          rewards count toward "Earn five Ichor")
//   thrall-equipped      → equips_today (only when nextId !== null)
//   rite-used            → rites_used_today
//
// Idempotent — main.ts calls installQuestTracking() once.

import { events } from './events';
import { rotateIfNeeded, recordMetric } from './quests';

let installed = false;

export function installQuestTracking(): void {
  if (installed) return;
  installed = true;

  // Cheap rotation poke so a midnight cross-over while the player is
  // tabbed-out doesn't leave the active quest stale on next interact.
  rotateIfNeeded();

  events.on('tapped', () => recordMetric('taps_today', 1));
  events.on('servant-bought', () => recordMetric('servants_bought_today', 1));
  events.on('ritual-pull-performed', ({ results }) => {
    recordMetric('pulls_today', results.length);
  });
  events.on('thrall-awakened', () => recordMetric('awakenings_today', 1));
  events.on('ascended', () => recordMetric('ascends_today', 1));
  events.on('ichor-earned', ({ amount }) => {
    recordMetric('ichor_earned_today', amount);
  });
  events.on('thrall-equipped', ({ nextId }) => {
    if (nextId !== null) recordMetric('equips_today', 1);
  });
  events.on('rite-used', () => recordMetric('rites_used_today', 1));
}
