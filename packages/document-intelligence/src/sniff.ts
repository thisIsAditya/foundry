import { fileTypeFromBuffer } from 'file-type';

const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

export async function sniffMime(bytes: Uint8Array): Promise<string | undefined> {
  const detected = await fileTypeFromBuffer(bytes);
  if (detected !== undefined) {
    return detected.mime;
  }
  if (isUtf8Text(bytes)) {
    return 'text/plain';
  }
  return undefined;
}

export function isUtf8Text(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.byteLength, 8 * 1024));
  if (sample.includes(0)) {
    return false;
  }
  try {
    UTF8_DECODER.decode(sample);
    return true;
  } catch {
    return false;
  }
}

export function mimeAllowedForIngest(
  declaredMime: string,
  sniffedMime: string | undefined,
): boolean {
  if (declaredMime === 'application/pdf') {
    return sniffedMime === 'application/pdf';
  }
  if (declaredMime === 'text/plain' || declaredMime === 'text/markdown') {
    return sniffedMime === 'text/plain' || sniffedMime === 'text/markdown';
  }
  return false;
}
