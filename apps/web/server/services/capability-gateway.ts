import { CreateProposalInputSchema } from '@foundry/api-contracts';
import { insertCapabilityInvocation, withWorkspaceScope, type PoolSql } from '@foundry/db';
import type { CofounderOperationId, Project, UserId, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService, add, div, mul, sub } from '@foundry/policy';
import { z } from 'zod';

import type { ProposalService } from './proposal-service';

export const CAPABILITY_MANIFEST = {
  'venture.readCurrentState': { version: '1', riskClass: 'read' as const },
  'evidence.searchApproved': { version: '1', riskClass: 'read' as const, disabled: true },
  'evidence.createDraft': { version: '1', riskClass: 'draft' as const },
  'business.calculate': { version: '1', riskClass: 'compute' as const },
  'artifact.createDraft': { version: '1', riskClass: 'draft' as const },
  'proposal.createDraft': { version: '1', riskClass: 'draft' as const },
  'material.prepareDraft': { version: '1', riskClass: 'draft' as const },
} as const;

export type CapabilityName = keyof typeof CAPABILITY_MANIFEST;

export type CapabilityInvokeResult = {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
};

const CalculateInputSchema = z.object({
  operation: z.enum(['add', 'sub', 'mul', 'div']),
  left: z.string().min(1),
  right: z.string().min(1),
});

const ReadCurrentStateInputSchema = z.object({
  currentStage: z.string().min(1).optional(),
  currentObjective: z.string().min(1).optional(),
});

export class CapabilityGateway {
  constructor(
    private readonly sql: PoolSql,
    private readonly policyService: PolicyService,
    private readonly proposals: ProposalService,
  ) {}

  async invoke(
    actor: {
      userId: UserId;
      membership: WorkspaceMembership;
      project: Project;
      operationId: CofounderOperationId;
    },
    name: string,
    input: unknown,
  ): Promise<CapabilityInvokeResult> {
    const started = Date.now();
    const capability = CAPABILITY_MANIFEST[name as CapabilityName];
    if (capability === undefined) {
      throw new AppError({
        code: 'capability_unsupported',
        explanation: 'That action is not available to the co-founder.',
        nextAction: 'Use a listed draft capability, or continue without it.',
      });
    }
    if (!this.policyService.can(actor.membership, 'cofounder.respond')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot invoke co-founder capabilities.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    if ('disabled' in capability && capability.disabled) {
      await this.audit(actor, name, capability, started, {
        safeError: 'disabled_until_citation_adapter',
        summary: 'Approved-source search is disabled.',
      });
      return {
        ok: false,
        summary: 'Approved evidence search is disabled until a citation-preserving adapter exists.',
      };
    }

    const result = await this.dispatch(actor, name, input);
    await this.audit(actor, name, capability, started, { summary: result.summary });
    return result;
  }

  private async dispatch(
    actor: {
      userId: UserId;
      membership: WorkspaceMembership;
      project: Project;
      operationId: CofounderOperationId;
    },
    name: string,
    input: unknown,
  ): Promise<CapabilityInvokeResult> {
    if (name === 'venture.readCurrentState') {
      const parsed = ReadCurrentStateInputSchema.safeParse(input);
      const stage = parsed.success ? parsed.data.currentStage : undefined;
      const objective = parsed.success ? parsed.data.currentObjective : undefined;
      return {
        ok: true,
        summary: `Current stage is ${stage ?? 'unknown'}. ${objective ?? ''}`.trim(),
        data: {
          projectId: actor.project.id,
          ...(stage === undefined ? {} : { currentStage: stage }),
          ...(objective === undefined ? {} : { currentObjective: objective }),
        },
      };
    }
    if (name === 'business.calculate') {
      const parsed = CalculateInputSchema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          summary: 'Calculation input was invalid. Accepted record state is unchanged.',
        };
      }
      try {
        const value =
          parsed.data.operation === 'add'
            ? add(parsed.data.left, parsed.data.right)
            : parsed.data.operation === 'sub'
              ? sub(parsed.data.left, parsed.data.right)
              : parsed.data.operation === 'mul'
                ? mul(parsed.data.left, parsed.data.right)
                : div(parsed.data.left, parsed.data.right);
        if (value === null) {
          return {
            ok: false,
            summary: 'Calculation could not divide by zero. Accepted record state is unchanged.',
          };
        }
        return {
          ok: true,
          summary: 'Deterministic calculation completed. Accepted record state is unchanged.',
          data: { value },
        };
      } catch {
        return {
          ok: false,
          summary: 'Calculation could not be completed. Accepted record state is unchanged.',
        };
      }
    }
    if (name === 'proposal.createDraft') {
      const parsed = CreateProposalInputSchema.safeParse({
        ...(typeof input === 'object' && input !== null ? input : {}),
        projectId: actor.project.id,
      });
      if (!parsed.success) {
        return {
          ok: false,
          summary: 'Proposal draft input was invalid. Accepted record state is unchanged.',
        };
      }
      const created = await this.proposals.create(actor, parsed.data, 'cofounder');
      return {
        ok: true,
        summary: 'Created a reviewable proposal. It is not accepted.',
        data: { proposalId: created.proposal.id },
      };
    }
    return {
      ok: true,
      summary: 'Draft-only capability completed. Accepted record state is unchanged.',
    };
  }

  private async audit(
    actor: {
      userId: UserId;
      project: Project;
      operationId: CofounderOperationId;
    },
    name: string,
    capability: (typeof CAPABILITY_MANIFEST)[CapabilityName],
    started: number,
    result: { summary: string; safeError?: string },
  ): Promise<void> {
    await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      await insertCapabilityInvocation(tx, {
        operationId: actor.operationId,
        projectId: actor.project.id,
        workspaceId: actor.project.workspaceId,
        capabilityName: name,
        capabilityVersion: capability.version,
        riskClass: capability.riskClass,
        actorUserId: actor.userId,
        durationMs: Date.now() - started,
        safeResultSummary: result.summary,
        ...(result.safeError === undefined ? {} : { safeError: result.safeError }),
      });
    });
  }
}
