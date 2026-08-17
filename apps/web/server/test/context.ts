import { listWorkspaceMembershipsByUserId, type PoolSql } from '@foundry/db';
import type { User } from '@foundry/domain';
import { PolicyService } from '@foundry/policy';
import { randomUUID } from 'node:crypto';

import { createMemoryCoordinationStore } from '../coordination';
import { createServices, type Context } from '../context';

export async function createTestContext(sql: PoolSql, user: User | null): Promise<Context> {
  const coordination = createMemoryCoordinationStore();
  const policyService = new PolicyService();
  const services = createServices(sql, coordination, policyService);

  if (user === null) {
    return {
      sql,
      actor: { type: 'anonymous' },
      session: null,
      correlationId: randomUUID(),
      coordination,
      services,
      clientIp: '127.0.0.1',
    };
  }

  const memberships = await listWorkspaceMembershipsByUserId(sql, user.id);
  return {
    sql,
    actor: { type: 'user', userId: user.id, memberships },
    session: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
    correlationId: randomUUID(),
    coordination,
    services,
    clientIp: '127.0.0.1',
  };
}
