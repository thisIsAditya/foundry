import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="text-sm font-medium text-text">{title}</p>
      {description === undefined ? null : <p className="muted">{description}</p>}
      {action === undefined ? null : <div className="mt-2">{action}</div>}
    </div>
  );
}
