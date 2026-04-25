// V1.2-HF1 — Auto-ascend engine.
//
// Unlocked at Methuselah Century III (totalAscends ≥ 250). When the
// player's `settings.autoAscend` is true, this module fires an ascend
// automatically as soon as canAscend() flips, with one safety carve-out:
// PAUSE auto when the next ascend would cross a Form-bump threshold,
// so the player sees the cinematic transition manually.
//
// Plumbing: hooks into the game loop via tickAutoAscend(), called once
// per rAF frame after gameState.tickPassive(). The rAF callback is
// already on the main thread so no extra scheduler is needed.
//
// Re-arming after a Form bump: the pause is one-shot per form. Once
// the player ascends manually into the new form, auto resumes for
// the next 49 ascends (until the next 250-step boundary).

import { events } from './events';
import { gameState } from './state';
import { getCurrentForm } from './forms';
import { playAscensionFx } from '../fx/ascension';

/** Methuselah Century III. Auto-ascend toggle is hidden + locked
 *  before this milestone — the player needs to feel the manual cadence
 *  long enough to understand what auto saves them from.
 *
 *  Form thresholds (totalAscends): NEWBORN 0 / ELDER 1 / LORD 3 /
 *  METHUSELAH 7 / PROGENITOR 15 / TERA 30 / HORROR 50 / THIRST 100.
 *  Century within a form = totalAscends - formThreshold + 1, so
 *  Methuselah Century III = totalAscends 9 (Methuselah threshold 7
 *  + 2 ascends into the form). */
const AUTO_ASCEND_UNLOCK_ASCENDS = 9;

let pausedForFormBump = false;

/** Whether the auto-ascend feature has been unlocked yet. UI consumes
 *  this to gate the toggle row (hide entirely below the threshold). */
export function autoAscendUnlocked(): boolean {
  return gameState.getPrestigeCount() >= AUTO_ASCEND_UNLOCK_ASCENDS;
}

/** Whether auto-ascend is currently active (unlocked + toggle ON +
 *  not paused for a form bump). UI consumes this to render the inline
 *  "AUTO" badge on the Ascend modal. */
export function autoAscendActive(): boolean {
  if (!autoAscendUnlocked()) return false;
  const settings = (gameState.get() as unknown as {
    settings: { autoAscend: boolean };
  }).settings;
  if (!settings.autoAscend) return false;
  if (pausedForFormBump) return false;
  return true;
}

/** Manual reset of the form-bump pause. Called when the Ascend modal
 *  closes after a manual ascend that bumped the form — the player has
 *  seen the cinematic and we can resume automation. */
export function resumeAutoAscend(): void {
  pausedForFormBump = false;
}

/** Frame-level hook. Cheap (single boolean check most calls) so safe
 *  to call from every rAF tick. */
export function tickAutoAscend(): void {
  if (!autoAscendActive()) return;
  if (!gameState.canAscend()) return;
  if (gameState.projectedDreadGain() < 1) return;

  // Detect form-bump: if the next ascend would cross a form threshold,
  // pause auto and let the player ascend manually for the cinematic.
  // V1.3 — AUTO_ASCEND_PRO meta-node bypasses this pause; the player
  // explicitly bought the perk to remove the friction.
  const nextAscends = gameState.getPrestigeCount() + 1;
  const formBefore = getCurrentForm(gameState.getPrestigeCount());
  const formAfter = getCurrentForm(nextAscends);
  const hasAutoAscendPro =
    gameState.getMetaTree()['AUTO_ASCEND_PRO'] === true;
  if (formBefore !== formAfter && !hasAutoAscendPro) {
    pausedForFormBump = true;
    events.emit('auto-ascend-paused', { reason: 'form-bump' });
    return;
  }

  // Fire ascend with the standard cinematic so juice still feels
  // weighty even on automated firings.
  void playAscensionFx(() => gameState.ascend());
}
