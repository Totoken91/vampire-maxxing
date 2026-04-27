// Google Sign-In facade for Capacitor + web.
//
// Mirrors src/platform/iap.ts: lazy-loads the native plugin so the web
// bundle stays free of native-only code, and falls back to Google Identity
// Services (gsi.client) in browsers/dev.
//
// Plugin: @codetrix-studio/capacitor-google-auth (rc4 supports Capacitor 8+
// peer-dep with --legacy-peer-deps install). It returns an idToken that we
// pass to Supabase signInWithIdToken. We do NOT use access_token / serverAuthCode
// for v1 — the idToken alone is enough for Supabase to verify identity.
//
// The single env var VITE_GOOGLE_WEB_CLIENT_ID must match BOTH:
//   - the Web client_id configured in Google Cloud Console under "OAuth 2.0 Client IDs"
//   - the audience expected by Supabase's Google provider (set in Supabase Auth UI)
// Native Android also requires an Android client_id with the app's SHA-1 hash
// — that one isn't shipped to JS, the Capacitor plugin reads it from the
// google-services.json packaged with the app.
//
// Returns null on cancellation or when the plugin isn't available.

const PLUGIN_NAME = '@codetrix-studio/capacitor-google-auth';

interface CapacitorGlobal {
  Plugins?: { GoogleAuth?: NativeGoogleAuth };
  isNativePlatform?: () => boolean;
}

interface NativeGoogleAuth {
  initialize(opts: {
    clientId: string;
    scopes?: string[];
    grantOfflineAccess?: boolean;
  }): Promise<void>;
  signIn(): Promise<NativeGoogleAuthUser>;
  signOut(): Promise<void>;
  refresh(): Promise<{ idToken: string; accessToken: string }>;
}

interface NativeGoogleAuthUser {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  imageUrl?: string;
  authentication: {
    idToken: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

export interface GoogleAuthResult {
  idToken: string;
  email: string | null;
  displayName: string | null;
}

let initPromise: Promise<NativeGoogleAuth | null> | null = null;

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform ? cap.isNativePlatform() : false;
}

function getNativePlugin(): NativeGoogleAuth | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.Plugins?.GoogleAuth ?? null;
}

function getClientId(): string | null {
  const id = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;
  return id && id.length > 0 ? id : null;
}

/** Idempotent. Resolves once the plugin is wired (native) or the gsi
 *  script is loaded (web). Returns null if init fails (no clientId,
 *  plugin missing, or gsi blocked) — callers should treat that as "Google
 *  sign-in unavailable" and not surface the button. */
export async function initGoogleAuth(): Promise<NativeGoogleAuth | null> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const clientId = getClientId();
    if (!clientId) return null;

    if (isNativePlatform()) {
      // Native: the plugin auto-registers with Capacitor at app start.
      // We dynamically import the JS bridge (no-op runtime cost beyond a
      // ~2KB module) so plugin.initialize is callable from JS.
      try {
        await import(/* @vite-ignore */ PLUGIN_NAME);
      } catch {
        return null;
      }
      const plugin = getNativePlugin();
      if (!plugin) return null;
      try {
        await plugin.initialize({
          clientId,
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });
      } catch {
        return null;
      }
      return plugin;
    }

    // Web: use the same plugin's web implementation, which loads gsi
    // under the hood. We only need a clientId — no script tag required.
    try {
      await import(/* @vite-ignore */ PLUGIN_NAME);
    } catch {
      return null;
    }
    const plugin = getNativePlugin();
    if (!plugin) return null;
    try {
      await plugin.initialize({
        clientId,
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      });
    } catch {
      return null;
    }
    return plugin;
  })();
  return initPromise;
}

/** True iff the plugin is initialised AND we have a client id. UI gates
 *  the "Sign in with Google" button on this. */
export function googleAuthAvailable(): boolean {
  return Boolean(getClientId());
}

/** Trigger the Google sign-in sheet. Resolves with the idToken on success,
 *  null on cancellation/error. Callers (auth.ts) pass the idToken to
 *  Supabase via signInWithIdToken. */
export async function signInWithGoogle(): Promise<GoogleAuthResult | null> {
  const plugin = await initGoogleAuth();
  if (!plugin) return null;
  try {
    const user = await plugin.signIn();
    if (!user.authentication.idToken) return null;
    return {
      idToken: user.authentication.idToken,
      email: user.email ?? null,
      displayName: user.name ?? null,
    };
  } catch {
    return null;
  }
}

/** Sign out the local Google session. Does NOT sign out Supabase — that's
 *  the auth.ts caller's job. Safe to call even if no session is active. */
export async function signOutGoogle(): Promise<void> {
  const plugin = await initGoogleAuth();
  if (!plugin) return;
  try {
    await plugin.signOut();
  } catch {
    // ignore — user is already signed out or the plugin missed it
  }
}
