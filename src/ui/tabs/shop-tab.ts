// L10/L11 — SHOP — Ichor pack ladder.
//
// Layout follows the gacha-systems / ux / aaa-ui synthesis:
//   - HERO slot at top: the Pacte Fondateur card when its trigger window
//     is active (post-1st-Rare, 7 days). Otherwise the slot is hidden.
//   - GRID slot below: the always-on packs in tier order (bronze →
//     silver → gold). Once the Pacte Fondateur falls out of its featured
//     window, it slots into the grid at the silver tier.
//
// Pack cards encode 3 tiers visually (bronze / silver / gold) with
// distinct frame, glow density, and particle layer count. The
// FT-Double ribbon sits top-right with a slow ±2px Y drift while
// available; it disappears when consumed.
//
// Purchase flow:
//   1. Tap pack → if Cataclysmique (>19.99€), confirm modal first.
//   2. Otherwise → call iap.purchasePack(sku). Web/dev = instant
//      stub success.
//   3. On success: show celebration toast + animate Ichor counter.
//   4. On block (under-13 / spending cap): show explicit modal with
//      Settings link.
//   5. On cancel/fail: silent toast.

import { el } from '../../utils/dom';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { showToast } from '../components/toast';
import { showIchorGift } from '../components/ichor-gift';
import { scholarTier, SCHOLAR_THRESHOLDS } from '../../game/milestones';
import { PACKS, type PackDef } from '../../game/config/packs';
import {
  isFirstTimeAvailable,
  packDisplayMode,
  purchasePack,
} from '../../game/iap';
import { THRALLS_BY_ID } from '../../game/config/thralls';

export class ShopTab {
  private readonly root: HTMLElement;
  private readonly teardowns: Array<() => void> = [];
  private readonly heroSlot: HTMLElement;
  private readonly gridSlot: HTMLElement;
  private readonly scholarLine: HTMLElement;

  constructor() {
    this.root = el('div', 'tab-view tab-view--shop');

    const head = el('header', 'tab-head');
    head.appendChild(el('div', 'tab-head__label', '— the apothecary —'));
    head.appendChild(el('h1', 'tab-head__title', 'SHOP'));
    head.appendChild(
      el('div', 'tab-head__sub', 'Offerings from the living world.'),
    );
    this.root.appendChild(head);

    // ── HERO slot (Pacte Fondateur during trigger window) ─────────
    const heroSection = el('section', 'tome-section pack-hero-section');
    heroSection.appendChild(el('h2', 'tome-section__title', 'PACTE FONDATEUR'));
    this.heroSlot = el('div', 'pack-hero-slot');
    heroSection.appendChild(this.heroSlot);
    this.root.appendChild(heroSection);

    // ── GRID slot (always-on packs) ─────────────────────────────
    const gridSection = el('section', 'tome-section');
    gridSection.appendChild(el('h2', 'tome-section__title', 'OFFERINGS'));
    this.gridSlot = el('div', 'pack-grid');
    gridSection.appendChild(this.gridSlot);
    this.root.appendChild(gridSection);

    // ── Scholar milestone vitrine (kept from v1.1) ───────────────
    const milestonesSection = el('section', 'tome-section');
    milestonesSection.appendChild(el('h2', 'tome-section__title', 'MILESTONE BONUSES'));
    this.scholarLine = el('div', 'shop-placeholder');
    milestonesSection.appendChild(this.scholarLine);
    this.root.appendChild(milestonesSection);
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    this.render();
    this.teardowns.push(
      events.on('dread-changed', () => this.renderScholar()),
      events.on('ascended', () => this.renderScholar()),
      events.on('pack-purchased', () => this.render()),
      events.on('welcome-pack-armed', () => this.render()),
      events.on('ichor-changed', () => this.refreshAffordability()),
    );
  }

  destroy(): void {
    for (const t of this.teardowns) t();
    this.teardowns.length = 0;
    this.root.remove();
  }

  // ── Renderers ──

  private render(): void {
    this.renderHero();
    this.renderGrid();
    this.renderScholar();
  }

  private renderHero(): void {
    this.heroSlot.innerHTML = '';
    const featured = PACKS.find((p) => packDisplayMode(p) === 'featured');
    if (!featured) {
      this.heroSlot.appendChild(
        el(
          'div',
          'shop-placeholder',
          'A Founder’s pact will arrive after your first Rare communion.',
        ),
      );
      this.heroSlot.classList.add('pack-hero-slot--empty');
      return;
    }
    this.heroSlot.classList.remove('pack-hero-slot--empty');
    this.heroSlot.appendChild(this.buildPackCard(featured, true));
  }

