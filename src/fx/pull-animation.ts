// L5/L6 — pull reveal sequence. Now staged in three phases per result:
//
//   1) Anticipation (rare+ only) — screen darkens, glow accumulates,
//      the player feels a beat coming.
//   2) Reveal — the card lands with a per-rarity flourish + screen
//      shake + haptics.
//   3) Dissolve (dupe only) — the portrait shatters into particles
//      that converge into a glowing essence orb, then "+N essences"
//      surfaces in the center.
//
// Skip button is always available after 800ms — single press jumps
// to the summary regardless of phase.

import { el } from '../utils/dom';
import {
  THRALLS_BY_ID,
  type ThrallRarity,
} from '../game/config/thralls';
import type { BannerDef } from '../game/config/banners';
import type { PullResult } from '../game/ritual';
import {
  playPullImpact,
  playPullReveal,
  playPullRumble,
} from '../audio/pull-sfx';

const SKIP_VISIBLE_AFTER_MS = 800;

/** Anticipation lead-in. Even commons get a brief (250ms) build now
 *  — pure-instant reveal felt jarring per Kenny. Rare+ ramp up so
 *  the player feels the rarity coming before the visual lands. */
const ANTICIPATION_MS: Record<ThrallRarity, number> = {
  common: 250,
  rare: 600,
  epic: 950,
  legendary: 1200,
};

/** Reveal phase duration for PORTRAIT pulls. Tightened up vs the
 *  previous draft so total per-pull time stays under 5s for the
 *  longest path (epic dupe). */
const REVEAL_DURATION_MS: Record<ThrallRarity, number> = {
  common: 1300,
  rare: 2100,
  epic: 2800,
  legendary: 4000,
};

/** Dissolve phase duration when the result was a duplicate. The
 *  portrait dissolves and the essence orb takes over. */
const DISSOLVE_DURATION_MS: Record<ThrallRarity, number> = {
  common: 700,
  rare: 1100,
  epic: 1400,
  legendary: 1700,
};

/** Cinder Ceremony durations — separate from portrait reveals so
 *  saturation outcomes feel consistent across rarities (1.2-2.0s
 *  range vs 1.3-2.8s for portraits). No anticipation phase. */
const CINDER_DURATION_MS: Record<ThrallRarity, number> = {
  common: 1200,
  rare: 1600,
  epic: 2000,
  legendary: 2400,
};

