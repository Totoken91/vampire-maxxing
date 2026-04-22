// K1 Blood-tick VFX — event-driven pulses fired on integer blood
// increments from passive production. No continuous animation on the
// frame / body; every effect is triggered by a gameplay event so the
// frame never reads as a "tap me" CTA.
//
// Frequency scales naturally with the game loop: 1 blood/sec → ~1 pulse/
// sec, 60 blood/sec → ~60 pulses/sec (60 Hz RAF cap). Above that each
// pulse absorbs extra deltas as intensity — the frame feels like it's
// boiling without exceeding the display refresh rate.
//
// Layered effects per century (each layer composes on the previous):
//   C1 — silent (the player hasn't awakened)
//   C2 — tint flash + crimson particle (warm red-orange)
//   C3 — + reflective sweep across the frame ornaments, light 3D tilt
//   C4 — + chromatic aberration on the frame proportional to rate,
//         stronger 3D tilt, reflects more frequent
//   C5 — + spectral halo box-shadow pulse, particles alternate
//         crimson/violet/gold, strongest 3D tilt, reflects almost
//         every pulse
//
// Heavy effects (reflect, tilt, halo) are time-throttled — their own
// animations must finish before re-triggering, or at very high rate
// they'd fuse into a constant glow and lose impact.

import { events } from '../game/events';
import { gameState } from '../game/state';
import { getCenturyInForm } from '../game/forms';

const RAYS_BURST_CLASS = 'portrait__rays--burst';
const RAYS_BURST_MS = 720;
const FRAME_TILT_CLASS = 'portrait__frame--tilt-pulse';
const FRAME_TILT_MS = 180;
const FRAME_REFLECT_CLASS = 'portrait__frame-reflect--sweep';
const FRAME_REFLECT_MS = 420;
const HALO_CLASS = 'portrait__body--halo-pulse';
const HALO_MS = 320;
const PARTICLE_LIFETIME_MS = 600;
const MAX_LIVE_PARTICLES = 8;
const MAX_INTENSITY = 3;

// Per-century particle spawn throttle (ms between spawns). C2 stays
// sparse — a few embers per second, reads as "awakening". C5 is dense
// — nearly continuous, reads as "apotheosis". Without this cap, at
// high production rate we'd saturate MAX_LIVE_PARTICLES every frame
// and the frame would strobe red.
const PARTICLE_MIN_GAP_BY_CENTURY: Record<number, number> = {
  2: 400,
  3: 260,
  4: 180,
  5: 110,
};
const PARTICLE_FALLBACK_GAP_MS = 400;

// Minimum ms gap between successive triggers. Each gap MUST be >= its
// animation duration + a rest margin; otherwise the next trigger fires
// while the previous animation is still playing, classList cycling
// restarts it, and at 60 Hz ticks we get a visible tremor.
// At 60 Hz ticks at very high production, these are the real cadence
// of each effect — NOT the physics tick rate. Each gap is the anim
// duration + rest margin, so a new trigger never interrupts a running
// anim. Numbers tuned so the frame reads as "pulsed" (distinct beats
// with clear rest between) rather than "strobing".
const RAYS_MIN_GAP_MS = 780; // anim 720 + 60ms rest — clear burst cadence
const REFLECT_MIN_GAP_MS = 560; // anim 420 + margin
const TILT_MIN_GAP_MS = 320; // anim 180 + margin
const HALO_MIN_GAP_MS = 480; // anim 320 + margin

// C5 particle palette — random pick per pulse gives the "unstable
// multi-hue power" reading Kenny specced.
const C5_PARTICLE_PALETTE: readonly { bg: string; glow: string }[] = [
  { bg: '#c91818', glow: 'rgba(201, 24, 24, 0.85)' },
  { bg: '#6a2aa0', glow: 'rgba(106, 42, 160, 0.75)' },
  { bg: '#c9a961', glow: 'rgba(201, 169, 97, 0.75)' },
];

