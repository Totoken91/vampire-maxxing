import type { CapacitorConfig } from '@capacitor/cli';

// VITE_GOOGLE_WEB_CLIENT_ID is read at runtime by src/platform/google-auth.ts
// (the JS bridge calls plugin.initialize({ clientId }) on first use). The
// `serverClientId` here is the build-time fallback the native plugin reads
// directly from `capacitor.config.ts` if the JS init never fires. We mirror
// the same value via process.env so a single source of truth in CI / .env.
//
// On Android the Google Sign-In SDK ALSO requires the app to be associated
// with the same OAuth client at the SHA-1 level. See docs/SETUP-AUTH.md for
// the Cloud Console steps.
const GOOGLE_WEB_CLIENT_ID =
  process.env.VITE_GOOGLE_WEB_CLIENT_ID ?? process.env.GOOGLE_WEB_CLIENT_ID ?? '';

const config: CapacitorConfig = {
  appId: 'quest.kenny.vampiremaxxing',
  appName: 'Vampire Maxxing',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#08050a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#08050a',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: GOOGLE_WEB_CLIENT_ID,
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
