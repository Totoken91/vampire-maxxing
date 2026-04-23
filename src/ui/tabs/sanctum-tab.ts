// SANCTUM — the Thrall roster screen.
//
// v1.0 preview: grid of 7 hero-tier thralls as Kenny provided them, with
// silhouette placeholders for the 5 common-tier slots still pending. No
// equip / pull / level mechanics yet — those land in L2-L10. The rarity
// frame colour is driven by CSS mask-image on the grey ornament PNG +
// per-rarity custom property.
//
// Filter tabs let the player slice the grid by archetype. "Active
// Thralls" footer is a static teaser for the coming equip system.

import { el } from '../../utils/dom';
import {
  THRALLS,
  THRALL_ROSTER_TARGET,
  archetypeLabel,
  type Thrall,
  type ThrallArchetype,
} from '../../game/config/thralls';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { showThrallDetail } from '../components/thrall-detail-modal';

type FilterId = 'all' | ThrallArchetype;

const FILTERS: readonly { id: FilterId; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'harvester', label: 'HARVESTER' },
  { id: 'nocturne', label: 'NOCTURNE' },
  { id: 'predator', label: 'PREDATOR' },
  { id: 'hybrid', label: 'HYBRID' },
];

export class SanctumTab {
  private readonly root: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly collectedEl: HTMLElement;
  private activeFilter: FilterId = 'all';
  private readonly teardowns: Array<() => void> = [];

  constructor() {
    this.root = el('div', 'tab-view tab-view--sanctum');

    // ── Header
    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the sanctum —'));
    head.appendChild(el('h1', 'tab-head__title', 'THRALLS'));
    this.collectedEl = el('div', 'tab-head__sub');
    head.appendChild(this.collectedEl);
    this.renderCollectedCount();
    this.root.appendChild(head);

    // ── Filter tabs
    const filterRow = el('div', 'sanctum-filters');
    for (const f of FILTERS) {
      const btn = el('button', 'sanctum-filters__btn', f.label) as HTMLButtonElement;
      btn.type = 'button';
      btn.dataset.filter = f.id;
      if (f.id === 'all') btn.classList.add('sanctum-filters__btn--active');
      btn.addEventListener('click', () => this.setFilter(f.id));
      filterRow.appendChild(btn);
    }
    this.root.appendChild(filterRow);

    // ── Grid
    this.grid = el('div', 'thralls-grid');
    this.root.appendChild(this.grid);
    this.renderGrid();

    // ── Active slots footer
    const footer = el('section', 'sanctum-active');
    footer.appendChild(el('div', 'sanctum-active__label', '— active thralls —'));
    const slotRow = el('div', 'sanctum-active__slots');
    for (let i = 0; i < 3; i += 1) {
      const slot = el('div', 'sanctum-active__slot');
      slot.appendChild(el('div', 'sanctum-active__slot-num', `${i + 1}`));
      slotRow.appendChild(slot);
    }
    // The 4th / 5th slots are teasers for later unlocks.
    const locked = el('div', 'sanctum-active__slot sanctum-active__slot--locked');
    locked.appendChild(el('div', 'sanctum-active__slot-lock', '◆'));
    slotRow.appendChild(locked);
    footer.appendChild(slotRow);
    footer.appendChild(
      el(
        'div',
        'sanctum-active__hint',
        'the binding awaits — equip coming soon',
      ),
    );
    this.root.appendChild(footer);
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    // Re-render the grid + collected count when the player obtains a
    // thrall (welcome summon, milestone, pull, …).
    this.teardowns.push(
      events.on('thrall-obtained', () => {
        this.renderGrid();
        this.renderCollectedCount();
      }),
    );
  }

  destroy(): void {
    for (const fn of this.teardowns) fn();
    this.teardowns.length = 0;
    this.root.remove();
  }

  private renderCollectedCount(): void {
    const owned = gameState.ownedThrallCount();
    this.collectedEl.textContent = `Collected: ${owned}/${THRALL_ROSTER_TARGET}`;
  }

