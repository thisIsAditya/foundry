import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Foundry',
  slug: 'foundry',
  scheme: 'foundry',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'ai.foundry.app',
    supportsTablet: true,
  },
  android: {
    package: 'ai.foundry.app',
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-web-browser', 'expo-notifications'],
};

export default config;
