import type { ArtifactStatus, SectionStatus } from '@foundry/domain';

import { color, type ColorToken } from './tokens/color.js';

export type StatusPresentation = {
  label: string;
  colorToken: ColorToken;
  hex: string;
};

const sectionStatus: Record<SectionStatus, StatusPresentation> = {
  not_started: { label: 'Not started', colorToken: 'textMuted', hex: color.textMuted },
  draft: { label: 'Draft', colorToken: 'statusDraft', hex: color.statusDraft },
  evidence_required: {
    label: 'Evidence required',
    colorToken: 'statusWarning',
    hex: color.statusWarning,
  },
  review_required: { label: 'Review required', colorToken: 'statusInfo', hex: color.statusInfo },
  accepted: { label: 'Accepted', colorToken: 'statusSuccess', hex: color.statusSuccess },
  stale: { label: 'Stale', colorToken: 'statusWarning', hex: color.statusWarning },
  blocked: { label: 'Blocked', colorToken: 'statusDanger', hex: color.statusDanger },
  superseded: { label: 'Superseded', colorToken: 'textMuted', hex: color.textMuted },
};

const artifactStatus: Record<ArtifactStatus, StatusPresentation> = {
  requested: { label: 'Requested', colorToken: 'textMuted', hex: color.textMuted },
  generating: { label: 'Generating', colorToken: 'statusInfo', hex: color.statusInfo },
  current: { label: 'Current', colorToken: 'statusSuccess', hex: color.statusSuccess },
  failed: { label: 'Failed', colorToken: 'statusDanger', hex: color.statusDanger },
  stale: { label: 'Stale', colorToken: 'statusWarning', hex: color.statusWarning },
  superseded: { label: 'Superseded', colorToken: 'textMuted', hex: color.textMuted },
};

export function sectionStatusPresentation(status: SectionStatus): StatusPresentation {
  return sectionStatus[status];
}

export function artifactStatusPresentation(status: ArtifactStatus): StatusPresentation {
  return artifactStatus[status];
}
