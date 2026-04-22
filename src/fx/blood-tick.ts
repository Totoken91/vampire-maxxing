// K1 Blood-tick VFX — event-driven pulse fired once per integer blood
// increment from passive production. Frequency scales naturally with
// the game loop:
//
//   1 blood/sec  → ~1 pulse/sec    (ambient heartbeat)
//   10 blood/sec → ~10 pulses/sec  (noticeably alive)
//   60 blood/sec → ~60 pulses/sec  (frame feels busy)
//   600 blood/sec → 60 pulses/sec capped, each pulse intensifies 10×
//                  so the frame reads as "boiling" without exceeding
//                  the ~60 Hz visual budget of the browser.
//
// The module tracks floor(blood) between physics ticks and fires on
// positive deltas only — buys/ascend emit 'blood-changed' with negative
// deltas but never alter floor(blood) upward, so they're naturally
// filtered out.
//
// No-op on Century I (the player hasn't "awakened" yet).

import { events } from '../game/events';
import { gameState } from '../game/state';
import { getCenturyInForm } from '../game/forms';

const TINT_PULSE_CLASS = 'portrait__frame-tint--pulse';
const TINT_PULSE_MS = 280;
const BODY_PULSE_CLASS = 'portrait__body--tick-pulse';
const BODY_PULSE_MS = 120;
const PARTICLE_LIFETIME_MS = 600;
const COULURE_LIFETIME_MS = 2000;
const STREAK_LIFETIME_MS = 600;
const MAX_LIVE_PARTICLES = 8;
const MAX_LIVE_COULURES = 3;
const MAX_LIVE_STREAKS = 1;
const MAX_INTENSITY = 3;

// C3 spawns a coulure on every Nth tick.
const COULURE_TICK_INTERVAL = 10;
// C5 spawns a horizontal streak on every Nth tick.
const STREAK_TICK_INTERVAL = 20;
// C5 picks from this palette for each tick's flash colour.
const C5_FLASH_PALETTE = ['#a81818', '#4a1850', '#5a4518'];

let installed = false;
let bodyRef: HTMLElement | null = null;
let tintRef: HTMLElement | null = null;
let lastBloodFloor = 0;
let offTick: (() => void) | null = null;
let offRateChanged: (() => void) | null = null;
let liveParticles = 0;
let liveCoulures = 0;
let liveStreaks = 0;
let tickCount = 0;

export function installBloodTick(portraitBody: HTMLElement): () => void {
  if (installed) return noop;
  installed = true;
  bodyRef = portraitBody;
  tintRef = portraitBody.querySelector<HTMLElement>('.portrait__frame-tint');
  lastBloodFloor = Math.floor(gameState.get().blood);
  tickCount = 0;
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
  installed = false;
}

function noop(): void {
  /* no teardown when install was a no-op */
}

/**
 * C4 chromatic aberration — reads totalRate and writes the CSS custom
 * property --chromatic-offset on the body. CSS consumes it only when
 * [data-century='4'] is active, so this runs unconditionally but only
 * has visual impact in that century.
 *
 * Mapping (Kenny-spec):
 *   rate ≤ 10/sec  → 1px
 *   rate ≥ 100/sec → 3px
 * Linear interpolation between those two, clamped to [0, 3].
 */
