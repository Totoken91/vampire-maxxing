// Container for the 8 servant cards.
//
// Header is a whispered Blood multiplier readout — italic serif, dim
// blood tone, flanked by filigree em-dashes. Reads as a lore caption
// rather than a dashboard stat.

import { Component } from './base';
import { el } from '../../utils/dom';
import { SERVANTS } from '../../game/config/servants';
import { ServantCard } from './servant-card';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { globalMult } from '../../game/math';
import { hasUnlock } from '../../game/config/prestige-unlocks';

export class ServantList extends Component<HTMLElement> {
  private readonly cards: ServantCard[] = [];
  private readonly multValue: HTMLElement;

  constructor() {
    const root = el('div', 'servant-list');

    const header = el('div', 'servant-list__header');
    header.appendChild(el('span', 'servant-list__header-dash', '—'));
    const value = el('span', 'servant-list__header-value', '×1.00');
    header.appendChild(value);
    header.appendChild(el('span', 'servant-list__header-suffix', 'blood multiplier'));
    header.appendChild(el('span', 'servant-list__header-dash', '—'));
    root.appendChild(header);

    super(root);
    this.multValue = value;
    for (const t of SERVANTS) {
      this.cards.push(new ServantCard(t));
    }
  }

  protected override onMount(): void {
    this.renderMult();
    for (const card of this.cards) {
      card.mountTo(this.root);
    }
    this.addTeardown(events.on('ascended', () => this.renderMult()));
    this.addTeardown(events.on('dread-changed', () => this.renderMult()));
    this.addTeardown(() => {
      for (const card of this.cards) card.destroy();
      this.cards.length = 0;
    });
  }

  private renderMult(): void {
    const hasProgenitor = hasUnlock(
      gameState.getPrestigeCount(),
      'globalMultBonus',
    );
    const mult = globalMult(gameState.getDread(), hasProgenitor);
    this.multValue.textContent = `×${mult.toFixed(2)}`;
  }
}
