// L6 — wire awakening + equip lifecycle into the modifier registry.
// Lives in its own module to avoid a circular dep between state.ts
// and awakening.ts (state emits events; this module subscribes and
// calls into awakening.ts which reads back from state).

import { events } from './events';
import { gameState } from './state';
import {
  publishThrallModifiers,
  rehydrateEquippedModifiers,
  republishAllEquipped,
  withdrawThrallModifiers,
} from './awakening';
import { THRALLS_BY_ID } from './config/thralls';

const AMPLIFIER_ID = 'ashen-vale';

let installed = false;

export function installAwakening(): void {
  if (installed) return;
  installed = true;

  // Re-publish modifiers for thralls already equipped in the loaded
  // save. Must run AFTER state.loadFromStorage().
  rehydrateEquippedModifiers();

  // Equip slot mutations swap modifiers in/out of the registry.
  // Cascade rule: any change involving the amplifier (Ashen Vale)
  // OR a thrall whose bespoke depends on equipped composition
  // (cross_archetype) requires republishing all equipped buddies.
  events.on('thrall-equipped', ({ prevId, nextId }) => {
    if (prevId) withdrawThrallModifiers(prevId);
    if (nextId) publishThrallModifiers(nextId);

    // Amplifier swap: republish everyone else's primary so the
    // boost applies / un-applies cleanly.
    const touchesAmplifier =
      prevId === AMPLIFIER_ID || nextId === AMPLIFIER_ID;
    // Cross-archetype-count change: any equipped thrall with a
    // cross_archetype_blood mechanic recomputes its bonus.
    const touchesCrossArchetype = composedHasCrossArchetype();
    if (touchesAmplifier || touchesCrossArchetype) {
      republishAllEquipped(nextId ?? undefined);
    }
  });

  // Awakening an equipped thrall re-publishes its modifier with the
  // new star-amplified value. If the awakened thrall is the
  // amplifier (Ashen Vale), republish all other equipped buddies
  // since their effective primaries depend on Ashen's stars.
  events.on('thrall-awakened', ({ id }) => {
    if (gameState.isThrallEquipped(id)) {
      publishThrallModifiers(id);
    }
    if (id === AMPLIFIER_ID && gameState.isThrallEquipped(AMPLIFIER_ID)) {
      republishAllEquipped(AMPLIFIER_ID);
    }
  });

  // Per-ascend bespoke (Ash) reads `stats.totalAscends` at publish
  // time, so every ascend invalidates the modifier value. Republish
  // all equipped — cheap, and lets us extend later without changing
  // the hook.
  events.on('ascended', () => {
    republishAllEquipped();
  });
}

/** True iff at least one currently equipped thrall has a
 *  cross_archetype mechanic. Used to decide whether to cascade
 *  republish on equip changes. */
function composedHasCrossArchetype(): boolean {
  for (const id of gameState.getEquippedSlots()) {
    if (!id) continue;
    const def = THRALLS_BY_ID[id];
    for (const m of def.bespoke ?? []) {
      if (m.kind === 'cross_archetype_blood') return true;
    }
  }
  return false;
}
