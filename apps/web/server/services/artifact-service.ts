import type {
  ExportArtifactInput,
  ExportPackInput,
  GenerateArtifactInput,
  GenerateWorkbookInput,
  GetArtifactVersionInput,
} from '@foundry/api-contracts';
import {
  artifactObjectKey,
  buildPackExport,
  extensionForFormat,
  PACK_EXPORT_CONTENT_TYPE,
  primaryExtensionFor,
  siblingObjectKey,
  type RenderJobData,
} from '@foundry/artifacts';
import { limits } from '@foundry/config/limits';
import {
  getArtifactById,
  getArtifactByProjectAndType,
  getArtifactVersionById,
  getArtifactVersionByNumber,
  getCurrentMoneyRules,
  getLatestTemplate,
  getTemplateByTypeAndVersion,
  insertArtifact,
  insertArtifactVersion,
  insertRenderJob,
  listArtifactsByProjectId,
  listArtifactVersions,
  listExperimentsByProjectId,
  listGatesByProjectId,
  listMarketModelsByPackRevisionId,
  listSourcesByProjectId,
  markCurrentArtifactVersionsStale,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type {
  Artifact,
  ArtifactVersion,
  Project,
  UserId,
  WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { JobQueue } from '../queue/job-queue';
import type { ObjectStore } from '../storage/object-store';
import { ensurePackRevision, loadPackSnapshot } from './pack-snapshot';

export class ArtifactService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly objectStore: ObjectStore,
    private readonly jobQueue: JobQueue,
  ) {}

  async list(actor: { membership: WorkspaceMembership; project: Project }): Promise<Artifact[]> {
    if (!this.policyService.can(actor.membership, 'artifact.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list artifacts.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listArtifactsByProjectId(tx, actor.project.id),
    );
  }

  async generateWorkbook(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: GenerateWorkbookInput,
  ): Promise<{ artifact: Artifact; version: ArtifactVersion }> {
    return this.generate(actor, {
      projectId: input.projectId,
      artifactType: 'market_economics_workbook',
      idempotencyKey: input.idempotencyKey,
    });
  }

  async generate(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: GenerateArtifactInput,
  ): Promise<{ artifact: Artifact; version: ArtifactVersion }> {
    if (!this.policyService.can(actor.membership, 'artifact.generate')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot generate artifacts.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:artifact.generate:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as { artifact: Artifact; version: ArtifactVersion },
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const pack = await ensurePackRevision(tx, actor.project, actor.userId);
          if (input.artifactType === 'market_economics_workbook') {
            const moneyRules = await getCurrentMoneyRules(tx, actor.project.id);
            const markets = await listMarketModelsByPackRevisionId(tx, pack.id);
            const market = markets[0];
            if (moneyRules === null || market?.computedResult === null || market === undefined) {
              throw new AppError({
                code: 'invalid_input',
                explanation: 'MoneyRules and a computed market model are required.',
                nextAction: 'Set MoneyRules and upsert the market model first.',
              });
            }
          }
          const template =
            input.templateVersion === undefined
              ? await getLatestTemplate(tx, input.artifactType)
              : await getTemplateByTypeAndVersion(tx, input.artifactType, input.templateVersion);
          if (template === null) {
            throw new AppError({
              code: 'invalid_input',
              explanation: 'No template is registered for this artifact type.',
              nextAction: 'Omit templateVersion or pick a seeded template version.',
            });
          }
          let artifact = await getArtifactByProjectAndType(
            tx,
            actor.project.id,
            input.artifactType,
          );
          if (artifact === null) {
            artifact = await insertArtifact(tx, {
              projectId: actor.project.id,
              artifactType: input.artifactType,
            });
          } else {
            await markCurrentArtifactVersionsStale(tx, artifact.id);
          }
          const versions = await listArtifactVersions(tx, artifact.id);
          const versionNumber = (versions[0]?.versionNumber ?? 0) + 1;
          const extension = primaryExtensionFor(input.artifactType);
          const s3Key = artifactObjectKey(actor.project.id, artifact.id, versionNumber, extension);
          const version = await insertArtifactVersion(tx, {
            artifactId: artifact.id,
            versionNumber,
            packRevisionId: pack.id,
            s3Key,
            status: 'generating',
            templateId: template.id,
            citations: { templateVersion: template.version },
          });
          await insertRenderJob(tx, { artifactVersionId: version.id });
          const job: RenderJobData = {
            artifactVersionId: version.id,
            projectId: actor.project.id,
            workspaceId: actor.project.workspaceId,
            artifactType: input.artifactType,
            packRevisionId: pack.id,
            correlationId: input.idempotencyKey,
          };
          await this.jobQueue.enqueueRender(job);
          return { artifact, version };
        }),
    );
  }

  async getVersion(
    actor: { membership: WorkspaceMembership; project: Project },
    input: GetArtifactVersionInput,
  ): Promise<ArtifactVersion> {
    if (!this.policyService.can(actor.membership, 'artifact.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read artifacts.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const artifact = await this.requireProjectArtifact(tx, actor.project.id, input.artifactId);
      if (input.version === undefined) {
        if (artifact.currentVersionId === null) {
          throw new AppError({
            code: 'not_found',
            explanation: 'This artifact has no current version.',
            nextAction: 'Generate the artifact first.',
          });
        }
        const current = await getArtifactVersionById(tx, artifact.currentVersionId);
        if (current === null) {
          throw new AppError({
            code: 'not_found',
            explanation: 'Artifact version not found.',
            nextAction: 'Generate the artifact again.',
          });
        }
        return current;
      }
      const version = await getArtifactVersionByNumber(tx, artifact.id, input.version);
      if (version === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Artifact version not found.',
          nextAction: 'Pick a version that exists for this artifact.',
        });
      }
      return version;
    });
  }

  async export(
    actor: { membership: WorkspaceMembership; project: Project },
    input: ExportArtifactInput,
  ): Promise<{ url: string; expiresAt: Date; format: ExportArtifactInput['format'] }> {
    if (!this.policyService.can(actor.membership, 'artifact.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot export artifacts.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      await this.requireProjectArtifact(tx, actor.project.id, input.artifactId);
      const version = await getArtifactVersionByNumber(tx, input.artifactId, input.version);
      if (version === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Artifact version not found.',
          nextAction: 'Pick a version that exists for this artifact.',
        });
      }
      if (version.status === 'generating' || version.status === 'failed') {
        throw new AppError({
          code: 'invalid_input',
          explanation: 'This version is not ready to export.',
          nextAction: 'Wait for render to finish, or regenerate.',
        });
      }
      const key = siblingObjectKey(version.s3Key, extensionForFormat(input.format));
      const exists = await this.objectStore.exists(key);
      if (!exists) {
        throw new AppError({
          code: 'not_found',
          explanation: 'That export format is not available for this version.',
          nextAction: 'Export the primary format or regenerate the artifact.',
        });
      }
      return {
        ...(await this.objectStore.createDownloadUrl(key, limits.downloadUrlExpiresSeconds)),
        format: input.format,
      };
    });
  }

  async exportPack(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: ExportPackInput,
  ): Promise<{ url: string; expiresAt: Date; format: 'json' }> {
    if (!this.policyService.can(actor.membership, 'artifact.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot export the company pack.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:pack.export:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as { url: string; expiresAt: Date; format: 'json' },
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const pack = await ensurePackRevision(tx, actor.project, actor.userId);
          const snapshot = await loadPackSnapshot(tx, {
            ...actor.project,
            currentPackRevisionId: pack.id,
          });
          const [sources, experiments, artifacts, gates] = await Promise.all([
            listSourcesByProjectId(tx, actor.project.id),
            listExperimentsByProjectId(tx, actor.project.id),
            listArtifactsByProjectId(tx, actor.project.id),
            listGatesByProjectId(tx, actor.project.id),
          ]);
          const exported = buildPackExport({
            artifactType: 'company_pack',
            projectId: actor.project.id,
            projectName: actor.project.name,
            phase: snapshot.phase,
            packRevisionId: snapshot.pack.id,
            packRevisionNumber: snapshot.pack.revisionNumber,
            interviews: snapshot.interviews,
            quotes: snapshot.quotes,
            beachheads: snapshot.beachheads,
            dmus: snapshot.dmus,
            moneyRules: snapshot.moneyRules,
            marketModels: snapshot.marketModels,
            unitEconomics: snapshot.unitEconomics,
            wtpEvents: snapshot.wtpEvents,
            clarifications: snapshot.clarifications,
            generatedAt: new Date(),
            sources,
            experiments,
            artifacts,
            gates,
          });
          const objectKey = `exports/${actor.project.id}/${pack.id}/pack.json`;
          await this.objectStore.put(objectKey, exported.body, PACK_EXPORT_CONTENT_TYPE);
          return {
            ...(await this.objectStore.createDownloadUrl(
              objectKey,
              limits.downloadUrlExpiresSeconds,
            )),
            format: 'json' as const,
          };
        }),
    );
  }

  private async requireProjectArtifact(
    sql: Parameters<typeof getArtifactById>[0],
    projectId: Project['id'],
    artifactId: Artifact['id'],
  ): Promise<Artifact> {
    const artifact = await getArtifactById(sql, artifactId);
    if (artifact === null || artifact.projectId !== projectId) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Artifact not found.',
        nextAction: 'Pick an artifact that belongs to this project.',
      });
    }
    return artifact;
  }
}
