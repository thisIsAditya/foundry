'use client';

export function CofounderOperationStatus({
  pending,
  onCancel,
}: {
  pending: boolean;
  onCancel: () => void;
}) {
  if (!pending) {
    return null;
  }
  return (
    <div className="cofounder-working" aria-live="polite" aria-atomic="true">
      <span className="cofounder-working-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">Your co-founder is working</p>
        <p className="hint">Reading the venture context and preparing a grounded response.</p>
      </div>
      <button type="button" className="cofounder-working-cancel" onClick={onCancel}>
        Cancel turn
      </button>
    </div>
  );
}
