// Vampire Maxxing — entry point.

import './styles/index.css';
import { mountApp } from './ui/app';
import { startLoop } from './game/loop';
import { installFx } from './fx';
import { installMilestone } from './fx/milestone';
import { showDailyModal } from './ui/components/daily-modal';
import { installFtue } from './ftue';
import { startAutosave } from './game/autosave';
import { maybeShowOfflineModal } from './ui/components/offline-modal';
import { showToast } from './ui/components/toast';
import { events } from './game/events';
import { gameState } from './game/state';
import { installMusic } from './audio/music';
import { playButton } from './audio/sfx';
import { initAds } from './platform/ads';
import { checkAchievements, installAchievementChecks } from './game/achievements';
import { ACHIEVEMENTS_BY_ID } from './game/config/achievements';
import { showAchievementToast } from './ui/components/achievement-toast';
import { installMilestones } from './game/milestones';
import { SERVANTS, SERVANTS_BY_ID } from './game/config/servants';
import { FORMS, FORMS_BY_ID, type VampireForm } from './game/config/forms';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element');
}
const appRoot = root;

async function boot(): Promise<void> {
  // Restore save (if any) BEFORE the UI renders so components read final state.
  const offlineReport = await gameState.loadFromStorage();

  // Publish milestone-driven modifiers (M1: Bloodline Scholar auto-tier
  // from Dread Level). Must run after state load and before any
  // rate/cost calc fires. Subscribes to dread-changed internally.
  installMilestones();

  installFx(document.body);
  installMilestone();
  mountApp(appRoot);
  startLoop();
  startAutosave();

  // Default toast on every first-of-tier purchase. FTUE registers AFTER this
  // and overrides with "FIRST SPARK" when applicable.
  events.on('servant-bought', ({ id, owned }) => {
    if (owned !== 1) return;
    const name = SERVANTS_BY_ID[id].name;
    showToast('CLAIMED', `A new ${name.toLowerCase()} kneels before you.`);
  });

  installFtue();

  // Background music: autoplay if allowed, first-gesture fallback otherwise,
  // pauses/resumes with page visibility.
  installMusic();

  // AdMob: fire and forget. Init is idempotent and safe on web (no-ops).
  void initAds();

  // Achievements: show toast on unlock, run checks on relevant events, and
  // catch anything the predicates say is done at load (e.g. the offline
  // modal just pushed play time past 1h).
  events.on('achievement-unlocked', ({ id }) => {
    const def = ACHIEVEMENTS_BY_ID[id];
    if (def) showAchievementToast(def);
  });
  installAchievementChecks();
  checkAchievements();

  // Blood Altar upgrade was removed in M1 (redundant with Velmor thrall's
  // auto-collect effect landing in Phase L7).

  // Back-fill lore unlocks for existing saves from before the Bestiary /
  // Histories shipped. Any thrall the player has ever bought unlocks its
  // entry; any form reached so far unlocks its history.
  backfillLoreUnlocks();

  // Toast on lore unlock.
  events.on('lore-unlocked', ({ kind, id }) => {
    if (kind === 'servant') {
      const def = SERVANTS_BY_ID[id as keyof typeof SERVANTS_BY_ID];
      if (def) showToast('NEW ENTRY', `${def.name} added to the Bestiary.`);
    } else {
      const def = FORMS_BY_ID[id as VampireForm];
      if (def) showToast('NEW ENTRY', `${def.subtitle} added to the Histories.`);
    }
  });

  // SFX on SUCCESSFUL thrall purchase only (the event only fires when the
  // buy went through — blood < cost silently returns false upstream).
  events.on('servant-bought', () => playButton());

  if (offlineReport) {
    maybeShowOfflineModal(offlineReport, (amount) => {
      gameState.applyOfflineGain(amount);
    });
  }

  // K5 daily gift — show AFTER the offline modal dismisses so we never
  // stack two modals. If no offline modal was shown (elapsed < 60s), the
  // daily fires immediately. MutationObserver watches the offline
  // backdrop and triggers the daily when it's detached.
  if (gameState.canClaimDaily()) {
    const offlineBackdrop = document.querySelector('.offline-modal__backdrop');
    if (!offlineBackdrop) {
      showDailyModal();
    } else {
      const observer = new MutationObserver(() => {
        if (!document.body.contains(offlineBackdrop)) {
          observer.disconnect();
          showDailyModal();
        }
      });
      observer.observe(document.body, { childList: true });
    }
  }

  if (import.meta.env.DEV) {
    void import('./dev/cheats').then((m) => {
      m.installCheats();
      // Don't override the persisted state if a save already existed.
      if (!offlineReport && gameState.isFirstSession()) {
        window.vm?.setForm('LORD_OF_NIGHT');
      }
    });
  }
}

void boot();

/**
 * Saves written before the Tome lore expansion don't yet record which
 * thralls/forms have revealed their entries. Infer from existing state:
 * every thrall ever purchased → thrall lore; every form up to the highest
 * reached → history lore. Safe to run every boot; it only adds, never
 * removes.
 */
function backfillLoreUnlocks(): void {
  const snap = gameState.get();
  for (const servant of SERVANTS) {
    if (snap.servants[servant.id].totalPurchased > 0) {
      snap.unlockedServantLore.add(servant.id);
    }
  }
  const highest = snap.stats.highestFormReached;
  const highestIdx = FORMS.findIndex((f) => f.id === highest);
  for (let i = 0; i <= highestIdx; i++) {
    snap.unlockedFormLore.add(FORMS[i].id);
  }
}
