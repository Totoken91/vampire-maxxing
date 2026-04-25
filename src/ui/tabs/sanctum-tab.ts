// SANCTUM — the Thrall roster screen.
//
// v1.2 (2026-04-24): 12-slot MVP roster (6 Commons + 4 Rares + 2 Epics)
// rendered with full portraits + rarity-tinted frames. Legendaries are
// planned for v1.1+ and live outside of code for now.
//
// Equip / pull / level mechanics land in L4–L10. Filter tabs slice
// the grid by archetype. "Active Thralls" footer is a static teaser
// for the coming equip system.

import { el } from '../../utils/dom';
import {
  THRALLS,
  THRALL_ROSTER_TARGET,
  THRALLS_BY_ID,
  archetypeLabel,
  type Thrall,
  type ThrallArchetype,
} from '../../game/config/thralls';
import { STAR_MAX_PER_RARITY } from '../../game/config/awakening';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { showThrallDetail } from '../components/thrall-detail-modal';
import { showRitualsScreen } from '../components/rituals-screen';

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
  private activeFooter!: HTMLElement;
  private essenceRow!: HTMLElement;
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

    // ── Essence counters — gold/violet/crimson pills with the current
    //    balance per rarity. Updates on essence-gained.
    this.essenceRow = this.buildEssenceRow();
    this.root.appendChild(this.essenceRow);

    // ── Invoke CTA — opens the Rituals screen.
    const invoke = el(
      'button',
      'sanctum-invoke',
      'INVOKE',
    ) as HTMLButtonElement;
    invoke.type = 'button';
    invoke.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(8);
      showRitualsScreen();
    });
    this.root.appendChild(invoke);

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

    // ── Active slots footer (L6 — real equip slots)
    this.activeFooter = this.buildActiveFooter();
    this.root.appendChild(this.activeFooter);
  }

  /** Build the essence counter row — three rarity-tinted pills
   * showing current balance. Mounted once; values updated via
   * `renderEssences()`. */
  private buildEssenceRow(): HTMLElement {
    const row = el('div', 'sanctum-essences');
    for (const rarity of ['common', 'rare', 'epic'] as const) {
      const pill = el('div', `sanctum-essences__pill`);
      pill.dataset.rarity = rarity;
      const orb = el('span', 'sanctum-essences__orb');
      const value = el('span', 'sanctum-essences__value', '0');
      value.dataset.rarity = rarity;
      const label = el(
        'span',
        'sanctum-essences__label',
        `${rarity} essence`,
      );
      pill.appendChild(orb);
      pill.appendChild(value);
      pill.appendChild(label);
      row.appendChild(pill);
    }
    return row;
  }

  private renderEssences(): void {
    const values = this.essenceRow.querySelectorAll<HTMLElement>(
      '.sanctum-essences__value',
    );
    for (const v of values) {
      const rarity = v.dataset.rarity as 'common' | 'rare' | 'epic';
      v.textContent = String(gameState.getEssence(rarity));
    }
  }

  /** Render the 3 active slots + 1 locked teaser. Re-rendered when
   * an equip changes so portraits / empty placeholders stay fresh. */
  private buildActiveFooter(): HTMLElement {
    const footer = el('section', 'sanctum-active');
    footer.appendChild(el('div', 'sanctum-active__label', '— active thralls —'));
    const slotRow = el('div', 'sanctum-active__slots');
    slotRow.id = 'sanctum-active-slots';
    footer.appendChild(slotRow);
    footer.appendChild(
      el(
        'div',
        'sanctum-active__hint',
        'tap a slot to unbind &middot; tap a thrall to equip',
      ),
    );
    return footer;
  }

  private renderActiveSlots(): void {
    const slotRow = this.activeFooter.querySelector(
      '.sanctum-active__slots',
    ) as HTMLElement;
    slotRow.textContent = '';
    const slots = gameState.getEquippedSlots();
    for (let i = 0; i < slots.length; i += 1) {
      const id = slots[i];
      const slot = el(
        'button',
        id ? 'sanctum-active__slot sanctum-active__slot--filled' : 'sanctum-active__slot',
      ) as HTMLButtonElement;
      slot.type = 'button';
      slot.dataset.slotIndex = String(i);
      if (id) {
        const t = THRALLS_BY_ID[id];
        slot.dataset.rarity = t.rarity;
        const img = el('img', 'sanctum-active__slot-img') as HTMLImageElement;
        img.src = t.portraitPath;
        img.alt = t.name;
        img.decoding = 'async';
        slot.appendChild(img);
        // Stars badge
        const stars = gameState.getPlayerThrall(id).stars + 1;
        slot.appendChild(
          el('div', 'sanctum-active__slot-stars', '★'.repeat(stars)),
        );
        slot.addEventListener('click', () => {
          if (navigator.vibrate) navigator.vibrate(5);
          gameState.unequipSlot(i);
        });
      } else {
        slot.appendChild(el('div', 'sanctum-active__slot-num', `${i + 1}`));
        slot.appendChild(
          el('div', 'sanctum-active__slot-empty', 'empty'),
        );
      }
      slotRow.appendChild(slot);
    }
    // Teaser slot 4 — locked until Dread expansion lands.
    const locked = el(
      'div',
      'sanctum-active__slot sanctum-active__slot--locked',
    );
    locked.appendChild(el('div', 'sanctum-active__slot-lock', '◆'));
    slotRow.appendChild(locked);
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    this.renderActiveSlots();
    this.renderEssences();
    // Re-render the grid + collected count when the player obtains a
    // thrall (welcome summon, milestone, pull, …).
    this.teardowns.push(
      events.on('thrall-obtained', () => {
        this.renderGrid();
        this.renderCollectedCount();
        this.renderActiveSlots();
      }),
    );
    // L6 — refresh equip slots on equip changes + awakenings.
    this.teardowns.push(
      events.on('thrall-equipped', () => this.renderActiveSlots()),
    );
    this.teardowns.push(
      events.on('thrall-awakened', () => {
        this.renderActiveSlots();
        this.renderGrid();
        this.renderEssences();
      }),
    );
    // Essence balance updates from pulls / cinder ceremonies / cheats.
    this.teardowns.push(
      events.on('essence-gained', () => this.renderEssences()),
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

    // Safety net: if the roster ever ships below target (e.g. an ID
    // got removed mid-migration), fill with generic silhouettes so the
    // ALL grid stays rectangular and the X/12 read stays honest.
    if (this.activeFilter === 'all' && THRALLS.length < THRALL_ROSTER_TARGET) {
      const missing = THRALL_ROSTER_TARGET - THRALLS.length;
      for (let i = 0; i < missing; i += 1) {
        this.grid.appendChild(this.buildSilhouette());
      }
    }
  }

  private buildCard(t: Thrall): HTMLElement {
    const card = el('button', 'thrall-card') as HTMLButtonElement;
    card.type = 'button';
    card.dataset.thrallId = t.id;
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

    // L6 — star tier strip at the TOP cartouche of the frame. Filled
    // stars use the rarity tint, empty stars dim grey.
    const max = STAR_MAX_PER_RARITY[t.rarity];
    const filled = gameState.getPlayerThrall(t.id).stars + 1;
    const stars = el('div', 'thrall-stars');
    for (let i = 0; i < max; i += 1) {
      const star = el(
        'span',
        `thrall-stars__star${i < filled ? ' thrall-stars__star--on' : ''}`,
        '★',
      );
      stars.appendChild(star);
    }
    card.appendChild(stars);

    // L6 — equipped indicator: a small chain glyph in the top-LEFT
    // corner when this thrall is in an active slot. Top-RIGHT is
    // reserved for the "new" pulse; using the opposite corner keeps
    // both readable simultaneously.
    if (gameState.isThrallEquipped(t.id)) {
      card.classList.add('thrall-card--equipped');
      const chain = el('div', 'thrall-card__equipped-mark', '◆');
      card.appendChild(chain);
    }

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
    card.dataset.thrallId = t.id;
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
