export function requireRow<T>(rows: readonly T[], context: string): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`${context}: expected a row`);
  }
  return row;
}
