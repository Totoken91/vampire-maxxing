// First-Time User Experience cues.
// Per specs/ONBOARDING.md — zero text tutorial, purely visual affordance
// hints that auto-retract on the first meaningful action.
//
// L8 (2026-04-25) — extended with the "tutorial Ichor gift + guided
// first pull + guided first equip" flow per the V1.2 brief §9. The
// flow chains: FIRST SPARK → 25 Ichor grant → glow Sanctum tab →
// glow INVOKE → first pull resolves → glow active slots footer →
// first equip → FTUE complete.

import { events } from '../game/events';
import { gameState } from '../game/state';
import { showToast } from '../ui/components/toast';
import { onTabChange, getCurrentTab } from '../ui/navigation';
import { showIchorGift } from '../ui/components/ichor-gift';

const PULSE_DELAY_MS = 2000;
const STRAY_RAT_UNLOCK_BLOOD = 10;

/** Tutorial Ichor gift size — 25 = 2 guaranteed pulls + 5 leftover.
 *  Per the V1.2 brief: 10 = 1 forced pull (zero agency); 25 lets
 *  the player decide when to spend the 2nd 10 + leaves a 5-Ichor
 *  teaser for the next session. */
const TUTORIAL_GIFT_AMOUNT = 25;

/** Delay between FIRST SPARK toast and the Ichor gift grant so the
 *  two emotional beats don't stack. */
const GIFT_DELAY_MS = 1400;

/** How long to highlight the Sanctum tab / INVOKE button before the
 *  glow auto-retracts (failsafe — players who navigate away or quit
 *  mid-tutorial don't return to a permanent halo). */
const GLOW_TIMEOUT_MS = 60_000;

interface IchorFlagsHandle {
  ichorFlags: Record<string, boolean>;
}

function flag(name: string): boolean {
  return Boolean(
    (gameState.get() as unknown as IchorFlagsHandle).ichorFlags[name],
  );
}

function setFlag(name: string): void {
  (gameState.get() as unknown as IchorFlagsHandle).ichorFlags[name] = true;
}

