import { artifactStatusPresentation, color } from '@foundry/ui-native';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function ArtifactScreen() {
  const { artifactId } = useLocalSearchParams<{ artifactId: string }>();
  const generating = artifactStatusPresentation('generating');
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Artifact</Text>
      <Text style={styles.body}>{artifactId}</Text>
      <Text style={{ color: generating.hex }}>{generating.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
});
