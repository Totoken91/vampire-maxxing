// M1 — Dread Level milestones. Auto-granted bonus modifiers that
// unlock by Dread rank (no purchase, no currency). Replaces the
// "paid upgrade" pattern removed in M1 — 4 of the 5 old upgrades
// were made redundant by Phase L thralls (Velmor → auto-collect,
// Nox/Mirella → Blood gen %, Lilith/Crypt Warden → offline cap,
// dread_amplifier was dangerous vs. M2 form-gated cap), and
// Bloodline Scholar (the one unique effect) is ported here as a
// free tier unlock.

import { modifierRegistry } from './modifiers';
import { gameState } from './state';
import { events } from './events';

const SCHOLAR_SOURCE = 'milestone:bloodline_scholar';

/**
 * Dread Level thresholds that unlock each Scholar tier. Each tier
 * subtracts 0.01 from the servant cost multiplier (1.15 → 1.10 at
 * tier 5). Grandfathered v1.0.0 players who had levels in Scholar
 * get an equivalent tier via the save reclaim at migration time.
 */
export const SCHOLAR_THRESHOLDS = [10, 25, 50, 100, 200] as const;

/** Current Scholar tier (0 = locked, 5 = max) given a Dread Level. */
export function scholarTier(dreadLevel: number): number {
  let tier = 0;
  for (const threshold of SCHOLAR_THRESHOLDS) {
    if (dreadLevel >= threshold) tier += 1;
    else break;
  }
  return tier;
}

/**
 * Re-evaluate every milestone-driven modifier against current state.
 * Called on boot and on every `dread-changed` event. Idempotent.
 */
export function publishMilestoneModifiers(): void {
  modifierRegistry.unregister(SCHOLAR_SOURCE);
  const tier = scholarTier(gameState.getDread());
  if (tier > 0) {
    modifierRegistry.register(SCHOLAR_SOURCE, 'servantCost', 'add', -tier * 0.01);
  }
}

/**
 * Install the milestone system. Must run after state load and before
 * any rate/cost computation. Subscribes to dread-changed so every
 * ascend / daily gift refreshes the tier.
 */
export function installMilestones(): void {
  publishMilestoneModifiers();
  events.on('dread-changed', () => publishMilestoneModifiers());
}
