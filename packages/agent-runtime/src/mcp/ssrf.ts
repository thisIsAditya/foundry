import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { AppError } from '@foundry/observability';

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return (
    (n >= ipv4ToInt('10.0.0.0') && n <= ipv4ToInt('10.255.255.255')) ||
    (n >= ipv4ToInt('172.16.0.0') && n <= ipv4ToInt('172.31.255.255')) ||
    (n >= ipv4ToInt('192.168.0.0') && n <= ipv4ToInt('192.168.255.255')) ||
    (n >= ipv4ToInt('127.0.0.0') && n <= ipv4ToInt('127.255.255.255')) ||
    (n >= ipv4ToInt('169.254.0.0') && n <= ipv4ToInt('169.254.255.255')) ||
    n === 0
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('::ffff:')
  );
}

function addressBlocked(address: string, allowLoopback: boolean): boolean {
  const version = isIP(address);
  if (version === 4) {
    if (allowLoopback && address.startsWith('127.')) {
      return false;
    }
    return isPrivateIpv4(address);
  }
  if (version === 6) {
    if (allowLoopback && address === '::1') {
      return false;
    }
    return isPrivateIpv6(address);
  }
  return true;
}

export async function assertPublicHttpUrl(
  rawUrl: string,
  options: { allowLoopback?: boolean } = {},
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError({
      code: 'invalid_input',
      explanation: 'MCP server URL is not a valid URL.',
      nextAction: 'Provide an https URL for the MCP server.',
    });
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new AppError({
      code: 'invalid_input',
      explanation: 'MCP servers must use http or https.',
      nextAction: 'Use a remote Streamable HTTP or SSE endpoint.',
    });
  }
  if (parsed.username || parsed.password) {
    throw new AppError({
      code: 'invalid_input',
      explanation: 'MCP server URLs must not embed credentials.',
      nextAction: 'Pass secrets as an encrypted header instead.',
    });
  }

  const hostname = parsed.hostname;
  const allowLoopback = options.allowLoopback === true;
  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map((item) => item.address);

  if (addresses.some((address) => addressBlocked(address, allowLoopback))) {
    throw new AppError({
      code: 'policy_forbidden',
      explanation: 'MCP server hostname resolves to a private or loopback address.',
      nextAction: 'Use a public hostname. Internal URLs are blocked to prevent SSRF.',
    });
  }
  return parsed;
}
