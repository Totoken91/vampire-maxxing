// Ichor Gift Ceremony — the AAA-grade reveal for gifted Ichor.
//
// Replaces the silent toast pattern for moment-of-impact grants
// (tutorial gift L8, future event packs, achievement drops). The
// flow follows the "big-win" pattern from reward-screens.md:
//   1. backdrop dim + center pinprick
//   2. anticipation build-up (rays, particles converging)
//   3. impact: white burst + orb materializes
//   4. counter slot-machine roll 0 → amount
//   5. caption + CLAIM CTA
//   6. on claim: orb explodes into particles + header pulse
//
// The actual `grantIchor` call fires at CLAIM time (not at show
// time), so the header Ichor pill animates in lock-step with the
// orb dispersal.

import { el } from '../../utils/dom';
import { grantIchor, type IchorSource } from '../../game/ichor';

/** How long the player must watch before the CLAIM button becomes
 *  interactive. Set far past the build-up (rays + flash + title +
 *  counter roll + subtitle = ~2.2s) with extra grace so a
 *  tap-spammer (30+ taps/sec) can't burn through the gift before
 *  the reveal lands. */
const SKIP_AFTER_MS = 4000;
const COUNTER_DURATION_MS = 900;
const EXIT_DURATION_MS = 520;

/** Inline droplet — same shape as the header Ichor pill (small,
 *  flat fill for the pill / counter). */
const DROPLET_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 2 C12 2 5 10 5 15 C5 19 8 22 12 22 C16 22 19 19 19 15 C19 10 12 2 12 2 Z" ' +
  'fill="currentColor" stroke="rgba(0,0,0,0.35)" stroke-width="1"/></svg>';

/** Premium 3D droplet for the ceremony hero shot. Internal SVG
 *  gradients give it a sculpted look (specular highlight top-left,
 *  warm body, dark amber bottom rim) that scales cleanly to 200px+
 *  — what the flat counter pill icon never could. */
const HERO_DROPLET_SVG = `
  <svg viewBox="0 0 100 110" aria-hidden="true">
    <defs>
      <radialGradient id="iggift-body" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#fff8dc" stop-opacity="0.95"/>
        <stop offset="20%" stop-color="#fcd34d"/>
        <stop offset="55%" stop-color="#f59e0b"/>
        <stop offset="85%" stop-color="#a8580a"/>
        <stop offset="100%" stop-color="#5a2d05"/>
      </radialGradient>
      <radialGradient id="iggift-spec" cx="35%" cy="28%" r="22%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
        <stop offset="60%" stop-color="#ffffff" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="iggift-rim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.4"/>
        <stop offset="60%" stop-color="#92400e" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#451a03" stop-opacity="0.7"/>
      </linearGradient>
    </defs>
    <!-- Body (gradient fill) -->
    <path
      d="M50 8 C50 8 18 44 18 70 C18 90 32 102 50 102 C68 102 82 90 82 70 C82 44 50 8 50 8 Z"
      fill="url(#iggift-body)"
      stroke="url(#iggift-rim)"
      stroke-width="1.5"
    />
    <!-- Specular highlight (top-left ellipse) -->
    <ellipse cx="38" cy="42" rx="14" ry="22" fill="url(#iggift-spec)"/>
    <!-- Tight white pinprick (the catch-light) -->
    <circle cx="36" cy="34" r="3" fill="#ffffff" opacity="0.85"/>
  </svg>
`;

interface ShowOpts {
  /** Toast label written on the title bar. Defaults to a tutorial-
   *  flavored line; pass a custom string for non-tutorial uses
   *  (event drops, achievement payouts). */
  readonly title?: string;
  /** Italic serif subtitle below the amount. Defaults to the
   *  tutorial flavor "the Ancients offer their nectar". */
  readonly subtitle?: string;
  /** Source tag passed through to grantIchor for ledger tracking. */
  readonly source?: IchorSource;
}

/**
 * Open the ceremony, grant Ichor on claim, resolve when the modal
 * closes. Awaitable so the caller can chain post-gift cues (e.g.
 * the L8 Sanctum tab glow).
 */
