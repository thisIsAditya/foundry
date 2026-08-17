import { limits } from '@foundry/config/limits';

const SCALE = BigInt(limits.money.decimalScale);
const FACTOR = 10n ** SCALE;

export class DecimalError extends Error {
  override readonly name = 'DecimalError';
}

export function parseDecimal(value: string): bigint {
  const match = /^(?<sign>-)?(?<whole>\d+)(?:\.(?<frac>\d+))?$/.exec(value);
  if (match?.groups === undefined) {
    throw new DecimalError(`Invalid decimal: ${value}`);
  }
  const sign = match.groups['sign'] === '-' ? -1n : 1n;
  const whole = BigInt(match.groups['whole'] ?? '0');
  const fracRaw = match.groups['frac'] ?? '';
  if (fracRaw.length > Number(SCALE)) {
    throw new DecimalError(`Decimal exceeds scale ${SCALE}: ${value}`);
  }
  const frac = BigInt(fracRaw.padEnd(Number(SCALE), '0'));
  return sign * (whole * FACTOR + frac);
}

export function formatDecimal(units: bigint): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / FACTOR;
  const frac = abs % FACTOR;
  const fracText = frac.toString().padStart(Number(SCALE), '0').replace(/0+$/, '');
  const body = fracText.length === 0 ? whole.toString() : `${whole.toString()}.${fracText}`;
  return negative ? `-${body}` : body;
}

export function add(left: string, right: string): string {
  return formatDecimal(parseDecimal(left) + parseDecimal(right));
}

export function sub(left: string, right: string): string {
  return formatDecimal(parseDecimal(left) - parseDecimal(right));
}

export function mul(left: string, right: string): string {
  return formatDecimal((parseDecimal(left) * parseDecimal(right)) / FACTOR);
}

export function div(left: string, right: string): string | null {
  const denominator = parseDecimal(right);
  if (denominator === 0n) {
    return null;
  }
  return formatDecimal((parseDecimal(left) * FACTOR) / denominator);
}

export function cmp(left: string, right: string): number {
  const delta = parseDecimal(left) - parseDecimal(right);
  if (delta < 0n) {
    return -1;
  }
  if (delta > 0n) {
    return 1;
  }
  return 0;
}

export function percentOf(value: string, deltaPercent: string): string {
  const factor = add('1', div(deltaPercent, '100') ?? '0');
  return mul(value, factor);
}
