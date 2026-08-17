import { color } from '@foundry/ui-native';
import { StyleSheet } from 'react-native';

export const screen = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface, padding: 20, gap: 12 },
  title: { color: color.text, fontSize: 22, fontWeight: '600' },
  lede: { color: color.textMuted, fontSize: 15, lineHeight: 22 },
  card: {
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    backgroundColor: color.surfaceRaised,
    gap: 8,
  },
  cardTitle: { color: color.text, fontSize: 16, fontWeight: '600' },
  body: { color: color.text, fontSize: 15, lineHeight: 22 },
  muted: { color: color.textMuted, fontSize: 13 },
  alert: { color: color.statusDanger, fontSize: 14 },
  input: {
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: color.text,
    backgroundColor: color.surfaceRaised,
  },
  button: {
    backgroundColor: color.text,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonLabel: { color: color.surfaceRaised, fontWeight: '600' },
  secondary: {
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: { color: color.text, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: color.textMuted,
    fontSize: 12,
  },
});
