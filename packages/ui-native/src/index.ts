import { color } from '@foundry/ui';

export {
  artifactStatusPresentation,
  color,
  fontSize,
  fontWeight,
  motion,
  radius,
  sectionStatusPresentation,
  spacing,
  type ColorToken,
  type StatusPresentation,
} from '@foundry/ui';

export const nativewindTheme = {
  colors: {
    surface: color.surface,
    'surface-raised': color.surfaceRaised,
    border: color.border,
    text: color.text,
    'text-muted': color.textMuted,
    'status-draft': color.statusDraft,
    'status-warning': color.statusWarning,
    'status-info': color.statusInfo,
    'status-success': color.statusSuccess,
    'status-danger': color.statusDanger,
  },
};
