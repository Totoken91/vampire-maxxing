// Typed pub/sub event bus.
// Listeners subscribe with a key and receive the matching payload.

import type { ThrallId } from './config/thralls';
import type { VampireForm } from './config/forms';

export interface GameEvents {
  'blood-changed': { blood: number; delta: number };
  'rate-changed': { totalRate: number };
  'thrall-bought': { id: ThrallId; owned: number };
  'form-changed': { form: VampireForm };
  'tick': { dt: number };
  'tapped': { x: number; y: number; crit: boolean; gain: number };
  'achievement-unlocked': { id: string };
  'tab-unlocked': { tab: 'bloodline' | 'servants' | 'rites' | 'tome' | 'shop' };
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
