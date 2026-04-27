// Auto-save scheduler. Saves to local on a 5s interval AND on meaningful
// events (thrall purchase, ascension) AND on visibilitychange → background.
// Debounces multiple rapid triggers within 500ms.
//
// Cloud sync layer (added 2026-04-27): when the player is signed in,
// every local save also enqueues a cloud push. Cloud writes are debounced
// SEPARATELY at 15s so a tap-heavy session doesn't hit the network on
// every servant purchase. Background / pagehide events flush the cloud
// debounce immediately (last save before the player closes the app).

import { events } from './events';
import { gameState } from './state';
import { getCurrentUser } from './auth';
import { pushCurrentSnapshot } from './cloud-sync';

const AUTOSAVE_INTERVAL_MS = 5000;
const DEBOUNCE_MS = 500;
const CLOUD_DEBOUNCE_MS = 15_000;

let debounceTimer: number | null = null;
let cloudDebounceTimer: number | null = null;
let lastSave = 0;
let cloudDirty = false;

function scheduleSave(immediate = false): void {
  if (immediate) {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    void doSave();
    flushCloud();
    return;
  }
  if (debounceTimer === null) {
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      void doSave();
    }, DEBOUNCE_MS);
  }
  // Cloud write rides on the same triggers but with its own longer
  // debounce. The flag survives multiple debounce restarts so we never
  // miss a dirty window.
  cloudDirty = true;
  if (cloudDebounceTimer === null) {
    cloudDebounceTimer = window.setTimeout(() => {
      cloudDebounceTimer = null;
      flushCloud();
    }, CLOUD_DEBOUNCE_MS);
  }
}

async function doSave(): Promise<void> {
  try {
    await gameState.saveToStorage();
    lastSave = Date.now();
  } catch (e) {
    console.warn('[autosave] failed', e);
  }
}

/** Push to Supabase if the user is signed in. Quietly no-ops otherwise.
 *  Resets the dirty flag + cancels any pending cloud-debounce timer so
 *  immediate flushes (visibilitychange) skip a redundant queued write. */
function flushCloud(): void {
  if (cloudDebounceTimer !== null) {
    window.clearTimeout(cloudDebounceTimer);
    cloudDebounceTimer = null;
  }
  if (!cloudDirty) return;
  cloudDirty = false;
  if (!getCurrentUser()) return;
  void pushCurrentSnapshot().catch((e) => {
    console.warn('[autosave] cloud push failed', e);
    // Re-arm the dirty flag so the next save triggers another push.
    // The user's progress is still safe in localStorage.
    cloudDirty = true;
  });
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

  // When the cloud-sync handler resolves a sign-in (push or pull), the
  // local + cloud are aligned. We arm the dirty flag false so the first
  // post-sign-in autosave doesn't redundantly re-push the same blob.
  events.on('auth-changed', ({ user }) => {
    if (!user) {
      // Sign-out — drop any queued cloud write; the user might have
      // signed out specifically to stop syncing.
      cloudDirty = false;
      if (cloudDebounceTimer !== null) {
        window.clearTimeout(cloudDebounceTimer);
        cloudDebounceTimer = null;
      }
    }
  });
}