export function playPullSequence(
  results: readonly PullResult[],
  banner: BannerDef,
): Promise<void> {
  return new Promise((resolve) => {
    const overlay = el('div', 'pull-overlay');
    overlay.dataset.banner = banner.id;
    document.body.appendChild(overlay);

    let index = 0;
    let skipped = false;
    let pendingTimers: number[] = [];
    let readyForTap = false;
    let advanceHintEl: HTMLElement | null = null;

    const clearTimers = (): void => {
      for (const t of pendingTimers) window.clearTimeout(t);
      pendingTimers = [];
    };
    const after = (ms: number, fn: () => void): void => {
      pendingTimers.push(window.setTimeout(fn, ms));
    };

    const finish = (): void => {
      clearTimers();
      overlay.classList.add('pull-overlay--exit');
      after(320, () => {
        overlay.remove();
        resolve();
      });
    };

    const showSummary = (): void => {
      clearTimers();
      overlay.textContent = '';
      const summary = buildSummary(results, () => finish());
      overlay.appendChild(summary);
    };

    /** Mark the animation done for the current pull and surface a
     *  pulsing "TAP TO CONTINUE" hint so the player paces themselves. */
    const showAdvanceHint = (): void => {
      if (skipped) return;
      readyForTap = true;
      // For 10-pulls we hint how many remain so the player knows the
      // skip option is worth tapping if they're impatient.
      const remaining = results.length - index;
      const text =
        remaining > 0 ? `TAP — ${remaining} REMAINING` : 'TAP TO CONTINUE';
      advanceHintEl = el('div', 'pull-overlay__advance-hint', text);
      overlay.appendChild(advanceHintEl);
    };

    const playNext = (): void => {
      if (skipped) return;
      if (index >= results.length) {
        showSummary();
        return;
      }
      const result = results[index];
      index += 1;
      overlay.textContent = '';
      // Re-attach the skip button since textContent wiped everything.
      overlay.appendChild(skip);
      // Reset tap-ready state for the new reveal.
      readyForTap = false;
      advanceHintEl = null;

      // Phase 1 — anticipation. Common gets a brief 250ms quiet
      // build, rare/epic/legendary ramp up. Cinders skip
      // anticipation entirely (meditative, no hero buildup).
      const antMs = result.isCinder ? 0 : ANTICIPATION_MS[result.rarity];
      if (antMs > 0) {
        const ant = el('div', 'pull-anticipation');
        ant.dataset.rarity = result.rarity;
        overlay.appendChild(ant);
        // Audio rumble synced with the visual build-up. Web Audio
        // API procedural — sub-bass swell, pitch-rises, peaks at
        // ~95% of the duration so it cuts at the impact moment.
        playPullRumble(result.rarity, antMs);
        if (navigator.vibrate) {
          navigator.vibrate(
            result.rarity === 'epic' || result.rarity === 'legendary'
              ? [6, 80, 6, 80, 8]
              : result.rarity === 'rare'
                ? [4, 80, 4]
                : 3,
          );
        }
        after(antMs, () => doReveal(result));
      } else {
        doReveal(result);
      }
    };

    const doReveal = (result: PullResult): void => {
      if (skipped) return;
      overlay.textContent = '';
      overlay.appendChild(skip);

      // Cinder Ceremony — saturation outcome, no portrait. Uses its
      // own duration table so cinders feel consistent across
      // rarities (1.2-2.0s) instead of the portrait reveal range.
      if (result.isCinder) {
        const cinder = buildCinder(result);
        overlay.appendChild(cinder);
        hapticForRarity(result.rarity);
        // Cinder gets a soft impact — quieter than a portrait pull
        // since there's no thrall to celebrate.
        playPullImpact(result.rarity);
        // Subtle screen shake on epic Cinder only — rare/common feel
        // meditative rather than impactful.
        if (result.rarity === 'epic' || result.rarity === 'legendary') {
          triggerScreenShake(overlay, result.rarity, after);
        }
        // After the ceremony settles, the player advances by tap.
        after(CINDER_DURATION_MS[result.rarity], showAdvanceHint);
        return;
      }

      const reveal = buildReveal(result);
      overlay.appendChild(reveal);

      triggerScreenShake(overlay, result.rarity, after);
      hapticForRarity(result.rarity);
      // Color-tell impact — bright percussive strike at the moment
      // the rarity flash burns. The cluster (and gain) scales with
      // tier so SSR-equivalent Epics actually feel like an event.
      playPullImpact(result.rarity);
      // Bell-like reveal chime that lands as the player reads the
      // name (~600ms after impact). Higher rarity = more partials.
      after(600, () => {
        if (skipped) return;
        playPullReveal(result.rarity);
      });

      const revealMs = REVEAL_DURATION_MS[result.rarity];

      if (result.wasDupe) {
        // Show the rarity for the bulk of the reveal phase, then
        // trigger the dissolve overlay for the remainder. Player
        // sees: card lands → name registers → portrait shatters →
        // essence orb pulses with "+N", then taps to continue.
        const beforeDissolve = Math.round(revealMs * 0.6);
        after(beforeDissolve, () => {
          if (skipped) return;
          reveal.classList.add('pull-reveal--dissolving');
          const fx = buildEssenceFx(result);
          reveal.appendChild(fx);
        });
        after(beforeDissolve + DISSOLVE_DURATION_MS[result.rarity], showAdvanceHint);
      } else {
        // Fresh portrait — animation lands fast, give the player time
        // to read the name, then surface the tap hint.
        after(revealMs, showAdvanceHint);
      }
    };

    // Skip button — visible from 800ms regardless of phase.
    const skip = el('button', 'pull-overlay__skip', 'SKIP ▸') as HTMLButtonElement;
    skip.type = 'button';
    skip.style.opacity = '0';
    overlay.appendChild(skip);
    after(SKIP_VISIBLE_AFTER_MS, () => {
      skip.style.opacity = '1';
    });
    skip.addEventListener('click', (e) => {
      e.stopPropagation();
      skipped = true;
      clearTimers();
      showSummary();
    });

    // Tap-to-advance: clicking anywhere on the overlay (except the
    // SKIP button which stops propagation) moves to the next pull,
    // BUT only after the current animation has reached its natural
    // pause point (gated by readyForTap). Tapping early is ignored
    // so players can't accidentally cut their own reveals short.
    overlay.addEventListener('click', () => {
      if (!readyForTap || skipped) return;
      readyForTap = false;
      if (advanceHintEl) {
        advanceHintEl.remove();
        advanceHintEl = null;
      }
      // Drain any lingering scheduled shake-cleanup timers; the next
      // playNext will install fresh ones.
      clearTimers();
      playNext();
    });

    playNext();
  });
}

