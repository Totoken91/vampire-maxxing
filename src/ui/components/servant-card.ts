// One row in the servants list. Shows owned/rate/cost + handles purchase
// clicks. Affordability and lock state are reflected via `data-state`.
//
// Juice (added 2026-05): every successful purchase pulses the card,
// flashes the price, lets a `−COST` numeral float up, and surfaces the
// milestone progress bar. Crossing a milestone (10/25/50/100/200/300/400)
// triggers a full-card gold celebration + toast — revealing the
// previously-hidden `servantMilestoneMult` system.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { fmt, fmtShort } from '../../utils/format';
import { nextServantMilestone } from '../../game/math';
import { getSettings } from '../../game/settings';
import { spawnFloatNumber } from '../../fx/float-number';
import { showToast } from './toast';
import type { Servant } from '../../game/config/servants';

type CardState = 'locked' | 'affordable' | 'default';

const PULSE_MS = 220;
const FLASH_MS = 260;
const CELEBRATION_MS = 900;

export class ServantCard extends Component<HTMLElement> {
  private readonly servant: Servant;
  private readonly ownedEl: HTMLElement;
  private readonly rateEl: HTMLElement;
  private readonly costEl: HTMLElement;
  private readonly labelEl: HTMLElement;
  private readonly milestoneBarEl: HTMLElement;
  private readonly milestoneFillEl: HTMLElement;
  private readonly milestonePipsEl: HTMLElement;

  constructor(servant: Servant) {
    const root = el('button', 'servant-card');
    root.setAttribute('type', 'button');
    root.setAttribute('data-servant', servant.id);

    const icon = el('div', 'servant-card__icon');
    // The medallion frame comes from CSS (background-image); the servant
    // portrait sits inside it, circular-cropped so the ornate gold ring
    // stays visible around the illustration.
    const iconImg = el('img', 'servant-card__icon-img') as HTMLImageElement;
    iconImg.src = `/assets/servants/${servant.id}.webp`;
    iconImg.alt = '';
    iconImg.decoding = 'async';
    icon.appendChild(iconImg);

    const info = el('div', 'servant-card__info');
    const name = el('div', 'servant-card__name', servant.name);
    const stats = el('div', 'servant-card__stats');
    const owned = el('span', 'servant-card__stats-owned', '×0');
    const rate = el('span', 'servant-card__stats-rate', '0/s');
    stats.appendChild(owned);
    stats.appendChild(rate);

    const milestoneBar = el('div', 'servant-card__milestone');
    const milestoneFill = el('div', 'servant-card__milestone-fill');
    const milestonePips = el('div', 'servant-card__milestone-pips');
    milestoneBar.appendChild(milestoneFill);
    milestoneBar.appendChild(milestonePips);

    info.appendChild(name);
    info.appendChild(stats);
    info.appendChild(milestoneBar);

    const action = el('div', 'servant-card__action');
    const cost = el('div', 'servant-card__cost', '—');
    const label = el('div', 'servant-card__label', 'claim');
    action.appendChild(cost);
    action.appendChild(label);

    root.appendChild(icon);
    root.appendChild(info);
    root.appendChild(action);

    super(root);
    this.servant = servant;
    this.ownedEl = owned;
    this.rateEl = rate;
    this.costEl = cost;
    this.labelEl = label;
    this.milestoneBarEl = milestoneBar;
    this.milestoneFillEl = milestoneFill;
    this.milestonePipsEl = milestonePips;
  }

  protected override onMount(): void {
    this.render();
    this.root.addEventListener('click', this.handleClick);
    this.addTeardown(() => this.root.removeEventListener('click', this.handleClick));

    this.addTeardown(events.on('tick', () => this.renderAffordability()));
    this.addTeardown(events.on('blood-changed', () => this.renderAffordability()));
    this.addTeardown(events.on('servant-bought', (payload) => {
      if (payload.id === this.servant.id) this.handleBought();
    }));
    this.addTeardown(events.on('servant-milestone-reached', (payload) => {
      if (payload.id === this.servant.id) this.handleMilestone(payload);
    }));
    // Ascend wipes owned counts — re-render so the bar collapses.
    this.addTeardown(events.on('ascended', () => this.render()));
  }

  private handleClick = (event: MouseEvent): void => {
    if (this.currentState() !== 'affordable') return;
    const cost = gameState.getServantCost(this.servant.id);
    const ok = gameState.buyServant(this.servant.id);
    if (!ok) return;
    this.playClickJuice(event, cost);
  };

