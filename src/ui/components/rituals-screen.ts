// L5 — Rituals screen. Fullscreen overlay opened from the Sanctum tab
// header CTA. Lists the two banners (Standard + Featured), shows pity
// progress on each, and triggers single + 10× pulls. Pull animation +
// result reveal live in pull-animation.ts; this screen just dispatches
// to the engine and hands the resulting array to the animation.

import { el } from '../../utils/dom';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import {
  BANNER_LIST,
  type BannerDef,
} from '../../game/config/banners';
import {
  RITUAL_COST_BUNDLE_10,
  RITUAL_COST_SINGLE,
} from '../../game/config/ritual-rates';
import {
  canAffordPull,
  getBannerProgress,
  performPull,
} from '../../game/ritual';
import {
  archetypeLabel,
  THRALLS_BY_ID,
  type ThrallId,
} from '../../game/config/thralls';
import { playPullSequence } from '../../fx/pull-animation';
import { showToast } from './toast';
import { showThrallDetail } from './thrall-detail-modal';

const EXIT_DURATION_MS = 280;

/** Inline droplet — same shape as the Header's Ichor pill so the
 * currency reads identically across the app. */
const DROPLET_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 2 C12 2 5 10 5 15 C5 19 8 22 12 22 C16 22 19 19 19 15 C19 10 12 2 12 2 Z" ' +
  'fill="currentColor" stroke="rgba(0,0,0,0.35)" stroke-width="1"/></svg>';

export function showRitualsScreen(): void {
  if (document.querySelector('.rituals-screen__backdrop')) return;

  const backdrop = el('div', 'rituals-screen__backdrop');
  const screen = el('div', 'rituals-screen');

  // ── Header — daily-modal language: small mono caps title, italic
  //    serif subtitle, baroque corners on the panel.
  const close = el('button', 'rituals-screen__close', '×');
  close.setAttribute('aria-label', 'Close');

  const title = el('div', 'rituals-screen__title', 'THE RITUALS');
  const sub = el(
    'div',
    'rituals-screen__sub',
    'invoke those who sleep in the night',
  );

  // ── Ichor balance strip — gold droplet + tabular-nums value.
  const balance = el('div', 'rituals-screen__balance');
  const balanceIcon = el('span', 'rituals-screen__balance-icon');
  balanceIcon.innerHTML = DROPLET_SVG;
  const balanceValue = el('span', 'rituals-screen__balance-value');
  balance.appendChild(balanceIcon);
  balance.appendChild(balanceValue);
  const renderBalance = (): void => {
    balanceValue.textContent = `${gameState.getIchor()} ichor`;
  };
  renderBalance();

  // ── Banner cards (stacked)
  const cardsWrap = el('div', 'rituals-screen__cards');
  const cardRefs = BANNER_LIST.map((b) =>
    buildBannerCard(b, () => renderBalance()),
  );
  for (const c of cardRefs) cardsWrap.appendChild(c.root);

  // ── Recent history strip — last 10 results as colored dots
  const history = el('div', 'rituals-screen__history');
  const historyLabel = el(
    'div',
    'rituals-screen__history-label',
    '— RECENT INVOCATIONS —',
  );
  const historyRow = el('div', 'rituals-screen__history-row');
  history.appendChild(historyLabel);
  history.appendChild(historyRow);
  const renderHistory = (): void => {
    historyRow.textContent = '';
    const recent = gameState.getPullHistory().slice(-10);
    for (const e of recent) {
      const dot = el('div', 'rituals-screen__history-dot');
      dot.dataset.rarity = e.rarity;
      if (e.wasDupe) dot.classList.add('rituals-screen__history-dot--dupe');
      // Cinder Ceremony entries (no portrait) get a hollow ring marker.
      if (e.thrallId === null) {
        dot.classList.add('rituals-screen__history-dot--cinder');
        dot.title = `${e.rarity} cinder · +${e.essenceGained}`;
      } else {
        dot.title = `${THRALLS_BY_ID[e.thrallId].name} (${e.rarity})`;
      }
      historyRow.appendChild(dot);
    }
    if (recent.length === 0) {
      const empty = el(
        'div',
        'rituals-screen__history-empty',
        'no rite yet observed',
      );
      historyRow.appendChild(empty);
    }
  };
  renderHistory();

  // ── Footnote (legal stub — full disclosure page lands in L9)
  const foot = el(
    'div',
    'rituals-screen__foot',
    'rates disclosed · pity visible · history kept',
  );

  screen.appendChild(close);
  screen.appendChild(title);
  screen.appendChild(sub);
  screen.appendChild(balance);
  screen.appendChild(cardsWrap);
  screen.appendChild(history);
  screen.appendChild(foot);
  backdrop.appendChild(screen);
  document.body.appendChild(backdrop);

  // Refresh on Ichor / pull changes so the screen stays in sync if the
  // player triggers a pull via cheat or another path.
  const offIchor = events.on('ichor-changed', renderBalance);
  const offPull = events.on('ritual-pull-performed', () => {
    renderBalance();
    renderHistory();
    for (const c of cardRefs) c.refresh();
  });

  let dismissed = false;
  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    offIchor();
    offPull();
    backdrop.classList.add('rituals-screen__backdrop--exit');
    window.setTimeout(() => backdrop.remove(), EXIT_DURATION_MS);
  };

  close.addEventListener('click', dismiss);
  // Tap on the backdrop dismisses; tap on the screen card bubbles up
  // so internal taps don't close.
  backdrop.addEventListener('click', dismiss);
  screen.addEventListener('click', (e) => e.stopPropagation());
}

