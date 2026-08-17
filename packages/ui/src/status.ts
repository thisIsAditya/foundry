import type {
  ArtifactStatus,
  BusinessModelSectionStatus,
  ProductJobStatus,
  SectionStatus,
} from '@foundry/domain';

import { color, type ColorToken } from './tokens/color.js';

export type StatusPresentation = {
  label: string;
  icon: string;
  colorToken: ColorToken;
  hex: string;
};

function present(label: string, icon: string, colorToken: ColorToken): StatusPresentation {
  return { label, icon, colorToken, hex: color[colorToken] };
}

const sectionStatus: Record<SectionStatus, StatusPresentation> = {
  not_started: present('Not started', '○', 'textMuted'),
  draft: present('Draft', '✎', 'statusDraft'),
  evidence_required: present('Evidence required', '!', 'statusWarning'),
  review_required: present('Review required', '◎', 'statusInfo'),
  accepted: present('Accepted', '✓', 'statusSuccess'),
  stale: present('Stale', '↻', 'statusWarning'),
  blocked: present('Blocked', '✕', 'statusDanger'),
  superseded: present('Superseded', '–', 'textMuted'),
};

const artifactStatus: Record<ArtifactStatus, StatusPresentation> = {
  requested: present('Requested', '○', 'textMuted'),
  generating: present('Generating', '…', 'statusInfo'),
  current: present('Current', '✓', 'statusSuccess'),
  failed: present('Failed', '✕', 'statusDanger'),
  stale: present('Stale', '↻', 'statusWarning'),
  superseded: present('Superseded', '–', 'textMuted'),
};

const businessModelSectionStatus: Record<BusinessModelSectionStatus, StatusPresentation> = {
  draft: present('Draft', '✎', 'statusDraft'),
  assumption_heavy: present('Assumption-heavy', '~', 'statusDraft'),
  researching: present('Researching', '…', 'statusInfo'),
  needs_founder: present('Needs founder', '!', 'statusWarning'),
  supported: present('Supported', '✓', 'statusSuccess'),
  stale: present('Stale', '↻', 'statusWarning'),
  blocked: present('Blocked', '✕', 'statusDanger'),
  accepted: present('Accepted', '✓', 'statusSuccess'),
};

const productJobStatus: Record<ProductJobStatus, StatusPresentation> = {
  proposed: present('Proposed', '○', 'statusDraft'),
  queued: present('Queued', '…', 'statusInfo'),
  running: present('Running', '▶', 'statusInfo'),
  needs_founder: present('Needs you', '!', 'statusWarning'),
  needs_approval: present('Needs approval', '◎', 'statusWarning'),
  complete: present('Complete', '✓', 'statusSuccess'),
  blocked: present('Blocked', '✕', 'statusDanger'),
  failed: present('Failed', '✕', 'statusDanger'),
  canceled: present('Canceled', '–', 'textMuted'),
  expired: present('Expired', '–', 'textMuted'),
};

export function sectionStatusPresentation(status: SectionStatus): StatusPresentation {
  return sectionStatus[status];
}

export function artifactStatusPresentation(status: ArtifactStatus): StatusPresentation {
  return artifactStatus[status];
}

export function businessModelSectionStatusPresentation(
  status: BusinessModelSectionStatus,
): StatusPresentation {
  return businessModelSectionStatus[status];
}

export function productJobStatusPresentation(status: ProductJobStatus): StatusPresentation {
  return productJobStatus[status];
}
