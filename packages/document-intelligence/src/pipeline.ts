import { createHash } from 'node:crypto';

import { limits } from '@foundry/config/limits';

import { scanBytes, type MalwareScanOptions } from './malware.js';
import { parsePdf } from './parse-pdf.js';
import { parsePlainText, titleFromText, type ParsedBlock } from './parse-text.js';
import { IngestionRejectError } from './reject.js';
import { mimeAllowedForIngest, sniffMime } from './sniff.js';
import { detectPromptInjection, wrapUntrustedDocument } from './wrap-untrusted.js';

export type IngestionPipelineInput = {
  bytes: Uint8Array;
  declaredMime: string;
  filename: string | null;
  sourceId: string;
  maxBytes?: number;
  malware?: MalwareScanOptions;
};

export type IngestionPipelineResult = {
  sniffedMime: string;
  contentHash: string;
  title: string | null;
  blocks: ParsedBlock[];
  promptInjection: { suspected: boolean; matches: string[] };
  wrappedText: string;
  parserMetadata: Record<string, unknown>;
};

export async function runIngestionPipeline(
  input: IngestionPipelineInput,
): Promise<IngestionPipelineResult> {
  const maxBytes = input.maxBytes ?? limits.maxUploadFileBytes.document;
  if (input.bytes.byteLength === 0) {
    throw new IngestionRejectError('parse_failed', 'Uploaded file is empty.');
  }
  if (input.bytes.byteLength > maxBytes) {
    throw new IngestionRejectError('too_large', 'Uploaded file exceeds the size limit.');
  }

  const sniffedMime = await sniffMime(input.bytes);
  if (!mimeAllowedForIngest(input.declaredMime, sniffedMime)) {
    throw new IngestionRejectError(
      'mime_mismatch',
      'File type does not match the declared MIME type.',
    );
  }
  if (sniffedMime === undefined) {
    throw new IngestionRejectError('mime_mismatch', 'File type could not be determined.');
  }

  await scanBytes(input.bytes, input.malware ?? {});

  const blocks =
    sniffedMime === 'application/pdf'
      ? await parsePdf(input.bytes)
      : parsePlainText(new TextDecoder('utf-8').decode(input.bytes));
  if (blocks.length === 0) {
    throw new IngestionRejectError('parse_failed', 'No text could be extracted.');
  }

  const combined = blocks.map((block) => block.textContent).join('\n\n');
  const promptInjection = detectPromptInjection(combined);
  const wrappedText = wrapUntrustedDocument(combined, input.sourceId);

  return {
    sniffedMime,
    contentHash: createHash('sha256').update(input.bytes).digest('hex'),
    title: titleFromText(combined, input.filename),
    blocks,
    promptInjection,
    wrappedText,
    parserMetadata: {
      parser: sniffedMime === 'application/pdf' ? 'pdf' : 'text',
      declaredMime: input.declaredMime,
      sniffedMime,
      wrapRequired: true,
      promptInjectionSuspected: promptInjection.suspected,
      promptInjectionMatches: promptInjection.matches,
    },
  };
}
