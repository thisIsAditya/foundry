import { color } from '@foundry/ui-native';
import { StyleSheet, Text, View } from 'react-native';

export default function DeskScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Founder desk</Text>
      <Text style={styles.body}>
        This screen renders `project.getDeskSummary` for the active project — the same read model as
        web. Open More to switch workspace once you are signed in.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
});
