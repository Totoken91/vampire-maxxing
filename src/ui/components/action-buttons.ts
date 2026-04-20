// Bottom-row buttons: BOOST + ASCEND.
// When the BOOST cooldown is active and AdMob is available, the button
// flips to SUMMON THE NIGHT — a rewarded-ad variant that grants the
// extended boost (BOOST_DURATION_REWARDED_SEC at BOOST_MULTIPLIER×).

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { BALANCE } from '../../game/config/balance';
import { playAscensionFx, isAscending } from '../../fx/ascension';
import { adsAvailable, showRewarded } from '../../platform/ads';
import { showToast } from './toast';

export class ActionButtons extends Component<HTMLElement> {
  private readonly boostBtn: HTMLButtonElement;
  private readonly ascendBtn: HTMLButtonElement;
  private readonly boostLabel: HTMLElement;
  private readonly boostSub: HTMLElement;
  private readonly ascendSub: HTMLElement;
  private adInFlight = false;

  constructor() {
    const root = el('div', 'actions');

    const boost = el('button', 'action-btn action-btn--boost') as HTMLButtonElement;
    boost.type = 'button';
    boost.innerHTML =
      `<span class="action-btn__label">× BOOST ${BALANCE.BOOST_MULTIPLIER}×</span>` +
      `<span class="action-btn__sub">${BALANCE.BOOST_DURATION_SEC} sec</span>`;

    const ascend = el('button', 'action-btn action-btn--ascend') as HTMLButtonElement;
    ascend.type = 'button';
    ascend.innerHTML = `◈ ASCEND<span class="action-btn__sub">+0 dread</span>`;

    root.appendChild(boost);
    root.appendChild(ascend);

    super(root);
    this.boostBtn = boost;
    this.ascendBtn = ascend;
    this.boostLabel = boost.querySelector('.action-btn__label') as HTMLElement;
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
    if (this.adInFlight) return;
    const now = performance.now();
    const snap = gameState.get();
    const onCooldown = !snap.boost.active && snap.boost.cooldownEnd > now;
    if (onCooldown && adsAvailable()) {
      void this.handleSummonNight();
      return;
    }
    gameState.activateBoost(false);
    this.render();
  };

  private async handleSummonNight(): Promise<void> {
    this.adInFlight = true;
    const prevLabel = this.boostLabel.textContent;
    this.boostBtn.disabled = true;
    this.boostSub.textContent = 'preparing...';
    const result = await showRewarded('summon-night');
    this.adInFlight = false;
    if (result.rewarded) {
      gameState.activateBoost(true);
      showToast('THE NIGHT ANSWERS', 'Your power doubles for 2 minutes.');
    } else if (result.reason === 'failed' || result.reason === 'native-unavailable') {
      showToast('THE RITE FAILED', 'No response from the void.');
    }
    if (prevLabel !== null) this.boostLabel.textContent = prevLabel;
    this.render();
  }

  private handleAscend = (): void => {
    if (!gameState.canAscend() || isAscending()) return;
    void playAscensionFx(() => gameState.ascend()).then(() => this.render());
  };

  private render(): void {
    if (this.adInFlight) return;

    const ascendable = gameState.canAscend();
    this.ascendBtn.disabled = !ascendable;
    const gain = gameState.projectedDreadGain();
    this.ascendSub.textContent = ascendable ? `+${gain} dread` : 'locked';

    const now = performance.now();
    const snap = gameState.get();
    const regularLabel = `× BOOST ${BALANCE.BOOST_MULTIPLIER}×`;
    if (snap.boost.active) {
      const remaining = Math.max(0, Math.ceil((snap.boost.endTime - now) / 1000));
      this.boostBtn.disabled = true;
      this.boostLabel.textContent = regularLabel;
      this.boostSub.textContent = `${remaining}s active`;
    } else {
      const cooldownMs = snap.boost.cooldownEnd - now;
      if (cooldownMs > 0) {
        if (adsAvailable()) {
          // Offer the rewarded-ad variant instead of pure dead cooldown.
          this.boostBtn.disabled = false;
          this.boostLabel.textContent = '▶ SUMMON';
          this.boostSub.textContent = `the night · ${Math.ceil(BALANCE.BOOST_DURATION_REWARDED_SEC / 60)}m`;
        } else {
          this.boostBtn.disabled = true;
          this.boostLabel.textContent = regularLabel;
          this.boostSub.textContent = `${Math.ceil(cooldownMs / 1000)}s`;
        }
      } else {
        this.boostBtn.disabled = false;
        this.boostLabel.textContent = regularLabel;
        this.boostSub.textContent = `${BALANCE.BOOST_DURATION_SEC} sec`;
      }
    }
  }
}
