import {
  baselineResearchTemplate,
  buildInitialDraft,
  type StreamBus,
} from '@foundry/agent-runtime';
import {
  insertAssumption,
  insertConversationMessage,
  insertProblem,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type { Project, UserId, WorkspaceMembership } from '@foundry/domain';
import { randomUUID } from 'node:crypto';

import { ensurePackRevision } from './pack-snapshot';
import type { FounderTaskService } from './founder-task-service';
import type { ScoringService } from './scoring-service';
import type { SprintService } from './sprint-service';

export class InitialDraftService {
  constructor(
    private readonly sql: PoolSql,
    private readonly streamBus: StreamBus,
    private readonly sprintService: SprintService,
    private readonly founderTaskService: FounderTaskService,
    private readonly scoringService: ScoringService,
  ) {}

  async generate(actor: {
    userId: UserId;
    membership: WorkspaceMembership;
    project: Project;
    founderPitch?: string;
  }): Promise<void> {
    const founderText = [actor.founderPitch, actor.project.founderObjective, actor.project.name]
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join('. ');
    const draft = buildInitialDraft({
      founderText,
      geography: actor.project.geography,
    });
    await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const pack = await ensurePackRevision(tx, actor.project, actor.userId);
      const problem = draft.sections.find((item) => item.key === 'problem');
      if (problem?.provenance === 'founder_input') {
        await insertProblem(tx, { packRevisionId: pack.id, statement: problem.summary });
      }
      for (const section of draft.sections) {
        if (section.provenance !== 'assumption') {
          continue;
        }
        await insertAssumption(tx, {
          projectId: actor.project.id,
          statement: `${section.key}: ${section.summary}`,
        });
      }
      const message = await insertConversationMessage(tx, {
        projectId: actor.project.id,
        actor: 'co_founder',
        text: draft.founderMessage,
        blocks: [{ kind: 'concise_answer', text: draft.founderMessage }],
      });
      await this.streamBus.publish(actor.project.id, {
        type: 'conversation_message_appended',
        messageId: message.id,
        actor: 'co_founder',
      });
    });

    const research = baselineResearchTemplate(actor.project.geography);
    await this.sprintService.preview(actor, {
      projectId: actor.project.id,
      objectiveHint: research.objective,
      jobKind: research.jobKind,
      whyNow: research.whyNow,
      roleLabel: research.roleLabel,
      idempotencyKey: randomUUID(),
    });

    if (actor.project.founderObjective === 'undecided') {
      await this.founderTaskService.create(actor, {
        title: 'Describe the customer and the painful job',
        explanation:
          'The first draft is mostly open questions. Write who hurts, what they do today, and why it is worth paying to change.',
      });
    }
    await this.scoringService.recalculate(actor.project);
  }
}
