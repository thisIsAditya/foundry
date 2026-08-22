'use client';

import { CofounderOperationIdSchema } from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import { useProjectStream } from '../../lib/stream/use-project-stream';
import { useTRPC } from '../../lib/trpc/client';
import {
  DOCUMENT_FILE_ACCEPT,
  MAX_CHAT_ATTACHMENTS,
  uploadEvidenceAttachment,
} from '../../lib/upload-evidence';

const DRAFT_KEY = (projectId: string) => `foundry:cofounder-draft:${projectId}`;

export function useCofounderTransport(projectId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const stream = useProjectStream(projectId);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [answer, setAnswer] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [pendingOperationId, setPendingOperationId] = useState<string | null>(null);
  const [lastTerminalOperationId, setLastTerminalOperationId] = useState<string | null>(null);
  const history = useQuery(trpc.conversation.list.queryOptions({ projectId, limit: 40 }));
  const createIntent = useMutation(trpc.evidence.createUploadIntent.mutationOptions());
  const confirm = useMutation(trpc.evidence.confirmUpload.mutationOptions());
  const respond = useMutation(trpc.cofounder.respond.mutationOptions());
  const cancel = useMutation(trpc.cofounder.cancel.mutationOptions());

  useEffect(() => {
    const stored = window.sessionStorage.getItem(DRAFT_KEY(projectId));
    if (stored !== null && stored.length > 0) {
      setAnswer(stored);
    }
  }, [projectId]);

  useEffect(() => {
    window.sessionStorage.setItem(DRAFT_KEY(projectId), answer);
  }, [answer, projectId]);

  useEffect(() => {
    if (!respond.isPending) {
      return;
    }
    const started = [...stream.events]
      .reverse()
      .find((event) => event.type === 'cofounder_started');
    if (started !== undefined) {
      setPendingOperationId(started.operationId);
    }
  }, [respond.isPending, stream.events]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.conversation.list.queryKey({ projectId }),
    });
  }, [projectId, queryClient, trpc.conversation.list]);

  useEffect(() => {
    const terminal = [...stream.events]
      .reverse()
      .find(
        (event) =>
          event.type === 'cofounder_completed' ||
          event.type === 'cofounder_failed' ||
          event.type === 'cofounder_canceled' ||
          event.type === 'cofounder_waiting',
      );
    if (terminal === undefined || pendingOperationId === null || !('operationId' in terminal)) {
      return;
    }
    if (
      terminal.operationId !== pendingOperationId ||
      terminal.operationId === lastTerminalOperationId
    ) {
      return;
    }
    void refresh();
    setLastTerminalOperationId(terminal.operationId);
    setPendingOperationId(null);
  }, [lastTerminalOperationId, pendingOperationId, refresh, stream.events]);

  async function submit(nextText?: string): Promise<string | null> {
    const text = (nextText ?? answer).trim();
    if (text.length === 0 || respond.isPending) {
      return null;
    }
    for (const file of files) {
      await uploadEvidenceAttachment({
        file,
        projectId,
        createIntent: (body) => createIntent.mutateAsync(body),
        confirm: (body) => confirm.mutateAsync(body),
      });
    }
    const turn = await respond.mutateAsync({
      projectId,
      text,
      idempotencyKey: idempotencyKey.current,
    });
    idempotencyKey.current = crypto.randomUUID();
    setAnswer('');
    setFiles([]);
    window.sessionStorage.removeItem(DRAFT_KEY(projectId));
    setPendingOperationId(turn.operation?.id ?? null);
    await refresh();
    return turn.operation?.id ?? null;
  }

  async function cancelTurn(): Promise<void> {
    if (pendingOperationId === null) {
      return;
    }
    await cancel.mutateAsync({
      projectId,
      operationId: CofounderOperationIdSchema.parse(pendingOperationId),
      idempotencyKey: crypto.randomUUID(),
    });
    await refresh();
  }

  const errorMessage =
    errorMessageOf(respond.error) ??
    errorMessageOf(cancel.error) ??
    errorMessageOf(createIntent.error) ??
    errorMessageOf(confirm.error);

  return {
    history,
    answer,
    setAnswer,
    files,
    setFiles,
    pendingOperationId,
    lastTerminalOperationId,
    isPending: respond.isPending || pendingOperationId !== null,
    errorMessage,
    fileAccept: DOCUMENT_FILE_ACCEPT,
    maxFiles: MAX_CHAT_ATTACHMENTS,
    submit,
    cancelTurn,
    stream,
  };
}
