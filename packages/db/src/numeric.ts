export function numericToString(value: unknown): string {
  if (typeof value === 'string') {
    return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  throw new Error(`Expected numeric string, received ${typeof value}`);
}

export function nullableNumericToString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return numericToString(value);
}