export function showIchorGift(amount: number, opts: ShowOpts = {}): Promise<void> {
  if (document.querySelector('.ichor-gift')) return Promise.resolve();

  const title = opts.title ?? 'A GIFT FROM THE ANCIENTS';
  const subtitle =
    opts.subtitle ?? 'their nectar to summon those who sleep';
  const source: IchorSource = opts.source ?? 'tutorial_gift';

  return new Promise((resolve) => {
    const overlay = el('div', 'ichor-gift');

    // ── Backdrop layer — the page underneath is fully covered by
    //     the parent's solid black + this radial veil tint. The
    //     FX layers (rays / atmo / particles / flash) live INSIDE
    //     the orb core below so they always anchor to where the
    //     orb actually renders, not a guessed % of the viewport. ─
    overlay.appendChild(el('div', 'ichor-gift__veil'));

    // ── Title — slim mono caps line at the top of the screen. ──
    const titleEl = el('div', 'ichor-gift__title', `— ${title} —`);
    overlay.appendChild(titleEl);

    // ── Center stack — orb + amount counter + subtitle. ─────────
    const stack = el('div', 'ichor-gift__stack');

    // ── Hero core — orb wrapped with all its associated FX as
    //     CHILDREN so they follow the orb's natural flex position.
    //     Order in DOM = paint order; later siblings render on top.
    //     Halo / atmo / rays / particles sit BEHIND the droplet,
    //     flash sits IN FRONT (it's the impact pop). ─────────────
    const core = el('div', 'ichor-gift__core');

    const atmo = el('div', 'ichor-gift__atmo');
    const rays = el('div', 'ichor-gift__rays');
    const halo = el('div', 'ichor-gift__halo');

    // Convergent particles — 14 motes that spawn at the edges of
    // the orb's halo region and fly inward to the orb center.
    const particles = el('div', 'ichor-gift__particles');
    for (let i = 0; i < 14; i += 1) {
      const mote = el('div', 'ichor-gift__particle');
      mote.style.setProperty('--p-angle', `${(360 / 14) * i + (i % 2 ? 7 : -5)}deg`);
      mote.style.setProperty('--p-delay', `${300 + i * 60}ms`);
      mote.style.setProperty('--p-radius', `${220 + (i % 4) * 30}px`);
      particles.appendChild(mote);
    }

    const droplet = el('div', 'ichor-gift__droplet');
    droplet.innerHTML = HERO_DROPLET_SVG;

    const flash = el('div', 'ichor-gift__flash');

    core.appendChild(atmo);
    core.appendChild(rays);
    core.appendChild(halo);
    core.appendChild(particles);
    core.appendChild(droplet);
    core.appendChild(flash);
    stack.appendChild(core);

    const amountWrap = el('div', 'ichor-gift__amount-wrap');
    const amountIcon = el('span', 'ichor-gift__amount-icon');
    amountIcon.innerHTML = DROPLET_SVG;
    const amountValue = el('span', 'ichor-gift__amount-value', '0');
    const amountLabel = el('span', 'ichor-gift__amount-label', 'ichor');
    amountWrap.appendChild(amountIcon);
    amountWrap.appendChild(amountValue);
    amountWrap.appendChild(amountLabel);
    stack.appendChild(amountWrap);

    const subtitleEl = el('div', 'ichor-gift__subtitle', subtitle);
    stack.appendChild(subtitleEl);

    overlay.appendChild(stack);

    // ── CLAIM CTA — pulses gently once everything has settled. ──
    const claimBtn = el(
      'button',
      'ichor-gift__claim',
      'CLAIM',
    ) as HTMLButtonElement;
    claimBtn.type = 'button';
    overlay.appendChild(claimBtn);

    document.body.appendChild(overlay);

    // ── Counter slot-machine: roll 0 → amount over COUNTER_DURATION_MS,
    //     ease-out so it slows down at the end (the "settle" feel). ──
    const counterStart = performance.now() + 1000;
    const tick = (): void => {
      const now = performance.now();
      const t = Math.max(0, Math.min(1, (now - counterStart) / COUNTER_DURATION_MS));
      // ease-out (cubic)
      const eased = 1 - Math.pow(1 - t, 3);
      amountValue.textContent = String(Math.floor(amount * eased));
      if (t < 1) requestAnimationFrame(tick);
      else amountValue.textContent = String(amount);
    };
    requestAnimationFrame(tick);

    let claimed = false;
    let canClaim = false;
    let skipTimer: number | null = null;
    const onClaim = (): void => {
      if (claimed) return;
      claimed = true;
      if (skipTimer !== null) window.clearTimeout(skipTimer);

      // Grant the actual Ichor + emit events. The header pill
      // listener picks up 'ichor-changed' and pulses naturally.
      grantIchor(amount, source);

      // Animate the orb scattering toward the header before the
      // overlay dismisses. The exit class triggers the CSS that
      // disperses particles + fades everything.
      overlay.classList.add('ichor-gift--exit');
      window.setTimeout(() => {
        overlay.remove();
        resolve();
      }, EXIT_DURATION_MS);
    };

    // Only the CLAIM button dismisses — tap-anywhere on the overlay
    // is intentionally NOT wired so a tap-spammer (the typical
    // pre-gift state, since the FTUE fires at 15 taps in) can't
    // burn through the gift before reading it. The button itself
    // starts disabled (CSS `pointer-events: none`) and goes live
    // when the `--ready` class flips at SKIP_AFTER_MS.
    claimBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canClaim) return;
      onClaim();
    });

    // Failsafe auto-skip after 18s in case the player is afk.
    skipTimer = window.setTimeout(onClaim, 18_000);

    // Open the gate. Until SKIP_AFTER_MS the entire ceremony plays
    // uninterruptable — title slam, counter roll, subtitle settle.
    window.setTimeout(() => {
      canClaim = true;
      overlay.classList.add('ichor-gift--ready');
      claimBtn.classList.add('ichor-gift__claim--ready');
    }, SKIP_AFTER_MS);
  });
}
