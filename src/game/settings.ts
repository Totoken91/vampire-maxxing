// L15 — Settings accessor.
//
// The save layer already persists user preferences (settings.*) but
// no module exposed a typed get/set. This is that module.
//
// Why a separate file: the Settings UI lives in ui/components/menu.ts
// and needs to read/write toggles without poking the GameSnapshot
// directly. Centralising here keeps the storage shape an
// implementation detail of save.ts.
//
// Note on side-effects: changing some settings (sound, haptic) takes
// effect immediately for the next event that reads them. The flags
// are read at use-time (e.g. `if (settings.hapticsEnabled) navigator.vibrate(...)`),
// so no event/republish dance is needed.

import { events } from './events';
import { gameState } from './state';

export interface Settings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  lang: string;
  notifEnabled: boolean;
  /** V1.2-HF1 — Toggle for the Methuselah-Century-III auto-ascend
   *  feature. Hidden in UI below the unlock threshold; flipped via
   *  the Settings toggle row once visible. */
  autoAscend: boolean;
}

interface SettingsCarrier {
  settings?: Settings;
}

const DEFAULTS: Settings = {
  soundEnabled: false,
  hapticsEnabled: true,
  lang: typeof navigator !== 'undefined' && navigator.language?.startsWith('fr')
    ? 'fr'
    : 'en',
  notifEnabled: false,
  autoAscend: false,
};

/** Read the current settings. Falls back to DEFAULTS on missing
 *  entries (older saves, fresh boots). */
export function getSettings(): Settings {
  const carrier = gameState.get() as unknown as SettingsCarrier;
  if (!carrier.settings) {
    carrier.settings = { ...DEFAULTS };
  }
  return carrier.settings;
}

/** Mutate one setting. Persists implicitly (autosave picks it up on
 *  the next tick). Emits 'settings-changed' so listeners that need
 *  to react synchronously can. */
export function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): void {
  const settings = getSettings();
  if (settings[key] === value) return;
  settings[key] = value;
  events.emit('settings-changed', { key, value });
}
