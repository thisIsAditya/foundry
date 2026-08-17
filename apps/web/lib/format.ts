const packLabels: Record<string, string> = {
  mvbp: 'MVBP',
  gtm: 'GTM',
  org_cost: 'Org & cost',
  legal: 'Legal',
  launch: 'Launch',
};

const packDescriptions: Record<string, string> = {
  mvbp: 'The smallest version of your product worth building — what it does, how it makes money, and when to stop.',
  gtm: 'How you plan to reach your first 100 customers.',
  org_cost: 'Who runs this and what it costs to keep the lights on.',
  legal:
    'The legal groundwork this app can help you think through (India-only, for reference — not filed on your behalf).',
  launch: 'The checklist for getting your first version out the door.',
};

export function packSectionLabel(section: string): string {
  return packLabels[section] ?? section;
}

export function packSectionDescription(section: string): string {
  return (
    packDescriptions[section] ?? 'What you and the AI have agreed on for this part of the plan.'
  );
}

const fieldLabels: Record<string, string> = {
  hypothesis: 'What you\u2019re testing',
  capability: 'What it does',
  timeBoxDays: 'Time box (days)',
  featureCount: 'Number of features',
  paymentPath: 'How people pay',
  outOfScope: 'Out of scope',
  killLines: 'Kill conditions',
  founderAssertions: 'Founder assertions',
  firstHundredPlan: 'Plan for your first 100 customers',
  channel: 'Main channel',
  adsFirst: 'Paid ads first?',
  skills: 'Skills needed',
  monthlyBurn: 'Monthly burn',
  runwayMonths: 'Runway (months)',
  jurisdiction: 'Jurisdiction',
  watermark: 'Draft watermark',
  neverFiles: 'Never auto-files',
  items: 'Open questions',
  checklist: 'Checklist',
  log: 'Log',
};

export function packFieldLabel(key: string): string {
  return fieldLabels[key] ?? key.replaceAll(/([A-Z])/g, ' $1').replaceAll('_', ' ');
}

const approvalActionLabels: Record<string, string> = {
  'landing.publish': 'Publish a landing page',
  'payment_link.send': 'Send a payment link',
  'email.send': 'Send an email',
  'whatsapp.broadcast': 'Send a WhatsApp broadcast',
  'calendar.create_event': 'Create a calendar event',
  'crm.outbound': 'Send an outbound CRM message',
  'growth.publish': 'Publish a growth/marketing post',
  'ads.spend': 'Spend money on ads',
  'filing.submit': 'Submit a filing',
};

export function approvalActionLabel(actionType: string): string {
  return approvalActionLabels[actionType] ?? actionType.replaceAll('_', ' ').replaceAll('.', ' · ');
}

const approvalStatusLabels: Record<string, string> = {
  pending: 'Waiting on you',
  approved: 'Approved, about to run',
  executed: 'Done',
  rejected: 'Rejected',
  expired: 'Expired',
  execution_failed: 'Failed to run',
};

export function approvalStatusLabel(status: string): string {
  return approvalStatusLabels[status] ?? status.replaceAll('_', ' ');
}

const businessModelLabels: Record<string, string> = {
  context: 'Context',
  problem: 'Problem',
  beachhead: 'Beachhead',
  persona_dmu: 'Persona and decision-maker',
  alternatives_competitors: 'Alternatives and competitors',
  evidence_ledger: 'Evidence ledger',
  assumptions_experiments: 'Assumptions and experiments',
  market_model: 'Market model',
  business_model_money_rules: 'Business model and money rules',
  pricing_unit_economics: 'Pricing and unit economics',
  willingness_to_pay: 'Willingness to pay',
  mvbp_kill_lines: 'MVBP and kill lines',
  gtm_first_100: 'Go-to-market (first 100)',
  team_cost_runway: 'Team, cost, and runway',
  legal_compliance: 'Legal and compliance',
  launch_operate: 'Launch and operate',
  gates_decisions_artifacts: 'Gates, decisions, and artifacts',
};

export function businessModelSectionLabel(key: string): string {
  return businessModelLabels[key] ?? key.replaceAll('_', ' ');
}

const scoreDimensionLabels: Record<string, { heading: string; supporting: string }> = {
  customer_clarity: { heading: 'Who is this for?', supporting: 'customer clarity' },
  evidence_strength: { heading: 'How solid is the proof?', supporting: 'evidence strength' },
  market_support: { heading: 'Is the market real?', supporting: 'market support' },
  business_economics: { heading: 'Can the numbers work?', supporting: 'business economics' },
  willingness_to_pay: { heading: 'Will people pay?', supporting: 'willingness to pay' },
  execution_readiness: { heading: 'Can you ship this?', supporting: 'execution readiness' },
  risk_control: { heading: 'What could kill it?', supporting: 'risk control' },
};

export function scoreDimensionHeading(dimension: string): string {
  return scoreDimensionLabels[dimension]?.heading ?? dimension.replaceAll('_', ' ');
}

export function scoreDimensionSupporting(dimension: string): string {
  return scoreDimensionLabels[dimension]?.supporting ?? dimension.replaceAll('_', ' ');
}

export function formatUnknown(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not set yet';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'None yet';
    }
    if (value.every((item) => typeof item === 'string')) {
      return (value as string[]).join(' • ');
    }
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}
