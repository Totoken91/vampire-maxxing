// Bottom-row buttons: BOOST + ASCEND.
// J2 wires boost + ascend actions directly; modals + rewarded variants arrive J6/J10.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { BALANCE } from '../../game/config/balance';

export class ActionButtons extends Component<HTMLElement> {
  private readonly boostBtn: HTMLButtonElement;
  private readonly ascendBtn: HTMLButtonElement;
  private readonly boostSub: HTMLElement;
  private readonly ascendSub: HTMLElement;

  constructor() {
    const root = el('div', 'actions');

    const boost = el('button', 'action-btn action-btn--boost') as HTMLButtonElement;
    boost.type = 'button';
    boost.innerHTML = `× BOOST ${BALANCE.BOOST_MULTIPLIER}×<span class="action-btn__sub">${BALANCE.BOOST_DURATION_SEC} sec</span>`;

    const ascend = el('button', 'action-btn action-btn--ascend') as HTMLButtonElement;
    ascend.type = 'button';
    ascend.innerHTML = `◈ ASCEND<span class="action-btn__sub">+0 dread</span>`;

    root.appendChild(boost);
    root.appendChild(ascend);

    super(root);
    this.boostBtn = boost;
    this.ascendBtn = ascend;
    this.boostSub = boost.querySelector('.action-btn__sub') as HTMLElement;
    this.ascendSub = ascend.querySelector('.action-btn__sub') as HTMLElement;
  }

  protected override onMount(): void {
    this.render();
    this.boostBtn.addEventListener('click', this.handleBoost);
    this.ascendBtn.addEventListener('click', this.handleAscend);
    this.addTeardown(() => {
      this.boostBtn.removeEventListener('click', this.handleBoost);
      this.ascendBtn.removeEventListener('click', this.handleAscend);
    });
    this.addTeardown(events.on('tick', () => this.render()));
    this.addTeardown(events.on('blood-changed', () => this.render()));
    this.addTeardown(events.on('form-changed', () => this.render()));
  }

  private handleBoost = (): void => {
    gameState.activateBoost(false);
    this.render();
  };

  private handleAscend = (): void => {
    if (!gameState.canAscend()) return;
    gameState.ascend();
    this.render();
  };

  private render(): void {
    const ascendable = gameState.canAscend();
    this.ascendBtn.disabled = !ascendable;
    const gain = gameState.projectedDreadGain();
    this.ascendSub.textContent = ascendable ? `+${gain} dread` : 'locked';

    const now = performance.now();
    const snap = gameState.get();
    if (snap.boost.active) {
      const remaining = Math.max(0, Math.ceil((snap.boost.endTime - now) / 1000));
      this.boostBtn.disabled = true;
      this.boostSub.textContent = `${remaining}s active`;
    } else {
      const cooldownMs = snap.boost.cooldownEnd - now;
      if (cooldownMs > 0) {
        this.boostBtn.disabled = true;
        this.boostSub.textContent = `${Math.ceil(cooldownMs / 1000)}s`;
      } else {
        this.boostBtn.disabled = false;
        this.boostSub.textContent = `${BALANCE.BOOST_DURATION_SEC} sec`;
      }
    }
  }
}
