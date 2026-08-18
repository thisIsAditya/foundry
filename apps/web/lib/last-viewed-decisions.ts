const keyOf = (projectId: string): string => `foundry:lastViewedDecisions:${projectId}`;

export function readLastViewedDecisionsAt(projectId: string): number {
  const raw = window.localStorage.getItem(keyOf(projectId));
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function writeLastViewedDecisionsAt(projectId: string, at = Date.now()): number {
  window.localStorage.setItem(keyOf(projectId), String(at));
  return at;
}
