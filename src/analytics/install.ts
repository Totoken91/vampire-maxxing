// L14 — Analytics install. Subscribes the typed `track()` dispatcher
// to the game event bus so every domain emit translates into a
// provider-friendly analytics event. Also handles boot-time events
// (session_started) that don't have a corresponding bus emission.
//
// Idempotent — main.ts calls installAnalytics() once.

import { events } from '../game/events';
import { gameState } from '../game/state';
import { THRALLS_BY_ID, type ThrallId } from '../game/config/thralls';
import { track } from './events';

let installed = false;

export function installAnalytics(opts: { resumed: boolean }): void {
  if (installed) return;
  installed = true;

  // ── Boot snapshot — provides D1 / D7 / D30 cohort context. ────
  const snap = gameState.get();
  const daysSinceFirstLaunch = Math.floor(
    (Date.now() - snap.stats.firstLaunch) / (24 * 60 * 60 * 1000),
  );
  track('session_started', {
    resumed: opts.resumed,
    ichor: gameState.getIchor(),
    thrallsOwned: gameState.ownedThrallCount(),
    totalAscends: gameState.getPrestigeCount(),
    daysSinceFirstLaunch,
  });

  // ── Pull batch — aggregate results into a single event. ───────
  events.on('ritual-pull-performed', ({ banner, results }) => {
    let rareCount = 0;
    let epicCount = 0;
    let dupeCount = 0;
    let cinderCount = 0;
    let frgFired = false;
    let pityRareFired = false;
    let pityEpicFired = false;
    let bundleGuaranteeFired = false;
    for (const r of results) {
      if (r.rarity === 'rare') rareCount += 1;
      if (r.rarity === 'epic') epicCount += 1;
      if (r.wasDupe) dupeCount += 1;
      if (r.isCinder) cinderCount += 1;
      if (r.flags.frg) frgFired = true;
      if (r.flags.pityRare) pityRareFired = true;
      if (r.flags.pityEpic) pityEpicFired = true;
      if (r.flags.bundleGuarantee) bundleGuaranteeFired = true;
    }
    track('pull_performed', {
      banner,
      count: results.length === 10 ? 10 : 1,
      rareCount,
      epicCount,
      dupeCount,
      cinderCount,
      frgFired,
      pityRareFired,
      pityEpicFired,
      bundleGuaranteeFired,
    });
  });

  // ── Ichor flow ───────────────────────────────────────────────
  events.on('ichor-earned', ({ amount, source, balance }) => {
    track('ichor_earned', { source, amount, balance });
  });

  // ichor_spent doesn't have its own event — derive from
  // ichor-changed when the balance dropped. We could refine this
  // later by adding a dedicated ichor-spent event in ichor.ts.
  let lastIchor = gameState.getIchor();
  events.on('ichor-changed', ({ balance }) => {
    if (balance < lastIchor) {
      track('ichor_spent', {
        source: 'ritual_spent',
        amount: lastIchor - balance,
        balance,
      });
    }
    lastIchor = balance;
  });

  events.on('essence-gained', ({ rarity, amount, balance }) => {
    track('essence_gained', { rarity, amount, balance });
  });

  events.on('thrall-obtained', ({ id, firstTime }) => {
    if (!firstTime) return; // first-time only — re-grants are dupes
    const def = THRALLS_BY_ID[id as ThrallId];
    if (!def) return;
    track('thrall_obtained', {
      id,
      rarity: def.rarity,
      archetype: def.archetype,
    });
  });

  events.on('thrall-awakened', ({ id, stars }) => {
    track('thrall_awakened', { id, stars });
  });

  events.on('thrall-equipped', ({ slot, prevId, nextId }) => {
    track('thrall_equipped', { slot, prevId, nextId });
    // L8 tutorial milestone — first equip closes the FTUE loop.
    if (
      nextId &&
      !(gameState.get() as unknown as {
        ichorFlags: Record<string, boolean>;
      }).ichorFlags['ftue:bind_done_tracked']
    ) {
      (gameState.get() as unknown as {
        ichorFlags: Record<string, boolean>;
      }).ichorFlags['ftue:bind_done_tracked'] = true;
      track('tutorial_milestone', { step: 'first_equip' });
    }
  });

  events.on('ascended', ({ form, century, formChanged }) => {
    track('ascended', {
      form,
      century,
      formChanged,
      dread: gameState.getDread(),
    });
  });

  events.on('dread-changed', ({ level }) => {
    track('dread_changed', { level });
  });

  // L8 — tutorial Ichor gift firing is the first reach-step.
  events.on('ichor-earned', ({ source }) => {
    if (source !== 'tutorial_gift') return;
    if (
      (gameState.get() as unknown as {
        ichorFlags: Record<string, boolean>;
      }).ichorFlags['tutorial_gift:tracked']
    )
      return;
    (gameState.get() as unknown as {
      ichorFlags: Record<string, boolean>;
    }).ichorFlags['tutorial_gift:tracked'] = true;
    track('tutorial_milestone', { step: 'tutorial_gift' });
  });

  // L8 — first pull ever fires the FRG flag in the engine, but the
  // analytic moment is "the first ritual any pull-performed event
  // ever fires from a fresh save". We piggyback on pull_performed
  // and gate by a flag.
  events.on('ritual-pull-performed', () => {
    if (
      (gameState.get() as unknown as {
        ichorFlags: Record<string, boolean>;
      }).ichorFlags['first_pull:tracked']
    )
      return;
    (gameState.get() as unknown as {
      ichorFlags: Record<string, boolean>;
    }).ichorFlags['first_pull:tracked'] = true;
    track('tutorial_milestone', { step: 'first_pull' });
  });
}
