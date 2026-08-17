import { color } from '@foundry/ui-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiBaseUrl } from '../../lib/env';
import { storeAccessKey } from '../../lib/auth';

export default function AccessKeyScreen() {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function verify(): Promise<void> {
    setError(null);
    const response = await fetch(`${apiBaseUrl()}/api/auth/verify-access-key`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      setError('That access key was rejected.');
      return;
    }
    await storeAccessKey(key);
    router.replace('/(app)/home');
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Access key</Text>
      <Text style={styles.body}>Admin and test accounts only. Founders should use Google.</Text>
      <TextInput
        value={key}
        onChangeText={setKey}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="foundry_..."
        style={styles.input}
      />
      {error === null ? null : <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.button} onPress={() => void verify()}>
        <Text style={styles.buttonLabel}>Continue</Text>
      </Pressable>
      <Link href="/(auth)/sign-in" style={styles.secondary}>
        Back to Google sign-in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.surface,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  title: { color: color.text, fontSize: 24, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
  input: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 8,
    padding: 12,
    color: color.text,
    backgroundColor: color.surfaceRaised,
  },
  error: { color: color.statusDanger },
  button: {
    backgroundColor: color.statusInfo,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonLabel: { color: color.surfaceRaised, fontWeight: '600' },
  secondary: { color: color.textMuted },
});
