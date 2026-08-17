import type { CreateUploadIntentInput } from '@foundry/api-contracts';
import { ProjectIdSchema, type SourceKind } from '@foundry/domain';

export async function uploadLocalUri(input: {
  projectId: string;
  uri: string;
  filename: string;
  mimeType: string;
  kind?: SourceKind;
  createIntent: (body: CreateUploadIntentInput) => Promise<{ sourceId: string; uploadUrl: string }>;
  confirm: (body: { sourceId: string; idempotencyKey: string }) => Promise<unknown>;
}): Promise<string> {
  const body = await fetch(input.uri).then((response) => response.blob());
  const created = await input.createIntent({
    projectId: ProjectIdSchema.parse(input.projectId),
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: Math.max(body.size, 1),
    ...(input.kind === undefined ? {} : { kind: input.kind }),
    idempotencyKey: crypto.randomUUID(),
  });
  await fetch(created.uploadUrl, { method: 'PUT', body });
  await input.confirm({
    sourceId: created.sourceId,
    idempotencyKey: crypto.randomUUID(),
  });
  return created.sourceId;
}
