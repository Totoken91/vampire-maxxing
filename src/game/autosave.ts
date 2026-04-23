// Auto-save scheduler. Saves on a 5s interval AND on meaningful events
// (thrall purchase, ascension) AND on visibilitychange → background.
// Debounces multiple rapid triggers within 500ms.

import { events } from './events';
import { gameState } from './state';

const AUTOSAVE_INTERVAL_MS = 5000;
const DEBOUNCE_MS = 500;

let debounceTimer: number | null = null;
let lastSave = 0;

function scheduleSave(immediate = false): void {
  if (immediate) {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    void doSave();
    return;
  }
  if (debounceTimer !== null) return;
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void doSave();
  }, DEBOUNCE_MS);
}

async function doSave(): Promise<void> {
  try {
    await gameState.saveToStorage();
    lastSave = Date.now();
  } catch (e) {
    console.warn('[autosave] failed', e);
  }
}

export function startAutosave(): void {
  // Periodic save
  window.setInterval(() => {
    if (Date.now() - lastSave >= AUTOSAVE_INTERVAL_MS) scheduleSave();
  }, AUTOSAVE_INTERVAL_MS);

  // Save when tab / app goes to background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') scheduleSave(true);
  });
  window.addEventListener('pagehide', () => scheduleSave(true));
  window.addEventListener('beforeunload', () => scheduleSave(true));

  // Immediate save on key actions
  events.on('servant-bought', () => scheduleSave());
  events.on('form-changed', () => scheduleSave(true));
}
