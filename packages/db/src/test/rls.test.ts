import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertAssumption, listAssumptionsByProjectId } from '../repositories/assumptions.js';
import { insertAlternative, listAlternativesByProjectId } from '../repositories/alternatives.js';
import { insertCompetitor, listCompetitorsByProjectId } from '../repositories/competitors.js';
import {
  insertConversationMessage,
  listConversationMessagesByProjectId,
} from '../repositories/conversation-messages.js';
import {
  insertEvidenceItem,
  listEvidenceItemsByProjectId,
} from '../repositories/evidence-items.js';
import {
  listFounderPreferencesByProjectId,
  upsertFounderPreference,
} from '../repositories/founder-preferences.js';
import { insertFounderTask, listFounderTasksByProjectId } from '../repositories/founder-tasks.js';
import { insertPackRevision } from '../repositories/pack-revisions.js';
import { insertPlanScore, listPlanScoresByProjectId } from '../repositories/plan-scores.js';
import { insertProject, listProjects } from '../repositories/projects.js';
import { insertUser } from '../repositories/users.js';
import { insertWorkspace, listWorkspaces } from '../repositories/workspaces.js';
import { withWorkspaceScope } from '../rls.js';
import { sql } from './harness.js';

describe('RLS tenant isolation', () => {
  it('hides another workspace project when the session is scoped to workspace A', async () => {
    const ownerA = await insertUser(sql, {
      name: 'Owner A',
      email: `a-${randomUUID()}@example.com`,
    });
    const ownerB = await insertUser(sql, {
      name: 'Owner B',
      email: `b-${randomUUID()}@example.com`,
    });
    const workspaceA = await insertWorkspace(sql, {
      name: 'Workspace A',
      ownerUserId: ownerA.id,
    });
    const workspaceB = await insertWorkspace(sql, {
      name: 'Workspace B',
      ownerUserId: ownerB.id,
    });
    const projectA = await insertProject(sql, {
      workspaceId: workspaceA.id,
      name: 'Project A',
    });
    await insertProject(sql, {
      workspaceId: workspaceB.id,
      name: 'Project B',
    });

    const visible = await withWorkspaceScope(sql, [workspaceA.id], async (tx) => {
      return listProjects(tx);
    });

    expect(visible.map((project) => project.id)).toEqual([projectA.id]);
    expect(visible.map((project) => project.name)).toEqual(['Project A']);
  });

  it('returns no workspaces when the session scope is empty', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `empty-${randomUUID()}@example.com`,
    });
    await insertWorkspace(sql, {
      name: 'Hidden',
      ownerUserId: owner.id,
    });

    const visible = await withWorkspaceScope(sql, [], async (tx) => listWorkspaces(tx));
    expect(visible).toEqual([]);
  });

  it('hides conversation, founder task, evidence, assumption, and score rows from another workspace', async () => {
    const ownerA = await insertUser(sql, {
      name: 'Owner A',
      email: `rls-a-${randomUUID()}@example.com`,
    });
    const ownerB = await insertUser(sql, {
      name: 'Owner B',
      email: `rls-b-${randomUUID()}@example.com`,
    });
    const workspaceA = await insertWorkspace(sql, {
      name: 'Workspace A',
      ownerUserId: ownerA.id,
    });
    const workspaceB = await insertWorkspace(sql, {
      name: 'Workspace B',
      ownerUserId: ownerB.id,
    });
    await insertProject(sql, {
      workspaceId: workspaceA.id,
      name: 'Project A',
    });
    const projectB = await insertProject(sql, {
      workspaceId: workspaceB.id,
      name: 'Project B',
    });

    await withWorkspaceScope(sql, [workspaceB.id], async (tx) => {
      const pack = await insertPackRevision(tx, {
        projectId: projectB.id,
        revisionNumber: 1,
        actorType: 'founder',
        actorId: ownerB.id,
        proposedChanges: {},
      });
      await insertConversationMessage(tx, {
        projectId: projectB.id,
        actor: 'founder',
        text: 'Hidden conversation',
        blocks: [{ kind: 'concise_answer', text: 'Hidden conversation' }],
      });
      await insertFounderTask(tx, {
        projectId: projectB.id,
        title: 'Hidden task',
        explanation: 'Should not leak',
      });
      await insertEvidenceItem(tx, {
        projectId: projectB.id,
        summary: 'Hidden evidence',
        provenance: {
          kind: 'founder_asserted',
          sourceIds: [],
          sourceSnapshotIds: [],
          citationIds: [],
          verifiedAt: null,
        },
      });
      await insertAssumption(tx, {
        projectId: projectB.id,
        statement: 'Hidden assumption',
      });
      await insertAlternative(tx, {
        projectId: projectB.id,
        description: 'Hidden alternative',
      });
      await insertCompetitor(tx, {
        projectId: projectB.id,
        name: 'Hidden competitor',
        sourceIds: [],
      });
      await upsertFounderPreference(tx, {
        scope: { type: 'project', projectId: projectB.id },
        key: 'geography',
        value: 'hidden',
        confidence: {
          label: 'inferred',
          basis: 'test',
          reviewerUserId: null,
          expiresAt: null,
        },
      });
      await insertPlanScore(tx, {
        packRevisionId: pack.id,
        overall: 10,
        dimensions: {
          customer_clarity: { raw: 1, weight: 15, contribution: 3, basis: 'known' },
          evidence_strength: { raw: 0, weight: 20, contribution: 0, basis: 'insufficient_data' },
          market_support: { raw: 0, weight: 15, contribution: 0, basis: 'insufficient_data' },
          business_economics: { raw: 0, weight: 15, contribution: 0, basis: 'insufficient_data' },
          willingness_to_pay: { raw: 0, weight: 15, contribution: 0, basis: 'insufficient_data' },
          execution_readiness: { raw: 0, weight: 10, contribution: 0, basis: 'insufficient_data' },
          risk_control: { raw: 0, weight: 10, contribution: 0, basis: 'insufficient_data' },
        },
        ruleVersion: '2026-08-1',
        reasons: [],
        topActions: [],
      });
    });

    const leaked = await withWorkspaceScope(sql, [workspaceA.id], async (tx) => ({
      messages: await listConversationMessagesByProjectId(tx, projectB.id),
      tasks: await listFounderTasksByProjectId(tx, projectB.id),
      evidence: await listEvidenceItemsByProjectId(tx, projectB.id),
      assumptions: await listAssumptionsByProjectId(tx, projectB.id),
      alternatives: await listAlternativesByProjectId(tx, projectB.id),
      competitors: await listCompetitorsByProjectId(tx, projectB.id),
      preferences: await listFounderPreferencesByProjectId(tx, projectB.id),
      scores: await listPlanScoresByProjectId(tx, projectB.id, 10),
    }));
    expect(leaked.messages).toEqual([]);
    expect(leaked.tasks).toEqual([]);
    expect(leaked.evidence).toEqual([]);
    expect(leaked.assumptions).toEqual([]);
    expect(leaked.alternatives).toEqual([]);
    expect(leaked.competitors).toEqual([]);
    expect(leaked.preferences).toEqual([]);
    expect(leaked.scores).toEqual([]);
  });
});
