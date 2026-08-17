export type ParsedBlock = {
  blockType: 'text';
  sequenceNo: number;
  textContent: string;
  page?: number;
  paragraph?: number;
};

export function parsePlainText(text: string): ParsedBlock[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const parts =
    paragraphs.length === 0 ? (text.trim().length === 0 ? [] : [text.trim()]) : paragraphs;
  return parts.map((textContent, sequenceNo) => ({
    blockType: 'text' as const,
    sequenceNo,
    textContent,
    paragraph: sequenceNo,
  }));
}

export function titleFromText(text: string, filename: string | null): string | null {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (firstLine !== undefined) {
    return firstLine.slice(0, 200);
  }
  if (filename === null || filename.length === 0) {
    return null;
  }
  return filename.replace(/\.[^.]+$/, '') || filename;
}