  private renderGrid(): void {
    this.gridSlot.innerHTML = '';
    for (const pack of PACKS) {
      const mode = packDisplayMode(pack);
      if (mode === 'featured') continue; // shown in hero slot
      if (mode === 'hidden') continue;
      this.gridSlot.appendChild(this.buildPackCard(pack, false));
    }
  }

  private renderScholar(): void {
    const dread = gameState.getDread();
    const tier = scholarTier(dread);
    if (tier >= SCHOLAR_THRESHOLDS.length) {
      this.scholarLine.textContent =
        `Bloodline Scholar — MAX (-${(tier * 0.01).toFixed(2)} servant cost mult). You have studied eternity.`;
      return;
    }
    const nextThreshold = SCHOLAR_THRESHOLDS[tier];
    const currentBonus = tier > 0 ? ` (-${(tier * 0.01).toFixed(2)} servant cost mult).` : '';
    this.scholarLine.textContent =
      `Bloodline Scholar — tier ${tier}/${SCHOLAR_THRESHOLDS.length}${currentBonus} Next unlock at Dread Level ${nextThreshold}.`;
  }

  /** Cheaper update path for events that only change affordability /
   *  FT availability (e.g. another tab spent some Ichor). Re-renders
   *  every card to ensure ribbon + tier visuals stay in sync. */
  private refreshAffordability(): void {
    // Cheap: just re-render the grid + hero. The grid is at most 6
    // cards so this is well under the 16ms budget.
    this.renderHero();
    this.renderGrid();
  }

  // ── Card builder ──
  //
  // Layout per the AAA-UI redesign (2026-04-25):
  //  - Standard cards: list-view, horizontal grid 2-col on `normal-panel.webp`.
  //    Left = title + flavor + bonus tag. Right = ichor amount + price button.
  //  - Hero card (Pacte Fondateur featured window): vertical stack on
  //    `achievement-card.webp` baroque plaque. The btn-shop-price.png
  //    plate is reserved for the hero BUY button — it has the width to
  //    breathe there. Standard cards use a CSS gold/crimson gradient
  //    button instead.

