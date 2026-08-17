import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { insertProject } from './projects.js';
import { insertUser } from './users.js';
import { insertWorkspace } from './workspaces.js';
import { insertInterview, listInterviewsByProjectId } from './interviews.js';
import { insertQuote, listQuotesByInterviewIds } from './quotes.js';
import { insertPackRevision } from './pack-revisions.js';
import { insertBeachhead, updateBeachheadDmuId } from './beachheads.js';
import { insertDmu } from './dmus.js';
import { insertSprint, updateSprintStatus } from './sprints.js';
import { getCurrentAgentDefinition } from './agent-definitions.js';
import {
  insertProviderConnection,
  listProviderConnectionsByWorkspaceId,
} from './provider-connections.js';
import { insertUserMcpServer, listUserMcpServersByUserId } from './user-mcp-servers.js';
import { insertGate } from './gates.js';
import { PackRevisionIdSchema, SprintContractIdSchema, SprintIdSchema } from '@foundry/domain';
import { sql } from '../test/harness.js';
import { withUserScope, withWorkspaceScope } from '../rls.js';

describe('execution repositories', () => {
  it('round-trips pack, interview, sprint, provider, and user MCP rows', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `exec-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'Acme',
      ownerUserId: owner.id,
    });
    const project = await insertProject(sql, {
      workspaceId: workspace.id,
      name: 'Venture',
    });

    await withWorkspaceScope(
      sql,
      [workspace.id],
      async (tx) => {
        const pack = await insertPackRevision(tx, {
          projectId: project.id,
          revisionNumber: 1,
          actorType: 'founder',
          actorId: owner.id,
          proposedChanges: { clarifications: [] },
        });
        const head = await insertBeachhead(tx, {
          packRevisionId: pack.id,
          segmentDefinition: 'Pune restaurant owners',
        });
        const decisionMaker = await insertDmu(tx, {
          packRevisionId: pack.id,
          beachheadId: head.id,
          buyer: 'Chef-owner',
        });
        await updateBeachheadDmuId(tx, head.id, decisionMaker.id);

        const interview = await insertInterview(tx, {
          projectId: project.id,
          participantType: 'non_friend',
          consent: { given: true },
        });
        await insertQuote(tx, {
          interviewId: interview.id,
          textContent: 'The nightly close takes two extra hours',
        });
        expect(await listInterviewsByProjectId(tx, project.id)).toHaveLength(1);
        expect(await listQuotesByInterviewIds(tx, [interview.id])).toHaveLength(1);

        const sprintId = SprintIdSchema.parse(randomUUID());
        const sprint = await insertSprint(tx, {
          id: sprintId,
          projectId: project.id,
          contract: {
            id: SprintContractIdSchema.parse(randomUUID()),
            sprintId,
            objective: 'Test Gate A inputs',
            whyNow: 'Prove the execution path',
            phase: 'diagnose',
            packRevisionId: PackRevisionIdSchema.parse(pack.id),
            relevantEvidence: [],
            inputs: {},
            outputSchema: { name: 'SprintSynthesis', version: 1 },
            toolAllowlist: [],
            riskPolicy: 'compute',
            budget: {
              provider: 'anthropic',
              modelOrTool: 'mock',
              inputEstimate: '0',
              outputEstimate: '0',
              currency: 'USD',
              uncertainty: 'n/a',
            },
            qualityChecks: ['gate_a'],
            stopConditions: ['max_stalls'],
            promptVersion: 'orchestrator:1',
            maxWorkers: 1,
            maxStalls: 2,
            workers: [{ name: 'mock_worker', readsOnly: true, writeTargets: [] }],
            gateType: 'gate_a',
            createdAt: new Date('2026-04-01T00:00:00.000Z'),
          },
        });
        expect(sprint.status).toBe('draft');
        expect((await updateSprintStatus(tx, sprint.id, 'running')).status).toBe('running');

        const gate = await insertGate(tx, {
          projectId: project.id,
          gateType: 'gate_a',
          ruleVersion: 1,
          inputs: { countedInterviewIds: [interview.id] },
          result: 'failed',
        });
        expect(gate.result).toBe('failed');

        const connection = await insertProviderConnection(tx, {
          workspaceId: workspace.id,
          userId: owner.id,
          providerFamily: 'anthropic',
          authMode: 'api_key',
          credentialRefEncrypted: 'v1.test',
          healthStatus: 'ok',
        });
        expect(connection.credentialRefEncrypted).toBe('v1.test');
        expect(await listProviderConnectionsByWorkspaceId(tx, workspace.id)).toHaveLength(1);
      },
      owner.id,
    );

    await withUserScope(sql, owner.id, async (tx) => {
      const server = await insertUserMcpServer(tx, {
        userId: owner.id,
        name: 'kb',
        transport: 'http',
        url: 'https://mcp.example.com/mcp',
        healthStatus: 'ok',
        lastToolCount: 2,
      });
      expect(server.url).toBe('https://mcp.example.com/mcp');
      expect(await listUserMcpServersByUserId(tx, owner.id)).toHaveLength(1);
    });

    const orchestrator = await getCurrentAgentDefinition(sql, 'orchestrator');
    expect(orchestrator?.version).toBe(1);
    expect(orchestrator?.instructionsText.length).toBeGreaterThan(20);
  });
});
