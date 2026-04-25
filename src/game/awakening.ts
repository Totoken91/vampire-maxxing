// L6 — Awakening engine. Spend essences to bump a thrall's star tier,
// recompute its effective bonus, and reflect into the modifier
// registry when that thrall is equipped.
//
// "Star multiplier on the bonus PERCENTAGE" — concretely:
//   effective = 1 + (base - 1) * starMultiplier
// So Iron Maw with base 1.06 (+6%) at 5★ (×2.0) becomes 1.12 (+12%).
// We never multiply the raw multiplier — that would compound rare
// thralls into runaway numbers.
//
// Equipping is the gate for bonus application: only thralls in active
// slots register modifiers. Awakening an equipped thrall re-publishes
// its modifier with the new value; awakening a benched thrall just
// updates state for later.

import { events } from './events';
import { gameState } from './state';
import { modifierRegistry, type ModifierTarget } from './modifiers';
import {
  AWAKEN_COST_PER_RARITY,
  DOWNWARD_CONVERSION_RATE,
  STAR_MAX_PER_RARITY,
  STAR_MULTIPLIERS_PER_RARITY,
} from './config/awakening';
import {
  THRALLS_BY_ID,
  type BespokeMechanic,
  type Thrall,
  type ThrallEffect,
  type ThrallId,
  type ThrallRarity,
} from './config/thralls';

// ─────────── Star math ───────────

/** Multiplier on the thrall's bonus % at the current star tier.
 *  Returns 1.0 for an un-awakened thrall. */
export function starMultiplier(stars: number, rarity: ThrallRarity): number {
  const table = STAR_MULTIPLIERS_PER_RARITY[rarity];
  const idx = Math.max(0, Math.min(stars, table.length - 1));
  return table[idx];
}

/** Apply the star multiplier to a base ThrallEffect, returning the
 *  amplified `value`. Type stays the same. */
export function effectiveValue(base: number, stars: number, rarity: ThrallRarity): number {
  // Multiply the BONUS % rather than the raw value so additive bonuses
  // scale linearly with stars while neutral (1.0) stays neutral.
  return 1 + (base - 1) * starMultiplier(stars, rarity);
}

/** Effective primary effect for an owned thrall at its current star
 *  tier. Returns null if the thrall isn't owned (no contribution). */
export function effectivePrimary(thrall: Thrall): ThrallEffect {
  const stars = gameState.getPlayerThrall(thrall.id).stars;
  return {
    type: thrall.primaryEffect.type,
    value: effectiveValue(thrall.primaryEffect.value, stars, thrall.rarity),
  };
}

export function effectiveSecondary(thrall: Thrall): ThrallEffect | null {
  if (!thrall.secondaryEffect) return null;
  const stars = gameState.getPlayerThrall(thrall.id).stars;
  return {
    type: thrall.secondaryEffect.type,
    value: effectiveValue(thrall.secondaryEffect.value, stars, thrall.rarity),
  };
}

// ─────────── Awakening flow ───────────

/** Cost of the next awakening step, or null if maxed. */
export function nextAwakenCost(thrallId: ThrallId): {
  amount: number;
  rarity: ThrallRarity;
} | null {
  const t = THRALLS_BY_ID[thrallId];
  const stars = gameState.getPlayerThrall(thrallId).stars;
  const max = STAR_MAX_PER_RARITY[t.rarity];
  // stars index: 0 = base 1★. Max display stars = max. Last awaken
  // index = max - 1 (which jumps to max). So awakenable while stars < max - 1.
  if (stars >= max - 1) return null;
  const cost = AWAKEN_COST_PER_RARITY[t.rarity][stars];
  return { amount: cost, rarity: t.rarity };
}

export function canAwaken(thrallId: ThrallId): boolean {
  if (!gameState.isThrallOwned(thrallId)) return false;
  const cost = nextAwakenCost(thrallId);
  if (!cost) return false;
  return gameState.getEssence(cost.rarity) >= cost.amount;
}

/** Spend essences and bump the thrall's star tier. Re-publishes the
 *  thrall's modifiers if it's currently equipped. Returns true on
 *  success. */
export function awaken(thrallId: ThrallId): boolean {
  if (!canAwaken(thrallId)) return false;
  const cost = nextAwakenCost(thrallId)!;
  if (!gameState.spendEssence(cost.rarity, cost.amount)) return false;
  gameState.bumpThrallStars(thrallId);
  if (gameState.isThrallEquipped(thrallId)) {
    publishThrallModifiers(thrallId);
  }
  events.emit('thrall-awakened', {
    id: thrallId,
    stars: gameState.getPlayerThrall(thrallId).stars,
  });
  return true;
}

