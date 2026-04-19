// Thin key/value wrapper.
// - Inside a Capacitor native shell: uses the Preferences plugin exposed at
//   `window.Capacitor.Plugins.Preferences` (registered by `npx cap sync`).
// - Everywhere else (web dev, browser tests): falls back to localStorage.
// No build-time import of `@capacitor/preferences` so the bundle stays
// framework-free in web builds.

interface NativePreferences {
  get(opts: { key: string }): Promise<{ value: string | null }>;
  set(opts: { key: string; value: string }): Promise<void>;
  remove(opts: { key: string }): Promise<void>;
}

interface CapacitorGlobal {
  Plugins?: { Preferences?: NativePreferences };
  isNativePlatform?: () => boolean;
}

function getNative(): NativePreferences | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap) return null;
  const native = cap.isNativePlatform ? cap.isNativePlatform() : false;
  if (!native) return null;
  return cap.Plugins?.Preferences ?? null;
}

export async function kvGet(key: string): Promise<string | null> {
  const native = getNative();
  if (native) {
    const { value } = await native.get({ key });
    return value;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string): Promise<void> {
  const native = getNative();
  if (native) {
    await native.set({ key, value });
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or unavailable — swallow so the game keeps running.
  }
}

export async function kvRemove(key: string): Promise<void> {
  const native = getNative();
  if (native) {
    await native.remove({ key });
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}
