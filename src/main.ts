// Vampire Maxxing — entry point.

import './styles/index.css';
import { mountApp } from './ui/app';
import { startLoop } from './game/loop';
import { installFx } from './fx';
import { installFtue } from './ftue';
import { startAutosave } from './game/autosave';
import { maybeShowOfflineModal } from './ui/components/offline-modal';
import { showToast } from './ui/components/toast';
import { events } from './game/events';
import { gameState } from './game/state';
import { THRALLS_BY_ID } from './game/config/thralls';
import { installMusic } from './audio/music';
import { playButton } from './audio/sfx';
import { initAds } from './platform/ads';
import { checkAchievements, installAchievementChecks } from './game/achievements';
import { ACHIEVEMENTS_BY_ID } from './game/config/achievements';
import { showAchievementToast } from './ui/components/achievement-toast';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element');
}
const appRoot = root;

async function boot(): Promise<void> {
  // Restore save (if any) BEFORE the UI renders so components read final state.
  const offlineReport = await gameState.loadFromStorage();

  installFx(document.body);
  mountApp(appRoot);
  startLoop();
  startAutosave();

  // Default toast on every first-of-tier purchase. FTUE registers AFTER this
  // and overrides with "FIRST SPARK" when applicable.
  events.on('thrall-bought', ({ id, owned }) => {
    if (owned !== 1) return;
    const name = THRALLS_BY_ID[id].name;
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

  // SFX on SUCCESSFUL thrall purchase only (the event only fires when the
  // buy went through — blood < cost silently returns false upstream).
  events.on('thrall-bought', () => playButton());

  if (offlineReport) {
    maybeShowOfflineModal(offlineReport, (amount) => {
      gameState.applyOfflineGain(amount);
    });
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