// ─────────── Downward essence conversion ───────────

/** Convert N essences from `from` to `from`-tier-below at the
 *  configured 1:N rate. Upward conversion is rejected. */
export function convertEssence(
  from: ThrallRarity,
  amount: number,
): boolean {
  if (amount <= 0) return false;
  const target = downwardTarget(from);
  if (!target) return false;
  if (gameState.getEssence(from) < amount) return false;
  if (!gameState.spendEssence(from, amount)) return false;
  gameState.grantEssence(target, amount * DOWNWARD_CONVERSION_RATE);
  return true;
}

function downwardTarget(from: ThrallRarity): ThrallRarity | null {
  switch (from) {
    case 'legendary':
      return 'epic';
    case 'epic':
      return 'rare';
    case 'rare':
      return 'common';
    case 'common':
      return null;
  }
}

// ─────────── Equip wiring ───────────

/** Map a thrall effect type to the modifierRegistry target it boosts.
 *  v1.0 keeps the mapping flat (active_gain folds into servantRate
 *  since the game doesn't differentiate active vs passive idle). */
function targetFor(effectType: ThrallEffect['type']): ModifierTarget | null {
  switch (effectType) {
    case 'blood_gen':
    case 'active_gain':
      return 'servantRate';
    case 'tap_mult':
      return 'clickPower';
    case 'hybrid':
      return 'globalMult';
    case 'offline_gain':
      // Offline gains are computed in computeOfflineReport; the
      // modifier flows through 'servantRate' there too — no separate
      // target needed in v1.0. Future split: dedicated 'offlineRate'.
      return 'servantRate';
  }
}

const SOURCE_PREFIX = 'thrall:';

/**
 * Multiplier amplification factor from a co-equipped Ashen Vale (the
 * `amplify_others_primary` mechanic). Returns 1 if Ashen isn't
 * equipped, the thrall asking IS Ashen herself, or no amp mechanic
 * is configured. Star-amplified (Ashen at ★5 amplifies more).
 */
function ashenAmplifyFactor(askingThrallId: ThrallId): number {
  if (askingThrallId === 'ashen-vale') return 1;
  if (!gameState.isThrallEquipped('ashen-vale')) return 1;
  const ashen = THRALLS_BY_ID['ashen-vale'];
  const amp = (ashen.bespoke ?? []).find(
    (m) => m.kind === 'amplify_others_primary',
  );
  if (!amp) return 1;
  // amp.value is the bonus multiplier (1.15 = +15%). Star-scale via
  // the same effectiveValue formula so awakening Ashen lifts the
  // amp linearly — 1.15 base, ~1.375 at ★5 rare.
  const ashenStars = gameState.getPlayerThrall('ashen-vale').stars;
  return effectiveValue(amp.value, ashenStars, ashen.rarity);
}

/** Register the active multipliers from one equipped thrall (its
 *  primary + secondary effect + bespoke mechanics, all star-
 *  amplified). Idempotent — re-call after awakening / equip changes
 *  to refresh values. */
export function publishThrallModifiers(thrallId: ThrallId): void {
  const thrall = THRALLS_BY_ID[thrallId];
  const source = SOURCE_PREFIX + thrallId;
  // Wipe old entries first so re-publishing after an awaken doesn't
  // double up.
  modifierRegistry.unregister(source);

  // ── Primary + secondary effects ──
  const ampFactor = ashenAmplifyFactor(thrallId);
  const primary = effectivePrimary(thrall);
  const tgtP = targetFor(primary.type);
  if (tgtP) {
    // amplify_others_primary multiplies the BONUS percentage so the
    // base 1.0 stays neutral. value = 1 + (orig - 1) * ampFactor.
    const ampedValue =
      ampFactor === 1 ? primary.value : 1 + (primary.value - 1) * ampFactor;
    modifierRegistry.register(source, tgtP, 'mult', ampedValue);
  }
  const secondary = effectiveSecondary(thrall);
  if (secondary) {
    const tgtS = targetFor(secondary.type);
    if (tgtS) {
      const ampedSec =
        ampFactor === 1 ? secondary.value : 1 + (secondary.value - 1) * ampFactor;
      // Sub-key so primary + secondary on the same target don't
      // collapse into one entry.
      modifierRegistry.register(source + ':sec', tgtS, 'mult', ampedSec);
    }
  }

  // ── Bespoke mechanics ──
  // Each kind has its own publication logic. Static ones land
  // directly on the modifier registry; dynamic ones (per-ascend,
  // cross-archetype) recompute their value here from current state.
  const stars = gameState.getPlayerThrall(thrallId).stars;
  for (const mechanic of thrall.bespoke ?? []) {
    publishBespoke(thrall, mechanic, stars, source);
  }
}

