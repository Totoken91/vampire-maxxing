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
import { startMusic } from './audio/music';

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

  // Background music — fires on first tap (browsers gate audio autoplay on
  // a user gesture). Subsequent calls are no-ops.
  events.on('tapped', () => startMusic());

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
