export const color = {
  surface: '#fafafa',
  surfaceRaised: '#ffffff',
  border: '#e5e5e5',
  text: '#171717',
  textMuted: '#737373',
  statusDraft: '#d97706',
  statusWarning: '#ea580c',
  statusInfo: '#2563eb',
  statusSuccess: '#16a34a',
  statusDanger: '#dc2626',
} as const;

export type ColorToken = keyof typeof color;
