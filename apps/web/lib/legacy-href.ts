import { PackSectionKeyToBusinessModelSectionKey } from '@foundry/domain';

import { isProjectPanel } from './project-href';

const PACK_KEYS = PackSectionKeyToBusinessModelSectionKey;

export function legacyAppDestination(pathname: string, search = ''): string | null {
  if (pathname === '/w' || pathname.startsWith('/w/')) {
    return '/home';
  }
  const match = /^\/p\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (match === null) {
    return null;
  }
  const projectId = match[1]!;
  const rest = match[2];
  if (rest === undefined || rest.length === 0) {
    return null;
  }
  const [first, second] = rest.split('/');
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (first === 'co-founder') {
    return `/p/${projectId}`;
  }
  if (first === 'approvals') {
    return `/p/${projectId}?panel=work&view=blocked`;
  }
  if (first === 'pack') {
    const mapped =
      second !== undefined && second in PACK_KEYS
        ? PACK_KEYS[second as keyof typeof PACK_KEYS]
        : second;
    params.set('panel', 'plan');
    if (mapped !== undefined && mapped.length > 0) {
      params.set('section', mapped);
    }
    return `/p/${projectId}?${params.toString()}`;
  }
  if (isProjectPanel(first ?? null)) {
    params.set('panel', first!);
    if (first === 'plan' && second !== undefined && second.length > 0) {
      params.set('section', second);
    }
    return `/p/${projectId}?${params.toString()}`;
  }
  return null;
}
