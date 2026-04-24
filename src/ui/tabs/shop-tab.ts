// SHOP — monetization home. In v1.0.0 this hosted 5 paid meta-upgrades
// bought with Dread. M1 (2026-04-24) removed that system: Dread is a
// pure rank now, 4 of 5 upgrades were redundant with Phase L thralls,
// and Bloodline Scholar moved to auto-granted milestones (see
// game/milestones.ts).
//
// Current state: a placeholder until Phase L10 lands the Ichor pack
// ladder (7 tiers) + Phase L11 the Pack Fondateur trigger. Shop stays
// in the tab bar so the slot doesn't disappear and reappear — behaviour
// stability matters for spatial memory.

import { el } from '../../utils/dom';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { scholarTier, SCHOLAR_THRESHOLDS } from '../../game/milestones';

export class ShopTab {
  private readonly root: HTMLElement;
  private readonly teardowns: Array<() => void> = [];
  private readonly scholarLine: HTMLElement;

  constructor() {
    this.root = el('div', 'tab-view tab-view--shop');

    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the apothecary —'));
    head.appendChild(el('h1', 'tab-head__title', 'SHOP'));
    head.appendChild(
      el('div', 'tab-head__sub', 'Offerings from the living world will arrive here.'),
    );
    this.root.appendChild(head);

    // Placeholder card for the pack ladder (L10). Static copy, no CTA.
    const offersSection = el('section', 'tome-section');
    offersSection.appendChild(el('h2', 'tome-section__title', 'SPECIAL OFFERS'));
    const offersPlaceholder = el(
      'div',
      'shop-placeholder',
      'The pact is still being drafted. Offerings open in a coming rite.',
    );
    offersSection.appendChild(offersPlaceholder);
    this.root.appendChild(offersSection);

    // Passive vitrine — shows which Dread Level unlocks the next Scholar
    // tier so the upgrade system's replacement stays visible to players.
    const milestonesSection = el('section', 'tome-section');
    milestonesSection.appendChild(el('h2', 'tome-section__title', 'MILESTONE BONUSES'));
    this.scholarLine = el('div', 'shop-placeholder');
    milestonesSection.appendChild(this.scholarLine);
    this.root.appendChild(milestonesSection);
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    this.render();
    this.teardowns.push(
      events.on('dread-changed', () => this.render()),
      events.on('ascended', () => this.render()),
    );
  }

  destroy(): void {
    for (const t of this.teardowns) t();
    this.teardowns.length = 0;
    this.root.remove();
  }

  private render(): void {
    const dread = gameState.getDread();
    const tier = scholarTier(dread);
    if (tier >= SCHOLAR_THRESHOLDS.length) {
      this.scholarLine.textContent =
        `Bloodline Scholar — MAX (-${(tier * 0.01).toFixed(2)} servant cost mult). You have studied eternity.`;
      return;
    }
    const nextThreshold = SCHOLAR_THRESHOLDS[tier];
    const currentBonus = tier > 0 ? ` (-${(tier * 0.01).toFixed(2)} servant cost mult).` : '';
    this.scholarLine.textContent =
      `Bloodline Scholar — tier ${tier}/${SCHOLAR_THRESHOLDS.length}${currentBonus} Next unlock at Dread Level ${nextThreshold}.`;
  }
}
