// TOME — the codex. Six sections:
//   - DAILY QUESTS (L_QUESTS) — one rotating quest per day with a CLAIM
//     CTA when complete. Sticky-feeling header carries a "Rotates in
//     Xh Ym" countdown.
//   - CHRONICLE — run stats.
//   - ACHIEVEMENTS — 20-card grid. Each unlocked card with a non-zero
//     ichorReward exposes a CLAIM CTA. A CLAIM ALL flush sits at the
//     section header when the unclaimed pool is non-empty.
//   - BESTIARY — 8 thrall lore entries.
//   - HISTORIES — 8 form lore entries.
//   - RUN LOG — 10 most recent ascensions.
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
import {
  canClaimQuest,
  claimQuest,
  getActiveQuest,
  rotateIfNeeded,
  secondsUntilRotate,
} from '../../game/quests';
import {
  claimAchievement,
  claimAllAchievements,
} from '../../game/achievement-claim';

export class TomeTab {
  private readonly root: HTMLElement;
  private readonly teardowns: Array<() => void> = [];
  private readonly statValues = new Map<string, HTMLElement>();
  private readonly achievementsGrid: HTMLElement;
  private readonly achievementsSummary: HTMLElement;
  private readonly achievementsClaimAll: HTMLButtonElement;
  private readonly questCard: HTMLElement;
  private readonly questCountdown: HTMLElement;
  private readonly bestiaryGrid: HTMLElement;
  private readonly bestiarySummary: HTMLElement;
  private readonly historiesGrid: HTMLElement;
  private readonly historiesSummary: HTMLElement;
  private readonly runLog: HTMLElement;
  private readonly runLogEmpty: HTMLElement;
  private countdownTimer: number | null = null;

  constructor() {
    this.root = el('div', 'tab-view tab-view--tome');

    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the codex —'));
    head.appendChild(el('h1', 'tab-head__title', 'TOME'));
    head.appendChild(
      el('div', 'tab-head__sub', 'A record of centuries, deeds, and discoveries.'),
    );
    this.root.appendChild(head);

    // ── DAILY QUESTS (L_QUESTS) ─────────────────────────────
    const questSection = el('section', 'tome-section tome-section--quest');
    const questHead = el('div', 'tome-section__head tome-quest__head');
    const questTitleWrap = el('div', 'tome-quest__title-wrap');
    questTitleWrap.appendChild(el('h2', 'tome-section__title', 'DAILY QUEST'));
    this.questCountdown = el('div', 'tome-quest__countdown', '');
    questTitleWrap.appendChild(this.questCountdown);
    questHead.appendChild(questTitleWrap);
    questSection.appendChild(questHead);
    this.questCard = el('div', 'quest-card');
    questSection.appendChild(this.questCard);
    this.root.appendChild(questSection);

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
    this.achievementsClaimAll = el(
      'button',
      'btn-claim-all',
      'CLAIM ALL',
    ) as HTMLButtonElement;
    this.achievementsClaimAll.type = 'button';
    this.achievementsClaimAll.hidden = true;
    this.achievementsClaimAll.addEventListener('click', () =>
      this.handleClaimAll(),
    );
    this.root.appendChild(
      this.buildSection(
        'ACHIEVEMENTS',
        this.achievementsSummary,
        this.achievementsGrid,
        this.achievementsClaimAll,
      ),
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
    rotateIfNeeded();
    this.renderQuest();
    this.renderStats();
    this.renderAchievements();
    this.renderBestiary();
    this.renderHistories();
    this.renderRunLog();
    this.startCountdown();
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
      events.on('achievement-claimed', () => this.renderAchievements()),
      events.on('lore-unlocked', ({ kind }) => {
        if (kind === 'servant') this.renderBestiary();
        else this.renderHistories();
      }),
      events.on('ascended', () => this.renderRunLog()),
      events.on('quest-completed', () => this.renderQuest()),
      events.on('quest-claimed', () => this.renderQuest()),
      events.on('ichor-earned', () => this.renderQuest()),
      events.on('tapped', () => this.renderQuestProgress()),
      events.on('servant-bought', () => this.renderQuestProgress()),
      events.on('thrall-equipped', () => this.renderQuestProgress()),
      events.on('thrall-awakened', () => this.renderQuestProgress()),
      events.on('rite-used', () => this.renderQuestProgress()),
    );
  }

  destroy(): void {
    for (const t of this.teardowns) t();
    this.teardowns.length = 0;
    this.stopCountdown();
    this.root.remove();
  }

  // ── Section builders ──

  private buildSection(
    title: string,
    summary: HTMLElement,
    body: HTMLElement,
    extraAction?: HTMLElement,
  ): HTMLElement {
    const section = el('section', 'tome-section');
    const head = el('div', 'tome-section__head');
    head.appendChild(el('h2', 'tome-section__title', title));
    const right = el('div', 'tome-section__head-right');
    right.appendChild(summary);
    if (extraAction) right.appendChild(extraAction);
    head.appendChild(right);
    section.appendChild(head);
    section.appendChild(body);
    return section;
  }