export function installFtue(): void {
  // Existing FTUE only fires on a fresh save.
  const fresh = gameState.isFirstSession();

  let pulseTimer: number | null = null;
  let pulseActive = false;
  let tapCount = 0;
  let awakenedShown = false;
  let strayRatGlowActive = false;
  let firstSparkShown = false;

  // L8 glow state — module-local, transient (no save). Refs grabbed
  // lazily because the elements may not exist yet at boot.
  const sanctumTabBtn = (): HTMLElement | null =>
    document.querySelector('.tab-bar__btn[data-tab="sanctum"]');
  const invokeBtn = (): HTMLElement | null =>
    document.querySelector('.sanctum-invoke');
  const activeFooter = (): HTMLElement | null =>
    document.querySelector('.sanctum-active');

  let glowTabTimer: number | null = null;
  let glowInvokeTimer: number | null = null;
  let glowFooterTimer: number | null = null;

  const setGlow = (
    elGetter: () => HTMLElement | null,
    on: boolean,
  ): void => {
    const e = elGetter();
    if (!e) return;
    e.classList.toggle('ftue-glow', on);
  };

  const clearTimer = (id: number | null): void => {
    if (id !== null) window.clearTimeout(id);
  };

  const scheduleGlowAutoClear = (
    elGetter: () => HTMLElement | null,
    timerVar: 'tab' | 'invoke' | 'footer',
  ): number => {
    return window.setTimeout(() => {
      setGlow(elGetter, false);
      if (timerVar === 'tab') glowTabTimer = null;
      else if (timerVar === 'invoke') glowInvokeTimer = null;
      else glowFooterTimer = null;
    }, GLOW_TIMEOUT_MS);
  };

  const stopPulse = (): void => {
    if (pulseTimer !== null) {
      window.clearTimeout(pulseTimer);
      pulseTimer = null;
    }
    if (pulseActive) {
      document.body.classList.remove('ftue-portrait-pulse');
      pulseActive = false;
    }
  };

  if (fresh) {
    // 1. After 2 seconds with no tap, pulse the portrait to invite the first tap.
    pulseTimer = window.setTimeout(() => {
      document.body.classList.add('ftue-portrait-pulse');
      pulseActive = true;
    }, PULSE_DELAY_MS);

    // 2. On first tap → kill pulse. At 3 taps → AWAKENED toast.
    events.on('tapped', () => {
      stopPulse();
      tapCount += 1;
      if (tapCount === 3 && !awakenedShown) {
        awakenedShown = true;
        showToast('AWAKENED', 'Your bloodline stirs once more.');
      }
    });

    // 3. Highlight Stray Rat the moment it becomes affordable for the first time.
    events.on('blood-changed', ({ blood }) => {
      if (strayRatGlowActive) return;
      if (blood < STRAY_RAT_UNLOCK_BLOOD) return;
      if (gameState.get().servants.rat.owned > 0) return;
      const card = document.querySelector<HTMLElement>('[data-servant="rat"]');
      if (!card) return;
      card.classList.add('ftue-glow');
      strayRatGlowActive = true;
    });
  }

  // L8 — tap-count fallback: once the player has clearly engaged
  // with the core loop (>=15 taps) the tutorial gift fires even if
  // they haven't bought their first servant yet. The 15-tap floor
  // matches the brief's 30-60s window — a player tapping at typical
  // 1-2 Hz lands here in 8-15s, after the core loop has settled.
  // Reads gameState.stats.totalTaps so wipes reset cleanly without
  // depending on the install-time closure. Listener registered
  // OUTSIDE the if(fresh) gate so it works after a mid-session
  // vm.wipe() too.
  events.on('tapped', () => {
    if (
      !flag('tutorial_gift') &&
      gameState.get().stats.totalTaps >= 15
    ) {
      triggerTutorialGift();
    }
  });

  // 4. First Stray Rat purchased → FIRST SPARK toast (overrides the
  //    default CLAIMED), grant the tutorial Ichor, light up Sanctum.
  //    This step must work for any save where `tutorial_gift` hasn't
  //    fired — including returning saves from the pre-L8 era who
  //    bought their first rat before the gift existed.
  events.on('servant-bought', ({ id, owned }) => {
    if (id !== 'rat' || owned !== 1) return;
    if (strayRatGlowActive) {
      document
        .querySelector<HTMLElement>('[data-servant="rat"]')
        ?.classList.remove('ftue-glow');
      strayRatGlowActive = false;
    }
    if (!firstSparkShown) {
      firstSparkShown = true;
      showToast('FIRST SPARK', 'The vermin know your name.');
    }
    triggerTutorialGift();
  });

  // L8 — grant + cue the tutorial Ichor through the cinematic
  // ceremony. Idempotent: re-runs are gated by the persisted flag.
  // The ceremony component handles its own grantIchor call (deferred
  // to claim time so the header pill animates in lockstep with the
  // orb dispersal).
  function triggerTutorialGift(): void {
    if (flag('tutorial_gift')) return;
    setFlag('tutorial_gift');
    // Slight delay so any prior toast (FIRST SPARK) finishes before
    // the full-screen ceremony takes over.
    window.setTimeout(() => {
      void showIchorGift(TUTORIAL_GIFT_AMOUNT, {
        title: 'A GIFT FROM THE ANCIENTS',
        subtitle:
          'their nectar binds the souls who sleep — invoke them in the Sanctum',
        source: 'tutorial_gift',
      }).then(() => {
        // After the player claims, light up the Sanctum tab — they
        // need to navigate there to invoke. Skip if already there.
        if (getCurrentTab() !== 'sanctum') {
          setGlow(sanctumTabBtn, true);
          glowTabTimer = scheduleGlowAutoClear(sanctumTabBtn, 'tab');
        } else {
          startInvokeGlow();
        }
      });
    }, GIFT_DELAY_MS);
  }

  function startInvokeGlow(): void {
    // Skip if FRG already used (player has pulled before — likely a
    // returning save or someone who burned a cheat pull).
    if (gameState.hasUsedFirstRareGuarantee()) return;
    if (flag('ftue:bind_done')) return;
    setGlow(invokeBtn, true);
    glowInvokeTimer = scheduleGlowAutoClear(invokeBtn, 'invoke');
  }

  // Reaching the Sanctum tab clears the tab glow and (if the tutorial
  // gift fired but the player hasn't pulled yet) lights the INVOKE
  // button instead. Drives the player toward the rituals screen.
  onTabChange((tab) => {
    if (tab !== 'sanctum') return;
    if (sanctumTabBtn()?.classList.contains('ftue-glow')) {
      setGlow(sanctumTabBtn, false);
      clearTimer(glowTabTimer);
      glowTabTimer = null;
    }
    if (flag('tutorial_gift')) {
      // Defer one frame so the Sanctum DOM has mounted and the
      // .sanctum-invoke selector resolves.
      window.setTimeout(startInvokeGlow, 50);
    }
  });

  // First pull resolves → clear the INVOKE glow, prep the active-
  // slots footer glow for when the player returns to Sanctum after
  // the pull animation closes.
  events.on('ritual-pull-performed', () => {
    setGlow(invokeBtn, false);
    clearTimer(glowInvokeTimer);
    glowInvokeTimer = null;
    if (flag('ftue:bind_done')) return;
    // Defer the footer glow until the pull animation overlay is gone
    // (the overlay sits at z-index 600, the Sanctum is behind it —
    // glowing now would be invisible to the player). We poll the
    // overlay's presence rather than listening for an event since
    // the animation has its own internal lifecycle.
    const checkInterval = window.setInterval(() => {
      if (!document.querySelector('.pull-overlay')) {
        window.clearInterval(checkInterval);
        if (flag('ftue:bind_done')) return;
        setGlow(activeFooter, true);
        glowFooterTimer = scheduleGlowAutoClear(activeFooter, 'footer');
      }
    }, 400);
  });

  // Retroactive grandfathering — a returning save that already has
  // the first servant but predates L8 (or simply never received the
  // gift) gets it now. Same logic as ichor-rewards.ts retroactive
  // milestone scan.
  if (
    gameState.get().servants.rat.totalPurchased > 0 &&
    !flag('tutorial_gift')
  ) {
    triggerTutorialGift();
  }

  // First equip closes the FTUE loop. Persist the flag so the cues
  // never re-fire on subsequent sessions.
  events.on('thrall-equipped', ({ nextId }) => {
    if (!nextId) return;
    if (flag('ftue:bind_done')) return;
    setFlag('ftue:bind_done');
    setGlow(activeFooter, false);
    setGlow(invokeBtn, false);
    setGlow(sanctumTabBtn, false);
    clearTimer(glowFooterTimer);
    clearTimer(glowInvokeTimer);
    clearTimer(glowTabTimer);
    showToast('BOUND', 'The first pact is sealed. Many more await.');
  });
}
