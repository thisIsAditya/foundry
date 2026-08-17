function pdfEscape(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function toWinAnsi(value: string): string {
  return [...value].map((char) => (char.charCodeAt(0) < 128 ? char : '?')).join('');
}

function wrapLine(line: string, width: number): string[] {
  if (line.length <= width) {
    return [line];
  }
  const words = line.split(' ');
  const rows: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`;
    if (next.length > width && current.length > 0) {
      rows.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current.length > 0) {
    rows.push(current);
  }
  return rows.length === 0 ? [''] : rows;
}

function pageStream(lines: string[], startY: number, fontSize: number, leading: number): string {
  const ops = ['BT', `/F1 ${String(fontSize)} Tf`, `72 ${String(startY)} Td`];
  lines.forEach((line, index) => {
    if (index > 0) {
      ops.push(`0 -${String(leading)} Td`);
    }
    ops.push(`(${pdfEscape(toWinAnsi(line))}) Tj`);
  });
  ops.push('ET');
  return ops.join('\n');
}

export function renderPdf(title: string, bodyLines: string[]): Buffer {
  const fontSize = 11;
  const leading = 14;
  const startY = 720;
  const maxLines = 46;
  const wrapped = [title, '', ...bodyLines].flatMap((line) => wrapLine(line, 90));
  const pages: string[][] = [];
  for (let index = 0; index < wrapped.length; index += maxLines) {
    pages.push(wrapped.slice(index, index + maxLines));
  }
  if (pages.length === 0) {
    pages.push([title]);
  }

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageIds = pages.map((_, index) => 4 + index * 2);
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${String(id)} 0 R`).join(' ')}] /Count ${String(pages.length)} >>`,
  );
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  for (const [index, pageLines] of pages.entries()) {
    const contentId = 5 + index * 2;
    const pageId = 4 + index * 2;
    objects[pageId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${String(contentId)} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`;
    const stream = pageStream(pageLines, startY, fontSize, leading);
    objects[contentId - 1] =
      `<< /Length ${String(Buffer.byteLength(stream, 'utf8'))} >>\nstream\n${stream}\nendstream`;
  }

  const defined = objects.filter((item): item is string => item !== undefined);
  let offset = 0;
  const header = '%PDF-1.4\n';
  const chunks: Buffer[] = [Buffer.from(header, 'utf8')];
  offset += Buffer.byteLength(header, 'utf8');
  const xref = [0];
  defined.forEach((object, index) => {
    xref.push(offset);
    const body = `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
    chunks.push(Buffer.from(body, 'utf8'));
    offset += Buffer.byteLength(body, 'utf8');
  });
  const xrefStart = offset;
  const xrefLines = [
    'xref',
    `0 ${String(defined.length + 1)}`,
    '0000000000 65535 f ',
    ...xref.slice(1).map((value) => `${String(value).padStart(10, '0')} 00000 n `),
  ];
  const xrefBlock = `${xrefLines.join('\n')}\n`;
  chunks.push(Buffer.from(xrefBlock, 'utf8'));
  const trailer = `trailer\n<< /Size ${String(defined.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xrefStart)}\n%%EOF\n`;
  chunks.push(Buffer.from(trailer, 'utf8'));
  return Buffer.concat(chunks);
}

export function pdfLinesFromMarkdown(markdown: string): string[] {
  return markdown
    .split('\n')
    .map((line) => line.replace(/^#+ /, '').replace(/^- /, '• '))
    .filter((line) => line !== '---');
}
