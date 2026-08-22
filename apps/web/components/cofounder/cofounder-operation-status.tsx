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
    <div className="panel stack-tight" aria-live="polite" aria-atomic="true">
      <p className="text-sm font-medium">The co-founder is working</p>
      <p className="muted">Accepted record state stays unchanged until you review a proposal.</p>
      <button type="button" className="btn-secondary min-h-11" onClick={onCancel}>
        Cancel turn
      </button>
    </div>
  );
}
