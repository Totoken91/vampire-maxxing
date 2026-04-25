// Ascend confirmation modal — opened on Ascend button, closed either by
// the × icon (cancels) or by holding the ASCEND plate for HOLD_MS
// (confirms). Resolves a boolean; caller runs the cinematic only on true.

import { el } from '../../utils/dom';
import { gameState } from '../../game/state';
import { FORMS_BY_ID } from '../../game/config/forms';
import { getCurrentForm } from '../../game/forms';
import { BALANCE } from '../../game/config/balance';
import { dreadGainCap } from '../../game/math';
import {
  canSoulreave,
  performSoulreave,
  projectedSoulShards,
  soulreaveUnlocked,
} from '../../game/soulreave';
import { playSoulreaveCinematic } from '../../fx/soulreave';
import { openMetaTreeModal } from './meta-tree-modal';

const HOLD_MS = 700;

export function openAscendModal(): Promise<boolean> {
  return new Promise((resolve) => {
    const prestigeCount = gameState.getPrestigeCount();
    const currentForm = getCurrentForm(prestigeCount);
    const nextFormAfter = getCurrentForm(prestigeCount + 1);
    const formWillChange = nextFormAfter !== currentForm;
    const currentDread = gameState.getDread();
    const curseMult = gameState.getPendingCurseMult();
    const baseGain = gameState.projectedDreadGain();
    const gainWithCurse = Math.floor(baseGain * curseMult);
    const nextDread = currentDread + gainWithCurse;

    const backdrop = el('div', 'ascend-modal__backdrop');
    const modal = el('div', 'ascend-modal');
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-label', 'Confirm ascension');

    // Close icon
    const close = el('button', 'ascend-modal__close') as HTMLButtonElement;
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '\u2715'; // ✕

    // Title banner
    const title = el('div', 'ascend-modal__title', 'ASCENSION');

    // Dread deltas
    const stats = el('div', 'ascend-modal__stats');
    const statLeft = el('div', 'ascend-modal__stat');
    statLeft.appendChild(el('div', 'ascend-modal__stat-label', 'Current Dread'));
    statLeft.appendChild(
      el('div', 'ascend-modal__stat-value ascend-modal__stat-value--dim', `× ${currentDread}`),
    );
    const statRight = el('div', 'ascend-modal__stat');
    statRight.appendChild(el('div', 'ascend-modal__stat-label', 'Next Dread'));
    statRight.appendChild(
      el('div', 'ascend-modal__stat-value ascend-modal__stat-value--bright', `× ${nextDread}`),
    );
    stats.appendChild(statLeft);
    stats.appendChild(statRight);

    // Center seal
    const seal = el('img', 'ascend-modal__seal') as HTMLImageElement;
    seal.src = '/assets/ornaments/ascend-symbol.webp';
    seal.alt = '';
    seal.decoding = 'async';

    // Rewards cartouche
    const rewards = el('div', 'ascend-modal__rewards');
    rewards.appendChild(el('div', 'ascend-modal__rewards-title', 'Rewards'));
    const rewardsList = el('ul', 'ascend-modal__rewards-list');

    // M2 — show "{gain} / {cap}" when the form cap bites so the player
    // understands the gate. THIRST has Infinity cap → no denominator.
    const cap = dreadGainCap(currentForm);
    const capped = gameState.isDreadGainCapped();
    const dreadLabel =
      cap === Infinity
        ? `+${gainWithCurse} Dread`
        : capped
          ? `+${gainWithCurse} / ${cap} Dread (form limit reached)`
          : `+${gainWithCurse} / ${cap} Dread`;
    if (curseMult > 1) {
      addReward(rewardsList, `${dreadLabel} · ×${curseMult} CURSED`);
    } else {
      addReward(rewardsList, dreadLabel);
    }
    if (formWillChange) {
      const nextFormDef = FORMS_BY_ID[nextFormAfter];
      addReward(rewardsList, `Become ${nextFormDef.title}`);
    }
    addReward(rewardsList, 'Dread multiplier carries forward');
    addReward(rewardsList, 'Resets blood and thralls to zero');
    if (BALANCE.FORM_THRESHOLDS.LORD_OF_NIGHT === prestigeCount + 1) {
      addReward(rewardsList, 'Unlocks shorter Boost cooldown');
    }
    rewards.appendChild(rewardsList);

    // Narrative hint when capped — steers the player toward form bumps.
    if (capped) {
      const hint = el(
        'div',
        'ascend-modal__hint',
        'Ascend your form to claim more Dread per run.',
      );
      rewards.appendChild(hint);
    }

    // Confirm plate (hold to confirm)
    const confirm = el('button', 'ascend-modal__confirm') as HTMLButtonElement;
    confirm.type = 'button';
    const confirmFill = el('span', 'ascend-modal__confirm-fill');
    const confirmLabel = el('div', 'ascend-modal__confirm-label', 'ASCEND');
    const confirmSub = el(
      'div',
      'ascend-modal__confirm-sub',
      'Hold to confirm',
    );
    confirm.appendChild(confirmFill);
    confirm.appendChild(confirmLabel);
    confirm.appendChild(confirmSub);

    const footer = el(
      'div',
      'ascend-modal__footer',
      'Ascension resets your progress.',
    );

    // V1.3 — Soulreave + meta-tree access. Both gate-checks happen
    // here so the buttons reveal themselves only when contextually
    // earned. Soulreave button: `canSoulreave()` (Methuselah +
    // lifetimeDread ≥ threshold). Meta-tree button: `totalSoulreaves
    // ≥ 1` (player has at least one Soulreave under their belt).
    const soulreaveRow = buildSoulreaveRow(() => finish(false));
    const metaTreeRow = buildMetaTreeRow(() => finish(false));

    // Assemble
    modal.appendChild(close);
    modal.appendChild(title);
    modal.appendChild(stats);
    modal.appendChild(seal);
    modal.appendChild(rewards);
    modal.appendChild(confirm);
    if (soulreaveRow) modal.appendChild(soulreaveRow);
    if (metaTreeRow) modal.appendChild(metaTreeRow);
    modal.appendChild(footer);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    let settled = false;
    const finish = (result: boolean): void => {
      if (settled) return;
      settled = true;
      clearHold();
      backdrop.classList.add('ascend-modal__backdrop--exit');
      modal.classList.add('ascend-modal--exit');
      window.setTimeout(() => {
        backdrop.remove();
        modal.remove();
        resolve(result);
      }, 220);
    };

    close.addEventListener('click', () => finish(false));
    backdrop.addEventListener('click', () => finish(false));

    // Hold-to-confirm. We animate the fill via CSS transition triggered by
    // adding a class on pointer-down; a setTimeout commits on completion.
    let holdTimer: number | null = null;
    const clearHold = (): void => {
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      confirm.classList.remove('ascend-modal__confirm--holding');
    };
    const startHold = (): void => {
      if (settled || holdTimer !== null) return;
      confirm.classList.add('ascend-modal__confirm--holding');
      holdTimer = window.setTimeout(() => {
        holdTimer = null;
        finish(true);
      }, HOLD_MS);
    };
    confirm.addEventListener('pointerdown', startHold);
    confirm.addEventListener('pointerup', clearHold);
    confirm.addEventListener('pointercancel', clearHold);
    confirm.addEventListener('pointerleave', clearHold);
  });
}

