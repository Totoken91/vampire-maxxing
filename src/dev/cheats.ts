// Dev-only helpers exposed on window.vm. Stripped in production.
// Usage in browser console:
//   vm.setForm('LORD_OF_NIGHT')   — jump directly to a form
//   vm.addBlood(1e9)              — give yourself blood
//   vm.gameState, vm.events       — raw access

import { gameState } from '../game/state';
import { events } from '../game/events';
import { BALANCE } from '../game/config/balance';
import type { VampireForm } from '../game/config/forms';
import { wipeSave } from '../game/save';
import { playAscensionFx } from '../fx/ascension';
import { portraitOverlays } from '../ui/components/portrait';
import { modifierRegistry } from '../game/modifiers';
import {
  buyUpgrade,
  getUpgradeLevel,
  type UpgradeId,
} from '../game/upgrades';
import { THRALLS, type ThrallId } from '../game/config/thralls';

type Cheats = {
  gameState: typeof gameState;
  events: typeof events;
  setForm: (form: VampireForm) => void;
  addBlood: (n: number) => void;
  addDread: (n: number) => void;
  reset: () => void;
  wipe: () => Promise<void>;
  playAscension: (target?: VampireForm) => Promise<void>;
  overlays: typeof portraitOverlays;
  modifiers: typeof modifierRegistry;
  testOverlay: (layer?: 'front' | 'back', color?: string) => void;
  buyUpgrade: (id: UpgradeId) => boolean;
  getUpgradeLevel: (id: UpgradeId) => number;
  grantThrall: (id: ThrallId) => boolean;
  grantAllThralls: () => void;
};

declare global {
  interface Window {
    vm?: Cheats;
  }
}

export function installCheats(): void {
  const snap = gameState.get() as unknown as { stats: { totalAscends: number } };

  const cheats: Cheats = {
    gameState,
    events,
    setForm(form) {
      const ascends = BALANCE.FORM_THRESHOLDS[form as keyof typeof BALANCE.FORM_THRESHOLDS] ?? 0;
      snap.stats.totalAscends = ascends;
      events.emit('form-changed', { form });
      events.emit('rate-changed', { totalRate: gameState.getTotalRate() });
    },
    addBlood(n) {
      // bypass addBlood (private) via a harmless action: trigger taps worth n total.
      // Cleaner: mutate the snapshot directly.
      const s = gameState.get() as unknown as {
        blood: number;
        totalRunBlood: number;
        totalLifetimeBlood: number;
      };
      s.blood += n;
      s.totalRunBlood += n;
      s.totalLifetimeBlood += n;
      events.emit('blood-changed', { blood: s.blood, delta: n });
    },
    addDread(n) {
      const s = gameState.get() as unknown as { dread: number };
      s.dread += n;
      events.emit('blood-changed', { blood: gameState.getBlood(), delta: 0 });
    },
    buyUpgrade,
    getUpgradeLevel,
    grantThrall(id) {
      return gameState.obtainThrall(id);
    },
    grantAllThralls() {
      for (const t of THRALLS) gameState.obtainThrall(t.id);
    },
    reset() {
      gameState.reset();
      events.emit('blood-changed', { blood: 0, delta: 0 });
      events.emit('rate-changed', { totalRate: 0 });
      events.emit('form-changed', { form: 'NEWBORN' });
    },
    async wipe() {
      await wipeSave();
      gameState.reset();
      events.emit('blood-changed', { blood: 0, delta: 0 });
      events.emit('rate-changed', { totalRate: 0 });
      events.emit('form-changed', { form: 'NEWBORN' });
    },
    overlays: portraitOverlays,
    modifiers: modifierRegistry,
    testOverlay(layer = 'front', color = 'rgba(255,0,0,0.5)') {
      const el = document.createElement('div');
      el.style.cssText = `background: ${color}; width:100%; height:100%; pointer-events:none;`;
      portraitOverlays.add('__test', layer, el);
      // eslint-disable-next-line no-console
      console.warn(
        `[vm] overlay injected on ${layer}. Remove with vm.overlays.remove('__test').`,
      );
    },
    async playAscension(target?: VampireForm) {
      // Give enough blood to clear the ascend threshold, then play the
      // real orchestrator. Handy for iterating on the cinematic.
      // If `target` is given, jump totalAscends just below its threshold
      // so the next ascend bumps us INTO that form.
      const s = gameState.get() as unknown as {
        blood: number;
        totalRunBlood: number;
        totalLifetimeBlood: number;
        stats: { totalAscends: number };
      };
      if (target) {
        const threshold =
          BALANCE.FORM_THRESHOLDS[target as keyof typeof BALANCE.FORM_THRESHOLDS] ?? 0;
        s.stats.totalAscends = Math.max(0, threshold - 1);
      }
      const need = BALANCE.ASCEND_THRESHOLD - s.totalRunBlood;
      if (need > 0) {
        s.blood += need;
        s.totalRunBlood += need;
        s.totalLifetimeBlood += need;
        events.emit('blood-changed', { blood: s.blood, delta: need });
      }
      await playAscensionFx(() => gameState.ascend());
    },
  };

  window.vm = cheats;
  // eslint-disable-next-line no-console
  console.warn('[vm] dev cheats installed. Try vm.setForm("LORD_OF_NIGHT")');
}
