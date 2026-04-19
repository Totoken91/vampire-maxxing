// Generic toast — "— LABEL —" caps line + italic serif body line.
// Stays ~2.6s, then exits with fade. Only one toast at a time.

const DEFAULT_DURATION_MS = 2600;
const EXIT_DURATION_MS = 400;

export function showToast(
  label: string,
  text: string,
  durationMs: number = DEFAULT_DURATION_MS,
): void {
  document.querySelector('.toast')?.remove();

  const root = document.createElement('div');
  root.className = 'toast';

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
  }, durationMs);
}
