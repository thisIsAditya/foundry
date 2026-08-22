export const PROJECT_DESTINATIONS = [
  'overview',
  'journey',
  'model',
  'evidence',
  'decisions',
  'co-founder',
] as const;
export type ProjectDestination = (typeof PROJECT_DESTINATIONS)[number];

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

export function projectJourneyHref(projectId: string, stepId?: string): string {
  return stepId === undefined ? `/p/${projectId}/journey` : `/p/${projectId}/journey/${stepId}`;
}

export function projectModelHref(projectId: string, section?: string): string {
  return section === undefined ? `/p/${projectId}/model` : `/p/${projectId}/model/${section}`;
}

export function projectEvidenceHref(projectId: string): string {
  return `/p/${projectId}/evidence`;
}

export function projectDecisionsHref(projectId: string, proposalId?: string): string {
  return proposalId === undefined
    ? `/p/${projectId}/decisions`
    : `/p/${projectId}/decisions?proposal=${proposalId}`;
}

export function projectCofounderHref(projectId: string): string {
  return `/p/${projectId}/co-founder`;
}

export function projectSettingsHref(projectId: string): string {
  return `/p/${projectId}?panel=settings`;
}

/** @deprecated Query-panel URLs remain one-release compatibility wrappers. */
export function projectPanelHref(
  projectId: string,
  panel: ProjectPanel,
  extras: ProjectPanelQuery = {},
): string {
  if (panel === 'settings') {
    return projectSettingsHref(projectId);
  }
  if (panel === 'plan') {
    return projectModelHref(projectId, extras.section);
  }
  if (panel === 'work') {
    return extras.task === undefined
      ? projectJourneyHref(projectId)
      : projectJourneyHref(projectId, extras.task);
  }
  if (panel === 'research') {
    return projectEvidenceHref(projectId);
  }
  return projectDecisionsHref(projectId);
}
