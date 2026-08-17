import { color } from '@foundry/ui-native';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { clearAccessKey, signOut } from '../../lib/auth';

export default function MoreScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>More</Text>
      <Text style={styles.body}>Workspace switcher, providers, and sign-out.</Text>
      <Pressable
        style={styles.button}
        onPress={() => {
          void (async () => {
            await clearAccessKey();
            await signOut();
            router.replace('/(auth)/sign-in');
          })();
        }}
      >
        <Text style={styles.buttonLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
  button: {
    backgroundColor: color.statusDanger,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonLabel: { color: color.surfaceRaised, fontWeight: '600' },
});
