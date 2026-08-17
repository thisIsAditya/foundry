import { listWorkspaceMembershipsByUserId, type PoolSql } from '@foundry/db';
import { UserIdSchema, type UserId, type WorkspaceMembership } from '@foundry/domain';
import { PolicyService } from '@foundry/policy';
import { randomUUID } from 'node:crypto';

import { getAuth } from '../lib/auth';
import { getSql } from '../lib/sql';
import { getCoordinationStore, type CoordinationStore } from './coordination';
import { ProjectService } from './services/project-service';
import { WorkspaceService } from './services/workspace-service';

export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string | null;
  };
} | null;

export type Actor =
  { type: 'anonymous' } | { type: 'user'; userId: UserId; memberships: WorkspaceMembership[] };

export type ServiceContainer = {
  policyService: PolicyService;
  workspaceService: WorkspaceService;
  projectService: ProjectService;
};

export type Context = {
  sql: PoolSql;
  actor: Actor;
  session: AuthSession;
  correlationId: string;
  coordination: CoordinationStore;
  services: ServiceContainer;
  clientIp: string;
};

export function createServices(
  sql: PoolSql,
  coordination: CoordinationStore,
  policyService: PolicyService,
): ServiceContainer {
  return {
    policyService,
    workspaceService: new WorkspaceService(sql, coordination),
    projectService: new ProjectService(sql, coordination, policyService),
  };
}

export async function createContext(req: Request): Promise<Context> {
  const correlationId = req.headers.get('x-correlation-id') ?? randomUUID();
  const session = await getAuth().api.getSession({ headers: req.headers });
  const sql = getSql();
  const coordination = getCoordinationStore();
  const policyService = new PolicyService();
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (session === null) {
    return {
      sql,
      actor: { type: 'anonymous' },
      session: null,
      correlationId,
      coordination,
      services: createServices(sql, coordination, policyService),
      clientIp,
    };
  }

  const userId = UserIdSchema.parse(session.user.id);
  const memberships = await listWorkspaceMembershipsByUserId(sql, userId);

  return {
    sql,
    actor: { type: 'user', userId, memberships },
    session: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: 'role' in session.user ? String(session.user.role) : null,
      },
    },
    correlationId,
    coordination,
    services: createServices(sql, coordination, policyService),
    clientIp,
  };
}
