import { color, type ColorToken } from './tokens/color.js';
import { fontFamily, fontSize } from './tokens/typography.js';
import { spacing } from './tokens/spacing.js';
import { gaugeBandColor, scoreBandOf } from './gauge-band.js';

export type GaugeProps = {
  value: number | null;
  size: 'sm' | 'lg';
  label: string;
  colorToken?: ColorToken;
};

const SIZE_PX = {
  sm: Number.parseInt(spacing[8], 10),
  lg: Number.parseInt(spacing[24], 10),
} as const;

const STROKE_PX = {
  sm: Number.parseInt(spacing[1], 10),
  lg: Number.parseInt(spacing[2], 10),
} as const;

const SWEEP_DEG = 270;
const START_DEG = 135;

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
  if (sweepDeg <= 0) return '';
  const clamped = Math.min(sweepDeg, SWEEP_DEG);
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, startDeg + clamped);
  const largeArc = clamped > 180 ? 1 : 0;
  return `M ${String(start.x)} ${String(start.y)} A ${String(r)} ${String(r)} 0 ${String(largeArc)} 1 ${String(end.x)} ${String(end.y)}`;
}

export function Gauge({ value, size, label, colorToken }: GaugeProps) {
  const px = SIZE_PX[size];
  const stroke = STROKE_PX[size];
  const cx = px / 2;
  const cy = px / 2;
  const r = (px - stroke) / 2;
  const band = scoreBandOf(value);
  const fillColor = colorToken === undefined ? gaugeBandColor(band) : color[colorToken];
  const ratio = value === null ? 0 : Math.min(Math.max(value, 0), 100) / 100;
  const fill = arcPath(cx, cy, r, START_DEG, SWEEP_DEG * ratio);
  const track = arcPath(cx, cy, r, START_DEG, SWEEP_DEG);
  const reading = value === null ? '—' : String(Math.round(value));
  const type = size === 'sm' ? fontSize.xs : fontSize.lg;

  return (
    <svg
      role="img"
      aria-label={label}
      width={px}
      height={px}
      viewBox={`0 0 ${String(px)} ${String(px)}`}
    >
      <path
        d={track}
        fill="none"
        stroke={color.border}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {fill.length === 0 ? null : (
        <path d={fill} fill="none" stroke={fillColor} strokeWidth={stroke} strokeLinecap="round" />
      )}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color.text}
        fontFamily={fontFamily.mono}
        fontSize={type[0]}
      >
        {reading}
      </text>
    </svg>
  );
}
