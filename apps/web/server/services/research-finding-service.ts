import {
  insertResearchFinding,
  listResearchFindingsByJobId,
  listResearchFindingsByProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  PackSectionKeySchema,
  PackSectionKeyToBusinessModelSectionKey,
  type Project,
  type ResearchFinding,
  type Sprint,
  type WorkspaceId,
} from '@foundry/domain';
import type { AgentRunOutput } from '@foundry/agent-runtime';

export class ResearchFindingService {
  constructor(private readonly sql: PoolSql) {}

  async persistFromSprint(input: {
    workspaceId: WorkspaceId;
    project: Project;
    sprint: Sprint;
    synthesis: AgentRunOutput;
  }): Promise<ResearchFinding | null> {
    if (input.sprint.jobKind !== 'research') {
      return null;
    }
    const affectedSectionKeys = input.synthesis.proposedPackChanges.flatMap((change) => {
      const parsed = PackSectionKeySchema.safeParse(change.targetSection);
      if (!parsed.success) {
        return [];
      }
      const mapped = PackSectionKeyToBusinessModelSectionKey[parsed.data];
      return mapped === undefined ? [] : [mapped];
    });
    return withWorkspaceScope(this.sql, [input.workspaceId], async (tx) =>
      insertResearchFinding(tx, {
        projectId: input.project.id,
        jobId: input.sprint.id,
        claim: input.synthesis.result.slice(0, 2000),
        confidence: {
          label: 'unverified',
          basis: 'sprint_synthesis',
          reviewerUserId: null,
          expiresAt: null,
        },
        affectedSectionKeys,
        extractionMethod: 'web_search',
      }),
    );
  }

  async listByProject(
    workspaceId: WorkspaceId,
    projectId: Project['id'],
  ): Promise<ResearchFinding[]> {
    return withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listResearchFindingsByProjectId(tx, projectId),
    );
  }

  async listByJob(workspaceId: WorkspaceId, jobId: Sprint['id']): Promise<ResearchFinding[]> {
    return withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listResearchFindingsByJobId(tx, jobId),
    );
  }
}
