export function ventureNameFromPitch(pitch: string): string {
  const line = pitch.split('\n')[0]?.trim() ?? '';
  if (line.length === 0) {
    return 'Untitled venture';
  }
  if (line.length <= 60) {
    return line;
  }
  return `${line.slice(0, 57).trimEnd()}…`;
}
