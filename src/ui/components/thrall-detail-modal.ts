// Phase L — thrall detail modal. Tap a card in the Sanctum grid to
// open this full-illustration view: portrait NOT cropped, plus name,
// rarity, archetype, lore, and the primary effect preview.
// Read-only for v1.0; equip/level actions land in later L tickets.

import { el } from '../../utils/dom';
import {
  archetypeLabel,
  type Thrall,
  type ThrallRarity,
} from '../../game/config/thralls';

const EXIT_DURATION_MS = 260;

const RARITY_LABEL: Record<ThrallRarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

const EFFECT_LABEL: Record<Thrall['primaryEffect']['type'], string> = {
  blood_gen: 'blood generation',
  offline_gain: 'offline gains',
  active_gain: 'active gains',
  tap_mult: 'tap power',
  hybrid: 'all sources',
};

function formatEffect(effect: Thrall['primaryEffect']): string {
  const pct = Math.round((effect.value - 1) * 100);
  return `+${pct}% ${EFFECT_LABEL[effect.type]}`;
}

export function showThrallDetail(thrall: Thrall): void {
  // Only one modal at a time.
  if (document.querySelector('.thrall-detail__backdrop')) return;

  const backdrop = el('div', 'thrall-detail__backdrop');
  backdrop.dataset.rarity = thrall.rarity;
  const modal = el('div', 'thrall-detail');
  modal.dataset.rarity = thrall.rarity;

  const close = el('button', 'thrall-detail__close', '×');
  close.setAttribute('aria-label', 'Close');

  // Full-illustration portrait — displayed at natural aspect, no
  // crop. Wrapped so the grunge fade overlay (::after) can paint
  // over the bottom edge without touching the image itself.
  const portraitWrap = el('div', 'thrall-detail__portrait-wrap');
  const img = el('img', 'thrall-detail__portrait') as HTMLImageElement;
  img.src = thrall.portraitPath;
  img.alt = thrall.name;
  img.decoding = 'async';
  portraitWrap.appendChild(img);

  const rarityBar = el('div', 'thrall-detail__rarity');
  rarityBar.textContent = `— ${RARITY_LABEL[thrall.rarity]} ${archetypeLabel(thrall.archetype).toUpperCase()} —`;

  const name = el('h2', 'thrall-detail__name', thrall.name);

  const lore = el('p', 'thrall-detail__lore', thrall.lore);

  const effectBox = el('div', 'thrall-detail__effect');
  effectBox.appendChild(el('div', 'thrall-detail__effect-label', 'gift of the pact'));
  effectBox.appendChild(el('div', 'thrall-detail__effect-value', formatEffect(thrall.primaryEffect)));

  const hint = el(
    'div',
    'thrall-detail__hint',
    'the binding awaits — equip coming soon',
  );

  modal.appendChild(close);
  modal.appendChild(portraitWrap);
  modal.appendChild(rarityBar);
  modal.appendChild(name);
  modal.appendChild(lore);
  modal.appendChild(effectBox);
  modal.appendChild(hint);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  let dismissed = false;
  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    backdrop.classList.add('thrall-detail__backdrop--exit');
    window.setTimeout(() => backdrop.remove(), EXIT_DURATION_MS);
  };

  close.addEventListener('click', dismiss);
  // Tap on the backdrop (outside the modal card) dismisses. Tap inside
  // the modal bubbles up, so we stopPropagation on the modal itself.
  backdrop.addEventListener('click', dismiss);
  modal.addEventListener('click', (e) => e.stopPropagation());
}
