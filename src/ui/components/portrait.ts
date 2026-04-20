// Portrait with baroque frame overlay. Loads the real PNG when available,
// falls back to a subtitle placeholder otherwise.
// Taps go through gameState.tap() which handles crit/rate/events.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { getCurrentFormDefinition, getCenturyInForm } from '../../game/forms';
import { toRoman } from '../../utils/roman';

const FRAME_SRC = '/assets/ornaments/portrait-frame-baroque.png';

export class Portrait extends Component<HTMLElement> {
  private readonly body: HTMLElement;
  private readonly image: HTMLImageElement;
  private readonly placeholder: HTMLElement;
  private readonly title: HTMLElement;

  constructor() {
    const root = el('div', 'portrait');

    const label = el('div', 'portrait__label', '— the bloodline —');
    const body = el('div', 'portrait__body');
    body.setAttribute('role', 'button');
    body.setAttribute('aria-label', 'Feed the hunger');

    const image = el('img', 'portrait__image') as HTMLImageElement;
    image.alt = '';
    image.decoding = 'async';

    const frame = el('img', 'portrait__frame') as HTMLImageElement;
    frame.alt = '';
    frame.src = FRAME_SRC;
    frame.decoding = 'async';

    const placeholder = el('div', 'portrait__placeholder');
    const title = el('div', 'portrait__title');

    body.appendChild(image);
    body.appendChild(placeholder);
    body.appendChild(frame);
    body.appendChild(title);

    root.appendChild(label);
    root.appendChild(body);

    super(root);
    this.body = body;
    this.image = image;
    this.placeholder = placeholder;
    this.title = title;
  }

  protected override onMount(): void {
    this.render();
    this.body.addEventListener('pointerdown', this.handleTap);
    this.addTeardown(() => this.body.removeEventListener('pointerdown', this.handleTap));
    this.addTeardown(events.on('form-changed', () => this.render()));

    // Aspect-ratio is hardcoded in CSS to match the frame PNG's natural shape.
    // If the frame asset is regenerated at a different aspect, update both.
  }

  private handleTap = (event: PointerEvent): void => {
    if (document.body.classList.contains('is-ascending')) return;
    gameState.tap(event.clientX, event.clientY);
    // Micro feedback (scale handled in CSS via :active; juice stack comes J4).
  };

  private render(): void {
    const prestige = gameState.getPrestigeCount();
    const form = getCurrentFormDefinition(prestige);
    const century = toRoman(getCenturyInForm(prestige));
    this.title.textContent = `${form.subtitle} · Century ${century}`;
    this.placeholder.textContent = form.subtitle;

    this.image.onload = () => {
      this.body.classList.add('portrait__body--has-image');
    };
    this.image.onerror = () => {
      this.body.classList.remove('portrait__body--has-image');
    };
    this.image.src = form.portraitPath;
  }
}
