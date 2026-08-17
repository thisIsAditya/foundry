import { color } from '@foundry/ui-native';
import { StyleSheet, Text, View } from 'react-native';

export default function EvidenceScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Evidence</Text>
      <Text style={styles.body}>
        Capture uses `evidence.createUploadIntent` then a direct S3 PUT, the same path as web.
        Camera and file pickers are added when this screen is wired to an active project.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface, padding: 24, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  body: { color: color.textMuted, fontSize: 16, lineHeight: 24 },
});
