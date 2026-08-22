import {
  PackSectionKeyToBusinessModelSectionKey,
  recordSectionFromLegacyPack,
  type BusinessModelSectionKey,
} from '@foundry/domain';

import { isProjectPanel } from './project-href';

const PACK_KEYS = PackSectionKeyToBusinessModelSectionKey;

function modelHref(projectId: string, section?: string | null): string {
  if (section === undefined || section === null || section.length === 0) {
    return `/p/${projectId}/model`;
  }
  const mapped = recordSectionFromLegacyPack(section as BusinessModelSectionKey);
  if (mapped === 'deferred_extension') {
    return `/p/${projectId}/model`;
  }
  return `/p/${projectId}/model/${mapped}`;
}

const PANEL_TO_DESTINATION: Record<string, (projectId: string, section?: string) => string> = {
  plan: (projectId, section) => modelHref(projectId, section),
  work: (projectId) => `/p/${projectId}/journey`,
  research: (projectId) => `/p/${projectId}/evidence`,
  decisions: (projectId) => `/p/${projectId}/decisions`,
};

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
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const panel = params.get('panel');

  if (rest === undefined || rest.length === 0) {
    if (panel === 'settings' || panel === null) {
      return null;
    }
    const mapped = PANEL_TO_DESTINATION[panel];
    return mapped === undefined ? null : mapped(projectId, params.get('section') ?? undefined);
  }

  const [first, second] = rest.split('/');
  if (first === 'co-founder') {
    return `/p/${projectId}`;
  }
  if (first === 'journey' || first === 'model' || first === 'evidence' || first === 'decisions') {
    return null;
  }
  if (first === 'approvals') {
    return `/p/${projectId}/decisions`;
  }
  if (first === 'pack') {
    const mapped =
      second !== undefined && second in PACK_KEYS
        ? PACK_KEYS[second as keyof typeof PACK_KEYS]
        : second;
    return modelHref(projectId, mapped);
  }
  if (isProjectPanel(first ?? null) && first !== 'settings') {
    const mapped = PANEL_TO_DESTINATION[first!];
    if (mapped === undefined) {
      return null;
    }
    return mapped(projectId, first === 'plan' ? second : undefined);
  }
  return null;
}
