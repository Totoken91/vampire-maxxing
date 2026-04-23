// First-Time User Experience cues.
// Per specs/ONBOARDING.md — zero text tutorial, purely visual affordance
// hints that auto-retract on the first meaningful action.

import { events } from '../game/events';
import { gameState } from '../game/state';
import { showToast } from '../ui/components/toast';

const PULSE_DELAY_MS = 2000;
const STRAY_RAT_UNLOCK_BLOOD = 10;

export function installFtue(): void {
  if (!gameState.isFirstSession()) return;

  let pulseTimer: number | null = null;
  let pulseActive = false;
  let tapCount = 0;
  let awakenedShown = false;
  let strayRatGlowActive = false;
  let firstSparkShown = false;

  const stopPulse = (): void => {
    if (pulseTimer !== null) {
      window.clearTimeout(pulseTimer);
      pulseTimer = null;
    }
    if (pulseActive) {
      document.body.classList.remove('ftue-portrait-pulse');
      pulseActive = false;
    }
  };

  // 1. After 2 seconds with no tap, pulse the portrait to invite the first tap.
  pulseTimer = window.setTimeout(() => {
    document.body.classList.add('ftue-portrait-pulse');
    pulseActive = true;
  }, PULSE_DELAY_MS);

  // 2. On first tap → kill pulse. At 3 taps → AWAKENED toast.
  events.on('tapped', () => {
    stopPulse();
    tapCount += 1;
    if (tapCount === 3 && !awakenedShown) {
      awakenedShown = true;
      showToast('AWAKENED', 'Your bloodline stirs once more.');
    }
  });

  // 3. Highlight Stray Rat the moment it becomes affordable for the first time.
  events.on('blood-changed', ({ blood }) => {
    if (strayRatGlowActive) return;
    if (blood < STRAY_RAT_UNLOCK_BLOOD) return;
    if (gameState.get().servants.rat.owned > 0) return;
    const card = document.querySelector<HTMLElement>('[data-servant="rat"]');
    if (!card) return;
    card.classList.add('ftue-glow');
    strayRatGlowActive = true;
  });

  // 4. First Stray Rat purchased → FIRST SPARK toast (overrides the default
  // CLAIMED), and remove the highlight.
  events.on('servant-bought', ({ id, owned }) => {
    if (id !== 'rat' || owned !== 1) return;
    if (strayRatGlowActive) {
      document
        .querySelector<HTMLElement>('[data-servant="rat"]')
        ?.classList.remove('ftue-glow');
      strayRatGlowActive = false;
    }
    if (!firstSparkShown) {
      firstSparkShown = true;
      // Main.ts fires a CLAIMED toast on first purchase; showToast replaces
      // any existing toast, so FIRST SPARK wins by being registered later.
      showToast('FIRST SPARK', 'The vermin know your name.');
    }
  });
}
