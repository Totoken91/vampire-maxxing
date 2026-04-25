// Game loop built on requestAnimationFrame.
// Physics runs every frame; UI hooks fire at ~10 Hz via the 'tick' event.

import { gameState } from './state';
import { tickAutoAscend } from './auto-ascend';
import { tickAutoBuy } from './auto-buy';

let rafId: number | null = null;
let lastTime = 0;
let autoAscendAccum = 0;

function tick(time: number): void {
  if (lastTime === 0) {
    lastTime = time;
  }
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  gameState.tickPassive(dt);

  // V1.2-HF1 — Auto-ascend tick. Throttled to ~2 Hz so the canAscend
  // check doesn't fire 60×/sec needlessly; ascend gating is itself
  // a fast read but the ascend itself launches a cinematic so it
  // shouldn't run on every frame anyway.
  autoAscendAccum += dt;
  if (autoAscendAccum >= 0.5) {
    autoAscendAccum = 0;
    tickAutoAscend();
  }

  // V1.3 — Auto-buy tick. Internal 3s accumulator inside the module;
  // we just feed it the dt every frame.
  tickAutoBuy(dt);

  rafId = requestAnimationFrame(tick);
}

export function startLoop(): void {
  if (rafId !== null) return;
  lastTime = 0;
  rafId = requestAnimationFrame(tick);
}

export function stopLoop(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastTime = 0;
}
