import { describe, expect, it } from 'vitest';

import { clampCofounderRailWidth } from './cofounder-rail-layout';

describe('clampCofounderRailWidth', () => {
  it('caps the rail at half the viewport', () => {
    expect(clampCofounderRailWidth(800, 1200)).toBe(600);
  });

  it('does not shrink below the minimum when the viewport allows it', () => {
    expect(clampCofounderRailWidth(100, 1200)).toBe(280);
  });

  it('allows a narrow rail when half the screen is below the desktop minimum', () => {
    expect(clampCofounderRailWidth(400, 400)).toBe(200);
  });
});
