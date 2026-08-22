export const COFOUNDER_RAIL_DEFAULT_PX = 352;
export const COFOUNDER_RAIL_MIN_PX = 280;

export function clampCofounderRailWidth(width: number, viewportWidth: number): number {
  const max = Math.max(1, Math.floor(viewportWidth * 0.5));
  const min = Math.min(COFOUNDER_RAIL_MIN_PX, max);
  const next = Number.isFinite(width) ? Math.round(width) : COFOUNDER_RAIL_DEFAULT_PX;
  return Math.min(max, Math.max(min, next));
}