function updateChromaticOffset(): void {
  if (!bodyRef) return;
  const rate = gameState.getTotalRate();
  let offset: number;
  if (rate <= 0) offset = 0;
  else if (rate <= 10) offset = rate / 10;
  else if (rate >= 100) offset = 3;
  else offset = 1 + ((rate - 10) / 90) * 2;
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
  tickCount += 1;

  // 1 integer increment per frame = baseline intensity. More than that
  // means the game loop caught multiple increments this frame — amplify
  // the single pulse rather than queuing more (keeps us at ~60 Hz cap).
  const intensity = Math.min(MAX_INTENSITY, delta);

  // C5 randomises the flash colour per pulse — overrides the CSS default.
  if (century === 5) {
    const pick =
      C5_FLASH_PALETTE[Math.floor(Math.random() * C5_FLASH_PALETTE.length)];
    tintRef.style.setProperty('--tick-color', pick);
  }

  fireTintFlash(intensity);
  fireBodyScale(intensity);
  if (liveParticles < MAX_LIVE_PARTICLES) spawnParticle();

  // Periodic per-century extras.
  if (
    century === 3 &&
    tickCount % COULURE_TICK_INTERVAL === 0 &&
    liveCoulures < MAX_LIVE_COULURES
  ) {
    spawnCoulure();
  }
  if (
    century === 5 &&
    tickCount % STREAK_TICK_INTERVAL === 0 &&
    liveStreaks < MAX_LIVE_STREAKS
  ) {
    spawnStreak();
  }
}

function fireTintFlash(intensity: number): void {
  if (!tintRef) return;
  tintRef.style.setProperty('--tick-intensity', String(intensity));
  // Remove + reflow + re-add so the animation restarts even when back-to-back.
  tintRef.classList.remove(TINT_PULSE_CLASS);
  void tintRef.offsetWidth;
  tintRef.classList.add(TINT_PULSE_CLASS);
  window.setTimeout(
    () => tintRef?.classList.remove(TINT_PULSE_CLASS),
    TINT_PULSE_MS + 20,
  );
}

function fireBodyScale(intensity: number): void {
  if (!bodyRef) return;
  bodyRef.style.setProperty('--tick-intensity', String(intensity));
  bodyRef.classList.remove(BODY_PULSE_CLASS);
  void bodyRef.offsetWidth;
  bodyRef.classList.add(BODY_PULSE_CLASS);
  window.setTimeout(
    () => bodyRef?.classList.remove(BODY_PULSE_CLASS),
    BODY_PULSE_MS + 20,
  );
}

function spawnParticle(): void {
  if (!bodyRef) return;
  const p = document.createElement('span');
  p.className = 'portrait__tick-particle';
  p.setAttribute('aria-hidden', 'true');
  // Pick a random edge (top/right/bottom/left), then position the
  // particle within a ~10% band INSIDE that edge rather than strictly
  // on it. Two benefits:
  //   • the 4 edges no longer trace a visible rectangular ring (inset
  //     varies per spawn so spawns land across a wider area)
  //   • a 3-13% inset keeps particles fully inside the body, so
  //     overflow:hidden never clips half of them.
  // `along` also stays away from the corners so spawns look less
  // grid-aligned.
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

/**
 * C3 coulure — a thin vertical gradient that descends behind the
 * frame over 2s. Random horizontal position, one at a time ideally
 * but up to 3 stacked live.
 */
function spawnCoulure(): void {
  if (!bodyRef) return;
  const c = document.createElement('span');
  c.className = 'portrait__tick-coulure';
  c.setAttribute('aria-hidden', 'true');
  c.style.left = `${10 + Math.random() * 80}%`;
  bodyRef.appendChild(c);
  liveCoulures += 1;
  window.setTimeout(() => {
    c.remove();
    liveCoulures -= 1;
  }, COULURE_LIFETIME_MS + 50);
}

/**
 * C5 streak — a crimson blade sweeping horizontally behind the frame
 * over 400ms. Random vertical position in the mid 60% of the body so
 * it doesn't hug an edge.
 */
function spawnStreak(): void {
  if (!bodyRef) return;
  const s = document.createElement('span');
  s.className = 'portrait__tick-streak';
  s.setAttribute('aria-hidden', 'true');
  s.style.top = `${20 + Math.random() * 60}%`;
  bodyRef.appendChild(s);
  liveStreaks += 1;
  window.setTimeout(() => {
    s.remove();
    liveStreaks -= 1;
  }, STREAK_LIFETIME_MS + 50);
}
