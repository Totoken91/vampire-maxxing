// Typed pub/sub event bus.
// Listeners subscribe with a key and receive the matching payload.

import type { ServantId } from './config/servants';
import type { ThrallId, ThrallRarity } from './config/thralls';
import type { VampireForm } from './config/forms';
import type { BannerId } from './config/banners';
import type { PullResult } from './ritual';

export interface GameEvents {
  'blood-changed': { blood: number; delta: number };
  'rate-changed': { totalRate: number };
  'servant-bought': { id: ServantId; owned: number };
  'form-changed': { form: VampireForm };
  /** Fires on every successful ascend, regardless of form change. Century
   * updates within the same form rely on this to re-render the title. */
  'ascended': { form: VampireForm; century: number; formChanged: boolean };
  'tick': { dt: number };
  'tapped': { x: number; y: number; crit: boolean; gain: number };
  'achievement-unlocked': { id: string };
  'tab-unlocked': { tab: 'bloodline' | 'sanctum' | 'rites' | 'tome' | 'shop' };
  'upgrade-bought': { id: string; level: number };
  'altar-claimed': { amount: number };
  'lore-unlocked': { kind: 'servant' | 'form'; id: string };
  /** K4 — totalRunBlood crossed a 10^N threshold (N >= 4, so 10K upward).
   * Fires once per crossing per run; reset on ascend. */
  'milestone-reached': { threshold: number; exponent: number };
  /** L2 — a thrall was acquired (welcome summon, milestone, pull…).
   * firstTime is true only on the initial unlock; re-grants (awaken
   * via duplicates) land with firstTime:false. */
  'thrall-obtained': { id: ThrallId; firstTime: boolean };
  /** M1 — Dread Level changed (ascend or daily gift). Drives the
   * milestone-modifiers refresh (Bloodline Scholar auto-tier). */
  'dread-changed': { level: number };
  /** L3 — Ichor granted (any source). Carries the amount credited
   * and the source tag so toasts can show the flavor line. */
  'ichor-earned': { amount: number; source: string; balance: number };
  /** L3 — Ichor balance moved (grant OR spend). Header counter
   * re-renders on this. */
  'ichor-changed': { balance: number };
  /** L5 — a single pull batch resolved. `results.length` is 1 or 10. */
  'ritual-pull-performed': { banner: BannerId; results: readonly PullResult[] };
  /** L5 — essence count moved (dupe conversion or future awakening
   * spend). Drives the L6 awakening screen + future toasts. */
  'essence-gained': { rarity: ThrallRarity; amount: number; balance: number };
  /** L6 — a thrall's star tier increased. Carries the new total
   * stars (0 = base 1★, 4 = max 5★ for C/R/E). */
  'thrall-awakened': { id: ThrallId; stars: number };
  /** L6 — equip slot mutation. `slot` is the index that changed;
   * `prevId` was kicked out (null if slot was empty), `nextId` was
   * placed in (null if the slot is being cleared). */
  'thrall-equipped': {
    slot: number;
    prevId: ThrallId | null;
    nextId: ThrallId | null;
  };
  /** L_QUESTS — a rite was just consumed (Offering, Curse, Frisson…).
   *  Carries the rite id so future analytics + the daily quest
   *  metric tracker can react. Fires from gameState.markRiteUsed(). */
  'rite-used': { id: string };
  /** L_QUESTS — daily quest target reached. Drives the "ready to
   * claim" UI state (breathing pulse on the CLAIM CTA, red dot on
   * the Tome tab). Fires once per quest completion. */
  'quest-completed': { id: string };
  /** L_QUESTS — player tapped CLAIM on the active quest. Carries
   * the granted Ichor amount (also visible via the ichor-earned
   * event with source='daily_quest'). */
  'quest-claimed': { id: string; ichor: number };
  /** L_QUESTS — player tapped CLAIM on an achievement card.
   * Drives the per-card claim animation + parabolic Ichor flight. */
  'achievement-claimed': { id: string; ichor: number };
  /** L10 — successful IAP pack purchase. Carries the SKU, EUR price,
   *  Ichor credited (after FT-Double if applicable), and whether this
   *  was the first-time purchase. Drives analytics + the post-purchase
   *  celebration modal in the Shop tab. */
  'pack-purchased': {
    sku: string;
    priceEur: number;
    ichorCredited: number;
    wasFirstTime: boolean;
  };
  /** L11 — Pacte Fondateur trigger window opened. Fires once per save
   *  when the player obtains their first Rare+ thrall. The Shop tab
   *  + an FTUE modal listen to this to surface the welcome pack at
   *  the right dopamine moment (post-Rare reveal). */
  'welcome-pack-armed': { sku: string; ts: number };
  /** L15 — A single user setting toggled. The carrier shape uses an
   *  unknown value type because each setting has a different value
   *  shape (boolean for sound/haptic/notif, string for lang). */
  'settings-changed': { key: string; value: unknown };
  /** V1.2-HF1 — Auto-ascend was paused for a one-shot reason (form
   *  bump). UI consumes this to surface a hint toast "Auto paused —
   *  tap ASCEND to embrace the new Form." */
  'auto-ascend-paused': { reason: 'form-bump' };
  /** V1.3 — Soul Shards balance moved (granted on Soulreave or spent
   *  on a meta-tree node). The meta-tree screen + counter listen to
   *  this for re-render. */
  'soul-shards-changed': { balance: number; delta: number };
  /** V1.3 — a Soulreave was performed. `index` is the count post-
   *  reave (1 on the very first Soulreave). Drives the cinematic
   *  title ("SOULREAVE I/II/III"), the FX engine, and the post-cine
   *  meta-tree reveal pulse. */
  'soulreaved': { index: number; soulShardsGained: number };
  /** V1.3 — a meta-tree node was purchased. Drives the node-owned
   *  state mutation in the UI + the "+1 perk" toast. */
  'meta-node-purchased': { id: string; cost: number };
}

type Listener<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

export class EventBus {
  private readonly listeners = new Map<keyof GameEvents, Set<Listener<keyof GameEvents>>>();

  on<K extends keyof GameEvents>(event: K, listener: Listener<K>): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener as Listener<keyof GameEvents>);
    this.listeners.set(event, set);
    return () => set.delete(listener as Listener<keyof GameEvents>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      (listener as Listener<K>)(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const events = new EventBus();
