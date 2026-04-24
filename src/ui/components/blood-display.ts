// Blood counter block — HUD v5.1 (2026-04-24).
//
// Lives directly UNDER the portrait. 2 lines only:
//   1. "{amount}" — big red serif counter (40px)
//   2. "+{rate} / per second" — mono rate caption
//
// v5.1: Century label moved BACK to the portrait frame (.portrait__title)
// where the baroque cartouche reads as a natural nameplate. Mult pill
// and "— blood —" label stay removed (moved to topbar / redundant).

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { fmt } from '../../utils/format';

const UI_INTERVAL_MS = 100;

export class BloodDisplay extends Component<HTMLElement> {
  private readonly value: HTMLElement;
  private readonly rate: HTMLElement;
  private lastRender = 0;

  constructor() {
    const root = el('div', 'blood-display');

    const value = el('div', 'blood-display__value', '0');
    const rate = el('div', 'blood-display__rate');

    root.appendChild(value);
    root.appendChild(rate);

    super(root);
    this.value = value;
    this.rate = rate;
  }

  protected override onMount(): void {
    this.render();
    this.addTeardown(
      events.on('tick', () => {
        const now = performance.now();
        if (now - this.lastRender >= UI_INTERVAL_MS) {
          this.render();
          this.lastRender = now;
        }
      }),
    );
    this.addTeardown(events.on('servant-bought', () => this.render()));
  }

  private render(): void {
    this.value.textContent = fmt(gameState.getBlood());
    const rate = gameState.getTotalRate();
    this.rate.innerHTML = `<span class="blood-display__rate-number">+${fmt(
      rate,
    )}</span> / per second`;
  }
}
