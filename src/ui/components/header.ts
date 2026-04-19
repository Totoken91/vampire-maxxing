// Header: brand (left), identity (center), dread (right).
// Reads live from gameState + subscribes to form-changed / blood-changed for updates.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { getCurrentFormDefinition, getCenturyInForm } from '../../game/forms';
import { toRoman } from '../../utils/roman';

export class Header extends Component<HTMLElement> {
  private readonly statusTitle: HTMLElement;
  private readonly dreadValue: HTMLElement;

  constructor() {
    const root = el('div', 'header');

    const brand = el('div', 'header__brand');
    brand.innerHTML = 'Vampire<br>Maxxing';

    const status = el('div', 'header__status');
    const statusLabel = el('div', 'header__status-label', 'you are');
    const statusTitle = el('div', 'header__status-title');
    status.appendChild(statusLabel);
    status.appendChild(statusTitle);

    const dread = el('div', 'header__dread');
    const dreadLabel = el('div', 'header__dread-label', 'DREAD');
    const dreadValue = el('div', 'header__dread-value');
    dread.appendChild(dreadLabel);
    dread.appendChild(dreadValue);

    root.appendChild(brand);
    root.appendChild(status);
    root.appendChild(dread);

    super(root);
    this.statusTitle = statusTitle;
    this.dreadValue = dreadValue;
  }

  protected override onMount(): void {
    this.render();
    this.addTeardown(events.on('form-changed', () => this.render()));
    this.addTeardown(events.on('blood-changed', () => this.renderDread()));
    this.addTeardown(events.on('tick', () => this.renderDread()));
  }

  private render(): void {
    const prestige = gameState.getPrestigeCount();
    const form = getCurrentFormDefinition(prestige);
    const century = toRoman(getCenturyInForm(prestige));
    this.statusTitle.innerHTML = `${form.title.replace(
      /^(a |an |the )/,
      (m) => m,
    )} · <em>Century ${century}</em>`;
    this.renderDread();
  }

  private renderDread(): void {
    this.dreadValue.textContent = `× ${gameState.getDread()}`;
  }
}
