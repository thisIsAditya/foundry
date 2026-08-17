import { listWorkspaceMembershipsByUserId, type PoolSql } from '@foundry/db';
import { UserIdSchema, type UserId, type WorkspaceMembership } from '@foundry/domain';
import { PolicyService } from '@foundry/policy';
import { randomUUID } from 'node:crypto';

import { getAuth } from '../lib/auth';
import { getEnv } from '../lib/env';
import { getSql } from '../lib/sql';
import { getCoordinationStore, type CoordinationStore } from './coordination';
import { createBullmqJobQueue, createMemoryJobQueue, type JobQueue } from './queue/job-queue';
import { DocumentService } from './services/document-service';
import { ProjectService } from './services/project-service';
import { WorkspaceService } from './services/workspace-service';
import { createMemoryObjectStore, type ObjectStore } from './storage/object-store';
import { createS3ObjectStore } from './storage/s3-object-store';

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
  documentService: DocumentService;
};

export type Context = {
  sql: PoolSql;
  actor: Actor;
  session: AuthSession;
  correlationId: string;
  coordination: CoordinationStore;
  services: ServiceContainer;
  clientIp: string;
  objectStore: ObjectStore;
  jobQueue: JobQueue;
};

export type ServiceExtras = {
  objectStore: ObjectStore;
  jobQueue: JobQueue;
};

export function createServices(
  sql: PoolSql,
  coordination: CoordinationStore,
  policyService: PolicyService,
  extras: ServiceExtras,
): ServiceContainer {
  return {
    policyService,
    workspaceService: new WorkspaceService(sql, coordination),
    projectService: new ProjectService(sql, coordination, policyService),
    documentService: new DocumentService(
      sql,
      coordination,
      policyService,
      extras.objectStore,
      extras.jobQueue,
    ),
  };
}

function extrasFromEnv(): ServiceExtras {
  const env = getEnv();
  return {
    objectStore:
      env.AWS_S3_UPLOADS_BUCKET === undefined
        ? createMemoryObjectStore()
        : createS3ObjectStore(env),
    jobQueue:
      env.REDIS_URL === undefined ? createMemoryJobQueue() : createBullmqJobQueue(env.REDIS_URL),
  };
}

export async function createContext(req: Request): Promise<Context> {
  const correlationId = req.headers.get('x-correlation-id') ?? randomUUID();
  const session = await getAuth().api.getSession({ headers: req.headers });
  const sql = getSql();
  const coordination = getCoordinationStore();
  const policyService = new PolicyService();
  const extras = extrasFromEnv();
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
      services: createServices(sql, coordination, policyService, extras),
      clientIp,
      objectStore: extras.objectStore,
      jobQueue: extras.jobQueue,
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
    services: createServices(sql, coordination, policyService, extras),
    clientIp,
    objectStore: extras.objectStore,
    jobQueue: extras.jobQueue,
  };
}
