// Game loop built on requestAnimationFrame.
// Physics runs every frame; UI hooks fire at ~10 Hz via the 'tick' event.

import { gameState } from './state';

let rafId: number | null = null;
let lastTime = 0;

function tick(time: number): void {
  if (lastTime === 0) {
    lastTime = time;
  }
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  gameState.tickPassive(dt);

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
