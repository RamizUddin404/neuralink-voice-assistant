import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.neuralink.voiceassistant',
  appName: 'Neuralink Voice Assistant',
  webDir: 'out',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '258794901471-l4hm524teu8oiiodam70qqthumvm48ml.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