interface BannerCardRefs {
  root: HTMLElement;
  refresh: () => void;
}

function buildBannerCard(
  banner: BannerDef,
  onAfterPull: () => void,
): BannerCardRefs {
  const card = el('div', 'banner-card');
  card.dataset.banner = banner.id;
  card.style.setProperty('--banner-accent', banner.accent);

  // Ambient particle layer — slow upward drift, gives the panel
  // a subtle "alive" texture without any canvas. 6 motes for both
  // banners; per-banner accent comes from the parent's CSS var.
  const ambient = el('div', 'banner-card__ambient');
  for (let i = 0; i < 6; i += 1) {
    const mote = el('div', 'banner-card__ambient-mote');
    mote.style.setProperty('--ambient-x', `${10 + i * 15 + (i % 2 ? 4 : -3)}%`);
    mote.style.setProperty('--ambient-delay', `${i * 1100}ms`);
    mote.style.setProperty('--ambient-duration', `${6500 + i * 400}ms`);
    ambient.appendChild(mote);
  }
  card.appendChild(ambient);

  const head = el('div', 'banner-card__head');
  const name = el('h3', 'banner-card__name', banner.name);
  const sub = el('div', 'banner-card__sub', banner.subtitle);
  head.appendChild(name);
  head.appendChild(sub);

  const lore = el('p', 'banner-card__lore', banner.lore);

  // Pity bar — Rare on every banner; Epic only on Featured.
  const pityWrap = el('div', 'banner-card__pity');
  const pityRare = buildPityBar('rare');
  pityWrap.appendChild(pityRare.root);
  let pityEpic: ReturnType<typeof buildPityBar> | null = null;
  if (banner.id === 'featured') {
    pityEpic = buildPityBar('epic');
    pityWrap.appendChild(pityEpic.root);
  }

  // CTA row — single (boost button asset, gold) + bundle (ascend button
  // asset, blood). Cost displayed below label as italic serif.
  const ctaRow = el('div', 'banner-card__ctas');
  const single = buildPullCta('single', RITUAL_COST_SINGLE);
  const bundle = buildPullCta('bundle', RITUAL_COST_BUNDLE_10);
  ctaRow.appendChild(single.root);
  ctaRow.appendChild(bundle.root);

  // Featured banners reorganise per the 2026-04-25 mockup:
  //   ┌─★ RATE-UP─────────────────────────────────┐
  //   │ [portrait]  name + sub + lore             │   top row (flex)
  //   ├───────────────────────────────────────────┤
  //   │ Rare pity   ━━━━━━━  X / N                │   full-width
  //   │ Epic pity   ━━━━━━━  X / N                │
  //   ├───────────────────────────────────────────┤
  //   │ [Invoke ×1]              [Invoke ×10 −5%] │   full-width grid
  //   └───────────────────────────────────────────┘
  // Standard banners stay compact: inline name+sub, lore, pity, ctas.
  if (banner.featuredIds.length > 0) {
    card.classList.add('banner-card--featured-layout');

    const rateUpBadge = el('div', 'banner-card__rateup-badge', '★ RATE-UP');
    card.appendChild(rateUpBadge);

    const topRow = el('div', 'banner-card__top-row');
    const portraitCol = el('div', 'banner-card__portrait-col');
    for (const id of banner.featuredIds) {
      portraitCol.appendChild(buildRateUpCard(id));
    }
    const contentCol = el('div', 'banner-card__content-col');
    contentCol.appendChild(head);
    contentCol.appendChild(lore);
    topRow.appendChild(portraitCol);
    topRow.appendChild(contentCol);

    card.appendChild(topRow);
    card.appendChild(pityWrap);
    card.appendChild(ctaRow);
  } else {
    card.classList.add('banner-card--standard-layout');
    card.appendChild(head);
    card.appendChild(lore);
    card.appendChild(pityWrap);
    card.appendChild(ctaRow);
  }

  const refresh = (): void => {
    const p = getBannerProgress(banner.id);
    pityRare.update(p.pityRare, p.pityRareCap);
    if (pityEpic && p.pityEpic !== null && p.pityEpicCap !== null) {
      pityEpic.update(p.pityEpic, p.pityEpicCap);
    }
    single.setEnabled(canAffordPull(1));
    bundle.setEnabled(canAffordPull(10));
  };

  const onClick = (count: 1 | 10): void => {
    if (!canAffordPull(count)) {
      showToast(
        'NECTAR LACKING',
        `${count === 10 ? RITUAL_COST_BUNDLE_10 : RITUAL_COST_SINGLE} ichor required.`,
      );
      return;
    }
    if (navigator.vibrate) navigator.vibrate(count === 10 ? 14 : 8);
    const results = performPull(banner.id, count);
    if (!results) return;
    refresh();
    onAfterPull();
    void playPullSequence(results, banner);
  };

  single.btn.addEventListener('click', () => onClick(1));
  bundle.btn.addEventListener('click', () => onClick(10));

  refresh();

  return { root: card, refresh };
}

