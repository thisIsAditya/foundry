'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';

import { errorMessageOf } from '../../lib/error-message';
import {
  DOCUMENT_FILE_ACCEPT,
  MAX_VENTURE_ATTACHMENTS,
  uploadEvidenceAttachment,
} from '../../lib/upload-evidence';
import { useTRPC } from '../../lib/trpc/client';
import { ventureNameFromPitch } from '../../lib/venture-name';

const PROGRESS_LINES = [
  'Reading your idea…',
  'Drafting your first business model…',
  'Proposing a research plan…',
] as const;

export function VentureComposer({
  workspaceId,
  variant,
  onCancel,
}: {
  workspaceId: string;
  variant: 'hero' | 'overlay';
  onCancel?: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [pitch, setPitch] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(-1);
  const createProject = useMutation(trpc.project.create.mutationOptions());
  const createIntent = useMutation(trpc.evidence.createUploadIntent.mutationOptions());
  const confirm = useMutation(trpc.evidence.confirmUpload.mutationOptions());
  const observe = useMutation(trpc.evidence.recordObservation.mutationOptions());
  const pending = progress >= 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = pitch.trim();
    if (trimmed.length === 0) {
      return;
    }
    try {
      setProgress(0);
      const attachmentIds: string[] = [];
      for (const file of files) {
        const uploaded = await uploadEvidenceAttachment({
          file,
          workspaceId,
          createIntent: (body) => createIntent.mutateAsync(body),
          confirm: (body) => confirm.mutateAsync(body),
          recordObservation: (body) => observe.mutateAsync(body),
        });
        attachmentIds.push(uploaded.evidenceItemId);
      }
      setProgress(1);
      const created = await createProject.mutateAsync({
        workspaceId,
        name: ventureNameFromPitch(trimmed),
        founderPitch: trimmed,
        ...(attachmentIds.length === 0 ? {} : { attachmentIds }),
        idempotencyKey: idempotencyKey.current,
      });
      setProgress(2);
      idempotencyKey.current = crypto.randomUUID();
      router.push(`/p/${created.id}`);
    } catch {
      setProgress(-1);
    }
  }

  const errorMessage =
    errorMessageOf(createProject.error) ??
    errorMessageOf(createIntent.error) ??
    errorMessageOf(confirm.error) ??
    errorMessageOf(observe.error);

  return (
    <div className={variant === 'hero' ? 'venture-hero' : 'venture-overlay'}>
      <form className="venture-composer" onSubmit={(event) => void onSubmit(event)}>
        <p className="font-display text-xs font-semibold tracking-wide uppercase">
          Ready when you are
        </p>
        <h1 className="page-title">Tell us the idea</h1>
        <p className="lede">
          This is your real working environment — not a demo. Write what you know. We will draft the
          first business model and a research plan from it.
        </p>
        <label className="field">
          <span>Your pitch</span>
          <textarea
            className="textarea"
            value={pitch}
            onChange={(event) => setPitch(event.target.value)}
            placeholder="Tell us everything — who has the problem, what they do today, why it's worth paying to fix, and anything else you know"
            required
            disabled={pending}
          />
        </label>
        <label className="field">
          <span>Attachments</span>
          <input
            type="file"
            multiple
            accept={DOCUMENT_FILE_ACCEPT}
            disabled={pending}
            onChange={(event) =>
              setFiles(Array.from(event.target.files ?? []).slice(0, MAX_VENTURE_ATTACHMENTS))
            }
          />
          {files.length === 0 ? (
            <p className="hint">Optional. PDF or plain text, up to ten files.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {files.map((file) => (
                <li key={file.name}>
                  <button
                    type="button"
                    className="badge"
                    disabled={pending}
                    onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                  >
                    {file.name} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
        {pending ? (
          <ol className="stack" aria-live="polite">
            {PROGRESS_LINES.map((line, index) => (
              <li key={line} className={index <= progress ? 'text-sm' : 'hint'}>
                {line}
              </li>
            ))}
          </ol>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button className="btn" type="submit" disabled={pending || pitch.trim().length === 0}>
            {pending ? 'Starting…' : 'Start building'}
          </button>
          {onCancel === undefined ? null : (
            <button className="btn-secondary" type="button" onClick={onCancel} disabled={pending}>
              Cancel
            </button>
          )}
        </div>
        {errorMessage === null ? null : <p className="alert">{errorMessage}</p>}
      </form>
    </div>
  );
}
