import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pinFilePath = join(dirname(fileURLToPath(import.meta.url)), '../../../.local-admin-pin');

export function resolveLocalAdminPin(pin: string): string | undefined {
  if (!existsSync(pinFilePath)) {
    return undefined;
  }
  const body = readFileSync(pinFilePath, 'utf8');
  const values = new Map<string, string>();
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    values.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  if (values.get('PIN') !== pin) {
    return undefined;
  }
  const accessKey = values.get('ACCESS_KEY');
  return accessKey === undefined || accessKey.length === 0 ? undefined : accessKey;
}