  private playClickJuice(event: MouseEvent, cost: number): void {
    // Card pulse + price flash. Cheap CSS classes, removed after
    // animation so a rapid follow-up tap can re-trigger.
    this.root.classList.remove('servant-card--pulse');
    void this.root.offsetWidth;
    this.root.classList.add('servant-card--pulse');
    window.setTimeout(() => {
      this.root.classList.remove('servant-card--pulse');
    }, PULSE_MS);

    this.costEl.classList.remove('servant-card__cost--flash');
    void this.costEl.offsetWidth;
    this.costEl.classList.add('servant-card__cost--flash');
    window.setTimeout(() => {
      this.costEl.classList.remove('servant-card__cost--flash');
    }, FLASH_MS);

    // Float "−COST" rising from the click point. The HUD already has
    // a separate +N tap stream — this one is gold to read as "spent".
    const x = event.clientX || this.costEl.getBoundingClientRect().left + 20;
    const y = event.clientY || this.costEl.getBoundingClientRect().top + 10;
    spawnFloatNumber(x, y, `−${fmt(cost)}`, true);

    if (getSettings().hapticsEnabled && navigator.vibrate) {
      navigator.vibrate(6);
    }
  }

  private handleBought(): void {
    this.render();
    // Highlight the rate text since it just changed.
    this.rateEl.classList.remove('servant-card__stats-rate--flash');
    void this.rateEl.offsetWidth;
    this.rateEl.classList.add('servant-card__stats-rate--flash');
    window.setTimeout(() => {
      this.rateEl.classList.remove('servant-card__stats-rate--flash');
    }, FLASH_MS);
  }

  private handleMilestone(payload: { threshold: number; bonus: number; cumulativeMult: number }): void {
    this.root.classList.remove('servant-card--milestone');
    void this.root.offsetWidth;
    this.root.classList.add('servant-card--milestone');
    window.setTimeout(() => {
      this.root.classList.remove('servant-card--milestone');
    }, CELEBRATION_MS);

    if (getSettings().hapticsEnabled && navigator.vibrate) {
      navigator.vibrate([14, 36, 14]);
    }

    const bonusLabel = `×${payload.bonus}`;
    showToast(
      `${this.servant.name.toUpperCase()} — ${payload.threshold}`,
      `Milestone bound. Blood ${bonusLabel} (cumulative ×${payload.cumulativeMult}).`,
    );
  }

  private render(): void {
    const owned = gameState.get().servants[this.servant.id].owned;
    const rate = gameState.getServantRate(this.servant.id);
    this.ownedEl.textContent = `×${owned}`;
    this.rateEl.textContent = owned > 0 ? `${fmtShort(rate)}/s` : '—';
    this.renderMilestone(owned);
    this.renderAffordability();
  }

  private renderMilestone(owned: number): void {
    const info = nextServantMilestone(owned);
    // Hide the bar entirely until the player owns at least one — keeps
    // the locked/empty state clean.
    if (owned <= 0) {
      this.milestoneBarEl.setAttribute('data-state', 'empty');
      this.milestoneFillEl.style.width = '0%';
      this.milestonePipsEl.textContent = '';
      return;
    }
    if (info.next === null) {
      this.milestoneBarEl.setAttribute('data-state', 'maxed');
      this.milestoneFillEl.style.width = '100%';
    } else {
      this.milestoneBarEl.setAttribute('data-state', 'progress');
      this.milestoneFillEl.style.width = `${(info.progress * 100).toFixed(1)}%`;
    }
    this.milestoneBarEl.title =
      info.next === null
        ? `Bloodline maxed — ×${1080} milestone multiplier locked in.`
        : `${owned} / ${info.next} → next: ×${info.bonus} blood`;
    // Pip row: 7 dots, filled by `reached`. Compact gothic feedback —
    // the eye reads "I have 3 of 7 ranks bound" at a glance.
    this.milestonePipsEl.textContent = '';
    for (let i = 0; i < 7; i += 1) {
      const pip = document.createElement('span');
      pip.className = 'servant-card__milestone-pip';
      if (i < info.reached) pip.classList.add('servant-card__milestone-pip--filled');
      this.milestonePipsEl.appendChild(pip);
    }
  }

  private renderAffordability(): void {
    const state = this.currentState();
    this.root.setAttribute('data-state', state);
    if (state === 'locked') {
      this.costEl.textContent = '— —';
      this.labelEl.textContent = 'sealed';
    } else {
      this.costEl.textContent = fmt(gameState.getServantCost(this.servant.id));
      this.labelEl.textContent = 'claim';
    }
    (this.root as HTMLButtonElement).disabled = state !== 'affordable';
  }

  private currentState(): CardState {
    const snap = gameState.get();
    const locked = snap.totalLifetimeBlood < this.servant.unlockTotal;
    if (locked) return 'locked';
    return gameState.isServantAffordable(this.servant.id) ? 'affordable' : 'default';
  }
}
