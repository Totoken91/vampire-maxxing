// High-level auth state — bridges Supabase + Google Sign-In, exposes a
// minimal public profile, and emits 'auth-changed' on the event bus so the
// UI can react without coupling to the Supabase client directly.
//
// Flow:
//   signInWithGoogle()
//     → google-auth.signInWithGoogle() returns { idToken, email, displayName }
//     → supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
//     → supabase emits SIGNED_IN → onAuthStateChange handler updates local
//       state and emits 'auth-changed' on the event bus.
//
// signOut() reverses both sides (Supabase + Google's local session).
//
// On boot, restoreSession() asks Supabase for the persisted session (loaded
// from Capacitor Preferences via the storage adapter). If found, the
// SIGNED_IN event fires and the menu UI reflects the right state.
//
// IMPORTANT: this module deliberately does NOT touch gameState. Cloud-save
// migration is wired in the NEXT prompt and lives in its own module that
// listens for 'auth-changed'.

import { events } from './events';
import {
  googleAuthAvailable,
  initGoogleAuth,
  signInWithGoogle as nativeSignInGoogle,
  signOutGoogle,
} from '../platform/google-auth';
import { getSupabase, supabaseConfigured } from '../platform/supabase';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

let currentUser: AuthUser | null = null;
let bootRestorePromise: Promise<void> | null = null;

/** True iff both Supabase and Google config are present. UI hides the
 *  Account section entirely when false (env not set in this build). */
export function authAvailable(): boolean {
  return supabaseConfigured() && googleAuthAvailable();
}

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

/** Wire the Supabase auth state listener and restore any persisted session.
 *  Idempotent. Safe to call on every app boot — only the first call does
 *  work; subsequent calls reuse the same promise. */
export function restoreSession(): Promise<void> {
  if (bootRestorePromise) return bootRestorePromise;
  bootRestorePromise = (async () => {
    if (!authAvailable()) return;
    // Init the Google plugin in parallel so the sign-in button is ready
    // by the time the user opens the menu. Failure here is non-fatal.
    void initGoogleAuth();

    try {
      const supabase = await getSupabase();
      // Subscribe BEFORE fetching the session so we don't miss the
      // SIGNED_IN event the SDK fires synchronously from getSession.
      supabase.auth.onAuthStateChange((_event, session) => {
        const next = session?.user
          ? toAuthUser(session.user.id, session.user.email, session.user.user_metadata)
          : null;
        if (sameUser(next, currentUser)) return;
        currentUser = next;
        events.emit('auth-changed', { user: currentUser });
      });
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const u = data.session.user;
        currentUser = toAuthUser(u.id, u.email, u.user_metadata);
        events.emit('auth-changed', { user: currentUser });
      }
    } catch {
      // Supabase init failed (env missing, network, etc.). Silent — UI
      // already gates on authAvailable().
    }
  })();
  return bootRestorePromise;
}

/** Trigger the full sign-in flow. Returns true on success, false on
 *  cancellation or error.
 *
 *  Two paths:
 *    - Native (Capacitor on Android): `@codetrix-studio/capacitor-google-auth`
 *      pops the native Google Sign-In sheet, returns an idToken, we
 *      exchange it with Supabase via signInWithIdToken.
 *    - Web (browser dev/preview): redirect-based OAuth via
 *      supabase.auth.signInWithOAuth. The user navigates to
 *      accounts.google.com and back; the Supabase client picks the
 *      session out of the URL fragment via detectSessionInUrl.
 *
 *  We deliberately do NOT use the codetrix plugin on web: its
 *  implementation is built on the deprecated `gapi.auth2` library which
 *  Google retired in March 2023. The plugin is fine on native Android
 *  (different code path, native Google Sign-In SDK). */
export async function signInWithGoogle(): Promise<boolean> {
  if (!authAvailable()) return false;
  if (isNativePlatform()) {
    return signInNativeGoogle();
  }
  return signInWebGoogle();
}

async function signInNativeGoogle(): Promise<boolean> {
  const google = await nativeSignInGoogle();
  if (!google) return false;
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: google.idToken,
    });
    if (error) {
      await signOutGoogle();
      return false;
    }
    return true;
  } catch {
    await signOutGoogle();
    return false;
  }
}

async function signInWebGoogle(): Promise<boolean> {
  try {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Come back to the page that started the sign-in. After the
        // redirect lands, detectSessionInUrl reads the fragment and
        // fires SIGNED_IN → 'auth-changed' → the menu Account row
        // updates without further user action.
        redirectTo: window.location.origin,
      },
    });
    if (error) return false;
    // The page will navigate away to accounts.google.com. If we got
    // here without an error, the redirect is in flight; the boolean
    // we return is essentially academic.
    return true;
  } catch {
    return false;
  }
}

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return cap?.isNativePlatform ? cap.isNativePlatform() : false;
}

/** Sign out of Supabase AND the local Google session. Returns true on
 *  success — failures are silent so the UI stays responsive. */
export async function signOut(): Promise<boolean> {
  try {
    if (supabaseConfigured()) {
      const supabase = await getSupabase();
      await supabase.auth.signOut();
    }
  } catch {
    // ignore
  }
  await signOutGoogle();
  // The supabase auth listener will fire SIGNED_OUT → emits auth-changed.
  // Belt-and-suspenders: clear local state in case the listener missed.
  if (currentUser !== null) {
    currentUser = null;
    events.emit('auth-changed', { user: null });
  }
  return true;
}

function toAuthUser(
  id: string,
  email: string | null | undefined,
  metadata: Record<string, unknown> | undefined,
): AuthUser {
  const name =
    typeof metadata?.['full_name'] === 'string'
      ? (metadata['full_name'] as string)
      : typeof metadata?.['name'] === 'string'
        ? (metadata['name'] as string)
        : null;
  return {
    id,
    email: email ?? null,
    displayName: name,
  };
}

function sameUser(a: AuthUser | null, b: AuthUser | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id;
}
