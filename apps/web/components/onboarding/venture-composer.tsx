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
import { projectCofounderHref } from '../../lib/project-href';
import { useTRPC } from '../../lib/trpc/client';
import { ventureNameFromPitch } from '../../lib/venture-name';
import { CofounderThread } from '../cofounder/cofounder-thread';

const PROGRESS_LINES = [
  'Creating your venture…',
  'Uploading your source material…',
  'Opening the co-founder intake review…',
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
  const [showContext, setShowContext] = useState(false);
  const [geography, setGeography] = useState('');
  const [objective, setObjective] = useState<
    'undecided' | 'bootstrap' | 'venture' | 'grant' | 'loan' | 'lifestyle'
  >('undecided');
  const [constraints, setConstraints] = useState('');
  const [urgency, setUrgency] = useState<'' | 'now' | 'soon' | 'exploring'>('');
  const [customerHint, setCustomerHint] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(-1);
  const [createdVenture, setCreatedVenture] = useState<{
    id: string;
    founderMessage: string;
  } | null>(null);
  const createProject = useMutation(trpc.project.create.mutationOptions());
  const createIntent = useMutation(trpc.evidence.createUploadIntent.mutationOptions());
  const confirm = useMutation(trpc.evidence.confirmUpload.mutationOptions());
  const pending = progress >= 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = pitch.trim();
    if (trimmed.length === 0) {
      return;
    }
    try {
      setProgress(0);
      const created = await createProject.mutateAsync({
        workspaceId,
        name: ventureNameFromPitch(trimmed),
        founderPitch: trimmed,
        ...(geography.trim().length === 0 ? {} : { geography: geography.trim() }),
        ...(objective === 'undecided' ? {} : { objective }),
        ...(constraints.trim().length === 0 ? {} : { constraints: constraints.trim() }),
        ...(urgency === '' ? {} : { urgency }),
        ...(customerHint.trim().length === 0 ? {} : { customerHint: customerHint.trim() }),
        idempotencyKey: idempotencyKey.current,
      });
      setProgress(1);
      for (const file of files) {
        await uploadEvidenceAttachment({
          file,
          projectId: created.id,
          createIntent: (body) => createIntent.mutateAsync(body),
          confirm: (body) => confirm.mutateAsync(body),
        });
      }
      setProgress(2);
      idempotencyKey.current = crypto.randomUUID();
      setCreatedVenture({ id: created.id, founderMessage: trimmed });
    } catch {
      setProgress(-1);
    }
  }

  const errorMessage =
    errorMessageOf(createProject.error) ??
    errorMessageOf(createIntent.error) ??
    errorMessageOf(confirm.error);

  if (createdVenture !== null) {
    return (
      <div className={variant === 'hero' ? 'venture-hero' : 'venture-overlay'}>
        <section className="venture-creation-chat" aria-live="polite">
          <p className="callout-eyebrow">Your co-founder</p>
          <h1 className="page-title">Taking the first pass on your idea</h1>
          <p className="lede">
            Your idea is the first message in this conversation. We’ll open your venture as soon as
            the co-founder’s response is ready.
          </p>
          <CofounderThread
            projectId={createdVenture.id}
            initialPrompt={createdVenture.founderMessage}
            onInitialPromptSettled={() => router.replace(projectCofounderHref(createdVenture.id))}
          />
        </section>
      </div>
    );
  }

  return (
    <div className={variant === 'hero' ? 'venture-hero' : 'venture-overlay'}>
      <form className="venture-composer" onSubmit={(event) => void onSubmit(event)}>
        <p className="font-display text-xs font-semibold tracking-wide uppercase">Idea first</p>
        <h1 className="page-title">Tell us the idea</h1>
        <p className="lede">
          Write what you know. We will open an incomplete record and one recommended next step. We
          will not invent a 17-section plan, a score, or a research sprint.
        </p>
        <label className="field">
          <span>Your idea</span>
          <textarea
            className="textarea"
            value={pitch}
            onChange={(event) => setPitch(event.target.value)}
            placeholder="Who has the problem, what they do today, and anything else you actually know"
            required
            disabled={pending}
          />
        </label>
        <button
          type="button"
          className="btn-secondary min-h-11 self-start"
          disabled={pending}
          onClick={() => setShowContext((current) => !current)}
        >
          {showContext ? 'Hide optional context' : 'Add goal, geography, or constraints'}
        </button>
        {showContext ? (
          <div className="stack">
            <label className="field">
              <span>Geography</span>
              <input
                className="input min-h-11"
                value={geography}
                onChange={(event) => setGeography(event.target.value)}
                disabled={pending}
              />
            </label>
            <label className="field">
              <span>Goal</span>
              <select
                className="input min-h-11"
                value={objective}
                onChange={(event) => setObjective(event.target.value as typeof objective)}
                disabled={pending}
              >
                <option value="undecided">Undecided</option>
                <option value="bootstrap">Bootstrap</option>
                <option value="venture">Venture</option>
                <option value="grant">Grant</option>
                <option value="loan">Loan</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </label>
            <label className="field">
              <span>Constraints</span>
              <textarea
                className="textarea"
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                disabled={pending}
              />
            </label>
            <label className="field">
              <span>Urgency</span>
              <select
                className="input min-h-11"
                value={urgency}
                onChange={(event) => setUrgency(event.target.value as typeof urgency)}
                disabled={pending}
              >
                <option value="">Not specified</option>
                <option value="now">Now</option>
                <option value="soon">Soon</option>
                <option value="exploring">Exploring</option>
              </select>
            </label>
            <label className="field">
              <span>First customer, if you already know</span>
              <input
                className="input min-h-11"
                value={customerHint}
                onChange={(event) => setCustomerHint(event.target.value)}
                disabled={pending}
              />
              <p className="hint">
                Only include this when it should change the first recommended step.
              </p>
            </label>
          </div>
        ) : null}
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
          <button
            className="btn min-h-11"
            type="submit"
            disabled={pending || pitch.trim().length === 0}
          >
            {pending ? 'Starting…' : 'Start from this idea'}
          </button>
          {onCancel === undefined ? null : (
            <button
              className="btn-secondary min-h-11"
              type="button"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </button>
          )}
        </div>
        {errorMessage === null ? null : <p className="alert">{errorMessage}</p>}
      </form>
    </div>
  );
}
