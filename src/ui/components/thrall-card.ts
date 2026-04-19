// One row in the thralls list. Shows owned/rate/cost + handles purchase clicks.
// Affordability and lock state are reflected via `data-state`.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { fmt, fmtShort } from '../../utils/format';
import type { Thrall } from '../../game/config/thralls';

type CardState = 'locked' | 'sealed' | 'affordable' | 'default';

export class ThrallCard extends Component<HTMLElement> {
  private readonly thrall: Thrall;
  private readonly icon: HTMLElement;
  private readonly ownedEl: HTMLElement;
  private readonly rateEl: HTMLElement;
  private readonly costEl: HTMLElement;
  private readonly labelEl: HTMLElement;

  constructor(thrall: Thrall) {
    const root = el('button', 'thrall-card');
    root.setAttribute('type', 'button');
    root.setAttribute('data-thrall', thrall.id);

    const icon = el('div', 'thrall-card__icon');
    icon.textContent = thrall.name
      .split(/\s/)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

    const info = el('div', 'thrall-card__info');
    const name = el('div', 'thrall-card__name', thrall.name);
    const stats = el('div', 'thrall-card__stats');
    const owned = el('span', 'thrall-card__stats-owned', '×0');
    const rate = el('span', 'thrall-card__stats-rate', '0/s');
    stats.appendChild(owned);
    stats.appendChild(rate);
    info.appendChild(name);
    info.appendChild(stats);

    const action = el('div', 'thrall-card__action');
    const cost = el('div', 'thrall-card__cost', '—');
    const label = el('div', 'thrall-card__label', 'claim');
    action.appendChild(cost);
    action.appendChild(label);

    root.appendChild(icon);
    root.appendChild(info);
    root.appendChild(action);

    super(root);
    this.thrall = thrall;
    this.icon = icon;
    this.ownedEl = owned;
    this.rateEl = rate;
    this.costEl = cost;
    this.labelEl = label;
  }

  protected override onMount(): void {
    this.render();
    this.root.addEventListener('click', this.handleClick);
    this.addTeardown(() => this.root.removeEventListener('click', this.handleClick));

    this.addTeardown(events.on('tick', () => this.renderAffordability()));
    this.addTeardown(events.on('blood-changed', () => this.renderAffordability()));
    this.addTeardown(events.on('thrall-bought', (payload) => {
      if (payload.id === this.thrall.id) this.render();
    }));
  }

  private handleClick = (): void => {
    if (this.currentState() === 'affordable') {
      gameState.buyThrall(this.thrall.id);
    }
  };

  private render(): void {
    const owned = gameState.get().thralls[this.thrall.id].owned;
    const rate = gameState.getThrallRate(this.thrall.id);
    this.ownedEl.textContent = `×${owned}`;
    this.rateEl.textContent = owned > 0 ? `${fmtShort(rate)}/s` : '—';
    this.icon.textContent = this.thrall.name
      .split(/\s/)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    this.renderAffordability();
  }

  private renderAffordability(): void {
    const state = this.currentState();
    this.root.setAttribute('data-state', state);
    if (state === 'locked' || state === 'sealed') {
      this.costEl.textContent = '— —';
      this.labelEl.textContent = 'sealed';
    } else {
      this.costEl.textContent = fmt(gameState.getThrallCost(this.thrall.id));
      this.labelEl.textContent = 'claim';
    }
    (this.root as HTMLButtonElement).disabled =
      state === 'locked' || state === 'sealed';
  }

  private currentState(): CardState {
    const snap = gameState.get();
    const owned = snap.thralls[this.thrall.id].owned;
    const locked = snap.totalLifetimeBlood < this.thrall.unlockTotal;
    if (locked) return 'locked';
    if (owned === 0 && !gameState.isThrallAffordable(this.thrall.id)) {
      return 'sealed';
    }
    return gameState.isThrallAffordable(this.thrall.id) ? 'affordable' : 'default';
  }
}
