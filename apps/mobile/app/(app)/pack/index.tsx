import { color } from '@foundry/ui-native';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function PackIndexScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Company pack</Text>
      <Text style={styles.body}>Read-only sections. Complex edits continue on web.</Text>
      <Link href="/(app)/pack/overview" style={styles.link}>
        Open overview
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
  link: { color: color.statusInfo, fontWeight: '600' },
});
