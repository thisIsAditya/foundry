import type { CreateUploadIntentInput } from '@foundry/api-contracts';
import { ProjectIdSchema, SourceIdSchema } from '@foundry/domain';

export const MAX_VENTURE_ATTACHMENTS = 10;
export const MAX_CHAT_ATTACHMENTS = 5;
export const DOCUMENT_FILE_ACCEPT = '.pdf,.txt,.md,application/pdf,text/plain,text/markdown';

export type UploadEvidenceFns = {
  createIntent: (body: CreateUploadIntentInput) => Promise<{
    sourceId: string;
    projectId: string;
    uploadUrl: string;
  }>;
  confirm: (body: { sourceId: string; idempotencyKey: string }) => Promise<unknown>;
};

export async function uploadEvidenceAttachment(
  input: UploadEvidenceFns & {
    file: File;
    projectId: string;
  },
): Promise<{ sourceId: string; filename: string }> {
  const intent = await input.createIntent({
    filename: input.file.name,
    mimeType: input.file.type || 'text/plain',
    sizeBytes: Math.max(input.file.size, 1),
    idempotencyKey: crypto.randomUUID(),
    projectId: ProjectIdSchema.parse(input.projectId),
  });
  if (intent.uploadUrl.startsWith('memory://')) {
    const stored = await fetch(`/api/uploads/${intent.sourceId}`, {
      method: 'PUT',
      body: input.file,
    });
    if (!stored.ok) {
      throw new Error('Could not store the file.');
    }
  } else {
    const uploaded = await fetch(intent.uploadUrl, {
      method: 'PUT',
      body: input.file,
      headers: { 'Content-Type': input.file.type || 'text/plain' },
    });
    if (!uploaded.ok) {
      throw new Error('Could not store the file.');
    }
  }
  await input.confirm({
    sourceId: intent.sourceId,
    idempotencyKey: crypto.randomUUID(),
  });
  return {
    sourceId: SourceIdSchema.parse(intent.sourceId),
    filename: input.file.name,
  };
}
