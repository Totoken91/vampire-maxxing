// K1 Century upgrade impact — the "oh putain" moment when the player
// crosses from Century N → N+1. Fires four parallel channels:
//   1. Flash: crimson-white full-screen glow, peak 150ms, total 550ms
//   2. Shake: .app root translated on a 5-step easing, 300ms total
//   3. Pulse: portrait body scales 1 → 1.3 → 1 over 220ms
//   4. Haptic: 80ms vibration on supporting mobile devices
//
// Purely cosmetic — no game-state side effects. Safe to call at any
// time. Respects prefers-reduced-motion by skipping shake + pulse +
// haptic but keeping a softer flash (so the visual ack still fires).

const FLASH_ANIMATION_MS = 550;
const SHAKE_ANIMATION_MS = 320;
const PULSE_ANIMATION_MS = 220;
const HAPTIC_MS = 80;

export function triggerCenturyUpgrade(portraitBody: HTMLElement): void {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  fireFlash(reducedMotion);
  if (reducedMotion) return;
  fireShake();
  firePulse(portraitBody);
  fireHaptic();
}

function fireFlash(reducedMotion: boolean): void {
  const flash = document.createElement('div');
  flash.className = reducedMotion
    ? 'century-upgrade-flash century-upgrade-flash--reduced'
    : 'century-upgrade-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.appendChild(flash);
  window.setTimeout(() => flash.remove(), FLASH_ANIMATION_MS + 50);
}

function fireShake(): void {
  const target = document.querySelector<HTMLElement>('.app') ?? document.body;
  target.classList.add('is-century-shake');
  window.setTimeout(
    () => target.classList.remove('is-century-shake'),
    SHAKE_ANIMATION_MS,
  );
}

function firePulse(body: HTMLElement): void {
  body.classList.add('portrait__body--century-pulse');
  window.setTimeout(
    () => body.classList.remove('portrait__body--century-pulse'),
    PULSE_ANIMATION_MS + 20,
  );
}

function fireHaptic(): void {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(HAPTIC_MS);
    } catch {
      // Some browsers throw without user gesture; silently ignore.
    }
  }
}
