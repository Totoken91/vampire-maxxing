// Container for the 8 thrall cards.

import { Component } from './base';
import { el } from '../../utils/dom';
import { THRALLS } from '../../game/config/thralls';
import { ThrallCard } from './thrall-card';

export class ThrallList extends Component<HTMLElement> {
  private readonly cards: ThrallCard[] = [];

  constructor() {
    const root = el('div', 'thrall-list');

    const header = el('div', 'thrall-list__header', '— thy hollow servants —');
    root.appendChild(header);

    super(root);
    for (const t of THRALLS) {
      this.cards.push(new ThrallCard(t));
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
