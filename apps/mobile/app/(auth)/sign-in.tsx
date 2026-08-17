import { color } from '@foundry/ui-native';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { signIn } from '../../lib/auth';

export default function SignInScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Foundry</Text>
      <Text style={styles.body}>Sign in with Google to open the founder desk on this device.</Text>
      <Pressable
        style={styles.button}
        onPress={() => {
          void signIn.social({ provider: 'google' });
        }}
      >
        <Text style={styles.buttonLabel}>Continue with Google</Text>
      </Pressable>
      <Link href="/(auth)/access-key" style={styles.secondary}>
        Use an access key instead
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
  title: { color: color.text, fontSize: 28, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
  button: {
    backgroundColor: color.statusInfo,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonLabel: { color: color.surfaceRaised, fontWeight: '600' },
  secondary: { color: color.textMuted, marginTop: 8 },
});
