// Ichor — the pull currency (Phase L3, 2026-04-24).
//
// Plate currency used exclusively for Rite invocations (L5). Unlike
// Blood it does NOT scale with prestige; the player earns 5-7/day F2P
// actif at any point in the curve. Soft cap at 1000 prevents hoarding
// exploits when new sources land later (packs, battle pass, events).
//
// Transaction ledger tracks every earn/spend with source + earned-vs-
// paid flag (future-proofing for legal-compliant offers — "bonus on
// earned Ichor only" type features can inspect this cleanly).

import { events } from './events';
import { gameState } from './state';

/** All possible origins of an Ichor transaction. Extend here when a
 * new source ships (daily quest, ad placement, milestone, IAP pack,
 * …). Save-stable — do not rename. */
export type IchorSource =
  | 'tutorial_gift'
  | 'daily_login'
  | 'login_chain'
  | 'ad_offering'
  | 'milestone_prestige'
  | 'achievement_first_rare'
  | 'achievement_first_epic'
  | 'achievement_collection'
  | 'achievement_claim'
  | 'daily_quest'
  | 'event_reward'
  | 'iap_pack'
  | 'ritual_spent'
  | 'debug';

export interface IchorTransaction {
  /** Delta applied to ichor balance. Positive = earned, negative = spent. */
  readonly amount: number;
  readonly source: IchorSource;
  /** True when the delta came from play (not a paid IAP). Future
   * features may restrict bonuses to earned-only. */
  readonly earnedNotPaid: boolean;
  /** Epoch ms. */
  readonly ts: number;
}

/** Soft cap — the UI lets the player see they're at cap, and excess
 * grants are clipped (no negative feedback, no popup shouting "cap").
 * Deliberate ceiling: prevents hoarding between Ichor drops so each
 * drop keeps feeling worth something. */
export const ICHOR_SOFT_CAP = 1000;

/** Max number of transactions kept in the ledger. Old entries drop
 * off the head; analytics / future audits only need a rolling window
 * — long-term history would bloat saves pointlessly. */
const LEDGER_MAX = 100;

/**
 * Grant Ichor. Earned-Ichor sources clip at ICHOR_SOFT_CAP (anti-
 * hoarding ceiling so each F2P drop keeps feeling worth something).
 * Paid sources (IAP packs) BYPASS the cap entirely — clipping a
 * purchase would be theft from the player's wallet, full stop.
 *
 * Returns the amount actually credited. A clipped earned grant
 * returns 0 silently (no error popup; the balance UI shows the cap
 * state and the player can drain it before earning more).
 */
export function grantIchor(
  amount: number,
  source: IchorSource,
  opts: { earnedNotPaid?: boolean } = {},
): number {
  if (amount <= 0) return 0;
  const state = gameState.get() as unknown as {
    ichor: number;
    ichorLedger: IchorTransaction[];
  };

  // Sources that bypass the soft cap. IAP-paid Ichor (any pack)
  // must always credit fully — it's user-paid currency, the cap is
  // a F2P-economy guardrail not an upper limit on the wallet.
  const isPaidSource = source === 'iap_pack';
  const credited = isPaidSource
    ? amount
    : Math.min(amount, Math.max(0, ICHOR_SOFT_CAP - state.ichor));
  if (credited <= 0) return 0;

  state.ichor += credited;
  const earnedNotPaid = opts.earnedNotPaid ?? source !== 'iap_pack';
  state.ichorLedger.push({
    amount: credited,
    source,
    earnedNotPaid,
    ts: Date.now(),
  });
  if (state.ichorLedger.length > LEDGER_MAX) {
    state.ichorLedger.splice(0, state.ichorLedger.length - LEDGER_MAX);
  }

  events.emit('ichor-earned', { amount: credited, source, balance: state.ichor });
  events.emit('ichor-changed', { balance: state.ichor });
  return credited;
}

/**
 * Spend Ichor. Returns true if the balance had enough AND the spend
 * happened; false otherwise (caller should NOT apply the downstream
 * action on false). No ledger-cap concern for spends — a spend can
 * always fit since it removes entries implicitly.
 */
export function spendIchor(amount: number, source: IchorSource = 'ritual_spent'): boolean {
  if (amount <= 0) return false;
  const state = gameState.get() as unknown as {
    ichor: number;
    ichorLedger: IchorTransaction[];
  };
  if (state.ichor < amount) return false;

  state.ichor -= amount;
  state.ichorLedger.push({
    amount: -amount,
    source,
    earnedNotPaid: true, // spends don't distinguish origin
    ts: Date.now(),
  });
  if (state.ichorLedger.length > LEDGER_MAX) {
    state.ichorLedger.splice(0, state.ichorLedger.length - LEDGER_MAX);
  }

  events.emit('ichor-changed', { balance: state.ichor });
  return true;
}

/** Sum of lifetime earned (excludes spends, excludes paid IAP). Used
 * for future features that gate on earned-only progress. */
export function lifetimeEarnedIchor(): number {
  const state = gameState.get() as unknown as { ichorLedger: IchorTransaction[] };
  let total = 0;
  for (const tx of state.ichorLedger) {
    if (tx.amount > 0 && tx.earnedNotPaid) total += tx.amount;
  }
  return total;
}