function addReward(list: HTMLElement, text: string): void {
  const li = el('li', 'ascend-modal__reward');
  li.appendChild(el('span', 'ascend-modal__reward-marker', '\u25C6')); // ◆
  li.appendChild(el('span', 'ascend-modal__reward-text', text));
  list.appendChild(li);
}

/** V1.3 — Soulreave button. Returns null when the player isn't yet
 *  Methuselah (system locked) so the row is fully hidden. When
 *  unlocked but below the Dread threshold, returns a disabled button
 *  with hint copy ("XXX Dread to Soulreave") to tease the next gate.
 *  When ready, returns an enabled button that fires the cinematic. */
function buildSoulreaveRow(closeAscend: () => void): HTMLElement | null {
  if (!soulreaveUnlocked()) return null;
  const lifetime = gameState.getLifetimeDread();
  const ready = canSoulreave();
  const projected = projectedSoulShards(lifetime);

  const row = el('div', 'ascend-modal__soulreave-row');
  const btn = el(
    'button',
    'ascend-modal__soulreave-btn',
  ) as HTMLButtonElement;
  btn.type = 'button';
  if (ready) {
    btn.classList.add('ascend-modal__soulreave-btn--ready');
    btn.innerHTML =
      `<span class="ascend-modal__soulreave-label">SOULREAVE</span>` +
      `<span class="ascend-modal__soulreave-sub">+${projected} Soul Shards</span>`;
    btn.addEventListener('click', () => {
      closeAscend();
      const indexAfter = gameState.getTotalSoulreaves() + 1;
      void playSoulreaveCinematic(indexAfter, () => {
        performSoulreave();
      });
    });
  } else {
    btn.classList.add('ascend-modal__soulreave-btn--locked');
    btn.disabled = true;
    const remaining = Math.max(
      0,
      BALANCE.SOULREAVE_THRESHOLD_DREAD - lifetime,
    );
    btn.innerHTML =
      `<span class="ascend-modal__soulreave-label">SOULREAVE LOCKED</span>` +
      `<span class="ascend-modal__soulreave-sub">${remaining} Dread to unlock</span>`;
  }
  row.appendChild(btn);
  return row;
}

/** V1.3 — META-TREE access. Surfaces only after the player has
 *  Soulreaved at least once — before that, the meta-tree screen
 *  has no purchasable nodes and would just confuse. */
function buildMetaTreeRow(closeAscend: () => void): HTMLElement | null {
  if (gameState.getTotalSoulreaves() < 1) return null;
  const row = el('div', 'ascend-modal__meta-tree-row');
  const btn = el(
    'button',
    'ascend-modal__meta-tree-btn',
  ) as HTMLButtonElement;
  btn.type = 'button';
  const shards = gameState.getSoulShards();
  btn.innerHTML =
    `<span class="ascend-modal__meta-tree-label">SOUL SHARDS</span>` +
    `<span class="ascend-modal__meta-tree-sub">${shards} available · view tree</span>`;
  btn.addEventListener('click', () => {
    closeAscend();
    openMetaTreeModal();
  });
  row.appendChild(btn);
  return row;
}
