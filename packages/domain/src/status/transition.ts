export function canTransition<S extends string>(
  allowed: Readonly<Record<S, readonly S[]>>,
  from: S,
  to: S,
): boolean {
  return (allowed[from] ?? []).includes(to);
}

export function nextStates<S extends string>(
  allowed: Readonly<Record<S, readonly S[]>>,
  from: S,
): readonly S[] {
  return allowed[from] ?? [];
}
