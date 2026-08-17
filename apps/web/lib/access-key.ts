export const ACCESS_KEY_COOKIE = 'foundry.access-key';

export function accessKeyFromCookieHeader(cookieHeader: string | null): string | undefined {
  if (cookieHeader === null || cookieHeader.length === 0) {
    return undefined;
  }
  const prefix = `${ACCESS_KEY_COOKIE}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return undefined;
}

export function headersWithAccessKey(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    headers.append(key, value);
  });
  if (headers.get('x-api-key') !== null) {
    return headers;
  }
  const key = accessKeyFromCookieHeader(headers.get('cookie'));
  if (key !== undefined) {
    headers.set('x-api-key', key);
  }
  return headers;
}
