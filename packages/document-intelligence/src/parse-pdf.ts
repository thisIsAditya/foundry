import { limits } from '@foundry/config/limits';
import { extractText, getDocumentProxy } from 'unpdf';

import { parsePlainText, type ParsedBlock } from './parse-text.js';
import { IngestionRejectError } from './reject.js';

export async function parsePdf(
  bytes: Uint8Array,
  maxPages: number = limits.maxPdfPagesParsed,
): Promise<ParsedBlock[]> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(Uint8Array.from(bytes));
  } catch (error) {
    throw new IngestionRejectError(
      'parse_failed',
      error instanceof Error ? error.message : 'PDF could not be parsed.',
    );
  }

  if (pdf.numPages > maxPages) {
    throw new IngestionRejectError(
      'page_limit',
      `PDF has ${pdf.numPages} pages; the limit is ${maxPages}.`,
    );
  }

  try {
    const extracted = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
    const blocks: ParsedBlock[] = [];
    for (const [index, pageText] of pages.entries()) {
      const page = index + 1;
      const pageBlocks = parsePlainText(pageText);
      if (pageBlocks.length === 0) {
        continue;
      }
      for (const block of pageBlocks) {
        blocks.push({
          blockType: 'text',
          sequenceNo: blocks.length,
          textContent: block.textContent,
          page,
          ...(block.paragraph === undefined ? {} : { paragraph: block.paragraph }),
        });
      }
    }
    return blocks;
  } catch (error) {
    if (error instanceof IngestionRejectError) {
      throw error;
    }
    throw new IngestionRejectError(
      'parse_failed',
      error instanceof Error ? error.message : 'PDF text extraction failed.',
    );
  }
}
