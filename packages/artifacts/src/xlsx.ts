import { zipStore } from './xlsx-zip.js';

export type SheetCell = {
  ref: string;
  type: 'n' | 'inlineStr' | 'f';
  value?: string;
  formula?: string;
};

export type Sheet = {
  name: string;
  cells: readonly SheetCell[];
};

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cellXml(cell: SheetCell): string {
  if (cell.type === 'inlineStr') {
    return `<c r="${cell.ref}" t="inlineStr"><is><t>${escapeXml(cell.value ?? '')}</t></is></c>`;
  }
  if (cell.type === 'f') {
    return `<c r="${cell.ref}"><f>${escapeXml(cell.formula ?? '')}</f></c>`;
  }
  return `<c r="${cell.ref}"><v>${escapeXml(cell.value ?? '0')}</v></c>`;
}

function sheetXml(sheet: Sheet): string {
  const byRow = new Map<number, SheetCell[]>();
  for (const cell of sheet.cells) {
    const row = Number.parseInt(cell.ref.replace(/^[A-Z]+/, ''), 10);
    const list = byRow.get(row) ?? [];
    list.push(cell);
    byRow.set(row, list);
  }
  const rows = [...byRow.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([row, cells]) => `<row r="${row}">${cells.map(cellXml).join('')}</row>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
}

export function buildXlsx(sheets: readonly Sheet[]): Buffer {
  const workbookSheets = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join('');
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')}</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets
  .map(
    (_sheet, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join('')}
</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const files = [
    { name: '[Content_Types].xml', content: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', content: Buffer.from(rootRels, 'utf8') },
    { name: 'xl/workbook.xml', content: Buffer.from(workbook, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', content: Buffer.from(workbookRels, 'utf8') },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: Buffer.from(sheetXml(sheet), 'utf8'),
    })),
  ];
  return zipStore(files);
}
