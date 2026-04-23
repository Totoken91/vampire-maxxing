// Container for the 8 servant cards.

import { Component } from './base';
import { el } from '../../utils/dom';
import { SERVANTS } from '../../game/config/servants';
import { ServantCard } from './servant-card';

export class ServantList extends Component<HTMLElement> {
  private readonly cards: ServantCard[] = [];

  constructor() {
    const root = el('div', 'servant-list');

    const header = el('div', 'servant-list__header', '— thy hollow servants —');
    root.appendChild(header);

    super(root);
    for (const t of SERVANTS) {
      this.cards.push(new ServantCard(t));
    }
  }

  protected override onMount(): void {
    for (const card of this.cards) {
      card.mountTo(this.root);
    }
    this.addTeardown(() => {
      for (const card of this.cards) card.destroy();
      this.cards.length = 0;
    });
  }
}
