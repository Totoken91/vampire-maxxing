// TOME — the codex. Stats block up top, achievements grid below.
// Same grid layout as the old modal, now inlined so it's a first-class
// destination rather than a menu afterthought.

import { el } from '../../utils/dom';
import { ACHIEVEMENTS } from '../../game/config/achievements';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { fmt } from '../../utils/format';

export class TomeTab {
  private readonly root: HTMLElement;
  private readonly teardowns: Array<() => void> = [];
  private readonly statValues = new Map<string, HTMLElement>();
  private readonly grid: HTMLElement;
  private readonly summary: HTMLElement;

  constructor() {
    this.root = el('div', 'tab-view tab-view--tome');

    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the codex —'));
    head.appendChild(el('h1', 'tab-head__title', 'TOME'));
    head.appendChild(
      el('div', 'tab-head__sub', 'A record of centuries, deeds, and discoveries.'),
    );
    this.root.appendChild(head);

    // Stats block
    const statsSection = el('section', 'tome-section');
    statsSection.appendChild(el('h2', 'tome-section__title', 'CHRONICLE'));
    const stats = el('div', 'tome-stats');
    for (const [id, label] of this.statFields()) {
      const row = el('div', 'tome-stat');
      row.appendChild(el('div', 'tome-stat__label', label));
      const value = el('div', 'tome-stat__value', '—');
      row.appendChild(value);
      stats.appendChild(row);
      this.statValues.set(id, value);
    }
    statsSection.appendChild(stats);
    this.root.appendChild(statsSection);

    // Achievements block
    const achievementsSection = el('section', 'tome-section');
    const achievementsHead = el('div', 'tome-section__head');
    achievementsHead.appendChild(el('h2', 'tome-section__title', 'ACHIEVEMENTS'));
    const summary = el('div', 'tome-section__summary');
    achievementsHead.appendChild(summary);
    achievementsSection.appendChild(achievementsHead);

    const grid = el('div', 'achievements__grid');
    achievementsSection.appendChild(grid);
    this.root.appendChild(achievementsSection);

    this.grid = grid;
    this.summary = summary;
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    // Opening the Tome acknowledges every unlocked achievement, clearing the
    // notification dot on the tab.
    gameState.markAchievementsSeen();
    this.renderStats();
    this.renderAchievements();
    this.teardowns.push(
      events.on('tick', () => this.renderStats()),
      events.on('blood-changed', () => this.renderStats()),
      events.on('form-changed', () => this.renderStats()),
      events.on('thrall-bought', () => this.renderStats()),
      events.on('achievement-unlocked', () => this.renderAchievements()),
    );
  }

  destroy(): void {
    for (const t of this.teardowns) t();
    this.teardowns.length = 0;
    this.root.remove();
  }

  private statFields(): Array<[string, string]> {
    return [
      ['dread', 'Dread'],
      ['ascends', 'Ascensions'],
      ['totalBlood', 'Blood gathered'],
      ['playTime', 'Time in night'],
      ['totalTaps', 'Taps endured'],
      ['crits', 'Critical bites'],
    ];
  }

  private renderStats(): void {
    const snap = gameState.get();
    const set = (id: string, val: string): void => {
      const el = this.statValues.get(id);
      if (el) el.textContent = val;
    };
    set('dread', `× ${snap.dread}`);
    set('ascends', `${snap.stats.totalAscends}`);
    set('totalBlood', fmt(snap.totalLifetimeBlood));
    set('playTime', formatDuration(snap.stats.totalPlayTime));
    set('totalTaps', `${snap.stats.totalTaps}`);
    set('crits', `${snap.stats.totalCrits}`);
  }

  private renderAchievements(): void {
    const unlocked = gameState.getUnlockedAchievements();
    this.summary.textContent = `${unlocked.size} / ${ACHIEVEMENTS.length}`;
    this.grid.innerHTML = '';
    for (const def of ACHIEVEMENTS) {
      const isUnlocked = unlocked.has(def.id);
      const card = el(
        'div',
        `achievement-card achievement-card--${isUnlocked ? 'unlocked' : 'locked'}`,
      );
      const icon = el('div', 'achievement-card__icon');
      icon.textContent = isUnlocked ? '\u25C8' : '\u25C7';
      const title = el(
        'div',
        'achievement-card__title',
        isUnlocked ? def.title : '???',
      );
      const body = el(
        'div',
        'achievement-card__desc',
        isUnlocked ? def.desc : 'Hidden until earned.',
      );
      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(body);
      this.grid.appendChild(card);
    }
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}
