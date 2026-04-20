// SHOP — monetization home. Two sections :
//   * SPECIAL OFFERS (IAPs) — hidden behind a "Offers open soon" placeholder
//     until Phase D (Google Play Billing plumbing + FTB popup).
//   * UPGRADES (permanent dread sinks) — the 5 meta upgrades designed in
//     the V2 roadmap. Rendered as disabled cards here so the layout and
//     copy ship now; B1/B2 flip them to real buyable upgrades.
//
// Wallet shows Dread only — blood lives in the Bloodline top bar and
// repeating it here added noise for no aspiration value.

import { el } from '../../utils/dom';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { showToast } from '../components/toast';

interface UpgradePreview {
  id: string;
  title: string;
  sub: string;
  icon: string;
  maxLevel: number;
  firstCost: number;
}

/** The 5 permanent dread sinks planned in Phase B. Single source of truth
 * for labels; effects live in the eventual upgrade config. */
const UPGRADES: readonly UpgradePreview[] = [
  {
    id: 'blood_altar',
    title: 'Blood Altar',
    sub: 'Auto-claim blood · 4h → 1h (lvl 5)',
    icon: '\u26EB', // ⛫
    maxLevel: 5,
    firstCost: 10,
  },
  {
    id: 'servant_loyalty',
    title: 'Servant Loyalty',
    sub: '+5% thrall rate per level',
    icon: '\u26B7', // ⚷
    maxLevel: 10,
    firstCost: 5,
  },
  {
    id: 'bloodline_scholar',
    title: 'Bloodline Scholar',
    sub: 'Reduce thrall cost multiplier',
    icon: '\u2692', // ⚒
    maxLevel: 5,
    firstCost: 15,
  },
  {
    id: 'dread_amplifier',
    title: 'Dread Amplifier',
    sub: '+10% Dread on Ascend per level',
    icon: '\u26B0', // ⚰
    maxLevel: 3,
    firstCost: 25,
  },
  {
    id: 'offline_keeper',
    title: 'Offline Keeper',
    sub: '+1h offline cap per level',
    icon: '\u263D', // ☽
    maxLevel: 3,
    firstCost: 20,
  },
];

export class ShopTab {
  private readonly root: HTMLElement;
  private readonly teardowns: Array<() => void> = [];
  private readonly dreadValue: HTMLElement;

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

    // OFFERS — placeholder until Phase D.
    const offersSection = el('section', 'tome-section shop-section--offers');
    offersSection.appendChild(
      el('h2', 'tome-section__title', 'SPECIAL OFFERS'),
    );
    offersSection.appendChild(
      el(
        'div',
        'shop-placeholder',
        'Offers open soon — rites first. The apothecary is still stocking the shelves.',
      ),
    );
    this.root.appendChild(offersSection);

    // UPGRADES — 5 previews.
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
    this.renderWallet();
    this.teardowns.push(
      events.on('blood-changed', () => this.renderWallet()),
      events.on('tick', () => this.renderWallet()),
    );
  }

  destroy(): void {
    for (const t of this.teardowns) t();
    this.teardowns.length = 0;
    this.root.remove();
  }

  private renderWallet(): void {
    this.dreadValue.textContent = `${gameState.getDread()}`;
  }

  private buildUpgrade(up: UpgradePreview): HTMLElement {
    const card = el('button', 'shop-card shop-card--upgrade') as HTMLButtonElement;
    card.type = 'button';
    card.disabled = true;

    const icon = el('div', 'shop-card__icon shop-card__icon--gold');
    icon.textContent = up.icon;

    const info = el('div', 'shop-card__info');
    info.appendChild(el('div', 'shop-card__title', up.title));
    info.appendChild(el('div', 'shop-card__sub', up.sub));

    const levelDots = el('div', 'shop-card__level');
    for (let i = 0; i < up.maxLevel; i++) {
      const d = el('span', 'shop-card__level-pip shop-card__level-pip--empty');
      d.textContent = '\u25C7'; // ◇
      levelDots.appendChild(d);
    }
    info.appendChild(levelDots);

    const priceEl = el('div', 'shop-card__price shop-card__price--dread');
    priceEl.innerHTML = `<span class="shop-card__price-icon">\u2726</span> ${up.firstCost}`;

    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(priceEl);

    card.addEventListener('click', () => {
      showToast('LOCKED', 'The altar awakens with the next update.');
    });
    return card;
  }
}