function publishBespoke(
  thrall: Thrall,
  mechanic: BespokeMechanic,
  stars: number,
  source: string,
): void {
  switch (mechanic.kind) {
    case 'offline_cap_h': {
      // Star-amplified additive hours on offline cap.
      const value = mechanic.value * starMultiplier(stars, thrall.rarity);
      modifierRegistry.register(source + ':bespoke', 'offlineCap', 'add', value);
      return;
    }
    case 'click_power_mult': {
      // Star-amplifies the BONUS percentage on the click_power mult.
      const value = effectiveValue(mechanic.value, stars, thrall.rarity);
      modifierRegistry.register(source + ':bespoke', 'clickPower', 'mult', value);
      return;
    }
    case 'crit_damage': {
      // Additive on crit damage — value scales linearly with stars.
      const value = mechanic.value * starMultiplier(stars, thrall.rarity);
      modifierRegistry.register(source + ':bespoke', 'critDamage', 'add', value);
      return;
    }
    case 'offline_efficiency_floor': {
      // Floor is selected via max(default, this) at compute time.
      // We register as additive but the consumer uses it as a clamp.
      modifierRegistry.register(
        source + ':bespoke',
        'offlineEfficiencyFloor',
        'add',
        mechanic.value,
      );
      return;
    }
    case 'echo_tap_chance': {
      // Star-scales linearly. Cap at sensible 0.4 so a fully awakened
      // stack of multiple echo thralls (future) doesn't fire half the
      // time.
      const value = Math.min(
        0.4,
        mechanic.value * starMultiplier(stars, thrall.rarity),
      );
      modifierRegistry.register(
        source + ':bespoke',
        'echoTapChance',
        'add',
        value,
      );
      return;
    }
    case 'per_ascend_blood': {
      // value % per ascend, capped. Recomputed on every ascend via
      // awakening-install hook so the modifier value tracks live.
      const ascends = gameState.getPrestigeCount();
      const raw = mechanic.value * ascends;
      const capped = Math.min(mechanic.cap, raw);
      const starScaled = capped * starMultiplier(stars, thrall.rarity);
      // Apply as a multiplier on servantRate: 1 + scaledBonus.
      modifierRegistry.register(
        source + ':bespoke',
        'servantRate',
        'mult',
        1 + starScaled,
      );
      return;
    }
    case 'cross_archetype_blood': {
      // +N% per equipped thrall of `per` archetype (excl. self).
      const slots = gameState.getEquippedSlots();
      let count = 0;
      for (const id of slots) {
        if (!id || id === thrall.id) continue;
        if (THRALLS_BY_ID[id].archetype === mechanic.per) count += 1;
      }
      const bonus = mechanic.value * count;
      const starScaled = bonus * starMultiplier(stars, thrall.rarity);
      modifierRegistry.register(
        source + ':bespoke',
        'servantRate',
        'mult',
        1 + starScaled,
      );
      return;
    }
    case 'amplify_others_primary': {
      // No direct registration — the amp is read by ashenAmplifyFactor()
      // at the moment OTHER thralls publish their primary modifier.
      // This case is a placeholder so the switch is exhaustive.
      return;
    }
  }
}

export function withdrawThrallModifiers(thrallId: ThrallId): void {
  const source = SOURCE_PREFIX + thrallId;
  modifierRegistry.unregister(source);
  modifierRegistry.unregister(source + ':sec');
  modifierRegistry.unregister(source + ':bespoke');
}

/** Republish modifiers for every currently equipped thrall (except
 *  the optional `excludeId`). Used when something global changes —
 *  Ashen Vale equip, a per-ascend tick, an awakening that affects
 *  cross-archetype counts on equipped buddies. */
export function republishAllEquipped(excludeId?: ThrallId): void {
  for (const id of gameState.getEquippedSlots()) {
    if (id && id !== excludeId) publishThrallModifiers(id);
  }
}

/** Re-publish modifiers for every currently equipped thrall. Called
 *  on save load so the registry matches state without manual fix-up. */
export function rehydrateEquippedModifiers(): void {
  const slots = gameState.getEquippedSlots();
  for (const id of slots) {
    if (id) publishThrallModifiers(id);
  }
}
