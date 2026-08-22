import type { AddInterviewInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  insertInterview,
  insertQuote,
  listInterviewsByProjectId,
  listQuotesByInterviewIds,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type { Interview, Project, Quote, UserId, WorkspaceMembership } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';

export type InterviewSummary = { interview: Interview; quoteCount: number };

export class InterviewService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
  ) {}

  async addInterview(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: AddInterviewInput,
  ): Promise<{ interview: Interview; quotes: Quote[] }> {
    if (!this.policyService.can(actor.membership, 'evidence.upload')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot capture interview evidence in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withIdempotency(
      this.coordination,
      `idem:${actor.userId}:evidence.addInterview:${input.idempotencyKey}`,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as { interview: Interview; quotes: Quote[] },
      (value) => superjson.stringify(value),
      () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const interview = await insertInterview(tx, {
            projectId: actor.project.id,
            participantType: input.participantType,
            consent: {
              ...input.consent,
              ...(input.label === undefined ? {} : { label: input.label }),
              ...(input.notes === undefined ? {} : { notes: input.notes }),
              ...(input.sourceId === undefined ? {} : { sourceId: input.sourceId }),
            },
            conductedAt: input.conductedAt ?? null,
          });
          const quotes = await Promise.all(
            input.quotes.map((textContent) =>
              insertQuote(tx, { interviewId: interview.id, textContent }),
            ),
          );
          return { interview, quotes };
        }),
    );
  }

  async listInterviews(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<InterviewSummary[]> {
    if (!this.policyService.can(actor.membership, 'evidence.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read interview evidence in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const interviews = await listInterviewsByProjectId(tx, actor.project.id);
      const quotes = await listQuotesByInterviewIds(
        tx,
        interviews.map((item) => item.id),
      );
      const counts = new Map<string, number>();
      for (const quote of quotes) {
        if (quote.interviewId !== null) {
          counts.set(quote.interviewId, (counts.get(quote.interviewId) ?? 0) + 1);
        }
      }
      return interviews.map((interview) => ({
        interview,
        quoteCount: counts.get(interview.id) ?? 0,
      }));
    });
  }
}