  // ── Quest rendering ──

  /** Full re-render — runs on state changes that swap the active quest
   *  (rotation, claim) or flip its claimable status. */
  private renderQuest(): void {
    rotateIfNeeded();
    const def = getActiveQuest();
    const qs = gameState.getQuestState();
    const claimable = canClaimQuest();
    const claimed = qs.claimed;

    let stateClass = 'quest-card--in-progress';
    if (claimed) stateClass = 'quest-card--claimed';
    else if (claimable) stateClass = 'quest-card--complete';

    this.questCard.className = `quest-card ${stateClass}`;
    this.questCard.innerHTML = '';

    const title = el('div', 'quest-card__title', def.title);
    const desc = el('div', 'quest-card__desc', def.description);
    this.questCard.appendChild(title);
    this.questCard.appendChild(desc);

    const progressWrap = el('div', 'quest-card__progress');
    const fill = el('div', 'quest-card__progress-fill');
    const ratio = Math.min(1, qs.progress / def.target);
    fill.style.width = `${ratio * 100}%`;
    progressWrap.appendChild(fill);
    this.questCard.appendChild(progressWrap);

    const meta = el('div', 'quest-card__meta');
    const counter = el(
      'div',
      'quest-card__counter',
      `${Math.min(qs.progress, def.target)} / ${def.target}`,
    );
    const reward = el('div', 'quest-card__reward');
    reward.innerHTML = `<span class="quest-card__reward-amt">+${def.reward.ichor}</span><span class="quest-card__reward-label">Ichor</span>`;
    meta.appendChild(counter);
    meta.appendChild(reward);
    this.questCard.appendChild(meta);

    if (claimable) {
      const cta = el(
        'button',
        'btn-claim btn-claim--quest',
        `CLAIM +${def.reward.ichor} ICHOR`,
      ) as HTMLButtonElement;
      cta.type = 'button';
      cta.addEventListener('click', () => this.handleClaimQuest(cta));
      this.questCard.appendChild(cta);
    } else if (claimed) {
      this.questCard.appendChild(el('div', 'quest-card__claimed', 'CLAIMED'));
    }
  }

  /** Lighter re-render — only the progress bar + counter when a metric
   *  bumps without flipping completion state. Avoids tearing down the
   *  CLAIM CTA mid-animation. */
  private renderQuestProgress(): void {
    if (this.questCard.classList.contains('quest-card--complete')) {
      // Crossing into "complete" requires a full re-render to spawn
      // the CLAIM CTA. Detect by re-checking against the current state.
      this.renderQuest();
      return;
    }
    if (canClaimQuest()) {
      this.renderQuest();
      return;
    }
    const def = getActiveQuest();
    const qs = gameState.getQuestState();
    const fill = this.questCard.querySelector<HTMLElement>(
      '.quest-card__progress-fill',
    );
    const counter = this.questCard.querySelector<HTMLElement>(
      '.quest-card__counter',
    );
    if (fill) {
      const ratio = Math.min(1, qs.progress / def.target);
      fill.style.width = `${ratio * 100}%`;
    }
    if (counter) {
      counter.textContent = `${Math.min(qs.progress, def.target)} / ${def.target}`;
    }
  }

  private async handleClaimQuest(cta: HTMLButtonElement): Promise<void> {
    cta.disabled = true;
    const ichor = claimQuest();
    if (ichor <= 0) {
      cta.disabled = false;
      return;
    }
    flyIchorToHud(cta, ichor);
    cinderBurst(cta);
    await wait(420);
    this.renderQuest();
  }