let installed = false;
let bodyRef: HTMLElement | null = null;
let raysRef: HTMLElement | null = null;
let frameRef: HTMLImageElement | null = null;
let reflectRef: HTMLElement | null = null;
let lastBloodFloor = 0;
let offTick: (() => void) | null = null;
let offRateChanged: (() => void) | null = null;
let liveParticles = 0;
let lastRaysAt = 0;
let lastReflectAt = 0;
let lastTiltAt = 0;
let lastHaloAt = 0;
let lastParticleAt = 0;
// Pending class-removal timeouts. Cleared on re-fire so two in-flight
// animations don't cross-clobber each other's cleanup.
let raysTimeout: number | null = null;
let reflectTimeout: number | null = null;
let tiltTimeout: number | null = null;
let haloTimeout: number | null = null;

export function installBloodTick(portraitBody: HTMLElement): () => void {
  if (installed) return noop;
  installed = true;
  bodyRef = portraitBody;
  raysRef = portraitBody.querySelector<HTMLElement>('.portrait__rays');
  frameRef = portraitBody.querySelector<HTMLImageElement>('.portrait__frame');
  reflectRef = portraitBody.querySelector<HTMLElement>(
    '.portrait__frame-reflect',
  );
  lastBloodFloor = Math.floor(gameState.get().blood);
  offTick = events.on('tick', onTick);
  offRateChanged = events.on('rate-changed', updateChromaticOffset);
  updateChromaticOffset();
  return uninstall;
}

function uninstall(): void {
  if (!installed) return;
  offTick?.();
  offRateChanged?.();
  offTick = null;
  offRateChanged = null;
  if (raysTimeout !== null) window.clearTimeout(raysTimeout);
  if (reflectTimeout !== null) window.clearTimeout(reflectTimeout);
  if (tiltTimeout !== null) window.clearTimeout(tiltTimeout);
  if (haloTimeout !== null) window.clearTimeout(haloTimeout);
  raysTimeout = reflectTimeout = tiltTimeout = haloTimeout = null;
  bodyRef = null;
  raysRef = null;
  frameRef = null;
  reflectRef = null;
  installed = false;
}

function noop(): void {
  /* no teardown when install was a no-op */
}

/**
 * C4 chromatic aberration intensity — writes --chromatic-offset on the
 * body. CSS only consumes it under [data-century='4'], so this is safe
 * to run unconditionally.
 *
 * Softer mapping (Kenny said the previous one was "beaucoup trop fort"):
 *   log10(rate) * 0.5, clamped to [0, 1.5]
 *     rate 0      → 0
 *     rate 10     → 0.5px
 *     rate 100    → 1px
 *     rate 1000+  → 1.5px  (capped)
 * Combined with the 0.5× multiplier in the CSS rule, the actual visible
 * offset tops out at ~0.75px per drop-shadow side.
 */
function updateChromaticOffset(): void {
  if (!bodyRef) return;
  const rate = gameState.getTotalRate();
  const offset = Math.min(1.5, Math.log10(Math.max(1, rate)) * 0.5);
  bodyRef.style.setProperty('--chromatic-offset', offset.toFixed(2));
}

function onTick(): void {
  if (!bodyRef) return;

  const century = getCenturyInForm(gameState.getPrestigeCount());
  if (century < 2) {
    // Reset baseline so when the player crosses into Century II we don't
    // fire a storm of pulses for the blood that accumulated pre-awakening.
    lastBloodFloor = Math.floor(gameState.get().blood);
    return;
  }

  const nowFloor = Math.floor(gameState.get().blood);
  if (nowFloor <= lastBloodFloor) return;

  const delta = nowFloor - lastBloodFloor;
  lastBloodFloor = nowFloor;

  // 1 integer increment per frame = baseline intensity. More than that
  // means the game loop caught multiple increments this frame — amplify
  // the single pulse rather than queuing more (keeps us at ~60 Hz cap).
  const intensity = Math.min(MAX_INTENSITY, delta);

  // C5 randomises the ray colour per burst — crimson / violet / gold.
  if (century === 5 && bodyRef) {
    const r = Math.random();
    const picked =
      r < 0.55
        ? 'rgba(168, 24, 24, 0.9)'
        : r < 0.85
          ? 'rgba(106, 42, 160, 0.8)'
          : 'rgba(201, 169, 97, 0.75)';
    bodyRef.style.setProperty('--ray-color', picked);
  }

  fireRaysBurst(intensity);
  maybeSpawnParticle(century);

  // C3+ reflective sweep + subtle 3D tilt, throttled by their own
  // animation duration.
  if (century >= 3) {
    maybeFireReflect(intensity);
    maybeFireTilt(intensity);
  }

  // C5 spectral halo on the body itself.
  if (century === 5) {
    maybeFireHalo(intensity);
  }
}

