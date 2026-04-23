// One row in the servants list. Shows owned/rate/cost + handles purchase
// clicks. Affordability and lock state are reflected via `data-state`.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { fmt, fmtShort } from '../../utils/format';
import type { Servant } from '../../game/config/servants';

type CardState = 'locked' | 'affordable' | 'default';

export class ServantCard extends Component<HTMLElement> {
  private readonly servant: Servant;
  private readonly ownedEl: HTMLElement;
  private readonly rateEl: HTMLElement;
  private readonly costEl: HTMLElement;
  private readonly labelEl: HTMLElement;

  constructor(servant: Servant) {
    const root = el('button', 'servant-card');
    root.setAttribute('type', 'button');
    root.setAttribute('data-servant', servant.id);

    const icon = el('div', 'servant-card__icon');
    // The medallion frame comes from CSS (background-image); the servant
    // portrait sits inside it, circular-cropped so the ornate gold ring
    // stays visible around the illustration.
    const iconImg = el('img', 'servant-card__icon-img') as HTMLImageElement;
    iconImg.src = `/assets/servants/${servant.id}.webp`;
    iconImg.alt = '';
    iconImg.decoding = 'async';
    icon.appendChild(iconImg);

    const info = el('div', 'servant-card__info');
    const name = el('div', 'servant-card__name', servant.name);
    const stats = el('div', 'servant-card__stats');
    const owned = el('span', 'servant-card__stats-owned', '×0');
    const rate = el('span', 'servant-card__stats-rate', '0/s');
    stats.appendChild(owned);
    stats.appendChild(rate);
    info.appendChild(name);
    info.appendChild(stats);

    const action = el('div', 'servant-card__action');
    const cost = el('div', 'servant-card__cost', '—');
    const label = el('div', 'servant-card__label', 'claim');
    action.appendChild(cost);
    action.appendChild(label);

    root.appendChild(icon);
    root.appendChild(info);
    root.appendChild(action);

    super(root);
    this.servant = servant;
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
    this.addTeardown(events.on('servant-bought', (payload) => {
      if (payload.id === this.servant.id) this.render();
    }));
  }

  private handleClick = (): void => {
    if (this.currentState() === 'affordable') {
      gameState.buyServant(this.servant.id);
    }
  };

  private render(): void {
    const owned = gameState.get().servants[this.servant.id].owned;
    const rate = gameState.getServantRate(this.servant.id);
    this.ownedEl.textContent = `×${owned}`;
    this.rateEl.textContent = owned > 0 ? `${fmtShort(rate)}/s` : '—';
    this.renderAffordability();
  }

  private renderAffordability(): void {
    const state = this.currentState();
    this.root.setAttribute('data-state', state);
    if (state === 'locked') {
      this.costEl.textContent = '— —';
      this.labelEl.textContent = 'sealed';
    } else {
      this.costEl.textContent = fmt(gameState.getServantCost(this.servant.id));
      this.labelEl.textContent = 'claim';
    }
    (this.root as HTMLButtonElement).disabled = state !== 'affordable';
  }

  private currentState(): CardState {
    const snap = gameState.get();
    const locked = snap.totalLifetimeBlood < this.servant.unlockTotal;
    if (locked) return 'locked';
    return gameState.isServantAffordable(this.servant.id) ? 'affordable' : 'default';
  }
}