  private startCountdown(): void {
    const update = (): void => {
      const remaining = secondsUntilRotate();
      this.questCountdown.textContent = `Rotates in ${formatCountdown(remaining)}`;
      if (remaining === 0) {
        // Date crossed — pull a fresh quest. State.rotateIfNeeded()
        // takes care of the actual pivot; we only need to re-render.
        this.renderQuest();
      }
    };
    update();
    this.countdownTimer = window.setInterval(update, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      window.clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
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
    const unclaimed = gameState.getUnclaimedAchievements();
    this.achievementsSummary.textContent = `${unlocked.size} / ${ACHIEVEMENTS.length}`;
    this.achievementsClaimAll.hidden = unclaimed.size === 0;
    if (unclaimed.size > 0) {
      this.achievementsClaimAll.textContent = `CLAIM ALL (${unclaimed.size})`;
    }
    this.achievementsGrid.innerHTML = '';
    for (const def of ACHIEVEMENTS) {
      const isUnlocked = unlocked.has(def.id);
      const isClaimable = unclaimed.has(def.id);
      const isClaimed = isUnlocked && !isClaimable && def.ichorReward > 0;
      const stateClass = isClaimable
        ? 'achievement-card--claimable'
        : isUnlocked
        ? 'achievement-card--unlocked'
        : 'achievement-card--locked';
      const card = el('div', `achievement-card ${stateClass}`);
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

      if (isClaimable) {
        const cta = el(
          'button',
          'btn-claim btn-claim--ach',
          `CLAIM +${def.ichorReward}`,
        ) as HTMLButtonElement;
        cta.type = 'button';
        cta.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.handleClaimAchievement(def.id, cta);
        });
        card.appendChild(cta);
      } else if (isClaimed) {
        const tag = el(
          'div',
          'achievement-card__claimed',
          `+${def.ichorReward} claimed`,
        );
        card.appendChild(tag);
      } else if (isUnlocked && def.ichorReward > 0) {
        // Backfill safety — we should never land here, but keep the
        // reward visible if somehow flagged unlocked w/o claim path.
        const tag = el(
          'div',
          'achievement-card__claimed',
          `+${def.ichorReward} claimed`,
        );
        card.appendChild(tag);
      }

      this.achievementsGrid.appendChild(card);
    }
  }

  private async handleClaimAchievement(
    id: string,
    cta: HTMLButtonElement,
  ): Promise<void> {
    cta.disabled = true;
    const ichor = claimAchievement(id);
    if (ichor <= 0) {
      cta.disabled = false;
      return;
    }
    flyIchorToHud(cta, ichor);
    cinderBurst(cta);
    await wait(420);
    this.renderAchievements();
  }

  private async handleClaimAll(): Promise<void> {
    this.achievementsClaimAll.disabled = true;
    const result = claimAllAchievements();
    if (result.count === 0) {
      this.achievementsClaimAll.disabled = false;
      return;
    }
    flyIchorToHud(this.achievementsClaimAll, result.totalIchor);
    cinderBurst(this.achievementsClaimAll, 16);
    showClaimAllSummary(result.count, result.totalIchor);
    await wait(420);
    this.achievementsClaimAll.disabled = false;
    this.renderAchievements();
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

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 1) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m >= 1) return `${m}m`;
  return `${seconds}s`;
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Parabolic flight of an Ichor token from `from` to the HUD ichor
 *  counter. Renders a single animated div on the body's coords; falls
 *  back to a fade-up "+N" if the HUD anchor isn't on screen (e.g.
 *  scrolled out of view or ribbon missing entirely). */
function flyIchorToHud(from: HTMLElement, amount: number): void {
  const fromRect = from.getBoundingClientRect();
  const target = document.querySelector<HTMLElement>('.ichor-pill, [data-ichor-anchor]');
  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const targetRect = target?.getBoundingClientRect();
  const toX = targetRect ? targetRect.left + targetRect.width / 2 : fromX;
  const toY = targetRect ? targetRect.top + targetRect.height / 2 : fromY - 80;

  const token = el('div', 'ichor-fly', `+${amount}`);
  document.body.appendChild(token);
  token.style.left = `${fromX}px`;
  token.style.top = `${fromY}px`;
  // Force reflow so the transition kicks in.
  void token.offsetWidth;
  token.style.transform = `translate(${toX - fromX}px, ${toY - fromY}px) scale(0.6)`;
  token.style.opacity = '0';
  window.setTimeout(() => token.remove(), 700);
}

/** Cinder particle burst — emits N small sparks radially around the
 *  source element. Pure CSS keyframes, no canvas (the entire Tome can
 *  re-render without leaking burst nodes). */
function cinderBurst(from: HTMLElement, count = 8): void {
  const rect = from.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const distance = 32 + Math.random() * 28;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const spark = el('div', 'cinder-spark');
    document.body.appendChild(spark);
    spark.style.left = `${cx}px`;
    spark.style.top = `${cy}px`;
    spark.style.setProperty('--dx', `${dx}px`);
    spark.style.setProperty('--dy', `${dy}px`);
    window.setTimeout(() => spark.remove(), 720);
  }
}

/** Compact summary popup for CLAIM ALL. Self-dismisses; 1 popup per
 *  flush (multi-claim is naturally batched server-side). */
function showClaimAllSummary(count: number, totalIchor: number): void {
  const existing = document.querySelector('.claim-all-summary');
  existing?.remove();
  const summary = el(
    'div',
    'claim-all-summary',
    `+${totalIchor} Ichor — ${count} achievements collected`,
  );
  document.body.appendChild(summary);
  void summary.offsetWidth;
  summary.classList.add('claim-all-summary--visible');
  window.setTimeout(() => {
    summary.classList.remove('claim-all-summary--visible');
    window.setTimeout(() => summary.remove(), 280);
  }, 1800);
}

// Keep unused-imports happy.
export type { ServantId, VampireForm };
