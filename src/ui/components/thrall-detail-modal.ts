// Phase L — thrall detail modal. Tap a card in the Sanctum grid to
// open this full-illustration view: portrait, lore, current bonus
// preview, star tier, and (when owned) EQUIP / AWAKEN actions.

import { el } from '../../utils/dom';
import {
  archetypeLabel,
  THRALLS_BY_ID,
  type BespokeMechanic,
  type Thrall,
  type ThrallArchetype,
  type ThrallEffect,
  type ThrallRarity,
} from '../../game/config/thralls';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import {
  awaken,
  canAwaken,
  effectivePrimary,
  effectiveValue,
  nextAwakenCost,
  starMultiplier,
} from '../../game/awakening';
import {
  EQUIP_SLOT_COUNT,
  STAR_MAX_PER_RARITY,
} from '../../game/config/awakening';
import { showToast } from './toast';

const EXIT_DURATION_MS = 260;

const RARITY_LABEL: Record<ThrallRarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

const EFFECT_LABEL: Record<ThrallEffect['type'], string> = {
  blood_gen: 'blood generation',
  offline_gain: 'offline gains',
  active_gain: 'active gains',
  tap_mult: 'tap power',
  hybrid: 'all sources',
};

function formatEffect(effect: ThrallEffect): string {
  const pct = Math.round((effect.value - 1) * 100);
  return `+${pct}% ${EFFECT_LABEL[effect.type]}`;
}

const ARCHETYPE_PLURAL: Record<ThrallArchetype, string> = {
  harvester: 'Harvesters',
  nocturne: 'Nocturnes',
  predator: 'Predators',
  hybrid: 'Hybrids',
};

/**
 * Render a bespoke mechanic as a user-facing stat line, star-
 * amplified for the current thrall. Returns null if the mechanic
 * has no meaningful display value (none currently).
 */
function formatBespoke(
  mechanic: BespokeMechanic,
  stars: number,
  rarity: ThrallRarity,
): string {
  const sm = starMultiplier(stars, rarity);
  switch (mechanic.kind) {
    case 'offline_cap_h': {
      const hours = mechanic.value * sm;
      const minutes = Math.round(hours * 60);
      return minutes >= 60
        ? `+${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)}h offline cap`
        : `+${minutes} min offline cap`;
    }
    case 'click_power_mult': {
      const pct = Math.round((mechanic.value - 1) * sm * 100);
      return `+${pct}% click power`;
    }
    case 'crit_damage': {
      const value = mechanic.value * sm;
      return `+${value.toFixed(2).replace(/\.?0+$/, '')}× crit damage`;
    }
    case 'per_ascend_blood': {
      const perAscendPct = Math.round(mechanic.value * 100);
      const capPct = Math.round(mechanic.cap * 100);
      const ascends = gameState.getPrestigeCount();
      const live = Math.min(mechanic.cap, mechanic.value * ascends);
      const livePct = Math.round(live * sm * 100);
      return `+${perAscendPct}% blood per ascend (cap +${capPct}%) — now +${livePct}%`;
    }
    case 'cross_archetype_blood': {
      const perPct = Math.round(mechanic.value * sm * 100);
      return `+${perPct}% blood per equipped ${ARCHETYPE_PLURAL[mechanic.per]}`;
    }
    case 'amplify_others_primary': {
      const pct = Math.round((mechanic.value - 1) * sm * 100);
      return `+${pct}% to other equipped thralls' primary`;
    }
    case 'offline_efficiency_floor': {
      const pct = Math.round(mechanic.value * 100);
      return `offline efficiency floor: ${pct}%`;
    }
    case 'echo_tap_chance': {
      const chance = Math.min(0.4, mechanic.value * sm);
      const pct = Math.round(chance * 100);
      return `${pct}% chance per tap of an echo strike`;
    }
  }
}

