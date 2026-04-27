// Supabase client facade.
//
// Lazy-loaded so the auth-less code paths don't pay for the @supabase/supabase-js
// bundle (~45 KB gzip on its own — significant against our 90 KB JS budget).
// First call to getSupabase() triggers the dynamic import; subsequent calls
// reuse the same client instance.
//
// The client uses a custom storage adapter that routes to Capacitor Preferences
// on native (so the auth session survives app restarts on Android) and falls
// back to localStorage in web/dev. The adapter is sync-looking from Supabase's
// perspective even though kvGet/kvSet are async — Supabase v2 supports async
// storage adapters out of the box.
//
// Env vars (vite-prefixed so they ship to the client bundle):
//   VITE_SUPABASE_URL       — project REST endpoint (https://xxx.supabase.co)
//   VITE_SUPABASE_ANON_KEY  — project anon publishable key (safe to ship)
//
// If either is missing at boot, getSupabase() throws — auth UI surfaces
// "Cloud sync unavailable" and the offline path keeps working.
//
// IMPORTANT: this module never reads game state; it's a pure platform facade.
// Game-side auth orchestration lives in src/game/auth.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { kvGet, kvRemove, kvSet } from './storage';

const STORAGE_KEY_PREFIX = 'sb-vm';

let clientPromise: Promise<SupabaseClient> | null = null;

/** Custom storage adapter wrapping kvGet/kvSet/kvRemove so the Supabase
 *  session lives in Capacitor Preferences on native (survives app restart)
 *  and localStorage on web. Supabase tolerates async getItem returning a
 *  Promise<string | null>. */
const storageAdapter = {
  getItem: (key: string): Promise<string | null> => kvGet(key),
  setItem: (key: string, value: string): Promise<void> => kvSet(key, value),
  removeItem: (key: string): Promise<void> => kvRemove(key),
};

/** Resolve the singleton Supabase client, creating it on first call.
 *  Throws if env vars are missing — callers should catch and surface a
 *  friendly "cloud sync unavailable" message rather than crash. */
export function getSupabase(): Promise<SupabaseClient> {
  if (clientPromise) return clientPromise;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    return Promise.reject(
      new Error(
        'Supabase env missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
      ),
    );
  }
  clientPromise = (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(url, anonKey, {
      auth: {
        storage: storageAdapter,
        storageKey: STORAGE_KEY_PREFIX,
        autoRefreshToken: true,
        persistSession: true,
        // True so the OAuth redirect callback (web sign-in via
        // signInWithOAuth) is parsed out of the URL fragment and
        // the session lands automatically. Native Android uses the
        // Capacitor plugin's idToken path which doesn't go through
        // the URL — this flag is a no-op there.
        detectSessionInUrl: true,
      },
    });
  })();
  return clientPromise;
}

/** True iff env vars are present so the client can initialise. UI uses this
 *  to gate the Account section ("Cloud sync unavailable" copy when false). */
export function supabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url && anonKey);
}
