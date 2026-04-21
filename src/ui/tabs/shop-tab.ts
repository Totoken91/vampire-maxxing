// SHOP — monetization home. Two sections:
//   * SPECIAL OFFERS (IAPs) — hidden behind a "Offers open soon" placeholder
//     until Phase D (Google Play Billing plumbing + FTB popup).
//   * UPGRADES (permanent dread sinks) — the 5 meta upgrades from B1.
//     Cards are live: affordable ones pulse + can be bought for Dread,
//     locked ones dim. Blood Altar shows its next-claim countdown.

import { el } from '../../utils/dom';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { showToast } from '../components/toast';
import { fmt } from '../../utils/format';
import { UPGRADES, type UpgradeDef } from '../../game/config/upgrades';
import {
  altarSecondsRemaining,
  buyUpgrade,
  canAffordUpgrade,
  getUpgradeLevel,
  getUpgradeNextCost,
} from '../../game/upgrades';

function formatInterval(sec: number): string {
  if (sec <= 0) return 'ready';
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (sec >= 60) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${sec}s`;
}

interface UpgradeCardHandles {
  card: HTMLButtonElement;
  pips: HTMLElement;
  price: HTMLElement;
  sub: HTMLElement;
}

export class ShopTab {
  private readonly root: HTMLElement;
  private readonly teardowns: Array<() => void> = [];
  private readonly dreadValue: HTMLElement;
  private readonly cards = new Map<string, UpgradeCardHandles>();

  constructor() {
    this.root = el('div', 'tab-view tab-view--shop');

    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the apothecary —'));
    head.appendChild(el('h1', 'tab-head__title', 'SHOP'));
    head.appendChild(
      el('div', 'tab-head__sub', 'Spend Dread on permanent rites.'),
    );
    this.root.appendChild(head);

    // Wallet — Dread only.
    const wallet = el('div', 'shop-wallet');
    const dreadPill = el('div', 'shop-wallet__pill shop-wallet__pill--dread');
    dreadPill.appendChild(el('span', 'shop-wallet__icon', '\u2726')); // ✦
    const dreadValue = el('span', 'shop-wallet__value', '0');
    dreadPill.appendChild(dreadValue);
    const dreadLabel = el('span', 'shop-wallet__label', 'DREAD');
    dreadPill.appendChild(dreadLabel);
    wallet.appendChild(dreadPill);
    this.root.appendChild(wallet);
    this.dreadValue = dreadValue;

    // SPECIAL OFFERS (IAPs) lands in Phase D. Hidden entirely until then so
    // players don't encounter a dead section and learn the store is empty.

    // UPGRADES — 5 dread sinks.
    const upgradesSection = el('section', 'tome-section');
    upgradesSection.appendChild(el('h2', 'tome-section__title', 'UPGRADES'));
    const upgradesList = el('div', 'shop-list');
    for (const up of UPGRADES) {
      upgradesList.appendChild(this.buildUpgrade(up));
    }
    upgradesSection.appendChild(upgradesList);
    this.root.appendChild(upgradesSection);
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    this.render();
    this.teardowns.push(
      events.on('blood-changed', () => this.render()),
      events.on('tick', () => this.render()),
      events.on('upgrade-bought', () => this.render()),
      events.on('altar-claimed', () => this.render()),
    );
  }

  destroy(): void {
    for (const t of this.teardowns) t();
    this.teardowns.length = 0;
    this.root.remove();
  }

  private render(): void {
    this.dreadValue.textContent = `${gameState.getDread()}`;
    for (const def of UPGRADES) {
      this.renderCard(def);
    }
  }

  private renderCard(def: UpgradeDef): void {
    const h = this.cards.get(def.id);
    if (!h) return;
    const level = getUpgradeLevel(def.id);
    const maxed = level >= def.maxLevel;
    const cost = getUpgradeNextCost(def.id);
    const afford = canAffordUpgrade(def.id);

    // Pips: filled ◆ for each owned level, hollow ◇ for the rest.
    const pipNodes = h.pips.querySelectorAll<HTMLElement>('.shop-card__level-pip');
    pipNodes.forEach((node, idx) => {
      const owned = idx < level;
      node.textContent = owned ? '\u25C6' : '\u25C7';
      node.classList.toggle('shop-card__level-pip--empty', !owned);
    });

    // Price + state
    if (maxed) {
      h.price.innerHTML = '<span class="shop-card__price-icon">\u26AB</span> MAX';
      h.card.disabled = true;
      h.card.classList.add('shop-card--maxed');
      h.card.classList.remove('shop-card--affordable');
    } else {
      h.price.innerHTML = `<span class="shop-card__price-icon">\u2726</span> ${cost}`;
      h.card.disabled = !afford;
      h.card.classList.toggle('shop-card--affordable', afford);
      h.card.classList.remove('shop-card--maxed');
    }

    // Blood Altar gets a live countdown line under its description.
    if (def.id === 'blood_altar' && level > 0) {
      h.sub.textContent = `Auto-claim every ${formatInterval(
        Math.floor(altarSecondsRemaining()),
      )}`;
    } else {
      h.sub.textContent = def.description;
    }
  }

  private buildUpgrade(def: UpgradeDef): HTMLElement {
    const card = el('button', 'shop-card shop-card--upgrade') as HTMLButtonElement;
    card.type = 'button';

    const icon = el('div', 'shop-card__icon shop-card__icon--gold');
    icon.textContent = def.icon;

    const info = el('div', 'shop-card__info');
    info.appendChild(el('div', 'shop-card__title', def.title));
    const sub = el('div', 'shop-card__sub', def.description);
    info.appendChild(sub);

    const pips = el('div', 'shop-card__level');
    for (let i = 0; i < def.maxLevel; i++) {
      const d = el('span', 'shop-card__level-pip shop-card__level-pip--empty');
      d.textContent = '\u25C7';
      pips.appendChild(d);
    }
    info.appendChild(pips);

    const price = el('div', 'shop-card__price shop-card__price--dread');
    price.innerHTML = `<span class="shop-card__price-icon">\u2726</span> ${def.costs[0]}`;

    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(price);

    card.addEventListener('click', () => this.handleBuy(def));

    this.cards.set(def.id, { card, pips, price, sub });
    return card;
  }

  private handleBuy(def: UpgradeDef): void {
    const level = getUpgradeLevel(def.id);
    if (level >= def.maxLevel) {
      showToast('MAXED', `${def.title} has reached its peak.`);
      return;
    }
    if (!canAffordUpgrade(def.id)) {
      const cost = getUpgradeNextCost(def.id);
      showToast('NOT ENOUGH DREAD', `Need ${fmt(cost)} Dread.`);
      return;
    }
    if (buyUpgrade(def.id)) {
      if (navigator.vibrate) navigator.vibrate(15);
      showToast(def.title.toUpperCase(), def.flavor);
      this.render();
    }
  }
}
