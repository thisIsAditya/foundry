import type { DocumentModel } from './document-model.js';

function claimLines(model: DocumentModel, sectionId: string): string {
  const section = model.sections.find((item) => item.id === sectionId);
  if (section === undefined || section.claims.length === 0) {
    return '';
  }
  return section.claims
    .map((claim) => `- ${claim.label}: ${claim.value} (${claim.source})`)
    .join('\n');
}

export function renderMarkdown(model: DocumentModel): string {
  const parts = [`# ${model.title}`, ''];
  for (const section of model.sections) {
    parts.push(`## ${section.title}`, '', section.body);
    const claims = claimLines(model, section.id);
    if (claims.length > 0) {
      parts.push('', claims);
    }
    parts.push('');
  }
  if (model.staleWarnings.length > 0) {
    parts.push('## Stale warnings', '', ...model.staleWarnings.map((item) => `- ${item}`), '');
  }
  return parts.join('\n').trimEnd() + '\n';
}

export function renderSlideMarkdown(model: DocumentModel): string {
  return (
    model.sections
      .filter((section) => section.id !== 'provenance')
      .map((section) => {
        const claims = section.claims.map((claim) => `- ${claim.label}: ${claim.value}`).join('\n');
        return [`# ${section.title}`, '', section.body, claims === '' ? '' : `\n${claims}`]
          .join('\n')
          .trimEnd();
      })
      .concat(
        model.sections
          .filter((section) => section.id === 'provenance')
          .map((section) => `## ${section.title}\n\n${section.body}`),
      )
      .join('\n\n---\n\n') + '\n'
  );
}