  private buildPackCard(pack: PackDef, isHero: boolean): HTMLElement {
    const ftAvail = isFirstTimeAvailable(pack);
    const ichorTotal = pack.baseIchor + (ftAvail ? pack.firstTimeBonusIchor : 0);

    const card = el(
      'button',
      `pack-card pack-card--${pack.tier} pack-card--${isHero ? 'hero' : 'grid'}`,
    ) as HTMLButtonElement;
    card.type = 'button';
    card.setAttribute('data-sku', pack.sku);

    if (ftAvail) {
      const ribbon = el('div', 'pack-card__ribbon', '×2 FIRST TIME');
      card.appendChild(ribbon);
    }

    if (isHero) {
      const featuredTag = el('div', 'pack-card__featured', '★ FEATURED');
      card.appendChild(featuredTag);
    }

    // Left column — title + flavor copy + bonus tag.
    const inner = el('div', 'pack-card__inner');
    inner.appendChild(el('div', 'pack-card__title', pack.title));
    inner.appendChild(el('div', 'pack-card__desc', pack.description));
    if (pack.bonus.kind === 'guaranteed_thrall') {
      const def = THRALLS_BY_ID[pack.bonus.thrallId];
      if (def) {
        inner.appendChild(
          el(
            'div',
            `pack-card__bonus-tag pack-card__bonus-tag--${def.rarity}`,
            `+ ${def.name} (${def.rarity === 'epic' ? 'Epic' : 'Rare'}) guaranteed`,
          ),
        );
      }
    } else if (pack.bonus.kind === 'guaranteed_rare') {
      inner.appendChild(
        el(
          'div',
          'pack-card__bonus-tag pack-card__bonus-tag--rare',
          '+ 1 Rare guaranteed',
        ),
      );
    }
    card.appendChild(inner);

    // Right column — vessel art (escalating chalice → mug → cauldron
    // by base Ichor tier) + amount + label + optional FT/expiry lines.
    // The vessel does the heavy lifting visually; the numeric value
    // is the precise readout. Vessels stack horizontally when count=2
    // so "twice as much" reads instantly without reading the digits.
    const reward = el('div', 'pack-card__reward');
    const vessel = vesselForIchor(pack.baseIchor);
    const vesselWrap = el(
      'div',
      `pack-card__vessels pack-card__vessels--${vessel.kind} pack-card__vessels--count-${vessel.count}`,
    );
    for (let i = 0; i < vessel.count; i += 1) {
      const img = el(
        'img',
        'pack-card__vessel-img',
      ) as HTMLImageElement;
      img.src = `/assets/ornaments/vessel-${vessel.kind}.png`;
      img.alt = '';
      img.decoding = 'async';
      vesselWrap.appendChild(img);
    }
    reward.appendChild(vesselWrap);

    const ichorBlock = el('div', 'pack-card__ichor');
    const ichorValue = el(
      'span',
      'pack-card__ichor-amt',
      String(ichorTotal),
    );
    const ichorLabel = el('span', 'pack-card__ichor-lbl', 'ICHOR');
    ichorBlock.appendChild(ichorValue);
    ichorBlock.appendChild(ichorLabel);
    reward.appendChild(ichorBlock);

    if (ftAvail && pack.firstTimeBonusIchor > 0) {
      reward.appendChild(
        el(
          'div',
          'pack-card__ft-breakdown',
          `${pack.baseIchor} + ${pack.firstTimeBonusIchor} bonus`,
        ),
      );
    }

    if (pack.triggered && isHero && ftAvail) {
      const armedAt = gameState.getWelcomeFirstRareAt();
      if (armedAt !== null) {
        const cutoff = armedAt + pack.triggered.featuredDays * 86400000;
        const remaining = formatRemaining(cutoff - Date.now());
        if (remaining) {
          reward.appendChild(
            el(
              'div',
              'pack-card__ft-expiry',
              `First-time bonus ends in ${remaining}`,
            ),
          );
        }
      }
    }
    card.appendChild(reward);

    // Price BUY button — full-width row beneath the inner/reward grid.
    // Hero card uses btn-shop-price.png; standard cards use a CSS
    // gold/crimson gradient button (defined in shop.css).
    const price = el('div', 'pack-card__price', formatPrice(pack.priceEur));
    card.appendChild(price);

    card.addEventListener('click', () => {
      void this.handlePackTap(pack, card);
    });

    return card;
  }

  // ── Purchase flow ──

  private async handlePackTap(
    pack: PackDef,
    btn: HTMLButtonElement,
  ): Promise<void> {
    if (btn.disabled) return;
    if (pack.priceEur > 19.99) {
      const confirmed = await confirmHighValuePurchase(pack);
      if (!confirmed) return;
    }
    btn.disabled = true;
    btn.classList.add('pack-card--pending');
    try {
      const outcome = await purchasePack(pack.sku);
      if (!outcome.ok) {
        handlePurchaseFailure(outcome.reason, outcome.message);
        return;
      }
      handlePurchaseSuccess(pack, outcome.grant.ichorCredited);
    } finally {
      btn.disabled = false;
      btn.classList.remove('pack-card--pending');
    }
  }
}

// ── Helpers ──

function formatPrice(price: number): string {
  // en-US USD format ($0.99 with leading symbol + period decimal) —
  // matches Play Console's default base currency for our SKUs (US is
  // the primary launch market). The actual Play Store sheet localizes
  // per the user's region at purchase time; this is just the in-app
  // display label. The PackDef field is named `priceEur` for legacy
  // reasons but the number is the USD list price now.
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(price);
}

/**
 * Pick the vessel art + count for a pack based on its base Ichor.
 *
 * The escalation reads at-a-glance "this pack gives more" without
 * the player reading the numeric value:
 *   Modest 15        → chalice ×1
 *   Founder's 50     → chalice ×2
 *   Substantial 100  → mug ×1
 *   Starter 200      → mug ×2
 *   Greater 250      → mug ×2 (parity with Starter at 9.99€ tier)
 *   Royal 600        → cauldron ×1
 *   Cataclysmic 1800 → cauldron ×2
 *
 * Anchored on BASE Ichor (not total-with-FT) so the vessel doesn't
 * flip-flop after a player consumes the first-time bonus on the
 * same SKU.
 */
type VesselKind = 'chalice' | 'mug' | 'cauldron';

