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
  private activeFilter: FilterId = 'all';

  constructor() {
    this.root = el('div', 'tab-view tab-view--sanctum');

    // ── Header
    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the sanctum —'));
    head.appendChild(el('h1', 'tab-head__title', 'THRALLS'));
    head.appendChild(
      el(
        'div',
        'tab-head__sub',
        `Collected: ${THRALLS.length}/${THRALL_ROSTER_TARGET}`,
      ),
    );
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
    this.grid = el('div', 'sanctum-grid');
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
  }

  destroy(): void {
    this.root.remove();
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
      this.grid.appendChild(this.buildCard(t));
    }

    // Fill in silhouette placeholders so the "X/12" count reads
    // visually. Only shown when the ALL filter is active — filtered
    // views just show their actual count.
    if (this.activeFilter === 'all') {
      const missing = THRALL_ROSTER_TARGET - THRALLS.length;
      for (let i = 0; i < missing; i += 1) {
        this.grid.appendChild(this.buildSilhouette());
      }
    }
  }

  private buildCard(t: Thrall): HTMLElement {
    const card = el('div', 'thrall-card');
    card.dataset.rarity = t.rarity;
    card.dataset.archetype = t.archetype;

    // The frame is a masked div — background colour = rarity colour,
    // shape = grey ornament PNG's alpha channel.
    const frame = el('div', 'thrall-card__frame');
    card.appendChild(frame);

    const img = el('img', 'thrall-card__portrait') as HTMLImageElement;
    img.src = t.portraitPath;
    img.alt = t.name;
    img.decoding = 'async';
    card.appendChild(img);

    const info = el('div', 'thrall-card__info');
    info.appendChild(el('div', 'thrall-card__name', t.name));
    info.appendChild(
      el('div', 'thrall-card__meta', archetypeLabel(t.archetype)),
    );
    card.appendChild(info);

    return card;
  }

  private buildSilhouette(): HTMLElement {
    const card = el('div', 'thrall-card thrall-card--silhouette');
    card.dataset.rarity = 'unknown';
    card.appendChild(el('div', 'thrall-card__frame'));
    card.appendChild(el('div', 'thrall-card__silhouette-mark', '?'));
    card.appendChild(
      el('div', 'thrall-card__info thrall-card__info--locked', 'unknown'),
    );
    return card;
  }
}
