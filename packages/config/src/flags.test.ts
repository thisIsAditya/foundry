import { describe, expect, it } from 'vitest';

import { flagDefaults, flagOwners, flagRemovalConditions } from './flags.js';

describe('foundry flags', () => {
  it('keeps the journey cutover, co-founder UI, and operation worker on by default', () => {
    expect(flagDefaults.journeyCutover).toBe(true);
    expect(flagDefaults.assistantUi).toBe(true);
    expect(flagDefaults.cofounderWorker).toBe(true);
  });

  it('records an owner and removal condition for each flag', () => {
    for (const name of Object.keys(flagDefaults) as (keyof typeof flagDefaults)[]) {
      expect(flagOwners[name].length).toBeGreaterThan(0);
      expect(flagRemovalConditions[name].length).toBeGreaterThan(0);
    }
  });
});
