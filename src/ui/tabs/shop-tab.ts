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
  // v1.3.2 AAA refonte — Option A "vessel-as-hero-top" layout:
  //   ┌─────────────────────────────┐
  //   │   [VESSEL HERO grade-N]     │  ← top 60%, ambient motes around
  //   │                             │
  //   │      Title italic           │  ← Cinzel italic 17-22px
  //   │      flavor copy            │  ← serif italic 12-13px
  //   │      [+ Bonus tag]          │  ← rare/epic colored tag
  //   │   ┌──────────────────────┐  │
  //   │   │ 30 ICHOR      $0.99  │  │  ← BUY button full-width
  //   │   └──────────────────────┘  │
  //   └─────────────────────────────┘
  //
  // Single composition for hero AND grid (hero just upscales). Drops the
  // pre-1.3.2 horizontal grid + chalice/mug/cauldron count×2 system —
  // grade-{1..6}.webp encode the quantity escalation in the asset itself.

  private buildPackCard(pack: PackDef, isHero: boolean): HTMLElement {
    const ftAvail = isFirstTimeAvailable(pack);
    const ichorTotal = pack.baseIchor + (ftAvail ? pack.firstTimeBonusIchor : 0);
    const grade = gradeForSku(pack.sku);

    const card = el(
      'button',
      `pack-card pack-card--${pack.tier} pack-card--${isHero ? 'hero' : 'grid'}`,
    ) as HTMLButtonElement;
    card.type = 'button';
    card.setAttribute('data-sku', pack.sku);
    card.dataset.grade = String(grade);

    // Ambient motes — pure CSS animated dots floating around the vessel.
    // Density scales by tier (bronze 3 / silver 5 / gold 7) per the
    // 1-2-4 particle density rule. Hero gets +2 extra motes.
    const moteCount =
      (pack.tier === 'bronze' ? 3 : pack.tier === 'silver' ? 5 : 7) +
      (isHero ? 2 : 0);
    const motes = el('div', 'pack-card__motes');
    for (let i = 0; i < moteCount; i += 1) {
      const mote = el('span', 'pack-card__mote');
      mote.style.setProperty('--m-x', `${10 + (i * 11) % 80}%`);
      mote.style.setProperty('--m-d', `${i * 600}ms`);
      mote.style.setProperty('--m-r', `${5500 + (i * 740) % 2200}ms`);
      motes.appendChild(mote);
    }
    card.appendChild(motes);

    // Aura backdrop — radial gradient sized to the vessel's silhouette.
    // Per-tier color shift baked here so a single PNG works across all
    // grades (the asset already carries its own godrays; this layer
    // adds the *card* atmosphere underneath).
    const aura = el('div', 'pack-card__aura');
    card.appendChild(aura);

    if (ftAvail) {
      const ribbon = el('div', 'pack-card__ribbon', '×2 FIRST TIME');
      card.appendChild(ribbon);
    }
    if (isHero) {
      const featuredTag = el('div', 'pack-card__featured', '★ FEATURED');
      card.appendChild(featuredTag);
    }

    // Vessel hero — full-bleed top of the card. Uses webp at 600px,
    // sized down via CSS per layout (grid ~180px, hero ~280px).
    const vesselWrap = el('div', 'pack-card__vessel');
    const vesselImg = el('img', 'pack-card__vessel-img') as HTMLImageElement;
    vesselImg.src = `/assets/ichor/grade-${grade}.webp`;
    vesselImg.alt = '';
    vesselImg.decoding = 'async';
    vesselImg.loading = 'lazy';
    vesselWrap.appendChild(vesselImg);
    card.appendChild(vesselWrap);

    // Body — title + desc + bonus tag, centered stack.
    const body = el('div', 'pack-card__body');
    body.appendChild(el('div', 'pack-card__title', pack.title));
    body.appendChild(el('div', 'pack-card__desc', pack.description));
    if (pack.bonus.kind === 'guaranteed_thrall') {
      const def = THRALLS_BY_ID[pack.bonus.thrallId];
      if (def) {
        body.appendChild(
          el(
            'div',
            `pack-card__bonus-tag pack-card__bonus-tag--${def.rarity}`,
            `+ ${def.name} (${def.rarity === 'epic' ? 'Epic' : 'Rare'}) guaranteed`,
          ),
        );
      }
    } else if (pack.bonus.kind === 'guaranteed_rare') {
      body.appendChild(
        el(
          'div',
          'pack-card__bonus-tag pack-card__bonus-tag--rare',
          '+ 1 Rare guaranteed',
        ),
      );
    }
    if (ftAvail && pack.firstTimeBonusIchor > 0) {
      body.appendChild(
        el(
          'div',
          'pack-card__ft-breakdown',
          `${pack.baseIchor} + ${pack.firstTimeBonusIchor} first-time bonus`,
        ),
      );
    }
    if (pack.triggered && isHero && ftAvail) {
      const armedAt = gameState.getWelcomeFirstRareAt();
      if (armedAt !== null) {
        const cutoff = armedAt + pack.triggered.featuredDays * 86400000;
        const remaining = formatRemaining(cutoff - Date.now());
        if (remaining) {
          body.appendChild(
            el(
              'div',
              'pack-card__ft-expiry',
              `First-time bonus ends in ${remaining}`,
            ),
          );
        }
      }
    }
    card.appendChild(body);

    // BUY button — full-width row at the bottom. Two-column inside:
    // left = "X ICHOR" reward, right = price. Visual contract reads
    // as "give me $X to get Y Ichor".
    const buy = el('div', 'pack-card__buy');
    const buyAmt = el('div', 'pack-card__buy-amt');
    buyAmt.appendChild(
      el('span', 'pack-card__buy-amt-num', String(ichorTotal)),
    );
    buyAmt.appendChild(el('span', 'pack-card__buy-amt-lbl', 'ICHOR'));
    buy.appendChild(buyAmt);
    buy.appendChild(
      el('div', 'pack-card__buy-price', formatPrice(pack.priceEur)),
    );
    card.appendChild(buy);

    // Tap juice — flash overlay that fires on click. CSS animation is
    // self-cleaning via animationend so we don't accumulate listeners.
    const flash = el('div', 'pack-card__flash');
    card.appendChild(flash);

    card.addEventListener('click', () => {
      flash.classList.remove('pack-card__flash--firing');
      // Force reflow so the animation restarts every tap.
      void flash.offsetWidth;
      flash.classList.add('pack-card__flash--firing');
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
 * Map a SKU to its vessel grade asset (1..6). Each grade is a bespoke
 * baroque composition with its own quantity escalation baked in:
 *   1 → solo flacon (entry $0.99)
 *   2 → ceremonial single bottle with crowned cap (Founder's $2.99)
 *   3 → trio of bottles centered (Substantial $4.99)
 *   4 → 5-bottle set, shared by Starter Coven + Greater ($9.99 tier)
 *   5 → 7-bottle royal arrangement (Royal $19.99)
 *   6 → tiered altar / cathedral fountain (Cataclysmic $49.99)
 *
 * SKU-keyed (not Ichor-keyed) so we can keep two SKUs at the same
 * price ($9.99 tier) sharing one asset without breaking the mapping.
 */
function gradeForSku(sku: string): 1 | 2 | 3 | 4 | 5 | 6 {
  switch (sku) {
    case 'vm_ichor_modest':
      return 1;
    case 'vm_founder_pact':
      return 2;
    case 'vm_ichor_substantial':
      return 3;
    case 'vm_starter_coven':
    case 'vm_ichor_major':
      return 4;
    case 'vm_ichor_royal':
      return 5;
    case 'vm_ichor_cataclysm':
      return 6;
    default:
      return 1;
  }
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