  private setFilter(filter: FilterId): void {
    if (this.activeFilter === filter) return;
    this.activeFilter = filter;
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>(
      '.sanctum-filters__btn',
    )) {
      btn.classList.toggle(
        'sanctum-filters__btn--active',
        btn.dataset.filter === filter,
      );
    }
    this.renderGrid();
  }

  private renderGrid(): void {
    this.grid.textContent = '';
    const visible =
      this.activeFilter === 'all'
        ? THRALLS
        : THRALLS.filter((t) => t.archetype === this.activeFilter);

    for (const t of visible) {
      this.grid.appendChild(
        gameState.isThrallOwned(t.id)
          ? this.buildCard(t)
          : this.buildLockedCard(t),
      );
    }

    // Still show "unknown" placeholders for the 5 common-tier slots
    // we haven't generated portraits for yet (keeps the X/12 read
    // clean in the ALL view).
    if (this.activeFilter === 'all') {
      const missing = THRALL_ROSTER_TARGET - THRALLS.length;
      for (let i = 0; i < missing; i += 1) {
        this.grid.appendChild(this.buildSilhouette());
      }
    }
  }

  private buildCard(t: Thrall): HTMLElement {
    const card = el('button', 'thrall-card') as HTMLButtonElement;
    card.type = 'button';
    card.dataset.rarity = t.rarity;
    card.dataset.archetype = t.archetype;

    const portraitWrap = el('div', 'thrall-portrait-wrapper');
    const portrait = el('img', 'thrall-portrait') as HTMLImageElement;
    portrait.src = t.portraitPath;
    portrait.alt = t.name;
    portrait.decoding = 'async';
    portraitWrap.appendChild(portrait);
    card.appendChild(portraitWrap);

    const frame = el('img', 'thrall-frame') as HTMLImageElement;
    frame.src = '/assets/ornaments/thrall-frame.png';
    frame.alt = '';
    frame.decoding = 'async';
    card.appendChild(frame);

    const name = el('div', 'thrall-name', t.name);
    card.appendChild(name);

    const type = el(
      'div',
      'thrall-type',
      archetypeLabel(t.archetype).toUpperCase(),
    );
    card.appendChild(type);

    // "New" indicator — pulsing dot in the corner until acknowledged
    // by opening the detail modal.
    if (gameState.getPlayerThrall(t.id).isNew) {
      card.classList.add('thrall-card--new');
    }

    card.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(6);
      gameState.acknowledgeThrall(t.id);
      card.classList.remove('thrall-card--new');
      showThrallDetail(t);
    });

    return card;
  }

  /**
   * Locked card for a thrall whose portrait exists in data but whom
   * the player hasn't acquired yet. We still render the full rarity-
   * framed card so the player SEES what's coming (loi n°2 — tease the
   * next unlock), but the portrait itself is desaturated + darkened +
   * overlaid with a lock icon. Tap still opens the detail modal so
   * the player can read the lore preview.
   */
  private buildLockedCard(t: Thrall): HTMLElement {
    const card = el(
      'button',
      'thrall-card thrall-card--locked',
    ) as HTMLButtonElement;
    card.type = 'button';
    card.dataset.rarity = t.rarity;
    card.dataset.archetype = t.archetype;

    const portraitWrap = el('div', 'thrall-portrait-wrapper');
    const portrait = el('img', 'thrall-portrait') as HTMLImageElement;
    portrait.src = t.portraitPath;
    portrait.alt = '';
    portrait.decoding = 'async';
    portraitWrap.appendChild(portrait);
    card.appendChild(portraitWrap);

    const frame = el('img', 'thrall-frame') as HTMLImageElement;
    frame.src = '/assets/ornaments/thrall-frame.png';
    frame.alt = '';
    frame.decoding = 'async';
    card.appendChild(frame);

    const lockBadge = el('div', 'thrall-lock', '◆');
    card.appendChild(lockBadge);

    // Name hidden by the lock — just show the archetype so the
    // player has a hint of what they're missing.
    const type = el(
      'div',
      'thrall-type',
      archetypeLabel(t.archetype).toUpperCase(),
    );
    card.appendChild(type);

    card.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(4);
      showThrallDetail(t);
    });

    return card;
  }

  private buildSilhouette(): HTMLElement {
    const card = el('div', 'thrall-card thrall-card--silhouette');
    card.dataset.rarity = 'unknown';
    const frame = el('img', 'thrall-frame') as HTMLImageElement;
    frame.src = '/assets/ornaments/thrall-frame.png';
    frame.alt = '';
    frame.decoding = 'async';
    card.appendChild(frame);
    card.appendChild(el('div', 'thrall-silhouette-mark', '?'));
    card.appendChild(el('div', 'thrall-name thrall-name--locked', 'unknown'));
    return card;
  }
}
