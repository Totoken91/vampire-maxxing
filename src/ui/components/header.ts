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
import { navigateTo } from '../navigation';

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

    // L15 — Ichor pill is now interactive: tap routes to the Shop tab
    // when unlocked. Built as a button (not div) for accessibility +
    // proper tap-target semantics. The Ichor icon swapped from inline
    // SVG to Kenny's hand-painted PNG so the HUD reads premium.
    const ichorPill = el(
      'button',
      'header__pill header__pill--ichor',
    ) as HTMLButtonElement;
    ichorPill.type = 'button';
    ichorPill.setAttribute('aria-label', 'Open the Shop');
    const ichorIcon = el(
      'img',
      'header__pill-icon header__pill-icon--drop',
    ) as HTMLImageElement;
    ichorIcon.src = '/assets/ornaments/ichor-icon.png';
    ichorIcon.alt = '';
    ichorIcon.decoding = 'async';
    const ichorCol = el('div', 'header__pill-col');
    ichorCol.appendChild(el('span', 'header__pill-label', 'Ichor'));
    const ichorValue = el('span', 'header__pill-value', '0');
    ichorCol.appendChild(ichorValue);
    ichorPill.appendChild(ichorIcon);
    ichorPill.appendChild(ichorCol);
    ichorPill.addEventListener('click', () => {
      if (gameState.isTabUnlocked('shop')) {
        if (navigator.vibrate) navigator.vibrate(4);
        navigateTo('shop');
      }
    });

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

  private lastDreadLevel = 0;

  protected override onMount(): void {
    this.lastDreadLevel = gameState.getDread();
    this.render();
    this.addTeardown(events.on('ascended', () => this.render()));
    this.addTeardown(events.on('dread-changed', ({ level }) => {
      this.renderDread();
      // L15 — Cinematic-lite juice on rank-up. Anything that bumps
      // Dread (ascend, daily gift, milestone) lands here. We flash
      // the pill instead of doing a full-screen freeze: rank-ups
      // happen often enough in the early curve that 800ms cinematic
      // would feel intrusive, but a 600ms scoped flash is enough to
      // register the moment + push haptic + (future) sound cue.
      if (level > this.lastDreadLevel) {
        this.flashDreadRankUp();
      }
      this.lastDreadLevel = level;
    }));
    this.addTeardown(events.on('ichor-changed', () => this.renderIchor()));
  }

  private render(): void {
    this.renderDread();
    this.renderIchor();
  }

  private renderDread(): void {
    this.dreadValue.textContent = `Lv.${gameState.getDread()}`;
  }

  private flashDreadRankUp(): void {
    const pill = this.dreadValue.closest('.header__pill') as HTMLElement | null;
    if (!pill) return;
    pill.classList.remove('header__pill--rankup');
    // Force reflow so the animation restarts on rapid rank-ups.
    void pill.offsetWidth;
    pill.classList.add('header__pill--rankup');
    if (
      navigator.vibrate &&
      (gameState.get() as unknown as { settings: { hapticsEnabled: boolean } })
        .settings.hapticsEnabled
    ) {
      navigator.vibrate([15, 30, 15]);
    }
  }

  private renderIchor(): void {
    this.ichorValue.textContent = fmt(gameState.getIchor());
  }
}
