// L9 — Rates Disclosure Screen.
//
// Required by Korean Game Industry Promotion Act (March 2024) and
// EU best practice (DSA / UCPD). Lists every rate, every pity, every
// guarantee, and the methodology. Accessible in ≤2 taps from the
// Rituals screen footer.
//
// Pulls all values from the live config — never hardcode here.
// If a balance tweak ships, this screen reflects it automatically.

import { el } from '../../utils/dom';
import { BANNER_LIST, BANNERS } from '../../game/config/banners';
import {
  DUPLICATE_PROTECTION_REROLL,
  ESSENCE_PER_DUPE,
  FEATURED_RATES,
  FEATURED_RATE_UP_SHARE,
  PITY,
  RITUAL_COST_BUNDLE_10,
  RITUAL_COST_SINGLE,
  STANDARD_RATES,
} from '../../game/config/ritual-rates';
import { THRALLS, THRALLS_BY_ID } from '../../game/config/thralls';
import { PACKS } from '../../game/config/packs';
import { track } from '../../analytics/events';

const EXIT_DURATION_MS = 240;

function pct(value: number, fractionDigits = 0): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function showDisclosureScreen(): void {
  if (document.querySelector('.disclosure-screen__backdrop')) return;
  track('rates_disclosure_viewed', {});

  const backdrop = el('div', 'disclosure-screen__backdrop');
  const screen = el('div', 'disclosure-screen');

  const close = el('button', 'disclosure-screen__close', '×');
  close.setAttribute('aria-label', 'Close');

  const title = el(
    'div',
    'disclosure-screen__title',
    '— DISCLOSURE OF RATES —',
  );
  const sub = el(
    'div',
    'disclosure-screen__sub',
    'every chance, openly stated',
  );

  screen.appendChild(close);
  screen.appendChild(title);
  screen.appendChild(sub);

  // ── Per-banner sections ───────────────────────────────────────
  for (const banner of BANNER_LIST) {
    const section = el('section', 'disclosure-screen__section');
    section.dataset.banner = banner.id;

    const head = el('div', 'disclosure-screen__section-head');
    head.appendChild(
      el('div', 'disclosure-screen__section-name', banner.name),
    );
    head.appendChild(
      el(
        'div',
        'disclosure-screen__section-tag',
        `· ${banner.subtitle}`,
      ),
    );
    section.appendChild(head);

    const rates =
      banner.id === 'featured' ? FEATURED_RATES : STANDARD_RATES;

    // Cost line.
    const cost = el('dl', 'disclosure-screen__rates');
    appendRow(cost, 'Cost — single pull', `${RITUAL_COST_SINGLE} ichor`);
    appendRow(
      cost,
      'Cost — bundle of 10',
      `${RITUAL_COST_BUNDLE_10} ichor (saves ${RITUAL_COST_SINGLE * 10 - RITUAL_COST_BUNDLE_10})`,
    );
    section.appendChild(cost);

    section.appendChild(
      el('div', 'disclosure-screen__divider', '— PER-RARITY ODDS —'),
    );

    const list = el('dl', 'disclosure-screen__rates');
    appendRow(list, 'Common', pct(rates.common, 1));
    if (banner.id === 'featured') {
      appendRow(
        list,
        'Rare',
        `${pct(rates.rare)} (${pct(FEATURED_RATE_UP_SHARE.rare)} of Rares route to rate-up)`,
      );
      appendRow(
        list,
        'Epic',
        `${pct(rates.epic)} (${pct(FEATURED_RATE_UP_SHARE.epic)} of Epics route to rate-up)`,
      );
      appendRow(
        list,
        'Legendary',
        `${pct(rates.legendary, 2)} (${pct(FEATURED_RATE_UP_SHARE.legendary)} of Legendaries route to rate-up; soft pity ramp from pull ${PITY.legendarySoftStart})`,
      );
    } else {
      appendRow(list, 'Rare', pct(rates.rare));
      appendRow(list, 'Epic', pct(rates.epic));
      appendRow(list, 'Legendary', pct(rates.legendary, 2));
    }
    section.appendChild(list);

    // Featured rate-up roster.
    if (banner.id === 'featured' && banner.featuredIds.length > 0) {
      const rateUpNames = banner.featuredIds
        .map((id) => THRALLS_BY_ID[id].name)
        .join(' · ');
      section.appendChild(
        el(
          'div',
          'disclosure-screen__rate-up',
          `Rate-up roster: ${rateUpNames}`,
        ),
      );
    }

    section.appendChild(
      el('div', 'disclosure-screen__divider', '— GUARANTEES —'),
    );

    const guars = el('dl', 'disclosure-screen__rates');
    if (banner.id === 'featured') {
      appendRow(guars, 'Rare pity', `every ${PITY.featuredRare} pulls`);
      appendRow(guars, 'Epic pity', `every ${PITY.featuredEpic} pulls`);
    } else {
      appendRow(guars, 'Rare pity', `every ${PITY.standardRare} pulls`);
    }
    appendRow(
      guars,
      'Legendary pity',
      `hard at ${PITY.legendary} pulls (soft ramp from pull ${PITY.legendarySoftStart}, +${pct(PITY.legendarySoftRamp)} per pull)`,
    );
    appendRow(guars, 'Anti-streak', `${PITY.antiStreakCommons} commons → next pull is Rare+`);
    appendRow(guars, '10-pull bundle', '≥1 Rare+ guaranteed');
    section.appendChild(guars);

    screen.appendChild(section);
  }

  // ── Universal protections ────────────────────────────────────
  const universal = el('section', 'disclosure-screen__section');
  universal.appendChild(
    el(
      'div',
      'disclosure-screen__section-head',
      'UNIVERSAL PROTECTIONS',
    ),
  );

  const u = el('dl', 'disclosure-screen__rates');
  appendRow(
    u,
    'First lifetime pull',
    'always Rare (First Rare Guarantee)',
  );
  appendRow(
    u,
    'Duplicate protection',
    `${pct(DUPLICATE_PROTECTION_REROLL)} chance to silently reroll a duplicate into an unowned thrall of the same rarity (when one exists)`,
  );
  appendRow(
    u,
    'Saturation outcome',
    'when every thrall reachable through the cascade is owned, the pull resolves as a Cinder Ceremony — same essence reward, no portrait spam',
  );
  universal.appendChild(u);
  screen.appendChild(universal);

  // ── Essence rewards on dupes ─────────────────────────────────
  const essences = el('section', 'disclosure-screen__section');
  essences.appendChild(
    el(
      'div',
      'disclosure-screen__section-head',
      'DUPLICATE → ESSENCE',
    ),
  );
  const e = el('dl', 'disclosure-screen__rates');
  appendRow(e, 'Common dupe', `${ESSENCE_PER_DUPE.common} common essence`);
  appendRow(e, 'Rare dupe', `${ESSENCE_PER_DUPE.rare} rare essences`);
  appendRow(e, 'Epic dupe', `${ESSENCE_PER_DUPE.epic} epic essences`);
  appendRow(
    e,
    'Downward conversion',
    '1 epic essence → 3 rare essences → 9 common essences (no upward conversion permitted)',
  );
  essences.appendChild(e);
  screen.appendChild(essences);

  // ── Pack contents (L10/L11 IAP) ──────────────────────────────
  // Korean Game Industry Promotion Act (March 2024) requires pack
  // contents to be fully disclosed when any element is randomized.
  // Starter Coven's "1 Rare guaranteed" picks uniformly among the
  // un-owned Rares — that's a random distribution and must be listed.
  const packs = el('section', 'disclosure-screen__section');
  packs.appendChild(
    el('div', 'disclosure-screen__section-head', 'PACK CONTENTS'),
  );
  const rareNames = THRALLS.filter((t) => t.rarity === 'rare')
    .map((t) => t.name)
    .join(' · ');
  const packList = el('dl', 'disclosure-screen__rates');
  for (const pack of PACKS) {
    let value: string;
    switch (pack.bonus.kind) {
      case 'guaranteed_thrall': {
        const def = THRALLS_BY_ID[pack.bonus.thrallId];
        value =
          `${pack.baseIchor} ichor + ${def.name} (${def.rarity}) guaranteed` +
          (pack.firstTimeBonusIchor > 0
            ? ` · first-time bonus +${pack.firstTimeBonusIchor} ichor`
            : '');
        break;
      }
      case 'guaranteed_rare': {
        value =
          `${pack.baseIchor} ichor + 1 Rare guaranteed (uniform among un-owned: ${rareNames})` +
          (pack.firstTimeBonusIchor > 0
            ? ` · first-time bonus +${pack.firstTimeBonusIchor} ichor`
            : '');
        break;
      }
      case 'none': {
        value =
          `${pack.baseIchor} ichor` +
          (pack.firstTimeBonusIchor > 0
            ? ` · first-time bonus +${pack.firstTimeBonusIchor} ichor`
            : '');
        break;
      }
    }
    appendRow(packList, `${pack.title} ($${pack.priceEur.toFixed(2)})`, value);
  }
  packs.appendChild(packList);
  packs.appendChild(
    el(
      'div',
      'disclosure-screen__methodology',
      [
        'First-time bonuses apply only to the first purchase of each SKU. Subsequent purchases credit the base contents alone.',
        '',
        'Pacte Fondateur enters the Featured slot once the player obtains their first Rare-or-better thrall, and remains accessible afterward at the base price (without the first-time bonus once consumed).',
      ].join('\n'),
    ),
  );
  screen.appendChild(packs);

  // ── Methodology ───────────────────────────────────────────────
  const method = el('section', 'disclosure-screen__section');
  method.appendChild(
    el('div', 'disclosure-screen__section-head', 'METHODOLOGY'),
  );
  const methodText = el(
    'div',
    'disclosure-screen__methodology',
    [
      'Each pull rolls independently against the rates listed above. Pity counters and the anti-streak softener track totals across pulls and are visible in the Rituals screen at all times.',
      '',
      'When a pity threshold is reached, the next pull is forced to the corresponding rarity tier. Once triggered, the relevant counter resets to zero.',
      '',
      'Pool dynamic: when every thrall of a rarity is owned, that rarity\'s rolls cascade upward to find an unowned thrall. If the cascade exhausts (every reachable rarity is fully owned), the pull resolves as a Cinder Ceremony — the rolled rarity is preserved and the player receives the matching essence directly.',
      '',
      'Pulls obtained through essence conversion (downward) do not roll on these rates and do not advance pity counters. Awakening progress depends solely on essence accumulation.',
    ].join('\n'),
  );
  method.appendChild(methodText);
  screen.appendChild(method);

  // Footer disclaimer.
  screen.appendChild(
    el(
      'div',
      'disclosure-screen__foot',
      'last updated with the live banner config · changes ship with each balance patch',
    ),
  );

  backdrop.appendChild(screen);
  document.body.appendChild(backdrop);

  let dismissed = false;
  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    backdrop.classList.add('disclosure-screen__backdrop--exit');
    window.setTimeout(() => backdrop.remove(), EXIT_DURATION_MS);
  };

  close.addEventListener('click', dismiss);
  backdrop.addEventListener('click', dismiss);
  screen.addEventListener('click', (e) => e.stopPropagation());
}

function appendRow(
  list: HTMLElement,
  label: string,
  value: string,
): void {
  const row = el('div', 'disclosure-screen__row');
  row.appendChild(el('dt', 'disclosure-screen__row-label', label));
  row.appendChild(el('dd', 'disclosure-screen__row-value', value));
  list.appendChild(row);
}

// `BANNERS` import used only to ensure the lookup map stays referenced
// even if BANNER_LIST changes shape later — defensive.
void BANNERS;
