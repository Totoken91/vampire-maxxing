// K5 — Daily gift modal. Shown on boot when the local calendar day
// changed since the last claim. 7-day chain visualisation with the
// current day highlighted; CLAIM credits the reward and dismisses.
//
// Styled to match the offline-modal language (baroque card, gold
// accents, italic serif body, explicit CLAIM button).

import { el } from '../../utils/dom';
import { fmt } from '../../utils/format';
import { gameState } from '../../game/state';
import { DAILY_CYCLE } from '../../game/config/daily';
import { showToast } from './toast';
import { track } from '../../analytics/events';

const EXIT_DURATION_MS = 300;

export function showDailyModal(): void {
  if (!gameState.canClaimDaily()) return;
  // Don't stack on top of any modal already present.
  if (document.querySelector('.daily-modal__backdrop')) return;

  const pending = gameState.getPendingDailyReward();

  const backdrop = el('div', 'daily-modal__backdrop');
  const modal = el('div', 'daily-modal');

  const close = el('button', 'daily-modal__close', '×');
  close.setAttribute('aria-label', 'Close');

  const title = el(
    'div',
    'daily-modal__title',
    '— THE BLOODLINE REMEMBERS —',
  );
  const sub = el(
    'div',
    'daily-modal__sub',
    pending.isNewStreak
      ? 'A new chain begins tonight.'
      : pending.day === 1
        ? 'Your first tribute of the cycle.'
        : `Night ${pending.day} of your communion.`,
  );

  // 7-day chain — one pill per day, state encoded via --past / --current
  // / --future modifier classes. Day 7 gets --climax for the weekly-
  // reward visual emphasis.
  const chain = el('div', 'daily-modal__chain');
  for (let i = 1; i <= 7; i += 1) {
    const pill = el('div', 'daily-modal__day');
    pill.dataset.day = String(i);
    if (i < pending.day) pill.classList.add('daily-modal__day--past');
    else if (i === pending.day) pill.classList.add('daily-modal__day--current');
    else pill.classList.add('daily-modal__day--future');
    if (i === 7) pill.classList.add('daily-modal__day--climax');
    const num = el('div', 'daily-modal__day-num', String(i));
    pill.appendChild(num);
    chain.appendChild(pill);
  }

  const dayLabel = el(
    'div',
    'daily-modal__day-label',
    `— ${DAILY_CYCLE[pending.day - 1]!.label} —`,
  );

  const rewardLabel = el(
    'div',
    'daily-modal__reward-label',
    "tonight's tribute",
  );
  const rewardBlood = el(
    'div',
    'daily-modal__reward-blood',
    `+${fmt(pending.reward.blood)} blood`,
  );
  const rewardDread =
    pending.reward.dread > 0
      ? el(
          'div',
          'daily-modal__reward-dread',
          `+${pending.reward.dread} dread`,
        )
      : null;
  const rewardIchor =
    pending.reward.ichor > 0
      ? el(
          'div',
          'daily-modal__reward-ichor',
          `+${pending.reward.ichor} ichor`,
        )
      : null;

  const claimBtn = el(
    'button',
    'daily-modal__btn daily-modal__btn--claim',
  ) as HTMLButtonElement;
  claimBtn.type = 'button';
  claimBtn.innerHTML = '◈ CLAIM';

  modal.appendChild(close);
  modal.appendChild(title);
  modal.appendChild(sub);
  modal.appendChild(chain);
  modal.appendChild(dayLabel);
  modal.appendChild(rewardLabel);
  modal.appendChild(rewardBlood);
  if (rewardDread) modal.appendChild(rewardDread);
  if (rewardIchor) modal.appendChild(rewardIchor);
  modal.appendChild(claimBtn);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  let finished = false;
  const dismiss = (claim: boolean): void => {
    if (finished) return;
    finished = true;
    if (claim) {
      void resolveClaim().then((result) => {
        if (!result) return;
        track('daily_claimed', {
          day: result.day,
          blood: result.reward.blood,
          ichor: result.reward.ichor,
          dread: result.reward.dread,
        });
        const bloodTxt = `+${fmt(result.reward.blood)} blood`;
        const dreadTxt =
          result.reward.dread > 0 ? ` · +${result.reward.dread} dread` : '';
        showToast('THE GIFT', bloodTxt + dreadTxt);
      });
    }
    backdrop.classList.add('daily-modal__backdrop--exit');
    window.setTimeout(() => backdrop.remove(), EXIT_DURATION_MS);
  };

  // Cloud-aware dispatcher. Signed-in users go through the daily-claim
  // edge function so the reward is server-validated (anti-rollback,
  // anti-double-claim across devices). Signed-out players use the
  // local path which has been the offline-first source of truth since
  // K5. Both branches resolve to the same { day, reward } shape so the
  // surrounding toast + analytics code is identical.
  async function resolveClaim(): Promise<{
    day: number;
    reward: { blood: number; dread: number; ichor: number };
  } | null> {
    const { getCurrentUser } = await import('../../game/auth');
    if (getCurrentUser()) {
      const { performCloudDailyClaim } = await import('../../game/cloud-daily');
      return performCloudDailyClaim();
    }
    return gameState.claimDaily();
  }

  claimBtn.addEventListener('click', () => dismiss(true));
  close.addEventListener('click', () => dismiss(false));
  // Tap on the backdrop does NOT dismiss — prevents accidental loss.
}
