const TOOL_LABELS: Record<string, string> = {
  academic_search: 'Searching the web for…',
  market_report_search: 'Reading a market report…',
  market_calculator: 'Checking market math…',
  unit_economics_calculator: 'Checking unit economics…',
  sensitivity_calculator: 'Checking pricing sensitivity…',
  reconciliation_checker: 'Checking the numbers against each other…',
  mvbp_scope_check: 'Checking product scope…',
  'builder_prompt.generate': 'Drafting a builder prompt…',
  'landing.draft': 'Drafting a landing page…',
  'payment_link.draft': 'Drafting a payment link…',
  'email.draft': 'Drafting an email…',
  'calendar.draft': 'Drafting a calendar hold…',
  'invoice.draft': 'Drafting an invoice…',
  'legal_checklist.draft': 'Drafting a legal checklist…',
  'ops.migration_proposal': 'Drafting an ops change…',
  web_search: 'Searching the web for…',
  web_fetch: 'Reading a source…',
};

function queryOf(input: unknown): string | null {
  if (input === null || typeof input !== 'object') {
    return null;
  }
  const record = input as Record<string, unknown>;
  for (const key of ['query', 'url', 'objective', 'q']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function toolNameOf(tool: unknown): string {
  if (tool === null || typeof tool !== 'object') {
    return 'step';
  }
  const record = tool as Record<string, unknown>;
  if (typeof record.name === 'string' && record.name.length > 0) {
    return record.name;
  }
  if (typeof record.tool === 'string' && record.tool.length > 0) {
    return record.tool;
  }
  return 'step';
}

export function toolInputOf(tool: unknown): unknown {
  if (tool === null || typeof tool !== 'object') {
    return undefined;
  }
  return (tool as Record<string, unknown>).input;
}

export function describeToolCall(toolDefinitionId: string, input: unknown): string {
  const template = TOOL_LABELS[toolDefinitionId] ?? 'Running a step…';
  const detail = queryOf(input);
  if (detail === null) {
    return template.replace('…', '').trim();
  }
  return `${template.replace(/…$/, '')} ${detail}`;
}
