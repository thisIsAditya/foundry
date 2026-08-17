import type { DocumentModel } from './document-model.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function paragraphHtml(body: string): string {
  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        return `<li>${escapeHtml(trimmed.slice(2))}</li>`;
      }
      if (trimmed.length === 0) {
        return '';
      }
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .join('\n');
}

export function renderHtml(
  model: DocumentModel,
  variant: 'document' | 'slides' | 'canvas',
): string {
  const sections = model.sections
    .map((section) => {
      const claims =
        section.claims.length === 0
          ? ''
          : `<dl>${section.claims
              .map(
                (claim) =>
                  `<dt>${escapeHtml(claim.label)}</dt><dd>${escapeHtml(claim.value)} <span data-source="${escapeHtml(claim.source)}">${escapeHtml(claim.source)}</span></dd>`,
              )
              .join('')}</dl>`;
      const className =
        variant === 'slides' ? 'slide' : variant === 'canvas' ? 'canvas-cell' : 'section';
      return `<section class="${className}" id="${escapeHtml(section.id)}"><h2>${escapeHtml(section.title)}</h2>${paragraphHtml(section.body)}${claims}</section>`;
    })
    .join('\n');
  const warnings =
    model.staleWarnings.length === 0
      ? ''
      : `<aside class="stale">${model.staleWarnings.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</aside>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(model.title)}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem auto; max-width: 52rem; color: #171717; }
    h1, h2 { font-weight: 600; }
    .slide { min-height: 18rem; border-bottom: 1px solid #e5e5e5; padding: 2rem 0; }
    .canvas { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .canvas-cell { border: 1px solid #e5e5e5; padding: 1rem; }
    .stale { background: #fff7ed; padding: 1rem; }
    dt { font-weight: 600; }
  </style>
</head>
<body>
  <h1>${escapeHtml(model.title)}</h1>
  ${warnings}
  <div class="${variant === 'canvas' ? 'canvas' : variant}">
    ${sections}
  </div>
</body>
</html>
`;
}
