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
    infoPlist: {
      NSMicrophoneUsageDescription:
        'Foundry records voice notes for interviews and the co-founder conversation.',
      NSCameraUsageDescription: 'Foundry attaches photos to interview and field notes.',
      NSPhotoLibraryUsageDescription: 'Foundry attaches photos to interview and field notes.',
    },
  },
  android: {
    package: 'ai.foundry.app',
    permissions: ['RECORD_AUDIO', 'CAMERA'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    'expo-notifications',
    'expo-audio',
    [
      'expo-image-picker',
      {
        photosPermission: 'Foundry attaches photos to interview and field notes.',
        cameraPermission: 'Foundry attaches photos to interview and field notes.',
      },
    ],
  ],
};

export default config;