function fireRaysBurst(intensity: number): void {
  if (!raysRef) return;
  const now = performance.now();
  if (now - lastRaysAt < RAYS_MIN_GAP_MS) return;
  lastRaysAt = now;
  if (raysTimeout !== null) window.clearTimeout(raysTimeout);
  raysRef.style.setProperty('--tick-intensity', String(intensity));
  raysRef.classList.remove(RAYS_BURST_CLASS);
  void raysRef.offsetWidth;
  raysRef.classList.add(RAYS_BURST_CLASS);
  raysTimeout = window.setTimeout(() => {
    raysRef?.classList.remove(RAYS_BURST_CLASS);
    raysTimeout = null;
  }, RAYS_BURST_MS + 20);
}

function maybeFireReflect(intensity: number): void {
  if (!reflectRef) return;
  const now = performance.now();
  if (now - lastReflectAt < REFLECT_MIN_GAP_MS) return;
  lastReflectAt = now;
  if (reflectTimeout !== null) window.clearTimeout(reflectTimeout);
  reflectRef.style.setProperty('--tick-intensity', String(intensity));
  reflectRef.classList.remove(FRAME_REFLECT_CLASS);
  void reflectRef.offsetWidth;
  reflectRef.classList.add(FRAME_REFLECT_CLASS);
  reflectTimeout = window.setTimeout(() => {
    reflectRef?.classList.remove(FRAME_REFLECT_CLASS);
    reflectTimeout = null;
  }, FRAME_REFLECT_MS + 20);
}

function maybeFireTilt(intensity: number): void {
  if (!frameRef) return;
  const now = performance.now();
  if (now - lastTiltAt < TILT_MIN_GAP_MS) return;
  lastTiltAt = now;
  if (tiltTimeout !== null) window.clearTimeout(tiltTimeout);
  frameRef.style.setProperty('--tick-intensity', String(intensity));
  frameRef.classList.remove(FRAME_TILT_CLASS);
  void frameRef.offsetWidth;
  frameRef.classList.add(FRAME_TILT_CLASS);
  tiltTimeout = window.setTimeout(() => {
    frameRef?.classList.remove(FRAME_TILT_CLASS);
    tiltTimeout = null;
  }, FRAME_TILT_MS + 20);
}

function maybeFireHalo(intensity: number): void {
  if (!bodyRef) return;
  const now = performance.now();
  if (now - lastHaloAt < HALO_MIN_GAP_MS) return;
  lastHaloAt = now;
  if (haloTimeout !== null) window.clearTimeout(haloTimeout);
  bodyRef.style.setProperty('--tick-intensity', String(intensity));
  bodyRef.classList.remove(HALO_CLASS);
  void bodyRef.offsetWidth;
  bodyRef.classList.add(HALO_CLASS);
  haloTimeout = window.setTimeout(() => {
    bodyRef?.classList.remove(HALO_CLASS);
    haloTimeout = null;
  }, HALO_MS + 20);
}

function maybeSpawnParticle(century: number): void {
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

  // C5 picks from the crimson/violet/gold palette for each particle.
  if (century === 5) {
    const pick =
      C5_PARTICLE_PALETTE[
        Math.floor(Math.random() * C5_PARTICLE_PALETTE.length)
      ];
    p.style.background = pick.bg;
    p.style.boxShadow = `0 0 6px ${pick.glow}`;
  }

  // Inset 3-13% from the chosen edge, 6-94% along — avoids the "4 lines
  // forming a rectangle" pattern AND the overflow:hidden clipping.
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
