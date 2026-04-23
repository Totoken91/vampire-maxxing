// TOME — the codex. Five sections: Chronicle (run stats), Achievements
// (20-card grid), Bestiary (8 thrall lore entries), Histories (8 form
// lore entries), Run log (10 most recent ascensions).
//
// Bestiary + Histories unlock progressively — thralls on first purchase,
// forms when reached. Locked entries show a silhouette + "???". Tap an
// unlocked entry to read the full paragraph in a modal.

import { el } from '../../utils/dom';
import { ACHIEVEMENTS } from '../../game/config/achievements';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { fmt } from '../../utils/format';
import { SERVANTS, type ServantId } from '../../game/config/servants';
import { FORMS, FORMS_BY_ID, type VampireForm } from '../../game/config/forms';
import { SERVANT_LORE, FORM_LORE } from '../../game/config/lore';

export class TomeTab {
  private readonly root: HTMLElement;
  private readonly teardowns: Array<() => void> = [];
  private readonly statValues = new Map<string, HTMLElement>();
  private readonly achievementsGrid: HTMLElement;
  private readonly achievementsSummary: HTMLElement;
  private readonly bestiaryGrid: HTMLElement;
  private readonly bestiarySummary: HTMLElement;
  private readonly historiesGrid: HTMLElement;
  private readonly historiesSummary: HTMLElement;
  private readonly runLog: HTMLElement;
  private readonly runLogEmpty: HTMLElement;

  constructor() {
    this.root = el('div', 'tab-view tab-view--tome');

    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the codex —'));
    head.appendChild(el('h1', 'tab-head__title', 'TOME'));
    head.appendChild(
      el('div', 'tab-head__sub', 'A record of centuries, deeds, and discoveries.'),
    );
    this.root.appendChild(head);

    // ── CHRONICLE (stats)
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

    // ── ACHIEVEMENTS
    this.achievementsGrid = el('div', 'achievements__grid');
    this.achievementsSummary = el('div', 'tome-section__summary');
    this.root.appendChild(
      this.buildSection('ACHIEVEMENTS', this.achievementsSummary, this.achievementsGrid),
    );

    // ── BESTIARY
    this.bestiaryGrid = el('div', 'lore-grid');
    this.bestiarySummary = el('div', 'tome-section__summary');
    this.root.appendChild(
      this.buildSection('BESTIARY', this.bestiarySummary, this.bestiaryGrid),
    );

    // ── HISTORIES
    this.historiesGrid = el('div', 'lore-grid');
    this.historiesSummary = el('div', 'tome-section__summary');
    this.root.appendChild(
      this.buildSection('HISTORIES', this.historiesSummary, this.historiesGrid),
    );

    // ── RUN LOG
    const runLogSection = el('section', 'tome-section');
    runLogSection.appendChild(el('h2', 'tome-section__title', 'RUN LOG'));
    this.runLog = el('div', 'run-log');
    this.runLogEmpty = el(
      'div',
      'tome-empty',
      'Your first ascension will be inscribed here.',
    );
    runLogSection.appendChild(this.runLog);
    runLogSection.appendChild(this.runLogEmpty);
    this.root.appendChild(runLogSection);
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    gameState.markAchievementsSeen();
    this.renderStats();
    this.renderAchievements();
    this.renderBestiary();
    this.renderHistories();
    this.renderRunLog();
    this.teardowns.push(
      events.on('tick', () => this.renderStats()),
      events.on('blood-changed', () => this.renderStats()),
      events.on('form-changed', () => {
        this.renderStats();
        this.renderHistories();
      }),
      events.on('servant-bought', () => {
        this.renderStats();
        this.renderBestiary();
      }),
      events.on('achievement-unlocked', () => this.renderAchievements()),
      events.on('lore-unlocked', ({ kind }) => {
        if (kind === 'servant') this.renderBestiary();
        else this.renderHistories();
      }),
      events.on('ascended', () => this.renderRunLog()),
    );
  }

  destroy(): void {
    for (const t of this.teardowns) t();
    this.teardowns.length = 0;
    this.root.remove();
  }

  // ── Section builders ──

  private buildSection(
    title: string,
    summary: HTMLElement,
    body: HTMLElement,
  ): HTMLElement {
    const section = el('section', 'tome-section');
    const head = el('div', 'tome-section__head');
    head.appendChild(el('h2', 'tome-section__title', title));
    head.appendChild(summary);
    section.appendChild(head);
    section.appendChild(body);
    return section;
  }