function vesselForIchor(baseIchor: number): {
  kind: VesselKind;
  count: 1 | 2;
} {
  if (baseIchor < 30) return { kind: 'chalice', count: 1 };
  if (baseIchor < 100) return { kind: 'chalice', count: 2 };
  if (baseIchor < 150) return { kind: 'mug', count: 1 };
  if (baseIchor < 300) return { kind: 'mug', count: 2 };
  if (baseIchor < 1000) return { kind: 'cauldron', count: 1 };
  return { kind: 'cauldron', count: 2 };
}

/** Compact "Xd Yh" / "Xh Ym" / "Xm" format for the FT-expiry line.
 *  Returns an empty string when the cutoff already passed (caller
 *  hides the line entirely in that case). */
function formatRemaining(ms: number): string {
  if (ms <= 0) return '';
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin - days * 1440) / 60);
  const min = totalMin - days * 1440 - hours * 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(min).padStart(2, '0')}m`;
  return `${min}m`;
}

function handlePurchaseSuccess(
  pack: PackDef,
  ichorCredited: number,
): void {
  // Re-use the L8 Ichor Gift Ceremony (the same flow that fires on
  // the tutorial gift) for IAP completions. The Ichor was already
  // credited by purchasePack → grantPackContents, so we pass
  // skipGrant: true to keep the ceremony purely visual.
  void showIchorGift(ichorCredited, {
    title: 'OFFERING ACCEPTED',
    subtitle: `${pack.title} — the Ancients accept.`,
    source: 'iap_pack',
    skipGrant: true,
    // Same flow as the tutorial gift — 4s anticipation + manual
    // CLAIM tap to dismiss. The player asked for the IAP ceremony
    // to mirror the free-Ichor moment from the start of the game.
  });
  if (navigator.vibrate) navigator.vibrate([8, 30, 14]);
}

// showToast still used for failure paths below — kept import.
void showToast;

function handlePurchaseFailure(
  reason: string,
  message?: string,
): void {
  switch (reason) {
    case 'cancelled':
      // Silent — the player chose to cancel.
      return;
    case 'blocked-under13':
      showToast('PURCHASES LOCKED', 'IAPs are disabled for this account.');
      return;
    case 'blocked-spending-cap':
      showToast(
        'CAP REACHED',
        message ?? 'Daily spending cap reached. Adjust in Settings.',
      );
      return;
    case 'native-unavailable':
      showToast('SOON', 'Purchases land in a coming rite.');
      return;
    default:
      showToast('PURCHASE FAILED', 'The pact could not be sealed. Try again.');
  }
}

function confirmHighValuePurchase(pack: PackDef): Promise<boolean> {
  return new Promise((resolve) => {
    document.querySelector('.pack-confirm__backdrop')?.remove();

    const backdrop = el('div', 'pack-confirm__backdrop');
    const modal = el('div', 'pack-confirm');
    modal.setAttribute('role', 'dialog');

    const title = el('div', 'pack-confirm__title', '— A SERIOUS PACT —');
    const body = el(
      'div',
      'pack-confirm__body',
      `${pack.title} — ${formatPrice(pack.priceEur)}. This is a major offering. Are you certain?`,
    );

    const ack = el('label', 'pack-confirm__ack');
    const checkbox = el('input', 'pack-confirm__checkbox') as HTMLInputElement;
    checkbox.type = 'checkbox';
    const ackText = el(
      'span',
      'pack-confirm__ack-text',
      'I understand the amount I am about to spend.',
    );
    ack.appendChild(checkbox);
    ack.appendChild(ackText);

    const actions = el('div', 'pack-confirm__actions');
    const cancel = el('button', 'pack-confirm__cancel', 'Cancel') as HTMLButtonElement;
    cancel.type = 'button';
    const confirm = el(
      'button',
      'pack-confirm__confirm',
      `Continue (${formatPrice(pack.priceEur)})`,
    ) as HTMLButtonElement;
    confirm.type = 'button';
    confirm.disabled = true;
    actions.appendChild(cancel);
    actions.appendChild(confirm);

    modal.appendChild(title);
    modal.appendChild(body);
    modal.appendChild(ack);
    modal.appendChild(actions);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const teardown = (decision: boolean): void => {
      backdrop.remove();
      modal.remove();
      resolve(decision);
    };

    checkbox.addEventListener('change', () => {
      confirm.disabled = !checkbox.checked;
    });
    cancel.addEventListener('click', () => teardown(false));
    confirm.addEventListener('click', () => teardown(true));
    backdrop.addEventListener('click', () => teardown(false));
  });
}
