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
import { showToast } from '../ui/components/toast';
import { playAscensionSfx } from '../audio/sfx';

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
      const count = gameState.getPrestigeCount();
      showToast(
        'ASCENDED',
        `Your dread deepens. ${count} eternit${count === 1 ? 'y' : 'ies'} since the first tooth.`,
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
