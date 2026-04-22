// K1 Blood-tick VFX — single effect: a small crimson particle spawns on
// every integer blood increment from passive production. Silent on
// Century I (the player hasn't "awakened"); active from C2 onward with
// a per-century spawn throttle so density scales with the fantasy —
// C2 is a sparse ember drift, C5 is a constant swarm.
//
// Reads on 'tick' (physics loop, up to 60 Hz) and tracks floor(blood)
// between ticks. Positive deltas spawn particles; buys/ascend emit
// 'blood-changed' separately and never drive floor upward so they're
// naturally filtered out.

import { events } from '../game/events';
import { gameState } from '../game/state';
import { getCenturyInForm } from '../game/forms';

const PARTICLE_LIFETIME_MS = 600;
const MAX_LIVE_PARTICLES = 8;

// Per-century spawn throttle (ms between spawns).
//   C2 sparse / "awakening"
//   C5 dense  / "apotheosis"
// Combined with MAX_LIVE_PARTICLES, this is the effective rhythm.
const PARTICLE_MIN_GAP_BY_CENTURY: Record<number, number> = {
  2: 400,
  3: 260,
  4: 180,
  5: 110,
};
const PARTICLE_FALLBACK_GAP_MS = 400;

// C5 particle palette — random pick per spawn gives the "unstable
// multi-hue power" reading.
const C5_PARTICLE_PALETTE: readonly { bg: string; glow: string }[] = [
  { bg: '#c91818', glow: 'rgba(201, 24, 24, 0.85)' },
  { bg: '#6a2aa0', glow: 'rgba(106, 42, 160, 0.75)' },
  { bg: '#c9a961', glow: 'rgba(201, 169, 97, 0.75)' },
];

let installed = false;
let bodyRef: HTMLElement | null = null;
let lastBloodFloor = 0;
let offTick: (() => void) | null = null;
let liveParticles = 0;
let lastParticleAt = 0;

export function installBloodTick(portraitBody: HTMLElement): () => void {
  if (installed) return noop;
  installed = true;
  bodyRef = portraitBody;
  lastBloodFloor = Math.floor(gameState.get().blood);
  offTick = events.on('tick', onTick);
  return uninstall;
}

function uninstall(): void {
  if (!installed) return;
  offTick?.();
  offTick = null;
  bodyRef = null;
  installed = false;
}

function noop(): void {
  /* no teardown when install was a no-op */
}

function onTick(): void {
  if (!bodyRef) return;

  const century = getCenturyInForm(gameState.getPrestigeCount());
  if (century < 2) {
    // Reset baseline so crossing into C2 doesn't fire a storm of spawns
    // for the pre-awakening blood.
    lastBloodFloor = Math.floor(gameState.get().blood);
    return;
  }

  const nowFloor = Math.floor(gameState.get().blood);
  if (nowFloor <= lastBloodFloor) return;
  lastBloodFloor = nowFloor;

  maybeSpawnParticle(century);
}

function maybeSpawnParticle(century: number): void {
  if (!bodyRef) return;
  if (liveParticles >= MAX_LIVE_PARTICLES) return;
  const now = performance.now();
  const gap =
    PARTICLE_MIN_GAP_BY_CENTURY[century] ?? PARTICLE_FALLBACK_GAP_MS;
  if (now - lastParticleAt < gap) return;
  lastParticleAt = now;
  spawnParticle(century);
}

function spawnParticle(century: number): void {
  if (!bodyRef) return;
  const p = document.createElement('span');
  p.className = 'portrait__tick-particle';
  p.setAttribute('aria-hidden', 'true');

  // C5 picks from the crimson / violet / dark-gold palette per spawn.
  if (century === 5) {
    const pick =
      C5_PARTICLE_PALETTE[
        Math.floor(Math.random() * C5_PARTICLE_PALETTE.length)
      ];
    p.style.background = pick.bg;
    p.style.boxShadow = `0 0 6px ${pick.glow}`;
  }

  // Pick a random edge, then offset 3-13% inward and 6-94% along so
  // particles scatter in a band rather than tracing a 4-line rectangle.
  // The inset also keeps every particle fully inside the body so
  // overflow:hidden never clips half of them.
  const edge = Math.floor(Math.random() * 4);
  const along = `${6 + Math.random() * 88}%`;
  const inset = `${3 + Math.random() * 10}%`;
  if (edge === 0) {
    p.style.top = inset;
    p.style.left = along;
  } else if (edge === 1) {
    p.style.right = inset;
    p.style.top = along;
  } else if (edge === 2) {
    p.style.bottom = inset;
    p.style.left = along;
  } else {
    p.style.left = inset;
    p.style.top = along;
  }
  bodyRef.appendChild(p);
  liveParticles += 1;
  window.setTimeout(() => {
    p.remove();
    liveParticles -= 1;
  }, PARTICLE_LIFETIME_MS + 50);
}
