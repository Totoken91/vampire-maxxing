// Typed pub/sub event bus.
// Listeners subscribe with a key and receive the matching payload.

import type { ServantId } from './config/servants';
import type { VampireForm } from './config/forms';

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
  'tab-unlocked': { tab: 'bloodline' | 'servants' | 'rites' | 'tome' | 'shop' | 'sanctum' };
  'upgrade-bought': { id: string; level: number };
  'altar-claimed': { amount: number };
  'lore-unlocked': { kind: 'servant' | 'form'; id: string };
  /** K4 — totalRunBlood crossed a 10^N threshold (N >= 4, so 10K upward).
   * Fires once per crossing per run; reset on ascend. */
  'milestone-reached': { threshold: number; exponent: number };
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
