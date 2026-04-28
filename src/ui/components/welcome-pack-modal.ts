// L11 — Pacte Fondateur welcome modal.
//
// Fires once per save: 3s after the player obtains their first Rare+
// thrall (any source). The 3s delay is intentional — the Rare reveal
// animation runs ~2.5s and we don't want to step on the dopamine
// moment. The modal arrives as the player is settling, with a clear
// "your founder pact has arrived" framing.
//
// Style language matches daily-modal / offline-modal (baroque card,
// gold accents, italic serif body, single CLAIM-style CTA). The modal
// itself doesn't initiate the purchase — it routes the player to the
// Shop tab where the Pacte Fondateur sits in its FEATURED hero slot.

import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { navigateTo } from '../navigation';
import { FOUNDER_PACK_SKU, packForSku } from '../../game/config/packs';

const TRIGGER_DELAY_MS = 3000;
const EXIT_DURATION_MS = 280;

let alreadyShown = false;

export function installWelcomePackModal(): void {
  events.on('welcome-pack-armed', () => {
    if (alreadyShown) return;
    alreadyShown = true;
    window.setTimeout(() => maybeShow(), TRIGGER_DELAY_MS);
  });
}

/** Manual entry point used by the cheats suite (vm.firstRare()). */
export function showWelcomePackModal(): void {
  alreadyShown = true;
  maybeShow();
}

function maybeShow(): void {
  // Don't stack on any other modal — defer until they all close.
  // Includes the rituals fullscreen overlay + the pull cascade so the
  // CTA's `navigateTo('shop')` isn't masked by an overlay still mounted
  // when the player taps it (was the closed-testing dead-end bug).
  if (document.querySelector('.modal__backdrop, .daily-modal__backdrop, .offline-modal__backdrop, .ichor-gift__backdrop, .lore-modal__backdrop, .rituals-screen__backdrop, .pull-overlay')) {
    window.setTimeout(maybeShow, 800);
    return;
  }
  if (gameState.isUnder13()) return; // L13 — no IAP-adjacent UI for kids.
  const pack = packForSku(FOUNDER_PACK_SKU);
  if (!pack) return;

  const backdrop = el('div', 'welcome-pack__backdrop');
  const modal = el('div', 'welcome-pack');
  modal.setAttribute('role', 'dialog');

  const close = el('button', 'welcome-pack__close', '×') as HTMLButtonElement;
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');

  const eyebrow = el(
    'div',
    'welcome-pack__eyebrow',
    '— A PACT AWAITS —',
  );
  const title = el(
    'div',
    'welcome-pack__title',
    pack.title.toUpperCase(),
  );
  const flavor = el(
    'div',
    'welcome-pack__flavor',
    'The Ancients have noted your first communion. Their nectar awaits in the Shop, doubled — for seven nights only.',
  );

  const cta = el(
    'button',
    'welcome-pack__cta',
    'VIEW THE OFFER',
  ) as HTMLButtonElement;
  cta.type = 'button';

  const dismiss = el(
    'button',
    'welcome-pack__dismiss',
    'Later',
  ) as HTMLButtonElement;
  dismiss.type = 'button';

  modal.appendChild(close);
  modal.appendChild(eyebrow);
  modal.appendChild(title);
  modal.appendChild(flavor);
  modal.appendChild(cta);
  modal.appendChild(dismiss);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  const teardown = (): void => {
    backdrop.classList.add('welcome-pack__backdrop--exit');
    modal.classList.add('welcome-pack--exit');
    window.setTimeout(() => {
      backdrop.remove();
      modal.remove();
    }, EXIT_DURATION_MS);
  };

  cta.addEventListener('click', () => {
    teardown();
    // The shop unlocks on welcome-pack-armed (see isTabUnlocked('shop')),
    // so this navigation is now guaranteed to succeed. Belt-and-suspenders
    // gate kept in case the modal somehow opens without an arm event.
    if (gameState.isTabUnlocked('shop')) {
      navigateTo('shop');
    }
  });
  close.addEventListener('click', teardown);
  dismiss.addEventListener('click', teardown);
  backdrop.addEventListener('click', teardown);
}
