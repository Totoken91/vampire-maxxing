// L15 — First-Ichor contextual tooltip.
//
// Surfaces once, the very first time the player gains Ichor (tutorial
// gift, login chain, ad reward — whichever fires first). A short copy
// next to the Ichor pill explains what the currency is for, then the
// tooltip auto-dismisses after 5s or on any tap. One-shot per save:
// the `tooltip:ichor_first_seen` flag in ichorFlags blocks re-display.
//
// Why latéral (left of the pill) and not above:
//   - The Ichor pill sits in the HUD's top-right cluster. A tooltip
//     above would push past the safe area on small phones and might
//     overlap the gear / status bar.
//   - Latéral preserves the value readout — the player keeps seeing
//     the new amount tick in while reading the explanation.
//
// Animation entrance = pop with ease-out-pop (cubic-bezier(0.3, 1.2,
// 0.4, 1)) + opacity fade. Auto-dismiss adds a subtle exit fade.
// prefers-reduced-motion respected.

import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';

const FLAG = 'tooltip:ichor_first_seen';
const AUTO_DISMISS_MS = 5000;
const EXIT_DURATION_MS = 220;

let installed = false;
let active: { backdrop: HTMLElement; tooltip: HTMLElement } | null = null;

/** Install the listener. Idempotent — main.ts calls once at boot. */
export function installIchorTooltip(): void {
  if (installed) return;
  installed = true;
  events.on('ichor-earned', () => {
    if (hasFlag()) return;
    setFlag();
    // Defer one frame so the HUD value transition completes before
    // the tooltip anchors against the pill's bounding box.
    requestAnimationFrame(() => requestAnimationFrame(showTooltip));
  });
}

/** Manual entry point used by the cheats suite (vm.showIchorTooltip()). */
export function showIchorTooltip(): void {
  if (active) return;
  showTooltip();
}

function hasFlag(): boolean {
  return Boolean(
    (gameState.get() as unknown as {
      ichorFlags: Record<string, boolean>;
    }).ichorFlags[FLAG],
  );
}

function setFlag(): void {
  (gameState.get() as unknown as {
    ichorFlags: Record<string, boolean>;
  }).ichorFlags[FLAG] = true;
}

function showTooltip(): void {
  // Find the Ichor pill — single source in the Header. If the HUD
  // isn't mounted yet (very early boot), bail; the listener will
  // re-fire on the next ichor-earned that finds it.
  const pill = document.querySelector<HTMLElement>('.header__pill--ichor');
  if (!pill) return;
  if (active) return;

  const rect = pill.getBoundingClientRect();
  const backdrop = el('div', 'ichor-tooltip__backdrop');
  const tooltip = el('div', 'ichor-tooltip');
  tooltip.setAttribute('role', 'tooltip');

  const label = el('div', 'ichor-tooltip__label', '— A NEW NECTAR —');
  const body = el(
    'div',
    'ichor-tooltip__body',
    'Use Ichor at the Rituals to summon thralls.',
  );
  const arrow = el('div', 'ichor-tooltip__arrow');

  tooltip.appendChild(label);
  tooltip.appendChild(body);
  tooltip.appendChild(arrow);

  // Position latérally (left of the pill) — clamp so the tooltip never
  // exits the viewport on narrow screens.
  const tooltipMaxWidth = 220;
  const margin = 12;
  const tooltipRight = Math.max(margin, rect.left - 12);
  const tooltipLeft = Math.max(margin, tooltipRight - tooltipMaxWidth);
  const tooltipTop = rect.top + rect.height / 2;

  tooltip.style.left = `${tooltipLeft}px`;
  tooltip.style.top = `${tooltipTop}px`;
  tooltip.style.maxWidth = `${tooltipMaxWidth}px`;

  document.body.appendChild(backdrop);
  document.body.appendChild(tooltip);
  active = { backdrop, tooltip };

  // Force reflow so the entrance animation runs.
  void tooltip.offsetWidth;
  tooltip.classList.add('ichor-tooltip--visible');

  let dismissed = false;
  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    tooltip.classList.remove('ichor-tooltip--visible');
    tooltip.classList.add('ichor-tooltip--exit');
    backdrop.classList.add('ichor-tooltip__backdrop--exit');
    window.setTimeout(() => {
      backdrop.remove();
      tooltip.remove();
      if (active && active.tooltip === tooltip) active = null;
    }, EXIT_DURATION_MS);
  };

  // Tap anywhere (backdrop) or on the tooltip itself dismisses.
  backdrop.addEventListener('click', dismiss);
  tooltip.addEventListener('click', dismiss);
  // Auto-dismiss after AUTO_DISMISS_MS regardless of taps.
  window.setTimeout(dismiss, AUTO_DISMISS_MS);
}
