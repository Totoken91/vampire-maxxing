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
import { THRALLS, type ThrallId, type ThrallRarity } from '../game/config/thralls';
import { grantIchor, spendIchor, type IchorSource } from '../game/ichor';
import { performPull, type PullResult } from '../game/ritual';
import type { BannerId } from '../game/config/banners';
import { awaken, convertEssence, publishThrallModifiers } from '../game/awakening';
import { STAR_MAX_PER_RARITY } from '../game/config/awakening';

type Cheats = {
  gameState: typeof gameState;
  events: typeof events;
  setForm: (form: VampireForm) => void;
  addBlood: (n: number) => void;
  addDread: (n: number) => void;
  setDread: (level: number) => void;
  addIchor: (n: number, source?: IchorSource) => number;
  spendIchor: (n: number) => boolean;
  reset: () => void;
  wipe: () => Promise<void>;
  playAscension: (target?: VampireForm) => Promise<void>;
  overlays: typeof portraitOverlays;
  modifiers: typeof modifierRegistry;
  testOverlay: (layer?: 'front' | 'back', color?: string) => void;
  grantThrall: (id: ThrallId) => boolean;
  grantAllThralls: () => void;
  pull: (banner?: BannerId, count?: 1 | 10) => PullResult[] | null;
  setPity: (banner: BannerId, kind: 'rare' | 'epic', value: number) => void;
  resetFRG: () => void;
  addEssence: (rarity: ThrallRarity, amount: number) => void;
  awaken: (id: ThrallId) => boolean;
  maxAwaken: (id: ThrallId) => void;
  convertEssence: (from: ThrallRarity, amount: number) => boolean;
  equip: (id: ThrallId, slot?: number) => boolean;
  unequipAll: () => void;
  tutorialGift: () => void;
  clearFlags: () => void;
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
        totalRunBloodOnline: number;
        totalLifetimeBlood: number;
      };
      s.blood += n;
      s.totalRunBlood += n;
      s.totalRunBloodOnline += n;
      s.totalLifetimeBlood += n;
      events.emit('blood-changed', { blood: s.blood, delta: n });
    },
    addDread(n) {
      const s = gameState.get() as unknown as { dread: number };
      s.dread += n;
      events.emit('dread-changed', { level: s.dread });
      events.emit('blood-changed', { blood: gameState.getBlood(), delta: 0 });
    },
    setDread(level) {
      const s = gameState.get() as unknown as { dread: number };
      s.dread = Math.max(0, Math.floor(level));
      events.emit('dread-changed', { level: s.dread });
      events.emit('blood-changed', { blood: gameState.getBlood(), delta: 0 });
    },
    addIchor(n, source = 'debug') {
      return grantIchor(n, source);
    },
    spendIchor(n) {
      return spendIchor(n);
    },
    grantThrall(id) {
      return gameState.obtainThrall(id);
    },
    grantAllThralls() {
      for (const t of THRALLS) gameState.obtainThrall(t.id);
    },
    pull(banner = 'standard', count = 1) {
      // Top up Ichor implicitly so the cheat never fails on broke saves.
      const need = count === 10 ? 95 : 10;
      if (gameState.getIchor() < need) grantIchor(need, 'debug');
      return performPull(banner, count);
    },
    setPity(banner, kind, value) {
      const r = gameState.getRitualState()[banner];
      if (kind === 'rare') r.pityCounterRare = Math.max(0, value);
      else r.pityCounterEpic = Math.max(0, value);
    },
    resetFRG() {
      gameState.getRitualState().firstRareGuaranteeUsed = false;
    },
    addEssence(rarity, amount) {
      gameState.grantEssence(rarity, amount);
    },
    awaken(id) {
      // Top up essences implicitly so the cheat never fails.
      const t = gameState.get().playerThralls[id];
      if (!t.owned) gameState.obtainThrall(id);
      const thrallRarity = THRALLS.find((x) => x.id === id)!.rarity;
      gameState.grantEssence(thrallRarity, 100);
      return awaken(id);
    },
    maxAwaken(id) {
      const t = gameState.get().playerThralls[id];
      if (!t.owned) gameState.obtainThrall(id);
      const thrallRarity = THRALLS.find((x) => x.id === id)!.rarity;
      const max = STAR_MAX_PER_RARITY[thrallRarity];
      gameState.grantEssence(thrallRarity, 1000);
      while (gameState.getPlayerThrall(id).stars < max - 1) {
        if (!awaken(id)) break;
      }
      // Re-publish in case it's equipped.
      if (gameState.isThrallEquipped(id)) publishThrallModifiers(id);
    },
    convertEssence(from, amount) {
      return convertEssence(from, amount);
    },
    equip(id, slot) {
      if (!gameState.isThrallOwned(id)) gameState.obtainThrall(id);
      // Default: first empty slot, or 0 if all full.
      const slots = gameState.getEquippedSlots();
      const target = slot !== undefined
        ? slot
        : slots.indexOf(null) !== -1 ? slots.indexOf(null) : 0;
      return gameState.equipThrall(target, id);
    },
    unequipAll() {
      const slots = gameState.getEquippedSlots();
      for (let i = 0; i < slots.length; i += 1) {
        gameState.unequipSlot(i);
      }
    },
    tutorialGift() {
      // Force-fire the L8 tutorial Ichor ceremony, bypassing the
      // tap-count / first-rat triggers. Useful for testing the
      // ceremony + post-claim Sanctum tab glow flow.
      const flags = (gameState.get() as unknown as {
        ichorFlags: Record<string, boolean>;
      }).ichorFlags;
      delete flags['tutorial_gift'];
      // Lazy import to avoid pulling the ceremony component into
      // the cheats bundle on every page; only when the cheat fires.
      void import('../ui/components/ichor-gift').then((m) => {
        flags['tutorial_gift'] = true;
        void m.showIchorGift(25, {
          title: 'A GIFT FROM THE ANCIENTS',
          subtitle:
            'their nectar binds the souls who sleep — invoke them in the Sanctum',
          source: 'tutorial_gift',
        });
      });
    },
    clearFlags() {
      // Wipe every persisted FTUE / reward / ritual flag so the
      // first-time triggers re-arm. Pairs with vm.wipe() when
      // testing onboarding flows mid-session.
      const snap = gameState.get() as unknown as {
        ichorFlags: Record<string, boolean>;
        ritualState: { firstRareGuaranteeUsed: boolean };
      };
      snap.ichorFlags = {};
      snap.ritualState.firstRareGuaranteeUsed = false;
      // eslint-disable-next-line no-console
      console.warn('[vm] FTUE + reward + FRG flags cleared.');
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
        totalRunBloodOnline: number;
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
        s.totalRunBloodOnline += need;
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