// ─────────── Reveal layer ───────────

function buildReveal(result: PullResult): HTMLElement {
  // Caller has already checked isCinder; this path always has a thrall.
  const t = THRALLS_BY_ID[result.thrallId!];
  const card = el('div', 'pull-reveal');
  card.dataset.rarity = result.rarity;
  if (result.wasDupe) card.dataset.dupe = 'true';

  // ── AAA glow stack (FDP-grade, 5 layers behind the portrait):
  //    hot core / body / halo / bloom drift / [streak on epic+].
  //    Each layer is a sibling div so they stack via CSS without
  //    interfering with the portrait's filter pipeline.
  const glow = el('div', 'pull-reveal__glow');
  glow.appendChild(el('div', 'pull-reveal__glow-core'));
  glow.appendChild(el('div', 'pull-reveal__glow-body'));
  glow.appendChild(el('div', 'pull-reveal__glow-halo'));
  glow.appendChild(el('div', 'pull-reveal__glow-bloom'));
  if (result.rarity === 'epic' || result.rarity === 'legendary') {
    glow.appendChild(el('div', 'pull-reveal__glow-streak'));
  }
  card.appendChild(glow);

  // ── Color tell flash — white-out burst that fires 200ms after the
  //    card mounts. The portrait fades in THROUGH this flash so the
  //    rarity color reveal feels like the dopamine moment the V1.2
  //    spec describes.
  const flash = el('div', 'pull-reveal__flash');
  card.appendChild(flash);

  // ── Portrait wrapper — clipped to the visible aspect, with rim
  //    light + shimmer overlay siblings that don't disturb the image.
  const portraitWrap = el('div', 'pull-reveal__portrait-wrap');
  const portrait = el('img', 'pull-reveal__portrait') as HTMLImageElement;
  portrait.src = t.portraitPath;
  portrait.alt = t.name;
  portrait.decoding = 'async';
  portraitWrap.appendChild(portrait);

  // Shimmer sweep — diagonal white gradient that travels across the
  // portrait every ~3s on rare+, signature-AAA polish.
  if (result.rarity !== 'common') {
    portraitWrap.appendChild(el('div', 'pull-reveal__shimmer'));
  }
  card.appendChild(portraitWrap);

  // ── Sparkle particles — 8 elements around the portrait. Each has
  //    its own delay+angle CSS variables so the cluster feels organic
  //    instead of robotic. Pure CSS, no canvas, ~16 KB on the GPU.
  if (result.rarity !== 'common') {
    const sparkles = el('div', 'pull-reveal__sparkles');
    for (let i = 0; i < 8; i += 1) {
      const sp = el('div', 'pull-reveal__sparkle');
      sp.style.setProperty('--sparkle-angle', `${(360 / 8) * i + (i % 2 ? 12 : -8)}deg`);
      sp.style.setProperty('--sparkle-delay', `${300 + i * 140}ms`);
      sp.style.setProperty('--sparkle-radius', `${110 + (i % 3) * 18}px`);
      sparkles.appendChild(sp);
    }
    card.appendChild(sparkles);
  }

  const rarity = el(
    'div',
    'pull-reveal__rarity',
    `— ${result.rarity.toUpperCase()} —`,
  );
  card.appendChild(rarity);

  const name = el('div', 'pull-reveal__name', t.name);
  card.appendChild(name);

  if (!result.wasDupe) {
    const fresh = el('div', 'pull-reveal__fresh', 'bound to your will');
    card.appendChild(fresh);
  }

  return card;
}

