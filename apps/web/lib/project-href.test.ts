import { describe, expect, it } from 'vitest';

import { isProjectPanel, projectHref, projectPanelHref } from './project-href';

describe('projectPanelHref', () => {
  it('builds drawer query strings on the project URL', () => {
    expect(projectHref('aaaa')).toBe('/p/aaaa');
    expect(projectPanelHref('aaaa', 'plan')).toBe('/p/aaaa?panel=plan');
    expect(projectPanelHref('aaaa', 'plan', { section: 'problem' })).toBe(
      '/p/aaaa?panel=plan&section=problem',
    );
    expect(projectPanelHref('aaaa', 'work', { view: 'blocked', job: 'j1' })).toBe(
      '/p/aaaa?panel=work&job=j1&view=blocked',
    );
    expect(projectPanelHref('aaaa', 'research', { finding: 'f1' })).toBe(
      '/p/aaaa?panel=research&finding=f1',
    );
    expect(isProjectPanel('settings')).toBe(true);
    expect(isProjectPanel('overview')).toBe(false);
  });
});
