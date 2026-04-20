// SERVANTS — dedicated thrall management screen.
// Same ThrallList component but now with its own breathing room and a
// title banner. Will grow to show per-thrall stats + mass-buy in a later pass.

import { el } from '../../utils/dom';
import { ThrallList } from '../components/thrall-list';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { fmt } from '../../utils/format';

export class ServantsTab {
  private readonly root: HTMLElement;
  private readonly children: Array<{ destroy(): void }> = [];
  private readonly rateLine: HTMLElement;

  constructor() {
    this.root = el('div', 'tab-view tab-view--servants');

    const head = el('header', 'tab-head');
    const label = el('div', 'tab-head__label', '— the court —');
    const title = el('h1', 'tab-head__title', 'SERVANTS');
    const rateLine = el('div', 'tab-head__sub');
    head.appendChild(label);
    head.appendChild(title);
    head.appendChild(rateLine);
    this.root.appendChild(head);
    this.rateLine = rateLine;
  }

  mountTo(parent: HTMLElement): void {
    const list = new ThrallList();
    list.mountTo(this.root);
    this.children.push(list);
    parent.appendChild(this.root);
    this.renderRate();
    this.children.push({
      destroy: events.on('tick', () => this.renderRate()),
    });
    this.children.push({
      destroy: events.on('rate-changed', () => this.renderRate()),
    });
  }

  private renderRate(): void {
    this.rateLine.textContent = `${fmt(gameState.getTotalRate())} blood / sec`;
  }

  destroy(): void {
    for (const c of this.children) c.destroy();
    this.children.length = 0;
    this.root.remove();
  }
}
