// L14 — Analytics events. Typed dispatcher with a local stub
// implementation for now. When Kenny picks a provider (Firebase
// Analytics, Adjust, Mixpanel, etc.) the swap is a single function
// — every call site is provider-neutral.
//
// Naming convention: snake_case event names, payload keys
// camelCase. Payload values are flat (no nested objects) so any
// provider can ingest without remapping.

import type { ThrallArchetype, ThrallRarity } from '../game/config/thralls';
import type { BannerId } from '../game/config/banners';

export interface AnalyticsEvents {
  /** Boot of any session. `resumed` distinguishes fresh first-launch
   *  from a returning save. */
  session_started: {
    resumed: boolean;
    ichor: number;
    thrallsOwned: number;
    totalAscends: number;
    daysSinceFirstLaunch: number;
  };

  /** A pull batch resolved. Payload aggregates the results so
   *  funnel analytics can read "out of N pulls, X were rare+, Y
   *  were dupes" without needing to ingest 10 individual rows. */
  pull_performed: {
    banner: BannerId;
    count: 1 | 10;
    rareCount: number;
    epicCount: number;
    dupeCount: number;
    cinderCount: number;
    frgFired: boolean;
    pityRareFired: boolean;
    pityEpicFired: boolean;
    bundleGuaranteeFired: boolean;
  };

  /** Ichor credit. Source maps to `IchorSource` (tutorial_gift,
   *  daily_login, ad_offering, etc.) so funnel can split by acq path. */
  ichor_earned: { source: string; amount: number; balance: number };

  /** Ichor debit (always 'ritual_spent' in v1.0; future packs/
   *  conversion may add new sources). */
  ichor_spent: { source: string; amount: number; balance: number };

  essence_gained: {
    rarity: ThrallRarity;
    amount: number;
    balance: number;
  };

  thrall_obtained: {
    id: string;
    rarity: ThrallRarity;
    archetype: ThrallArchetype;
  };

  thrall_awakened: { id: string; stars: number };

  thrall_equipped: {
    slot: number;
    prevId: string | null;
    nextId: string | null;
  };

  ascended: {
    form: string;
    century: number;
    formChanged: boolean;
    dread: number;
  };

  dread_changed: { level: number };

  rite_used: { id: string };

  daily_claimed: {
    day: number;
    blood: number;
    ichor: number;
    dread: number;
  };

  /** L9 — disclosure screen opened (legal trust signal). */
  rates_disclosure_viewed: Record<string, never>;

  /** L13 — age gate answered. */
  age_gate_answered: { confirmation: 'over13' | 'under13' };

  /** L13 — daily spending cap edited. value === null means cap
   *  removed. */
  spending_cap_set: { value: number | null };

  /** L10 — IAP purchase fulfilled (placeholder for the future
   *  Play Billing layer). */
  purchase_made: { productId: string; amountEur: number };

  /** L8 — tutorial milestones (gift granted, first pull, first
   *  equip). Helps measure FTUE drop-off. */
  tutorial_milestone: {
    step: 'tutorial_gift' | 'first_pull' | 'first_equip';
  };
}

type EventName = keyof AnalyticsEvents;

let providerSink: <K extends EventName>(
  event: K,
  payload: AnalyticsEvents[K],
) => void = () => undefined;

/** Provider hook — call this from a provider-specific module to
 *  forward every track() invocation to e.g. Firebase Analytics. */
export function setAnalyticsSink(
  sink: <K extends EventName>(event: K, payload: AnalyticsEvents[K]) => void,
): void {
  providerSink = sink;
}

/** Emit an analytics event. In dev, also `console.log`s for
 *  debugging. The provider sink fires for every environment. */
export function track<K extends EventName>(
  event: K,
  payload: AnalyticsEvents[K],
): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, payload);
  }
  try {
    providerSink(event, payload);
  } catch {
    // Analytics must NEVER break gameplay.
  }
}
