// J2 portrait: placeholder body + tap handler. Real image + frame land J3/J8.
// Taps go through gameState.tap() which handles crit/rate/events.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { getCurrentFormDefinition } from '../../game/forms';

export class Portrait extends Component<HTMLElement> {
  private readonly body: HTMLElement;
  private readonly placeholder: HTMLElement;
  private readonly title: HTMLElement;

  constructor() {
    const root = el('div', 'portrait');

    const label = el('div', 'portrait__label', '— the bloodline —');
    const body = el('div', 'portrait__body');
    body.setAttribute('role', 'button');
    body.setAttribute('aria-label', 'Feed the hunger');

    const placeholder = el('div', 'portrait__placeholder');
    body.appendChild(placeholder);

    const title = el('div', 'portrait__title');

    root.appendChild(label);
    root.appendChild(body);
    root.appendChild(title);

    super(root);
    this.body = body;
    this.placeholder = placeholder;
    this.title = title;
  }

  protected override onMount(): void {
    this.render();
    this.body.addEventListener('pointerdown', this.handleTap);
    this.addTeardown(() => this.body.removeEventListener('pointerdown', this.handleTap));
    this.addTeardown(events.on('form-changed', () => this.render()));
  }

  private handleTap = (event: PointerEvent): void => {
    gameState.tap(event.clientX, event.clientY);
    // Micro feedback (scale is handled in CSS via :active; juice stack comes J4).
  };

  private render(): void {
    const form = getCurrentFormDefinition(gameState.getPrestigeCount());
    this.placeholder.textContent = form.subtitle;
    this.title.textContent = form.title;
  }
}
