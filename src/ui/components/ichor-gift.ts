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

/** Default skip gate. The tutorial gift uses this so a 30-taps/sec
 *  spammer can't burn through the reveal — IAP-purchase ceremonies
 *  pass a shorter `skipAfter` since the Play sheet already gated
 *  the action behind an explicit confirm. */
const DEFAULT_SKIP_AFTER_MS = 4000;
const COUNTER_DURATION_MS = 900;
const EXIT_DURATION_MS = 520;

/** Hero droplet markup — Kenny's hand-painted PNG. Replaces the
 *  earlier inline SVG (radial-gradient sculpted droplet) so the
 *  ceremony reads as the same currency the player sees in the HUD
 *  pill / pack cards. The CSS sets the render size; the PNG carries
 *  its own painting (specular highlight, rim light, gold body) which
 *  beats anything we could recreate via SVG gradients. */
const HERO_DROPLET_HTML =
  '<img class="ichor-gift__droplet-img" src="/assets/ornaments/ichor-icon.png" alt="" decoding="async" />';

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
  /** When true, the ceremony is purely visual — the Ichor was already
   *  credited by an upstream flow (typical case: IAP purchase, where
   *  the grant fires on platform-purchase success and we re-use the
   *  ceremony as the celebration). Default false → grant fires on
   *  CLAIM as before. */
  readonly skipGrant?: boolean;
  /** Override how long the CLAIM gate takes to open. The tutorial gift
   *  ships with the 4000ms default to defeat tap-spammers; IAP flows
   *  pass a shorter window (≈ 1500ms) since the Play sheet already
   *  gated the action and a long lock would feel punitive after the
   *  3rd consecutive purchase. */
  readonly skipAfterMs?: number;
  /** When true, the ceremony auto-dismisses after the CLAIM gate
   *  opens without waiting for a tap. Used by IAP flows where the
   *  reveal is celebratory but shouldn't block the player from
   *  returning to the Shop. Default false → manual CLAIM as before. */
  readonly autoDismiss?: boolean;
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
  const skipGrant = opts.skipGrant ?? false;
  const skipAfterMs = opts.skipAfterMs ?? DEFAULT_SKIP_AFTER_MS;
  const autoDismiss = opts.autoDismiss ?? false;

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
    droplet.innerHTML = HERO_DROPLET_HTML;

    const flash = el('div', 'ichor-gift__flash');

    core.appendChild(atmo);
    core.appendChild(rays);
    core.appendChild(halo);
    core.appendChild(particles);
    core.appendChild(droplet);
    core.appendChild(flash);
    stack.appendChild(core);

    const amountWrap = el('div', 'ichor-gift__amount-wrap');
    const amountIcon = el(
      'img',
      'ichor-gift__amount-icon',
    ) as HTMLImageElement;
    amountIcon.src = '/assets/ornaments/ichor-icon.png';
    amountIcon.alt = '';
    amountIcon.decoding = 'async';
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
      // Skipped on IAP-purchase ceremonies where the grant already
      // fired upstream (otherwise we'd double-credit).
      if (!skipGrant) {
        grantIchor(amount, source);
      }

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

    // Open the gate. Until skipAfterMs the entire ceremony plays
    // uninterruptable — title slam, counter roll, subtitle settle.
    // IAP flows hit autoDismiss so the ceremony self-closes shortly
    // after the gate opens, without forcing a manual CLAIM tap.
    window.setTimeout(() => {
      canClaim = true;
      overlay.classList.add('ichor-gift--ready');
      claimBtn.classList.add('ichor-gift__claim--ready');
      if (autoDismiss) {
        // Hold a beat post-gate-open so the breathe pulse is visible
        // before the orb scatters. Tap-anywhere still works inside
        // this window thanks to the click handler above.
        window.setTimeout(onClaim, 900);
      }
    }, skipAfterMs);
  });
}