interface PullCtaRefs {
  root: HTMLElement;
  btn: HTMLButtonElement;
  setEnabled: (ok: boolean) => void;
}

function buildPullCta(kind: 'single' | 'bundle', cost: number): PullCtaRefs {
  const btn = el('button', `pull-cta pull-cta--${kind}`) as HTMLButtonElement;
  btn.type = 'button';

  // Bundle CTA carries a small −5% discount badge (95 ichor for 10
  // pulls vs 100). Renders as a corner sticker on top of the asset.
  if (kind === 'bundle') {
    const discount = el('span', 'pull-cta__discount', '−5%');
    btn.appendChild(discount);
  }

  const label = el(
    'span',
    'pull-cta__label',
    kind === 'single' ? 'Invoke ×1' : 'Invoke ×10',
  );

  const cost_ = el('span', 'pull-cta__cost');
  const icon = el('span', 'pull-cta__cost-icon');
  icon.innerHTML = DROPLET_SVG;
  const num = el('span', 'pull-cta__cost-num', String(cost));
  cost_.appendChild(icon);
  cost_.appendChild(num);

  btn.appendChild(label);
  btn.appendChild(cost_);

  const setEnabled = (ok: boolean): void => {
    btn.disabled = !ok;
    btn.classList.toggle('pull-cta--locked', !ok);
  };

  return { root: btn, btn, setEnabled };
}

/**
 * Build a Sanctum-style framed card for the rate-up thrall, with a
 * gentle continuous 3D tilt to draw the eye. Reuses the `.thrall-card`
 * structure verbatim so per-thrall crop overrides + rarity tint flow
 * through unchanged. Tap opens the thrall detail modal.
 */
function buildRateUpCard(id: ThrallId): HTMLElement {
  const t = THRALLS_BY_ID[id];
  const card = el(
    'button',
    'thrall-card rate-up-card',
  ) as HTMLButtonElement;
  card.type = 'button';
  card.dataset.thrallId = t.id;
  card.dataset.rarity = t.rarity;
  card.dataset.archetype = t.archetype;

  const portraitWrap = el('div', 'thrall-portrait-wrapper');
  const portrait = el('img', 'thrall-portrait') as HTMLImageElement;
  portrait.src = t.portraitPath;
  portrait.alt = t.name;
  portrait.decoding = 'async';
  portraitWrap.appendChild(portrait);
  card.appendChild(portraitWrap);

  const frame = el('img', 'thrall-frame') as HTMLImageElement;
  frame.src = '/assets/ornaments/thrall-frame.png';
  frame.alt = '';
  frame.decoding = 'async';
  card.appendChild(frame);

  card.appendChild(el('div', 'thrall-name', t.name));
  card.appendChild(
    el('div', 'thrall-type', archetypeLabel(t.archetype).toUpperCase()),
  );

  card.addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(4);
    showThrallDetail(t);
  });

  return card;
}

interface PityBarRefs {
  root: HTMLElement;
  update: (current: number, cap: number) => void;
}

function buildPityBar(kind: 'rare' | 'epic'): PityBarRefs {
  const root = el('div', 'pity-bar');
  root.dataset.kind = kind;
  // Top row: caps label LEFT + numeric counter RIGHT.
  const headRow = el('div', 'pity-bar__head');
  const label = el(
    'div',
    'pity-bar__label',
    kind === 'rare' ? 'Rare pity' : 'Epic pity',
  );
  const counter = el('div', 'pity-bar__counter');
  headRow.appendChild(label);
  headRow.appendChild(counter);
  // Track + fill below.
  const track = el('div', 'pity-bar__track');
  const fill = el('div', 'pity-bar__fill');
  track.appendChild(fill);
  root.appendChild(headRow);
  root.appendChild(track);

  // Tooltip carries the verbose phrasing for accessibility / hover —
  // "Rare guaranteed in 7 pulls" — without cluttering the pill.
  const update = (current: number, cap: number): void => {
    const remaining = Math.max(0, cap - current);
    const tier = kind === 'rare' ? 'Rare' : 'Epic';
    root.title =
      remaining === 0
        ? `${tier} guaranteed next pull`
        : `${tier} guaranteed in ${remaining} pull${remaining > 1 ? 's' : ''}`;
    const pct = Math.min(100, (current / cap) * 100);
    fill.style.width = `${pct}%`;
    counter.textContent = `${current} / ${cap}`;
  };

  return { root, update };
}
