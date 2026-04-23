// K4 — milestone celebrations. Fires when totalRunBlood crosses a 10^N
// threshold that hasn't been hit this run (see state.ts:checkMilestone).
//
// Layers a toast with flavor text on the player's session + a gold
// particle burst from the portrait + a haptic tick. Intensity scales
// with the exponent so 1B feels visibly bigger than 10K.
//
// No audio — the existing SFX pool is just thrall-click + ascension
// sting, neither fits. If an "achievement chime" is added later, wire
// it here.

import { events } from '../game/events';
import { showToast } from '../ui/components/toast';
import { particleEngine } from './particle-engine';
import { BloodParticle } from './blood-particle';

// Flavor per exponent. Labels are the "— CAPS —" line; text is the
// italic serif body underneath. Missing exponents fall back to a
// generic high-tier line so we never show a bland toast.
const FLAVOR: Record<number, { label: string; text: string }> = {
  4: {
    label: 'FIRST DROP',
    text: 'Ten thousand lives — the chapels begin to whisper.',
  },
  5: {
    label: 'CROWNED IN VELVET',
    text: 'A hundred thousand. Your hunger has a name now.',
  },
  6: {
    label: 'SOVEREIGN',
    text: 'A million drained. The bloodline kneels.',
  },
  7: {
    label: 'THE NIGHT BENDS',
    text: 'Ten million. Doors open without being touched.',
  },
  8: {
    label: 'MORTAL NO MORE',
    text: 'A hundred million. They forget there was an age before you.',
  },
  9: {
    label: 'YOU ARE THE DARK',
    text: 'A billion souls. Stars grow pale.',
  },
  10: {
    label: 'WORLDS IN YOUR PALM',
    text: 'Ten billion. The world is an ember in your hand.',
  },
  11: {
    label: 'BEYOND NAMING',
    text: 'A hundred billion. Language fails to describe you.',
  },
  12: {
    label: 'THE GREAT HUNGER',
    text: 'A trillion. Reality itself becomes offertory.',
  },
};

const FALLBACK_FLAVOR = {
  label: 'VAST BEYOND COUNT',
  text: 'The ledgers have given up.',
};

export function installMilestone(): void {
  events.on('milestone-reached', ({ exponent }) => {
    const flavor = FLAVOR[exponent] ?? FALLBACK_FLAVOR;
    showToast(flavor.label, flavor.text);
    burstFromPortrait(exponent);
    haptic(exponent);
  });
}

function burstFromPortrait(exp: number): void {
  const rect = document
    .querySelector<HTMLElement>('.portrait__body')
    ?.getBoundingClientRect();
  if (!rect) return;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  // 15 particles at 10K, +3 per tier, capped 40 so the engine's 200
  // global limit is never threatened by a single milestone.
  const count = Math.min(40, 15 + (exp - 4) * 3);
  for (let i = 0; i < count; i += 1) {
    // crit=true → gold particles, matches the "prestige / milestone"
    // colour palette the player already associates with meaningful
    // events (tap crits, ascension bursts).
    particleEngine.add(new BloodParticle(cx, cy, true));
  }
}

function haptic(exp: number): void {
  if (!('vibrate' in navigator)) return;
  // 25ms at 10K, +5ms per tier, capped 50ms — within the "medium
  // impact" range recommended for idle reward moments.
  const ms = Math.min(50, 25 + (exp - 4) * 5);
  try {
    navigator.vibrate(ms);
  } catch {
    // Some browsers throw if called without a prior user gesture;
    // nothing to do.
  }
}
