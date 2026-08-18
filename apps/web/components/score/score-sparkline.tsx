export function ScoreSparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <p className="muted">No score history yet.</p>;
  }
  const width = 100;
  const height = 32;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${String(x)},${String(y)}`;
    })
    .join(' ');
  return (
    <svg
      className="score-sparkline"
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Score trend across revisions"
    >
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}
