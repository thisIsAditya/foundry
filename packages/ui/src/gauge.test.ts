import { describe, expect, it } from 'vitest';

import { gaugeBandPresentation, scoreBandOf } from './gauge-band.js';

describe('scoreBandOf', () => {
  it('maps null and the three D4 bands', () => {
    expect(scoreBandOf(null)).toBe('unscored');
    expect(scoreBandOf(0)).toBe('early');
    expect(scoreBandOf(39)).toBe('early');
    expect(scoreBandOf(40)).toBe('developing');
    expect(scoreBandOf(74)).toBe('developing');
    expect(scoreBandOf(75)).toBe('validated');
    expect(scoreBandOf(100)).toBe('validated');
  });
});

describe('gaugeBandPresentation', () => {
  it('keeps score-band colors on the dedicated gauge tokens', () => {
    expect(gaugeBandPresentation('early')).toEqual({
      label: 'Early — mostly assumptions',
      colorToken: 'gaugeOrange',
    });
    expect(gaugeBandPresentation('developing')).toEqual({
      label: 'Developing — real gaps remain',
      colorToken: 'gaugeAmber',
    });
    expect(gaugeBandPresentation('validated')).toEqual({
      label: 'Validated — evidence-backed',
      colorToken: 'gaugeGreen',
    });
    expect(gaugeBandPresentation('unscored')).toEqual({
      label: 'Not scored yet',
      colorToken: 'textMuted',
    });
  });
});
