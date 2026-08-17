import { color } from '@foundry/ui-native';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function SprintScreen() {
  const { sprintId } = useLocalSearchParams<{ sprintId: string }>();
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Sprint</Text>
      <Text style={styles.body}>{sprintId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
});