export function showThrallDetail(thrall: Thrall): void {
  if (document.querySelector('.thrall-detail__backdrop')) return;

  const backdrop = el('div', 'thrall-detail__backdrop');
  backdrop.dataset.rarity = thrall.rarity;
  const modal = el('div', 'thrall-detail');
  modal.dataset.rarity = thrall.rarity;

  const close = el('button', 'thrall-detail__close', '×');
  close.setAttribute('aria-label', 'Close');

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

  // Current bonus preview — stars-amplified for owned thralls,
  // base value for locked ones (so the "what you'd unlock" reads
  // correctly). The signature block underneath holds bespoke stat
  // lines + flavor caption — those are re-rendered on awaken /
  // equip changes since star scaling moves the numbers.
  const effectBox = el('div', 'thrall-detail__effect');
  effectBox.appendChild(el('div', 'thrall-detail__effect-label', 'gift of the pact'));
  const effectValue = el('div', 'thrall-detail__effect-value');
  effectBox.appendChild(effectValue);

  // Secondary line — Iron Maw's tap_mult, Gravebound's tap_mult, etc.
  const secondaryLine = el('div', 'thrall-detail__effect-secondary');
  effectBox.appendChild(secondaryLine);

  // Signature block — bespoke stat lines + flavor caption.
  let signatureBlock: HTMLElement | null = null;
  if (thrall.bespoke?.length || thrall.bespokeCaption) {
    signatureBlock = el('div', 'thrall-detail__signature');
    effectBox.appendChild(signatureBlock);
  }

  // Stars row + actions container (only meaningful when owned).
  const starsRow = el('div', 'thrall-detail__stars');
  const actions = el('div', 'thrall-detail__actions');

  modal.appendChild(close);
  modal.appendChild(portraitWrap);
  modal.appendChild(rarityBar);
  modal.appendChild(name);
  modal.appendChild(lore);
  modal.appendChild(effectBox);
  modal.appendChild(starsRow);
  modal.appendChild(actions);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // ── Dynamic re-render on state changes (awaken / equip / essence). ──
  const rerender = (): void => {
    const owned = gameState.isThrallOwned(thrall.id);
    const player = gameState.getPlayerThrall(thrall.id);
    const stars = player.stars;

    // Effect preview: amplified for owned, base for locked.
    const liveEffect = owned ? effectivePrimary(thrall) : thrall.primaryEffect;
    effectValue.textContent = formatEffect(liveEffect);

    // Secondary — same star scaling as primary if owned.
    secondaryLine.textContent = '';
    if (thrall.secondaryEffect) {
      const sec = owned
        ? {
            type: thrall.secondaryEffect.type,
            value: effectiveValue(thrall.secondaryEffect.value, stars, thrall.rarity),
          }
        : thrall.secondaryEffect;
      secondaryLine.textContent = formatEffect(sec);
    }

    // Signature block — repopulate with star-scaled bespoke values
    // so awakening live-updates the displayed numbers.
    if (signatureBlock) {
      signatureBlock.textContent = '';
      signatureBlock.appendChild(
        el('div', 'thrall-detail__effect-bespoke-label', '— signature —'),
      );
      const livestars = owned ? stars : 0;
      for (const m of thrall.bespoke ?? []) {
        const line = formatBespoke(m, livestars, thrall.rarity);
        signatureBlock.appendChild(
          el('div', 'thrall-detail__effect-bespoke-stat', line),
        );
      }
      if (thrall.bespokeCaption) {
        signatureBlock.appendChild(
          el(
            'div',
            'thrall-detail__effect-bespoke',
            thrall.bespokeCaption,
          ),
        );
      }
    }

    // Stars row.
    starsRow.textContent = '';
    if (owned) {
      const max = STAR_MAX_PER_RARITY[thrall.rarity];
      // stars stored 0..max-1 → display stars + 1 filled, rest empty.
      const filled = player.stars + 1;
      for (let i = 0; i < max; i += 1) {
        const star = el(
          'span',
          `thrall-detail__star${i < filled ? ' thrall-detail__star--on' : ''}`,
          '★',
        );
        starsRow.appendChild(star);
      }
    }

    // Action buttons.
    actions.textContent = '';
    if (!owned) {
      const hint = el(
        'div',
        'thrall-detail__hint',
        'sealed away — invoke the rite to bind',
      );
      actions.appendChild(hint);
      return;
    }

    // EQUIP / UNEQUIP — primary CTA.
    const equippedSlot = gameState.findEquippedSlot(thrall.id);
    if (equippedSlot >= 0) {
      const unequipBtn = el(
        'button',
        'thrall-detail__btn thrall-detail__btn--unequip',
      ) as HTMLButtonElement;
      unequipBtn.type = 'button';
      unequipBtn.innerHTML = `<span class="thrall-detail__btn-label">UNEQUIP</span><span class="thrall-detail__btn-sub">slot ${equippedSlot + 1} active</span>`;
      unequipBtn.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(6);
        gameState.unequipSlot(equippedSlot);
        showToast('UNBOUND', `${thrall.name} steps back into the night.`);
      });
      actions.appendChild(unequipBtn);
    } else {
      const equipBtn = el(
        'button',
        'thrall-detail__btn thrall-detail__btn--equip',
      ) as HTMLButtonElement;
      equipBtn.type = 'button';
      equipBtn.innerHTML = `<span class="thrall-detail__btn-label">EQUIP</span><span class="thrall-detail__btn-sub">bind to a slot</span>`;
      equipBtn.addEventListener('click', () => {
        if (navigator.vibrate) navigator.vibrate(6);
        promptEquipSlot(thrall);
      });
      actions.appendChild(equipBtn);
    }

    // AWAKEN — secondary CTA. Hidden when maxed.
    const cost = nextAwakenCost(thrall.id);
    if (cost) {
      const can = canAwaken(thrall.id);
      const nextValue = effectiveValue(
        thrall.primaryEffect.value,
        player.stars + 1,
        thrall.rarity,
      );
      const nextPct = Math.round((nextValue - 1) * 100);
      const awakenBtn = el(
        'button',
        'thrall-detail__btn thrall-detail__btn--awaken',
      ) as HTMLButtonElement;
      awakenBtn.type = 'button';
      awakenBtn.disabled = !can;
      awakenBtn.innerHTML = `
        <span class="thrall-detail__btn-label">AWAKEN ★</span>
        <span class="thrall-detail__btn-sub">→ +${nextPct}% &middot; ${cost.amount} ${cost.rarity} ${cost.amount > 1 ? 'essences' : 'essence'} (have ${gameState.getEssence(cost.rarity)})</span>
      `;
      awakenBtn.addEventListener('click', () => {
        if (!canAwaken(thrall.id)) {
          showToast(
            'NOT ENOUGH',
            `${cost.amount} ${cost.rarity} essence${cost.amount > 1 ? 's' : ''} required.`,
          );
          return;
        }
        if (navigator.vibrate) navigator.vibrate([10, 40, 12]);
        if (awaken(thrall.id)) {
          showToast(
            'AWAKENED',
            `${thrall.name} burns brighter.`,
          );
          // Star pulse animation on the row.
          starsRow.classList.remove('thrall-detail__stars--pulse');
          void starsRow.offsetWidth;
          starsRow.classList.add('thrall-detail__stars--pulse');
        }
      });
      actions.appendChild(awakenBtn);
    } else {
      // Maxed — proud caption.
      const maxed = el(
        'div',
        'thrall-detail__hint thrall-detail__hint--maxed',
        'fully awakened — the pact is whole',
      );
      actions.appendChild(maxed);
    }
  };

  rerender();

  // Live updates while modal is open: equip changes, awakenings,
  // essence balance shifts (player might convert in another modal),
  // thrall obtained.
  const offEquip = events.on('thrall-equipped', rerender);
  const offAwaken = events.on('thrall-awakened', rerender);
  const offEssence = events.on('essence-gained', rerender);
  const offObtain = events.on('thrall-obtained', rerender);

  let dismissed = false;
  const dismiss = (): void => {
    if (dismissed) return;
    dismissed = true;
    offEquip();
    offAwaken();
    offEssence();
    offObtain();
    backdrop.classList.add('thrall-detail__backdrop--exit');
    window.setTimeout(() => backdrop.remove(), EXIT_DURATION_MS);
  };

  close.addEventListener('click', dismiss);
  backdrop.addEventListener('click', dismiss);
  modal.addEventListener('click', (e) => e.stopPropagation());
}

