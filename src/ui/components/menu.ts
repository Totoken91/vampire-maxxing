// Settings menu — panel + backdrop only. The gear trigger itself
// lives inside the Header's pill row (v5.4) so it stays visually
// stuck to the wallet pills. Menu exposes open()/close() through a
// singleton reference that the Header wires to its inline button.

import { Component } from './base';
import { el } from '../../utils/dom';
import { wipeSave } from '../../game/save';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { globalMult } from '../../game/math';
import { hasUnlock } from '../../game/config/prestige-unlocks';

/** Singleton reference, set on Menu construction. Null until the
 * Menu mounts (once at app boot). Header consumes this to wire its
 * inline gear button without passing refs through component trees. */
export let menuInstance: Menu | null = null;

export class Menu extends Component<HTMLElement> {
  private readonly panel: HTMLElement;
  private readonly backdrop: HTMLElement;
  private readonly multValue: HTMLElement;
  private isOpen = false;

  constructor() {
    const root = el('div', 'menu');

    const backdrop = el('div', 'menu__backdrop');
    const panel = el('div', 'menu__panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Menu');

    const header = el('div', 'menu__label', '— the rite —');
    const title = el('div', 'menu__title', 'SETTINGS');

    // Blood multiplier readout — surfaced only here (v5.3) so the main
    // HUD stays minimal. Populated on open so the value stays current
    // without a global subscription.
    const multRow = el('div', 'menu__stat');
    multRow.appendChild(el('span', 'menu__stat-label', 'Blood multiplier'));
    const multValue = el('span', 'menu__stat-value', '×1.00');
    multRow.appendChild(multValue);

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
    panel.appendChild(multRow);
    panel.appendChild(wipeBtn);
    panel.appendChild(closeBtn);

    root.appendChild(backdrop);
    root.appendChild(panel);

    super(root);
    this.panel = panel;
    this.backdrop = backdrop;
    this.multValue = multValue;

    backdrop.addEventListener('click', () => this.setOpen(false));
    closeBtn.addEventListener('click', () => this.setOpen(false));
    wipeBtn.addEventListener('click', () => {
      void this.confirmWipe();
    });

    menuInstance = this;
  }

  /** Public API so external buttons (Header's inline gear) can
   * request the panel to open. Also refreshes the mult readout. */
  open(): void {
    this.setOpen(true);
  }

  close(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.classList.toggle('menu__panel--open', open);
    this.backdrop.classList.toggle('menu__backdrop--open', open);
    if (open) this.refreshStats();
  }

  private refreshStats(): void {
    const hasProgenitor = hasUnlock(
      gameState.getPrestigeCount(),
      'globalMultBonus',
    );
    const mult = globalMult(gameState.getDread(), hasProgenitor);
    this.multValue.textContent = `×${mult.toFixed(2)}`;
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

  isPanelOpen(): boolean {
    return this.isOpen;
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
