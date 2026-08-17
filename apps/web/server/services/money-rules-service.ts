import type { SetMoneyRulesInput, UpsertMarketModelInput } from '@foundry/api-contracts';
import { dependentsOf } from '@foundry/artifacts';
import { limits } from '@foundry/config/limits';
import {
  getCurrentMoneyRules,
  insertCurrentMoneyRules,
  insertMarketModel,
  insertUnitEconomicsModel,
  markDependentArtifactsStale,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type {
  MarketModel,
  MoneyRules,
  Project,
  UnitEconomicsModel,
  UserId,
  WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import {
  calculateMarketSize,
  calculateSensitivity,
  calculateUnitEconomics,
  PolicyService,
} from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import { ensurePackRevision } from './pack-snapshot';

export class MoneyRulesService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
  ) {}

  async getCurrent(actor: {
    membership: WorkspaceMembership;
    project: Project;
  }): Promise<MoneyRules | null> {
    if (!this.policyService.can(actor.membership, 'money.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read MoneyRules.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      getCurrentMoneyRules(tx, actor.project.id),
    );
  }

  async setCurrent(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: SetMoneyRulesInput,
  ): Promise<{ moneyRules: MoneyRules; unitEconomics: UnitEconomicsModel }> {
    if (!this.policyService.can(actor.membership, 'money.write')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot change MoneyRules.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:moneyRules.set:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) =>
        superjson.parse(raw) as { moneyRules: MoneyRules; unitEconomics: UnitEconomicsModel },
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const pack = await ensurePackRevision(tx, actor.project, actor.userId);
          const moneyRules = await insertCurrentMoneyRules(tx, {
            projectId: actor.project.id,
            packRevisionId: pack.id,
            currency: input.currency,
            unitOfSale: input.unitOfSale,
            price: input.price,
            ...(input.billingFrequency === undefined
              ? {}
              : { billingFrequency: input.billingFrequency }),
            costStructure: input.costStructure,
          });
          const margin = calculateUnitEconomics({
            price: moneyRules.price,
            currency: moneyRules.currency,
            costStructure: moneyRules.costStructure,
          });
          const unitEconomics = await insertUnitEconomicsModel(tx, {
            packRevisionId: pack.id,
            moneyRulesId: moneyRules.id,
            margin,
            sensitivity: calculateSensitivity({
              price: moneyRules.price,
              currency: moneyRules.currency,
              costStructure: moneyRules.costStructure,
            }),
          });
          await markDependentArtifactsStale(tx, actor.project.id, dependentsOf('money_rules'));
          return { moneyRules, unitEconomics };
        }),
    );
  }

  async upsertMarket(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: UpsertMarketModelInput,
  ): Promise<MarketModel> {
    if (!this.policyService.can(actor.membership, 'money.write')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot update the market model.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:market.upsert:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as MarketModel,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const pack = await ensurePackRevision(tx, actor.project, actor.userId);
          const moneyRules = await getCurrentMoneyRules(tx, actor.project.id);
          if (moneyRules === null) {
            throw new AppError({
              code: 'invalid_input',
              explanation: 'Canonical MoneyRules must exist before market size is computed.',
              nextAction: 'Set MoneyRules first.',
            });
          }
          const computed = calculateMarketSize({
            spec: input.spec,
            inputs: input.inputs,
            price: moneyRules.price,
          });
          const created = await insertMarketModel(tx, {
            packRevisionId: pack.id,
            formulaSpec: input.spec,
            inputs: input.inputs,
            computedResult: computed,
          });
          await markDependentArtifactsStale(tx, actor.project.id, dependentsOf('market_model'));
          return created;
        }),
    );
  }
}
