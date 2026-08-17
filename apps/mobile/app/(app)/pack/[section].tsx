import { color } from '@foundry/ui-native';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function PackSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Pack</Text>
      <Text style={styles.body}>
        Section `{section ?? 'overview'}` is a read-only view of the same pack the web app edits.
        Complex MoneyRules forms continue on web.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
});