  // ── Renderers ──

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
    const dreadEl = this.statValues.get('dread');
    if (dreadEl) {
      dreadEl.innerHTML = `<img class="tome-stat__icon" src="/assets/ornaments/dread-icon.webp" alt=""><span>${snap.dread}</span>`;
    }
    set('ascends', `${snap.stats.totalAscends}`);
    set('totalBlood', fmt(snap.totalLifetimeBlood));
    set('playTime', formatDuration(snap.stats.totalPlayTime));
    set('totalTaps', `${snap.stats.totalTaps}`);
    set('crits', `${snap.stats.totalCrits}`);
  }

  private renderAchievements(): void {
    const unlocked = gameState.getUnlockedAchievements();
    this.achievementsSummary.textContent = `${unlocked.size} / ${ACHIEVEMENTS.length}`;
    this.achievementsGrid.innerHTML = '';
    for (const def of ACHIEVEMENTS) {
      const isUnlocked = unlocked.has(def.id);
      const card = el(
        'div',
        `achievement-card achievement-card--${isUnlocked ? 'unlocked' : 'locked'}`,
      );
      const icon = el('div', 'achievement-card__icon');
      icon.textContent = isUnlocked ? '◈' : '◇';
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
      this.achievementsGrid.appendChild(card);
    }
  }

  private renderBestiary(): void {
    const unlocked = gameState.get().unlockedServantLore;
    this.bestiarySummary.textContent = `${unlocked.size} / ${SERVANTS.length}`;
    this.bestiaryGrid.innerHTML = '';
    for (const thrall of SERVANTS) {
      const isUnlocked = unlocked.has(thrall.id);
      this.bestiaryGrid.appendChild(
        this.buildLoreCard({
          isUnlocked,
          title: thrall.name,
          subtitle: `Tier ${thrall.tier}`,
          preview: isUnlocked ? firstSentence(SERVANT_LORE[thrall.id]) : 'Hidden until sired.',
          onOpen: () =>
            showLoreModal(thrall.name, `Tier ${thrall.tier}`, SERVANT_LORE[thrall.id]),
        }),
      );
    }
  }

  private renderHistories(): void {
    const unlocked = gameState.get().unlockedFormLore;
    this.historiesSummary.textContent = `${unlocked.size} / ${FORMS.length}`;
    this.historiesGrid.innerHTML = '';
    for (const form of FORMS) {
      const isUnlocked = unlocked.has(form.id);
      this.historiesGrid.appendChild(
        this.buildLoreCard({
          isUnlocked,
          title: form.subtitle,
          subtitle: 'An age of the bloodline',
          preview: isUnlocked ? firstSentence(FORM_LORE[form.id]) : 'Hidden until reached.',
          onOpen: () =>
            showLoreModal(form.subtitle, 'An age of the bloodline', FORM_LORE[form.id]),
        }),
      );
    }
  }

  private buildLoreCard(opts: {
    isUnlocked: boolean;
    title: string;
    subtitle: string;
    preview: string;
    onOpen: () => void;
  }): HTMLElement {
    const card = el(
      'button',
      `lore-card lore-card--${opts.isUnlocked ? 'unlocked' : 'locked'}`,
    ) as HTMLButtonElement;
    card.type = 'button';
    card.disabled = !opts.isUnlocked;

    const glyph = el('div', 'lore-card__glyph');
    glyph.textContent = opts.isUnlocked ? '◈' : '◇';

    const body = el('div', 'lore-card__body');
    body.appendChild(
      el('div', 'lore-card__title', opts.isUnlocked ? opts.title : '???'),
    );
    body.appendChild(
      el('div', 'lore-card__subtitle', opts.isUnlocked ? opts.subtitle : '—'),
    );
    body.appendChild(el('div', 'lore-card__preview', opts.preview));

    card.appendChild(glyph);
    card.appendChild(body);

    if (opts.isUnlocked) {
      card.addEventListener('click', opts.onOpen);
    }
    return card;
  }

  private renderRunLog(): void {
    const runs = gameState.get().runHistory;
    this.runLog.innerHTML = '';
    if (runs.length === 0) {
      this.runLogEmpty.hidden = false;
      return;
    }
    this.runLogEmpty.hidden = true;
    for (const run of runs) {
      const row = el('div', 'run-log__row');
      const date = new Date(run.ts);
      const formDef = FORMS_BY_ID[run.form];

      const when = el('div', 'run-log__when', formatRelative(date));
      const form = el(
        'div',
        'run-log__form',
        formDef ? formDef.subtitle : `${run.form}`,
      );
      const blood = el('div', 'run-log__blood', fmt(run.maxBlood));
      const dread = el('div', 'run-log__dread');
      dread.innerHTML = `<img class="run-log__icon" src="/assets/ornaments/dread-icon.webp" alt=""><span>+${run.dreadGained}</span>`;

      row.appendChild(when);
      row.appendChild(form);
      row.appendChild(blood);
      row.appendChild(dread);
      if (run.formChanged) {
        const badge = el('span', 'run-log__badge', 'ASCENDED');
        row.appendChild(badge);
      }
      this.runLog.appendChild(row);
    }
  }
}

// ── Helpers ──

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  if (!match) return text.slice(0, 140) + '...';
  return match[0];
}

function showLoreModal(title: string, subtitle: string, body: string): void {
  // Drop any existing lore modal — only one at a time.
  document.querySelector('.lore-modal__backdrop')?.remove();

  const backdrop = el('div', 'lore-modal__backdrop');
  const modal = el('div', 'lore-modal');
  modal.setAttribute('role', 'dialog');

  const close = el('button', 'lore-modal__close') as HTMLButtonElement;
  close.type = 'button';
  close.innerHTML = '✕';
  close.setAttribute('aria-label', 'Close');

  const label = el('div', 'lore-modal__label', '— an entry —');
  const titleEl = el('div', 'lore-modal__title', title);
  const subtitleEl = el('div', 'lore-modal__subtitle', subtitle);
  const bodyEl = el('div', 'lore-modal__body', body);

  modal.appendChild(close);
  modal.appendChild(label);
  modal.appendChild(titleEl);
  modal.appendChild(subtitleEl);
  modal.appendChild(bodyEl);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  const dismiss = (): void => {
    backdrop.classList.add('lore-modal__backdrop--exit');
    modal.classList.add('lore-modal--exit');
    window.setTimeout(() => {
      backdrop.remove();
      modal.remove();
    }, 240);
  };
  backdrop.addEventListener('click', dismiss);
  close.addEventListener('click', dismiss);
}

// Keep unused-imports happy.
export type { ServantId, VampireForm };