// ─────────── Cinder Ceremony (saturation outcome) ───────────

function buildCinder(result: PullResult): HTMLElement {
  const card = el('div', 'pull-cinder');
  card.dataset.rarity = result.rarity;

  // Lore caption shifts subtly per rarity so the screen reads
  // different across the three saturation tiers.
  const loreByRarity: Record<string, string> = {
    common: 'the night offers only ash',
    rare: 'a violet ember kept by the dead',
    epic: 'crimson cinders, pact of the elder ones',
    legendary: 'the bloodline turns to flame',
  };
  const tag = el(
    'div',
    'pull-cinder__tag',
    `— ${result.rarity.toUpperCase()} CINDER —`,
  );
  card.appendChild(tag);

  // Essence FX layer drives the visual — same orb + motes + numbers
  // stack as the dupe path, but without a portrait dissolving behind.
  const fx = buildEssenceFx(result);
  card.appendChild(fx);

  const lore = el(
    'div',
    'pull-cinder__lore',
    loreByRarity[result.rarity] ?? 'the rite is whole',
  );
  card.appendChild(lore);

  return card;
}

// ─────────── Dupe → essence FX layer ───────────

function buildEssenceFx(result: PullResult): HTMLElement {
  const fx = el('div', 'pull-reveal__essence-fx');
  fx.dataset.rarity = result.rarity;

  // Convergent particles — six small motes spawned around the
  // portrait that animate inward to the orb. Pure CSS keyframes per
  // particle (each has a slight angle offset).
  for (let i = 0; i < 8; i += 1) {
    const mote = el('span', 'pull-reveal__essence-mote');
    mote.style.setProperty('--mote-angle', `${(360 / 8) * i}deg`);
    mote.style.setProperty('--mote-delay', `${i * 30}ms`);
    fx.appendChild(mote);
  }

  const orb = el('div', 'pull-reveal__essence-orb');
  fx.appendChild(orb);

  const amount = el(
    'div',
    'pull-reveal__essence-amount',
    `+${result.essenceGained}`,
  );
  fx.appendChild(amount);

  const label = el(
    'div',
    'pull-reveal__essence-label',
    `${result.rarity} ${result.essenceGained > 1 ? 'essences' : 'essence'}`,
  );
  fx.appendChild(label);

  return fx;
}

// ─────────── Screen shake ───────────

function triggerScreenShake(
  overlay: HTMLElement,
  rarity: ThrallRarity,
  schedule: (ms: number, fn: () => void) => void,
): void {
  if (rarity === 'common') return;
  // Strip any prior shake class so the animation can re-trigger.
  overlay.classList.remove('pull-overlay--shake-rare');
  overlay.classList.remove('pull-overlay--shake-epic');
  overlay.classList.remove('pull-overlay--shake-legendary');
  // Force reflow so the browser registers the removal before re-add.
  void overlay.offsetWidth;
  const cls = `pull-overlay--shake-${rarity}`;
  overlay.classList.add(cls);
  // Clean up so future shakes don't compound.
  schedule(900, () => overlay.classList.remove(cls));
}

// ─────────── Summary ───────────

