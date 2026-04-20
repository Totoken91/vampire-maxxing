// Rite availability checker — shared between the Rites tab (for rendering
// card state) and the tab bar (for the notification dot).
//
// Keep the predicates in one place so a change to cooldowns or rite
// conditions propagates everywhere consistently.

import { gameState } from './state';

export const OFFERING_COOLDOWN_SEC = 4 * 60 * 60; // 4h

/** True when at least one manually-triggered rite can fire right now. */
export function anyRiteUsable(): boolean {
  return (
    canSummonNight() ||
    canOffering() ||
    canInvokeCurse()
    // Embrace the Dawn is triggered only by the offline modal, so we
    // deliberately don't surface it here.
  );
}

export function canSummonNight(): boolean {
  return !gameState.get().boost.active;
}

export function canOffering(): boolean {
  if (gameState.getTotalRate() <= 0) return false;
  return gameState.riteCooldownSec('offering', OFFERING_COOLDOWN_SEC) === 0;
}

export function canInvokeCurse(): boolean {
  if (gameState.getPendingCurseMult() > 1) return false;
  return gameState.getPrestigeCount() >= 1;
}