/**
 * Prompt the player to pick an equip slot. If a slot is empty, fill
 * the first one immediately (no friction). Otherwise show a small
 * inline picker over the modal so the player chooses which existing
 * thrall to displace.
 */
function promptEquipSlot(thrall: Thrall): void {
  const slots = gameState.getEquippedSlots();
  const firstEmpty = slots.indexOf(null);
  if (firstEmpty !== -1) {
    gameState.equipThrall(firstEmpty, thrall.id);
    showToast('BOUND', `${thrall.name} answers your call.`);
    return;
  }

  // All slots full — overlay a chooser.
  const overlay = el('div', 'equip-picker__backdrop');
  const panel = el('div', 'equip-picker');
  panel.appendChild(
    el('div', 'equip-picker__title', 'CHOOSE A SLOT TO REPLACE'),
  );
  panel.appendChild(
    el(
      'div',
      'equip-picker__sub',
      `${thrall.name} will displace whoever you pick.`,
    ),
  );
  const row = el('div', 'equip-picker__row');
  for (let i = 0; i < EQUIP_SLOT_COUNT; i += 1) {
    const occupantId = slots[i];
    const occupant = occupantId ? THRALLS_BY_ID[occupantId] : null;
    const slot = el('button', 'equip-picker__slot') as HTMLButtonElement;
    slot.type = 'button';
    slot.dataset.rarity = occupant?.rarity ?? 'common';
    if (occupant) {
      const occImg = el('img', 'equip-picker__slot-img') as HTMLImageElement;
      occImg.src = occupant.portraitPath;
      occImg.alt = occupant.name;
      occImg.decoding = 'async';
      slot.appendChild(occImg);
      slot.appendChild(
        el('div', 'equip-picker__slot-name', occupant.name),
      );
    }
    slot.appendChild(el('div', 'equip-picker__slot-num', `slot ${i + 1}`));
    slot.addEventListener('click', (e) => {
      e.stopPropagation();
      gameState.equipThrall(i, thrall.id);
      showToast('BOUND', `${thrall.name} takes the place of the bound.`);
      overlay.remove();
    });
    row.appendChild(slot);
  }
  panel.appendChild(row);

  const cancel = el(
    'button',
    'equip-picker__cancel',
    'CANCEL',
  ) as HTMLButtonElement;
  cancel.type = 'button';
  cancel.addEventListener('click', () => overlay.remove());
  panel.appendChild(cancel);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', () => overlay.remove());
  panel.addEventListener('click', (e) => e.stopPropagation());
}
