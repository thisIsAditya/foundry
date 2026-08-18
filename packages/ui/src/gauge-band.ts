import { color, type ColorToken } from './tokens/color.js';

export type GaugeBand = 'early' | 'developing' | 'validated' | 'unscored';

export function scoreBandOf(overall: number | null): GaugeBand {
  if (overall === null) return 'unscored';
  if (overall < 40) return 'early';
  if (overall < 75) return 'developing';
  return 'validated';
}

export function gaugeBandPresentation(band: GaugeBand): { label: string; colorToken: ColorToken } {
  switch (band) {
    case 'early':
      return { label: 'Early — mostly assumptions', colorToken: 'gaugeOrange' };
    case 'developing':
      return { label: 'Developing — real gaps remain', colorToken: 'gaugeAmber' };
    case 'validated':
      return { label: 'Validated — evidence-backed', colorToken: 'gaugeGreen' };
    case 'unscored':
      return { label: 'Not scored yet', colorToken: 'textMuted' };
  }
}

export function gaugeBandColor(band: GaugeBand): string {
  return color[gaugeBandPresentation(band).colorToken];
}
