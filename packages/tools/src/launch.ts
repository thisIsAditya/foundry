import { ApprovalActionTypeSchema } from '@foundry/domain';
import { evaluateMvbpScope } from '@foundry/policy';
import { tool, type Tool } from 'ai';
import { z } from 'zod';

const MvbpToolInputSchema = z.object({
  hypothesis: z.string(),
  featureCount: z.number().int().nonnegative(),
  paymentPath: z.string().nullable(),
});

export const mvbpScopeCheckTool: Tool = tool({
  description:
    'Deterministically check MVBP scope. Instant-fail on four or more features, a missing payment path, or a missing hypothesis.',
  inputSchema: MvbpToolInputSchema,
  execute: async (input) => evaluateMvbpScope(input),
});

export const builderPromptGenerateTool: Tool = tool({
  description: 'Draft a paste-ready builder prompt or concierge runbook. Never execute a deploy.',
  inputSchema: z.object({
    target: z.enum(['lovable', 'bolt', 'v0', 'cursor', 'concierge']),
    prompt: z.string().min(1),
  }),
  execute: async (input) => ({ status: 'draft' as const, ...input }),
});

const DraftPayloadSchema = z.object({
  summary: z.string().min(1),
  payload: z.unknown(),
});

function draftTool(name: string, description: string): Tool {
  return tool({
    description,
    inputSchema: DraftPayloadSchema,
    execute: async (input) => ({ status: 'draft' as const, tool: name, ...input }),
  });
}

export const landingDraftTool = draftTool(
  'landing.draft',
  'Draft landing copy. Publishing requires founder approval.',
);
export const paymentLinkDraftTool = draftTool(
  'payment_link.draft',
  'Draft a payment link from accepted MoneyRules. Sending requires founder approval.',
);
export const emailDraftTool = draftTool(
  'email.draft',
  'Draft an email. Sending requires founder approval.',
);
export const calendarDraftTool = draftTool(
  'calendar.draft',
  'Draft a calendar event. Creating it requires founder approval.',
);
export const invoiceDraftTool = draftTool(
  'invoice.draft',
  'Draft an invoice from accepted MoneyRules. This does not file or charge.',
);
export const legalChecklistDraftTool = draftTool(
  'legal_checklist.draft',
  'Draft an India legal/IP/compliance checklist. Never file. Watermark as draft-for-review.',
);
export const opsMigrationProposalTool = draftTool(
  'ops.migration_proposal',
  'Propose ops config migration when MoneyRules change. Do not silently diverge.',
);

export const filingSubmitTool: Tool = tool({
  description: 'Government filing. Always forbidden — humans file MCA/GST/trademark submissions.',
  inputSchema: z.object({ reason: z.string().min(1) }),
  execute: async () => ({
    status: 'forbidden' as const,
    action: 'filing.submit',
    reason: 'The platform never files with the government.',
  }),
});

export const sideEffectRequestTool: Tool = tool({
  description:
    'Request a side-effect action. The platform records an approval; it does not execute send/publish/charge here.',
  inputSchema: z.object({
    actionType: ApprovalActionTypeSchema,
    summary: z.string().min(1),
    payload: z.unknown(),
  }),
  execute: async (input) => ({ status: 'approval_required' as const, ...input }),
});
