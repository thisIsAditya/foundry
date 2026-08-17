import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { apiBaseUrl } from './env';

export const authClient = createAuthClient({
  baseURL: apiBaseUrl(),
  plugins: [
    expoClient({
      scheme: 'foundry',
      storagePrefix: 'foundry',
      storage: SecureStore,
    }),
  ],
});

export const { useSession, signIn, signOut } = authClient;

const ACCESS_KEY_STORE = 'foundry.access-key';

export async function storeAccessKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY_STORE, key);
}

export async function clearAccessKey(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY_STORE);
}

export async function readAccessKey(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY_STORE);
}
