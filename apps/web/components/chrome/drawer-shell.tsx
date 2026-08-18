'use client';

import { useEffect, type ReactNode } from 'react';

export function DrawerShell({
  title,
  open,
  onClose,
  quiet = false,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  quiet?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button type="button" className="drawer-scrim" aria-label="Close drawer" onClick={onClose} />
      <aside className="drawer-shell" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-shell-header">
          <h2 className={quiet ? 'hint' : 'page-title'}>{title}</h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="drawer-shell-body">{children}</div>
      </aside>
    </>
  );
}
