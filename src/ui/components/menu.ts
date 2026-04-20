// Settings menu — floating gear button top-right. Opens a small panel
// with destructive actions (wipe save) behind a confirmation.
// Future home for sound toggle, credits, privacy link.

import { Component } from './base';
import { el } from '../../utils/dom';
import { wipeSave } from '../../game/save';
import { gameState } from '../../game/state';
import { events } from '../../game/events';

export class Menu extends Component<HTMLElement> {
  private readonly panel: HTMLElement;
  private readonly backdrop: HTMLElement;
  private open = false;

  constructor() {
    const root = el('div', 'menu');

    const button = el('button', 'menu__button') as HTMLButtonElement;
    button.type = 'button';
    button.setAttribute('aria-label', 'Open menu');
    button.innerHTML = '<span class="menu__gear" aria-hidden="true">\u2699</span>';

    const backdrop = el('div', 'menu__backdrop');
    const panel = el('div', 'menu__panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Menu');

    const header = el('div', 'menu__label', '— the rite —');
    const title = el('div', 'menu__title', 'SETTINGS');

    const wipeBtn = el('button', 'menu__action menu__action--danger') as HTMLButtonElement;
    wipeBtn.type = 'button';
    wipeBtn.innerHTML =
      '<span class="menu__action-label">WIPE PROGRESS</span>' +
      '<span class="menu__action-sub">Erase the bloodline. No return.</span>';

    const closeBtn = el('button', 'menu__close') as HTMLButtonElement;
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';

    panel.appendChild(header);
    panel.appendChild(title);
    panel.appendChild(wipeBtn);
    panel.appendChild(closeBtn);

    root.appendChild(button);
    root.appendChild(backdrop);
    root.appendChild(panel);

    super(root);
    this.panel = panel;
    this.backdrop = backdrop;

    button.addEventListener('click', () => this.setOpen(true));
    backdrop.addEventListener('click', () => this.setOpen(false));
    closeBtn.addEventListener('click', () => this.setOpen(false));
    wipeBtn.addEventListener('click', () => {
      void this.confirmWipe();
    });
  }

  private setOpen(open: boolean): void {
    this.open = open;
    this.panel.classList.toggle('menu__panel--open', open);
    this.backdrop.classList.toggle('menu__backdrop--open', open);
  }

  private async confirmWipe(): Promise<void> {
    const ok = await showConfirm(
      'WIPE THE BLOODLINE?',
      'Every thrall, every drop of blood, every century undone. This cannot be reversed.',
      'WIPE',
      'Keep playing',
    );
    if (!ok) return;

    await wipeSave();
    gameState.reset();
    events.emit('blood-changed', { blood: 0, delta: 0 });
    events.emit('rate-changed', { totalRate: 0 });
    events.emit('form-changed', { form: 'NEWBORN' });
    this.setOpen(false);
  }

  isOpen(): boolean {
    return this.open;
  }
}

/** Minimal modal confirmation. Resolves true on the primary action. */
function showConfirm(
  title: string,
  body: string,
  primaryLabel: string,
  cancelLabel: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = el('div', 'confirm__backdrop');
    const modal = el('div', 'confirm');
    modal.setAttribute('role', 'alertdialog');

    const titleEl = el('div', 'confirm__title', title);
    const bodyEl = el('div', 'confirm__body', body);
    const actions = el('div', 'confirm__actions');

    const cancel = el('button', 'confirm__btn confirm__btn--cancel', cancelLabel) as HTMLButtonElement;
    cancel.type = 'button';
    const primary = el('button', 'confirm__btn confirm__btn--danger', primaryLabel) as HTMLButtonElement;
    primary.type = 'button';

    actions.appendChild(cancel);
    actions.appendChild(primary);
    modal.appendChild(titleEl);
    modal.appendChild(bodyEl);
    modal.appendChild(actions);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const close = (result: boolean): void => {
      backdrop.remove();
      modal.remove();
      resolve(result);
    };

    cancel.addEventListener('click', () => close(false));
    backdrop.addEventListener('click', () => close(false));
    primary.addEventListener('click', () => close(true));
  });
}
