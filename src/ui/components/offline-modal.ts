// Offline-gain modal — shown after the state is restored from storage
// if more than 60s elapsed. Kinematic count-up and an explicit CLAIM
// action (plus a stub for the rewarded-ad variant wired in J10).

import { el } from '../../utils/dom';
import { fmt } from '../../utils/format';
import type { OfflineReport } from '../../game/state';

const COUNTUP_MS = 900;
const MIN_ELAPSED_SEC = 60;

const TITLES = [
  'YOU SLEPT THROUGH THE DAWN',
  'A CENTURY PASSED',
  'YOUR HUNGER GREW',
  'THE NIGHT WAS LONG',
  'DARKNESS FAVORED YOU',
];

const SUBS = [
  'Your thralls fed without you.',
  'The vermin served their master.',
  'The Court kept its silence.',
  'Blood flowed in your absence.',
  'Eternity passed, your power grew.',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function formatElapsed(sec: number): string {
  if (sec < 60) return `${Math.floor(sec)}s offline`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}min offline`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h offline` : `${h}h ${rem}min offline`;
}

export function maybeShowOfflineModal(
  report: OfflineReport,
  onClaim: (amount: number) => void,
): void {
  if (report.elapsedSec < MIN_ELAPSED_SEC || report.blood <= 0) return;

  const backdrop = el('div', 'offline-modal__backdrop');
  const modal = el('div', 'offline-modal');

  const close = el('button', 'offline-modal__close', '×');
  close.setAttribute('aria-label', 'Close');

  const title = el('div', 'offline-modal__title', pick(TITLES));
  const sub = el('div', 'offline-modal__sub', pick(SUBS));

  const valueLabel = el('div', 'offline-modal__label', '— blood —');
  const valueEl = el('div', 'offline-modal__value', '0');
  const metaEl = el('div', 'offline-modal__meta');
  metaEl.textContent = `${formatElapsed(report.elapsedSec)} · ${Math.round(report.efficiency * 100)}%`;

  const actions = el('div', 'offline-modal__actions');
  const claimBtn = el(
    'button',
    'offline-modal__btn offline-modal__btn--claim',
  ) as HTMLButtonElement;
  claimBtn.type = 'button';
  claimBtn.innerHTML = '◈ CLAIM';

  const embraceBtn = el(
    'button',
    'offline-modal__btn offline-modal__btn--embrace',
  ) as HTMLButtonElement;
  embraceBtn.type = 'button';
  embraceBtn.innerHTML =
    '▶ EMBRACE THE DAWN<span class="offline-modal__btn-sub">+2h · 100%</span>';
  embraceBtn.disabled = true; // wired up with AdMob in J10
  embraceBtn.title = 'Rewarded ad coming in a later release';

  actions.appendChild(claimBtn);
  actions.appendChild(embraceBtn);

  const hint = el('div', 'offline-modal__hint', 'Watch a short rite for bonus');

  modal.appendChild(close);
  modal.appendChild(title);
  modal.appendChild(sub);
  modal.appendChild(valueLabel);
  modal.appendChild(valueEl);
  modal.appendChild(metaEl);
  modal.appendChild(actions);
  modal.appendChild(hint);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  let finished = false;
  const finish = (apply: boolean): void => {
    if (finished) return;
    finished = true;
    if (apply) onClaim(report.blood);
    backdrop.classList.add('offline-modal__backdrop--exit');
    window.setTimeout(() => backdrop.remove(), 300);
  };

  // Count-up animation on the big number.
  const startTime = performance.now();
  const tick = (): void => {
    const elapsed = performance.now() - startTime;
    const t = Math.min(1, elapsed / COUNTUP_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    valueEl.textContent = fmt(report.blood * eased);
    if (t < 1) window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);

  claimBtn.addEventListener('click', () => finish(true));
  close.addEventListener('click', () => finish(false));
  // Tap on backdrop does NOT dismiss (prevents accidental loss of gain).
}
