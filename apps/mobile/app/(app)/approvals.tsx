import { color } from '@foundry/ui-native';
import { StyleSheet, Text, View } from 'react-native';

export default function ApprovalsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Approvals</Text>
      <Text style={styles.body}>
        Approval actions require a live round trip. They are not queued while offline.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
});
