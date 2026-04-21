// Upgrade state + modifier-registry glue. The data (what an upgrade does,
// how much it costs) lives in config/upgrades.ts. This module owns the
// mutation: buying, republishing modifiers, and running the Blood Altar
// auto-claim heartbeat.

import { modifierRegistry } from './modifiers';
import { events } from './events';
import { gameState } from './state';
import {
  UPGRADES,
  UPGRADES_BY_ID,
  altarClaimAmount,
  altarIntervalSec,
  nextCost,
  type UpgradeId,
} from './config/upgrades';

function modifierSource(id: UpgradeId): string {
  return `upgrade:${id}`;
}

/** Read current level (0 if untouched). */
export function getUpgradeLevel(id: UpgradeId): number {
  return gameState.getUpgradeLevel(id);
}

/** Cost of the next level, Infinity if maxed. */
export function getUpgradeNextCost(id: UpgradeId): number {
  return nextCost(UPGRADES_BY_ID[id], getUpgradeLevel(id));
}

export function canAffordUpgrade(id: UpgradeId): boolean {
  const cost = getUpgradeNextCost(id);
  return cost !== Infinity && gameState.getDread() >= cost;
}

/**
 * Publish the upgrade's current level as a modifier in the registry.
 * Called on load (for every owned level) and after every purchase.
 */
export function publishUpgradeModifier(id: UpgradeId): void {
  const def = UPGRADES_BY_ID[id];
  const level = getUpgradeLevel(id);
  const source = modifierSource(id);
  // Always unregister first so changing level is atomic.
  modifierRegistry.unregister(source);
  if (!def.effect || level <= 0) return;
  modifierRegistry.register(
    source,
    def.effect.target,
    def.effect.op,
    def.effect.valueAtLevel(level),
  );
}

/** Republish every upgrade modifier from current state. Used on load + wipe. */
export function republishAllUpgradeModifiers(): void {
  for (const def of UPGRADES) {
    publishUpgradeModifier(def.id);
  }
}

/**
 * Attempt to buy the next level of an upgrade. Returns true on success.
 * Emits 'upgrade-bought' so UI can re-render.
 */
export function buyUpgrade(id: UpgradeId): boolean {
  const def = UPGRADES_BY_ID[id];
  const level = getUpgradeLevel(id);
  if (level >= def.maxLevel) return false;
  const cost = def.costs[level];
  if (gameState.getDread() < cost) return false;

  gameState.spendDread(cost);
  gameState.setUpgradeLevel(id, level + 1);
  publishUpgradeModifier(id);

  events.emit('upgrade-bought', { id, level: level + 1 });
  events.emit('rate-changed', { totalRate: gameState.getTotalRate() });
  return true;
}

// ─────────── Blood Altar heartbeat ───────────

let altarElapsedSec = 0;

/** Install the per-tick driver that auto-claims from the Blood Altar. */
export function installAltarHeartbeat(): void {
  events.on('tick', ({ dt }) => {
    const level = getUpgradeLevel('blood_altar');
    if (level <= 0) {
      altarElapsedSec = 0;
      return;
    }
    altarElapsedSec += dt;
    const interval = altarIntervalSec(level);
    if (interval <= 0) return;
    if (altarElapsedSec >= interval) {
      altarElapsedSec -= interval;
      const amount = altarClaimAmount(level, gameState.getTotalRate());
      if (amount > 0) {
        gameState.applyOfflineGain(amount);
        events.emit('altar-claimed', { amount });
      }
    }
  });
}

/** Seconds remaining on the Altar's current cycle (0 if dormant). */
export function altarSecondsRemaining(): number {
  const level = getUpgradeLevel('blood_altar');
  if (level <= 0) return 0;
  const interval = altarIntervalSec(level);
  return Math.max(0, interval - altarElapsedSec);
}

export { UPGRADES, UPGRADES_BY_ID } from './config/upgrades';
export type { UpgradeDef, UpgradeId } from './config/upgrades';
