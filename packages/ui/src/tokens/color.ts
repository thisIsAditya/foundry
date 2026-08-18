export const color = {
  surface: '#F6F4EF',
  surfaceRaised: '#FFFFFF',
  border: '#E4E0D6',
  text: '#14161A',
  textMuted: '#6B6D72',
  statusDraft: '#D9A62B',
  statusWarning: '#D9663D',
  statusInfo: '#3B5BA5',
  statusSuccess: '#4C8B5D',
  statusDanger: '#C6432E',
  gaugeOrange: '#D9663D',
  gaugeAmber: '#D9A62B',
  gaugeGreen: '#4C8B5D',
  ink: '#14161A',
  paper: '#F6F4EF',
} as const;

export type ColorToken = keyof typeof color;
