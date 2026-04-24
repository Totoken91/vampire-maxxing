// Generic toast — "— LABEL —" caps line + italic serif body line.
// Stays ~2.6s, then exits with fade. Only one toast at a time.

const DEFAULT_DURATION_MS = 2600;
const EXIT_DURATION_MS = 400;

export type ToastVariant = 'default' | 'ichor';

interface ToastOpts {
  durationMs?: number;
  variant?: ToastVariant;
}

export function showToast(
  label: string,
  text: string,
  durationMsOrOpts: number | ToastOpts = DEFAULT_DURATION_MS,
): void {
  document.querySelector('.toast')?.remove();

  const opts: ToastOpts =
    typeof durationMsOrOpts === 'number'
      ? { durationMs: durationMsOrOpts }
      : durationMsOrOpts;
  const duration = opts.durationMs ?? DEFAULT_DURATION_MS;
  const variant = opts.variant ?? 'default';

  const root = document.createElement('div');
  root.className = 'toast';
  if (variant !== 'default') root.classList.add(`toast--${variant}`);

  const labelEl = document.createElement('div');
  labelEl.className = 'toast__label';
  labelEl.textContent = `— ${label} —`;

  const textEl = document.createElement('div');
  textEl.className = 'toast__text';
  textEl.textContent = text;

  root.appendChild(labelEl);
  root.appendChild(textEl);
  document.body.appendChild(root);

  window.setTimeout(() => {
    root.classList.add('toast--exit');
    window.setTimeout(() => root.remove(), EXIT_DURATION_MS);
  }, duration);
}

/** Helper for Ichor-earned toasts — uses the violet variant and
 * formats the amount + source flavor consistently. */
const ICHOR_SOURCE_FLAVOR: Record<string, string> = {
  tutorial_gift: 'The Ancients offer their nectar.',
  daily_login: 'The altar remembers your return.',
  login_chain: 'A night delivered, a nectar kept.',
  ad_offering: 'The evening tribute accepted.',
  milestone_prestige: 'Ascension rewarded in kind.',
  achievement_first_rare: 'First Rare bound — the pact strengthens.',
  achievement_first_epic: 'First Epic bound — the old houses stir.',
  achievement_collection: 'Twelve bound to your will.',
  event_reward: 'A seasonal rite, paid forward.',
  iap_pack: 'Your tribute received.',
  debug: 'By the will of the developer.',
};

export function showIchorToast(amount: number, source: string): void {
  const flavor = ICHOR_SOURCE_FLAVOR[source] ?? 'The nectar deepens.';
  showToast(`+${amount} Ichor`, flavor, { variant: 'ichor' });
}
