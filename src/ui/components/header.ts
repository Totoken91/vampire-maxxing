// Header — HUD v5.3 layout (2026-04-24).
//
// Three-column flex:
//   [Vampire / Maxxing logo]  [Dread + Ichor pills]  [settings gear]
//
// The ×mult caption was dropped from the topbar (Kenny, v5.3): it
// surfaces only inside the Settings panel now so the HUD stays
// minimal. Rank ("Methuselah" etc.) was dropped in v5.2 — the
// Century label on the portrait frame carries the rank identity.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { fmt } from '../../utils/format';
import { menuInstance } from './menu';

const DROPLET_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 2 C12 2 5 10 5 15 C5 19 8 22 12 22 C16 22 19 19 19 15 C19 10 12 2 12 2 Z" ' +
  'fill="currentColor" stroke="rgba(0,0,0,0.35)" stroke-width="1"/></svg>';

export class Header extends Component<HTMLElement> {
  private readonly dreadValue: HTMLElement;
  private readonly ichorValue: HTMLElement;

  constructor() {
    const root = el('div', 'header');

    // ── Col 1: brand (logo PNG, text fallback) ─────────────────────
    const brand = el('div', 'header__brand');
    const logo = el('img', 'header__logo') as HTMLImageElement;
    logo.src = '/assets/ornaments/logo.png';
    logo.alt = 'Vampire Maxxing';
    logo.decoding = 'async';
    logo.onerror = () => {
      brand.textContent = '';
      const top = el('span', 'header__brand-line', 'Vampire');
      const bot = el('span', 'header__brand-line', 'Maxxing');
      brand.appendChild(top);
      brand.appendChild(bot);
    };
    brand.appendChild(logo);

    // ── Col 2: 2×2 pill grid ───────────────────────────────────────
    const stack = el('div', 'header__stack');

    // Row 1 — Dread + Ichor + Mult (wallet + global multiplier)
    const walletRow = el('div', 'header__pill-row');

    const dreadPill = el('div', 'header__pill header__pill--dread');
    const dreadIcon = el('span', 'header__pill-icon header__pill-icon--diamond');
    const dreadCol = el('div', 'header__pill-col');
    dreadCol.appendChild(el('span', 'header__pill-label', 'Dread'));
    const dreadValue = el('span', 'header__pill-value', 'Lv.0');
    dreadCol.appendChild(dreadValue);
    dreadPill.appendChild(dreadIcon);
    dreadPill.appendChild(dreadCol);

    const ichorPill = el('div', 'header__pill header__pill--ichor');
    const ichorIcon = el('span', 'header__pill-icon header__pill-icon--drop');
    ichorIcon.innerHTML = DROPLET_SVG;
    const ichorCol = el('div', 'header__pill-col');
    ichorCol.appendChild(el('span', 'header__pill-label', 'Ichor'));
    const ichorValue = el('span', 'header__pill-value', '0');
    ichorCol.appendChild(ichorValue);
    ichorPill.appendChild(ichorIcon);
    ichorPill.appendChild(ichorCol);

    // Inline gear — sits adjacent to the wallet pills (v5.4). Opens
    // the Settings panel via the Menu singleton; the panel itself is
    // mounted globally by app.ts.
    const gear = el('button', 'header__gear') as HTMLButtonElement;
    gear.type = 'button';
    gear.setAttribute('aria-label', 'Open settings');
    gear.innerHTML = '<span class="header__gear-icon" aria-hidden="true">⚙</span>';
    gear.addEventListener('click', () => menuInstance?.open());

    walletRow.appendChild(dreadPill);
    walletRow.appendChild(ichorPill);
    walletRow.appendChild(gear);

    stack.appendChild(walletRow);

    root.appendChild(brand);
    root.appendChild(stack);

    super(root);
    this.dreadValue = dreadValue;
    this.ichorValue = ichorValue;
  }

  protected override onMount(): void {
    this.render();
    this.addTeardown(events.on('ascended', () => this.render()));
    this.addTeardown(events.on('dread-changed', () => this.renderDread()));
  }

  private render(): void {
    this.renderDread();
    this.renderIchor();
  }

  private renderDread(): void {
    this.dreadValue.textContent = `Lv.${gameState.getDread()}`;
  }

  private renderIchor(): void {
    this.ichorValue.textContent = fmt(gameState.getIchor());
  }
}
