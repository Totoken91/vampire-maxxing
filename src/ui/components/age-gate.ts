// L13 — Age gate modal. Required by RGPD + KR 2024 + EU best
// practice on gacha apps. Fires once on the first session that has
// `ageConfirmation === 'unconfirmed'`. The modal is non-skippable
// — the player must answer before any IAP can ever fire. Under-13
// answers are persisted and lock IAPs forever (changeable in
// Settings if Kenny ever wants a re-prompt path).

import { el } from '../../utils/dom';
import { gameState } from '../../game/state';

const EXIT_DURATION_MS = 240;

export function showAgeGate(): Promise<void> {
  // If already answered, return immediately (no-op).
  if (gameState.getAgeConfirmation() !== 'unconfirmed') {
    return Promise.resolve();
  }
  if (document.querySelector('.age-gate__backdrop')) return Promise.resolve();

  return new Promise((resolve) => {
    const backdrop = el('div', 'age-gate__backdrop');
    const modal = el('div', 'age-gate');

    modal.appendChild(
      el('div', 'age-gate__title', '— BEFORE THE PACT —'),
    );
    modal.appendChild(
      el(
        'div',
        'age-gate__sub',
        'a single question, then the night is yours',
      ),
    );

    const question = el(
      'p',
      'age-gate__question',
      'Are you 13 years of age or older?',
    );
    modal.appendChild(question);

    const note = el(
      'p',
      'age-gate__note',
      'Your answer is kept on this device. Players under 13 can play freely; in-app purchases stay disabled.',
    );
    modal.appendChild(note);

    const buttons = el('div', 'age-gate__buttons');

    const yesBtn = el(
      'button',
      'age-gate__btn age-gate__btn--primary',
    ) as HTMLButtonElement;
    yesBtn.type = 'button';
    yesBtn.innerHTML =
      '<span class="age-gate__btn-label">YES, 13 OR OLDER</span>' +
      '<span class="age-gate__btn-sub">the pact is mine to make</span>';

    const noBtn = el(
      'button',
      'age-gate__btn age-gate__btn--secondary',
    ) as HTMLButtonElement;
    noBtn.type = 'button';
    noBtn.innerHTML =
      '<span class="age-gate__btn-label">UNDER 13</span>' +
      '<span class="age-gate__btn-sub">play freely; no purchases shown</span>';

    buttons.appendChild(yesBtn);
    buttons.appendChild(noBtn);
    modal.appendChild(buttons);

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    let answered = false;
    const answer = (value: 'over13' | 'under13'): void => {
      if (answered) return;
      answered = true;
      gameState.setAgeConfirmation(value);
      // Force a save so the gate state survives an immediate quit.
      void gameState.saveToStorage();
      backdrop.classList.add('age-gate__backdrop--exit');
      window.setTimeout(() => {
        backdrop.remove();
        resolve();
      }, EXIT_DURATION_MS);
    };

    yesBtn.addEventListener('click', () => answer('over13'));
    noBtn.addEventListener('click', () => answer('under13'));

    // No backdrop dismissal — the player MUST answer to proceed.
  });
}
