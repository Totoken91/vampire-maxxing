// Prestige cinematic. Locks input, plays flash + dissolve on the old
// portrait, commits the state change mid-animation (so form-changed
// fires and the image swaps under cover of opacity 0), then materializes
// the new form with a gold shower and a flavor toast.
//
// Timeline (~2.5s total):
//   0ms    flash in + red particles + dissolve class on image
//   700ms  commit() → state mutates, Portrait re-renders src
//   700ms  swap dissolve → materialize; gold particles if form changed
//   900ms  flash starts fading
//  1500ms  flash gone, materialize class removed
//  1600ms  toast
//
// The orchestrator degrades to a 300ms red-flash-only feedback under
// prefers-reduced-motion.

import { particleEngine } from './particle-engine';
import { spawnDissolveBurst } from './dissolve-particle';
import { gameState } from '../game/state';
import { FORMS_BY_ID, type VampireForm } from '../game/config/forms';
import { getCenturyInForm } from '../game/forms';
import { showToast } from '../ui/components/toast';
import { playAscensionSfx } from '../audio/sfx';
import { toRoman } from '../utils/roman';

const FORM_FLAVOR: Record<VampireForm, string> = {
  NEWBORN: 'The hunger remembers its first night.',
  ELDER: 'Centuries gather behind you like a cape.',
  LORD_OF_NIGHT: 'The dark tilts when you enter a room.',
  METHUSELAH: 'You have seen empires born and buried.',
  PROGENITOR: 'Your line is older than language.',
  TERA_OVERLORD: 'The night belongs to you, wholesale.',
  HORROR_INCARNATE: 'Mortals forget how to name you.',
  THIRST: 'You are not a being. You are a verb.',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Ceremonial "CENTURY N → N+1" overlay shown when the ascension bumps
 * the Century counter but the form stays the same. Lives for ~1.6s and
 * removes itself. Cheap DOM, no canvas, animated via CSS.
 */
function showCenturyFlash(from: number, to: number): void {
  const root = document.createElement('div');
  root.className = 'century-flash';

  const label = document.createElement('div');
  label.className = 'century-flash__label';
  label.textContent = '— CENTURY —';

  const numbers = document.createElement('div');
  numbers.className = 'century-flash__numbers';

  const fromEl = document.createElement('span');
  fromEl.className = 'century-flash__from';
  fromEl.textContent = toRoman(from);

  const arrow = document.createElement('span');
  arrow.className = 'century-flash__arrow';
  arrow.textContent = '→';

  const toEl = document.createElement('span');
  toEl.className = 'century-flash__to';
  toEl.textContent = toRoman(to);

  numbers.appendChild(fromEl);
  numbers.appendChild(arrow);
  numbers.appendChild(toEl);

  root.appendChild(label);
  root.appendChild(numbers);
  document.body.appendChild(root);

  window.setTimeout(() => {
    root.classList.add('century-flash--exit');
    window.setTimeout(() => root.remove(), 400);
  }, 1400);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let animating = false;
export function isAscending(): boolean {
  return animating;
}

/**
 * Play the ascension cinematic. `commit` must perform the actual state
 * change (typically `() => gameState.ascend()`); it is invoked mid-
 * animation so the portrait image swap is hidden by the dissolve.
 * Resolves once the animation is fully done (toast shown).
 */
export async function playAscensionFx(commit: () => boolean): Promise<void> {
  if (animating) return;
  animating = true;
  document.body.classList.add('is-ascending');

  try {
    if (prefersReducedMotion()) {
      await playReducedAscension(commit);
      return;
    }

    const body = document.querySelector('.portrait__body') as HTMLElement | null;
    const image = document.querySelector('.portrait__image') as HTMLImageElement | null;

    const prevForm = gameState.getForm();
    const prevCentury = getCenturyInForm(gameState.getPrestigeCount());

    const flash = document.createElement('div');
    flash.className = 'ascension-flash';
    document.body.appendChild(flash);

    // Glorious ascension sting — fires at t=0 so its peak lands on the
    // form reveal mid-cinematic.
    playAscensionSfx();

    if (navigator.vibrate) navigator.vibrate([20, 40, 30]);

    if (image) image.classList.add('portrait__image--dissolving');
    if (body) {
      const rect = body.getBoundingClientRect();
      spawnDissolveBurst((p) => particleEngine.add(p), rect, 40, false);
      window.setTimeout(() => {
        if (!body.isConnected) return;
        const r2 = body.getBoundingClientRect();
        spawnDissolveBurst((p) => particleEngine.add(p), r2, 28, false);
      }, 280);
    }

    await sleep(700);

    const ok = commit();
    if (!ok) {
      flash.remove();
      if (image) image.classList.remove('portrait__image--dissolving');
      return;
    }
    const newForm = gameState.getForm();
    const formChanged = newForm !== prevForm;

    if (image) {
      image.classList.remove('portrait__image--dissolving');
      image.classList.add('portrait__image--materializing');
    }
    if (body && formChanged) {
      const rect = body.getBoundingClientRect();
      spawnDissolveBurst((p) => particleEngine.add(p), rect, 50, true);
      if (navigator.vibrate) navigator.vibrate(40);
    }
    // Same form, new Century — surface the Roman numeral bump as a
    // ceremonial overlay so the ascend feels rewarding instead of silent.
    if (!formChanged) {
      const newCentury = getCenturyInForm(gameState.getPrestigeCount());
      showCenturyFlash(prevCentury, newCentury);
    }

    await sleep(200);
    flash.classList.add('ascension-flash--fading');

    await sleep(600);
    flash.remove();
    if (image) image.classList.remove('portrait__image--materializing');

    await sleep(100);

    if (formChanged) {
      const def = FORMS_BY_ID[newForm];
      showToast('ASCENDED', `You are now ${def.title}. ${FORM_FLAVOR[newForm]}`);
    } else {
      const def = FORMS_BY_ID[newForm];
      const newCentury = getCenturyInForm(gameState.getPrestigeCount());
      showToast(
        'ASCENDED',
        `${def.subtitle} · Century ${toRoman(newCentury)}. Your dread deepens.`,
      );
    }
  } finally {
    animating = false;
    document.body.classList.remove('is-ascending');
  }
}

async function playReducedAscension(commit: () => boolean): Promise<void> {
  const flash = document.createElement('div');
  flash.className = 'ascension-flash ascension-flash--reduced';
  document.body.appendChild(flash);

  await sleep(200);
  const ok = commit();
  if (!ok) {
    flash.remove();
    return;
  }
  const newForm = gameState.getForm();

  flash.classList.add('ascension-flash--fading');
  await sleep(300);
  flash.remove();

  const def = FORMS_BY_ID[newForm];
  showToast('ASCENDED', `You are now ${def.title}.`);
}
