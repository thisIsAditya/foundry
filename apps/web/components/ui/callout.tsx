import type { ReactNode } from 'react';

/**
 * "Here's what to do next, and why" box. Used to turn a bare backend
 * `nextAction` string into a guided, explained call to action.
 */
export function Callout({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="callout">
      <p className="callout-eyebrow">{eyebrow}</p>
      <p className="callout-title">{title}</p>
      {children === undefined ? null : <div className="text-sm text-text-muted">{children}</div>}
      {action === undefined ? null : <div className="mt-1">{action}</div>}
    </div>
  );
}
