import type { CapacitorConfig } from '@capacitor/cli';

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
  },
};

export default config;
