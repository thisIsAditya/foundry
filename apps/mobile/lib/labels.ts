export const scoreHeadings: Record<string, string> = {
  customer_clarity: 'Who is this for?',
  evidence_strength: 'How solid is the proof?',
  market_support: 'Is the market real?',
  business_economics: 'Can the numbers work?',
  willingness_to_pay: 'Will people pay?',
  execution_readiness: 'Can you ship this?',
  risk_control: 'What could kill it?',
};

export function scoreHeading(dimension: string): string {
  return scoreHeadings[dimension] ?? dimension.replaceAll('_', ' ');
}
