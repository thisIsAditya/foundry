import { businessModelSectionStatusPresentation } from '@foundry/ui';
import type { BusinessModelSectionStatus } from '@foundry/domain';

export function SectionStatusBadge({ status }: { status: BusinessModelSectionStatus }) {
  const presentation = businessModelSectionStatusPresentation(status);
  const tone =
    presentation.colorToken === 'statusSuccess'
      ? 'badge-success'
      : presentation.colorToken === 'statusWarning'
        ? 'badge-warning'
        : presentation.colorToken === 'statusInfo'
          ? 'badge-info'
          : presentation.colorToken === 'statusDraft'
            ? 'badge-draft'
            : 'badge';
  return (
    <span className={tone}>
      <span aria-hidden="true">{presentation.icon}</span>
      {presentation.label}
    </span>
  );
}
