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

const TINT_PULSE_CLASS = 'portrait__frame-tint--pulse';
const TINT_PULSE_MS = 280;
const FRAME_TILT_CLASS = 'portrait__frame--tilt-pulse';
const FRAME_TILT_MS = 180;
const FRAME_REFLECT_CLASS = 'portrait__frame-reflect--sweep';
const FRAME_REFLECT_MS = 420;
const HALO_CLASS = 'portrait__body--halo-pulse';
const HALO_MS = 320;
const PARTICLE_LIFETIME_MS = 600;
const MAX_LIVE_PARTICLES = 10;
const MAX_INTENSITY = 3;

// Minimum ms gap between successive triggers of each heavy effect. The
// animations themselves last X ms; firing more often than that makes
// them stack / restart and either degrades perf or kills impact.
const REFLECT_MIN_GAP_MS = 380;
const TILT_MIN_GAP_MS = 180;
const HALO_MIN_GAP_MS = 300;

// C5 particle palette — random pick per pulse gives the "unstable
// multi-hue power" reading Kenny specced.
const C5_PARTICLE_PALETTE: readonly { bg: string; glow: string }[] = [
  { bg: '#c91818', glow: 'rgba(201, 24, 24, 0.85)' },
  { bg: '#6a2aa0', glow: 'rgba(106, 42, 160, 0.75)' },
  { bg: '#c9a961', glow: 'rgba(201, 169, 97, 0.75)' },
];

let installed = false;
let bodyRef: HTMLElement | null = null;
let tintRef: HTMLElement | null = null;
let frameRef: HTMLImageElement | null = null;
let reflectRef: HTMLElement | null = null;
let lastBloodFloor = 0;
let offTick: (() => void) | null = null;
let offRateChanged: (() => void) | null = null;
let liveParticles = 0;
let lastReflectAt = 0;
let lastTiltAt = 0;
let lastHaloAt = 0;

export function installBloodTick(portraitBody: HTMLElement): () => void {
  if (installed) return noop;
  installed = true;
  bodyRef = portraitBody;
  tintRef = portraitBody.querySelector<HTMLElement>('.portrait__frame-tint');
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
  bodyRef = null;
  tintRef = null;
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
  if (!bodyRef || !tintRef) return;

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

  // C5 randomises the flash colour per pulse — crimson / violet / gold.
  if (century === 5) {
    const r = Math.random();
    const flash = r < 0.5 ? '#a81818' : r < 0.8 ? '#6a2aa0' : '#c9a961';
    tintRef.style.setProperty('--tick-color', flash);
  }

  fireTintFlash(intensity);
  if (liveParticles < MAX_LIVE_PARTICLES) spawnParticle(century);

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

function fireTintFlash(intensity: number): void {
  if (!tintRef) return;
  tintRef.style.setProperty('--tick-intensity', String(intensity));
  tintRef.classList.remove(TINT_PULSE_CLASS);
  void tintRef.offsetWidth;
  tintRef.classList.add(TINT_PULSE_CLASS);
  window.setTimeout(
    () => tintRef?.classList.remove(TINT_PULSE_CLASS),
    TINT_PULSE_MS + 20,
  );
}

function maybeFireReflect(intensity: number): void {
  if (!reflectRef) return;
  const now = performance.now();
  if (now - lastReflectAt < REFLECT_MIN_GAP_MS) return;
  lastReflectAt = now;
  reflectRef.style.setProperty('--tick-intensity', String(intensity));
  reflectRef.classList.remove(FRAME_REFLECT_CLASS);
  void reflectRef.offsetWidth;
  reflectRef.classList.add(FRAME_REFLECT_CLASS);
  window.setTimeout(
    () => reflectRef?.classList.remove(FRAME_REFLECT_CLASS),
    FRAME_REFLECT_MS + 20,
  );
}

function maybeFireTilt(intensity: number): void {
  if (!frameRef) return;
  const now = performance.now();
  if (now - lastTiltAt < TILT_MIN_GAP_MS) return;
  lastTiltAt = now;
  frameRef.style.setProperty('--tick-intensity', String(intensity));
  frameRef.classList.remove(FRAME_TILT_CLASS);
  void frameRef.offsetWidth;
  frameRef.classList.add(FRAME_TILT_CLASS);
  window.setTimeout(
    () => frameRef?.classList.remove(FRAME_TILT_CLASS),
    FRAME_TILT_MS + 20,
  );
}

function maybeFireHalo(intensity: number): void {
  if (!bodyRef) return;
  const now = performance.now();
  if (now - lastHaloAt < HALO_MIN_GAP_MS) return;
  lastHaloAt = now;
  bodyRef.style.setProperty('--tick-intensity', String(intensity));
  bodyRef.classList.remove(HALO_CLASS);
  void bodyRef.offsetWidth;
  bodyRef.classList.add(HALO_CLASS);
  window.setTimeout(
    () => bodyRef?.classList.remove(HALO_CLASS),
    HALO_MS + 20,
  );
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
