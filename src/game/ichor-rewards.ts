// Ichor reward hooks (Phase L3). Drops live one-shot grants onto
// specific milestones, using the `ichorFlags` map in state to
// guarantee each reward fires at most once per save.
//
// Hooks are installed once at boot (see main.ts → installIchorRewards).
// Individual grants funnel through grantIchor() so the ledger + toast
// stay consistent.

import { events } from './events';
import { gameState } from './state';
import { grantIchor, type IchorSource } from './ichor';
import { THRALLS_BY_ID, type ThrallId } from './config/thralls';

/** Prestige milestones (totalAscends threshold → Ichor reward). */
const PRESTIGE_MILESTONES: ReadonlyArray<{ threshold: number; amount: number }> = [
  { threshold: 1, amount: 5 },
  { threshold: 3, amount: 10 },
  { threshold: 5, amount: 15 },
  { threshold: 10, amount: 25 },
  { threshold: 15, amount: 40 },
];

/** Has this one-shot flag already fired? */
function has(flag: string): boolean {
  return Boolean((gameState.get() as unknown as { ichorFlags: Record<string, boolean> }).ichorFlags[flag]);
}

/** Mark a one-shot flag as fired. */
function mark(flag: string): void {
  (gameState.get() as unknown as { ichorFlags: Record<string, boolean> }).ichorFlags[flag] =
    true;
}

function grantOnce(flag: string, amount: number, source: IchorSource): void {
  if (has(flag)) return;
  mark(flag);
  grantIchor(amount, source);
}

function checkPrestigeMilestones(): void {
  const ascends = gameState.getPrestigeCount();
  for (const { threshold, amount } of PRESTIGE_MILESTONES) {
    if (ascends < threshold) break; // array sorted ascending → safe
    const flag = `prestige:${threshold}`;
    if (has(flag)) continue;
    grantOnce(flag, amount, 'milestone_prestige');
  }
}

function checkThrallAchievements(id: ThrallId): void {
  const t = THRALLS_BY_ID[id];
  if (!t) return;

  // First Rare (any rarity == 'rare')
  if (t.rarity === 'rare' && !has('first:rare')) {
    grantOnce('first:rare', 5, 'achievement_first_rare');
  }
  // First Epic (any rarity == 'epic')
  if (t.rarity === 'epic' && !has('first:epic')) {
    grantOnce('first:epic', 10, 'achievement_first_epic');
  }
  // Collection complete — fire when the 12th distinct thrall lands.
  if (!has('collection') && gameState.ownedThrallCount() >= 12) {
    grantOnce('collection', 100, 'achievement_collection');
  }
}

/**
 * Install runtime listeners. Idempotent — main.ts calls this once.
 * Also runs a retroactive check on boot so existing saves claim any
 * milestone they've already passed (grandfathering).
 */
export function installIchorRewards(): void {
  events.on('ascended', () => checkPrestigeMilestones());
  events.on('thrall-obtained', ({ id, firstTime }) => {
    // Only first-time grants count toward achievements — duplicates
    // will eventually feed Essences (L6), not Ichor.
    if (firstTime) checkThrallAchievements(id);
  });

  // Retroactive grandfathering. A returning player who already ascended
  // past threshold 5 but never received the drop (because the reward
  // didn't exist) gets it now. Same logic for collection completion.
  checkPrestigeMilestones();
  // Thrall achievements — scan owned set.
  for (const [thrallId, state] of Object.entries(
    (gameState.get() as unknown as {
      playerThralls: Record<string, { owned: boolean }>;
    }).playerThralls,
  )) {
    if (state.owned) checkThrallAchievements(thrallId as ThrallId);
  }
}
