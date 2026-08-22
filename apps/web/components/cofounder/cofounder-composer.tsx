'use client';

import { type FormEvent, type RefObject } from 'react';

const COMPOSER_MAX_HEIGHT_PX = 200;

export function CofounderComposer({
  answer,
  setAnswer,
  files,
  setFiles,
  errorMessage,
  isPending,
  fileAccept,
  maxFiles,
  textareaRef,
  onSubmit,
}: {
  answer: string;
  setAnswer: (value: string) => void;
  files: File[];
  setFiles: (value: File[] | ((current: File[]) => File[])) => void;
  errorMessage: string | null;
  isPending: boolean;
  fileAccept: string;
  maxFiles: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="chat-composer" onSubmit={onSubmit}>
      {errorMessage === null ? null : (
        <p className="alert px-1" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="chat-composer-box">
        {files.length === 0 ? null : (
          <ul className="flex flex-wrap gap-2" aria-label="Attachments">
            {files.map((file) => (
              <li key={file.name}>
                <button
                  type="button"
                  className="badge min-h-11"
                  onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                >
                  {file.name} ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          ref={textareaRef}
          className="chat-composer-textarea"
          aria-label="Message"
          name="answer"
          rows={1}
          style={{ maxHeight: `${String(COMPOSER_MAX_HEIGHT_PX)}px` }}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="e.g. I think small cafes waste time on scheduling staff."
          required
        />
        <div className="chat-composer-toolbar">
          <label className="chat-composer-icon-btn min-h-11 min-w-11" aria-label="Attach files">
            <AttachGlyph />
            <input
              className="sr-only"
              type="file"
              multiple
              accept={fileAccept}
              onChange={(event) =>
                setFiles((current) =>
                  [...current, ...Array.from(event.target.files ?? [])].slice(0, maxFiles),
                )
              }
            />
          </label>
          <button
            className="chat-composer-send"
            type="submit"
            disabled={isPending || answer.trim().length === 0}
          >
            {isPending ? <SpinnerGlyph /> : <SendGlyph />}
            {isPending ? 'Sending' : 'Send'}
          </button>
        </div>
      </div>
    </form>
  );
}

function SendGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path fill="currentColor" d="M8 3 12 9 9.3 9 9.3 13 6.7 13 6.7 9 4 9Z" />
    </svg>
  );
}

function AttachGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

function SpinnerGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="chat-spin size-4" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M8 2a6 6 0 1 0 6 6"
      />
    </svg>
  );
}