function buildSummary(
  results: readonly PullResult[],
  onContinue: () => void,
): HTMLElement {
  const panel = el('div', 'pull-summary');

  const title = el('div', 'pull-summary__title', 'RITE COMPLETE');
  panel.appendChild(title);

  const sub = el(
    'div',
    'pull-summary__sub',
    results.length === 1
      ? 'one presence answers.'
      : `${results.length} presences answer.`,
  );
  panel.appendChild(sub);

  const grid = el('div', 'pull-summary__grid');
  const sorted = [...results].sort(
    (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity),
  );
  for (const r of sorted) {
    grid.appendChild(buildSummaryCard(r));
  }
  panel.appendChild(grid);

  const totals = el('div', 'pull-summary__totals');
  const freshCount = results.filter((r) => !r.wasDupe).length;
  const essenceTotals: Record<ThrallRarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };
  for (const r of results) essenceTotals[r.rarity] += r.wasDupe ? r.essenceGained : 0;
  if (freshCount > 0) {
    totals.appendChild(
      el(
        'div',
        'pull-summary__totals-line',
        `${freshCount} thrall${freshCount > 1 ? 's' : ''} added to the Sanctum`,
      ),
    );
  }
  for (const [rarity, n] of Object.entries(essenceTotals) as [
    ThrallRarity,
    number,
  ][]) {
    if (n > 0) {
      totals.appendChild(
        el(
          'div',
          'pull-summary__totals-line',
          `+${n} ${rarity} essence${n > 1 ? 's' : ''}`,
        ),
      );
    }
  }
  if (freshCount === 0 && Object.values(essenceTotals).every((v) => v === 0)) {
    totals.appendChild(
      el('div', 'pull-summary__totals-line', 'the night keeps its secrets'),
    );
  }
  panel.appendChild(totals);

  const cta = el(
    'button',
    'pull-summary__cta',
    'CONTINUE',
  ) as HTMLButtonElement;
  cta.type = 'button';
  cta.addEventListener('click', onContinue);
  panel.appendChild(cta);

  return panel;
}

function buildSummaryCard(r: PullResult): HTMLElement {
  const card = el('div', 'pull-summary__card');
  card.dataset.rarity = r.rarity;
  if (r.wasDupe) card.dataset.dupe = 'true';
  if (r.isCinder) card.dataset.cinder = 'true';

  if (r.isCinder) {
    // Generic ember glyph — no portrait, since the ceremony grants
    // essence directly. Layout still aligns with portrait cards.
    const ember = el('div', 'pull-summary__card-ember', '◈');
    card.appendChild(ember);
  } else {
    const t = THRALLS_BY_ID[r.thrallId!];
    const img = el('img', 'pull-summary__card-img') as HTMLImageElement;
    img.src = t.portraitPath;
    img.alt = t.name;
    img.decoding = 'async';
    card.appendChild(img);
  }

  const tag = el(
    'div',
    'pull-summary__card-tag',
    r.isCinder ? 'CINDER' : r.rarity.toUpperCase(),
  );
  card.appendChild(tag);

  if (r.wasDupe || r.isCinder) {
    const dupe = el(
      'div',
      'pull-summary__card-dupe',
      `+${r.essenceGained}`,
    );
    card.appendChild(dupe);
  } else {
    card.classList.add('pull-summary__card--new');
  }

  return card;
}

function rarityRank(r: ThrallRarity): number {
  switch (r) {
    case 'legendary':
      return 3;
    case 'epic':
      return 2;
    case 'rare':
      return 1;
    case 'common':
      return 0;
  }
}

function hapticForRarity(r: ThrallRarity): void {
  if (!navigator.vibrate) return;
  switch (r) {
    case 'common':
      navigator.vibrate(8);
      return;
    case 'rare':
      navigator.vibrate([12, 60, 12]);
      return;
    case 'epic':
      navigator.vibrate([18, 80, 18, 80, 24]);
      return;
    case 'legendary':
      navigator.vibrate([24, 80, 24, 80, 24, 80, 32]);
      return;
  }
}
