export const PROJECT_PANELS = ['plan', 'work', 'research', 'decisions', 'settings'] as const;
export type ProjectPanel = (typeof PROJECT_PANELS)[number];

export type ProjectPanelQuery = {
  section?: string;
  job?: string;
  task?: string;
  view?: string;
  filter?: string;
  finding?: string;
};

export function isProjectPanel(value: string | null): value is ProjectPanel {
  return PROJECT_PANELS.some((item) => item === value);
}

export function projectHref(projectId: string): string {
  return `/p/${projectId}`;
}

export function projectPanelHref(
  projectId: string,
  panel: ProjectPanel,
  extras: ProjectPanelQuery = {},
): string {
  const params = new URLSearchParams({ panel });
  if (extras.section !== undefined) params.set('section', extras.section);
  if (extras.job !== undefined) params.set('job', extras.job);
  if (extras.task !== undefined) params.set('task', extras.task);
  if (extras.view !== undefined) params.set('view', extras.view);
  if (extras.filter !== undefined) params.set('filter', extras.filter);
  if (extras.finding !== undefined) params.set('finding', extras.finding);
  return `/p/${projectId}?${params.toString()}`;
}
