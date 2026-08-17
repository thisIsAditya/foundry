export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

/**
 * Plain checklist for "what's required before X" panels (e.g. Gate A).
 * Kept generic so it can render any list of done/not-done requirements.
 */
export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="step-list">
      {items.map((item) => (
        <li key={item.id} className="step-row">
          <span
            className={`step-marker ${item.done ? 'step-marker-done' : 'step-marker-todo'}`}
            aria-hidden="true"
          >
            {item.done ? '✓' : ''}
          </span>
          <span
            className={item.done ? 'text-sm text-text-muted line-through' : 'text-sm text-text'}
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
