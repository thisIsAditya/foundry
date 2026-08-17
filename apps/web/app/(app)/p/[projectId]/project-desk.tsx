'use client';

import { SendConversationInputSchema, type OverviewSummary } from '@foundry/api-contracts';
import {
  BeachheadIdSchema,
  InterviewParticipantTypes,
  PackSectionKeys,
  SprintIdSchema,
  type SprintStatus,
} from '@foundry/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Callout } from '../../../../components/ui/callout';
import { Checklist, type ChecklistItem } from '../../../../components/ui/checklist';
import { JourneyStepper } from '../../../../components/ui/journey-stepper';
import { packSectionLabel } from '../../../../lib/format';
import { journeyStep } from '../../../../lib/journey';
import { useProjectStream } from '../../../../lib/stream/use-project-stream';
import { useTRPC } from '../../../../lib/trpc/client';
import { ModelProviderPanel } from './model-provider-panel';

function errorMessageOf(error: unknown): string | null {
  return error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : null;
}

const GATE_A_LABELS: Record<string, string> = {
  non_friend_interviews: 'Talk to real prospects who are not friends or family',
  quotes_linked: 'Capture direct quotes from those conversations',
  repeatable_pain: 'See the same pain show up across multiple interviews',
  beachhead: 'Define your beachhead — the specific first customer segment',
  decision_maker: 'Name who actually decides whether to pay',
};

const TOPIC_CHIPS: { id: string; label: string }[] = [
  { id: 'problem', label: 'The problem' },
  { id: 'customer', label: 'My customer' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'competition', label: 'Competition' },
  { id: 'mvp', label: 'What to build first' },
];

type NextActionGuide = {
  eyebrow: string;
  title: string;
  description: string;
  action: { label: string; href: string } | null;
};

function nextActionGuide(nextAction: string | undefined, projectId: string): NextActionGuide {
  if (nextAction === undefined) {
    return {
      eyebrow: 'Loading',
      title: 'Figuring out your next step…',
      description: '',
      action: null,
    };
  }
  switch (nextAction) {
    case 'Review pending approvals.':
      return {
        eyebrow: 'Your next step',
        title: 'Review what the AI wants to do',
        description:
          'The AI has a real-world action queued up (like sending an email or publishing something). Nothing goes out until you approve it.',
        action: { label: 'Go to Approvals', href: `/p/${projectId}/approvals` },
      };
    case 'Capture interview evidence.':
      return {
        eyebrow: 'Your next step',
        title: 'Talk to a real customer',
        description:
          'Before you build anything, we need proof the problem is real. Interview a few people who are not friends or family, then log what they told you below.',
        action: { label: 'Jump to interviews', href: '#interviews' },
      };
    case 'Scope the MVBP with a payment path and kill lines.':
      return {
        eyebrow: 'Your next step',
        title: 'Scope your first product',
        description:
          'You have enough evidence — now define the smallest version worth building, how it gets paid for, and what would make you kill it.',
        action: { label: 'Open the MVBP pack section', href: `/p/${projectId}/pack/mvbp` },
      };
    case 'Complete the launch checklist and keep side effects approval-gated.':
      return {
        eyebrow: 'Your next step',
        title: 'Finish the launch checklist',
        description:
          "You're building and launching. Work through the launch checklist, and approve any real-world action before it goes out.",
        action: { label: 'Open the launch pack section', href: `/p/${projectId}/pack/launch` },
      };
    case 'Record plan-versus-actual metrics and evaluate Gate C.':
      return {
        eyebrow: 'Your next step',
        title: 'Track your real numbers',
        description:
          "You're live. Keep recording plan-versus-actual metrics so you know whether to double down, fix, or stop.",
        action: { label: 'See recorded decisions', href: `/p/${projectId}/decisions` },
      };
    case 'Set canonical MoneyRules.':
      return {
        eyebrow: 'Coming up',
        title: 'Lock in how the business makes money',
        description:
          'This step is set up automatically as your sprints run. In the meantime, the most valuable thing you can do is talk to a real customer — start there.',
        action: { label: 'Jump to interviews', href: '#interviews' },
      };
    case 'Regenerate stale artifacts.':
      return {
        eyebrow: 'Your next step',
        title: 'Refresh your documents',
        description:
          'Some generated documents are out of date. Run a sprint to bring them up to date.',
        action: { label: 'Jump to sprint', href: '#sprint' },
      };
    default:
      return {
        eyebrow: 'Your next step',
        title: 'Review your business pack',
        description: 'Check the current state of your plan and keep moving through this phase.',
        action: { label: 'Open the business pack', href: '#pack' },
      };
  }
}

function AskCoFounder({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const stream = useProjectStream(projectId);
  const idempotencyKey = useRef(crypto.randomUUID());
  const [answer, setAnswer] = useState('');
  const history = useQuery(trpc.conversation.list.queryOptions({ projectId, limit: 20 }));
  const mutation = useMutation(trpc.conversation.send.mutationOptions());

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const input = SendConversationInputSchema.parse({
      projectId,
      text: answer,
      idempotencyKey: idempotencyKey.current,
    });
    try {
      await mutation.mutateAsync(input);
      idempotencyKey.current = crypto.randomUUID();
      setAnswer('');
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  const errorMessage = errorMessageOf(mutation.error);
  const chronological = [...(history.data?.items ?? [])].reverse();

  return (
    <section id="ask" className="card stack scroll-mt-6">
      <div>
        <h2 className="card-title">Ask your AI co-founder</h2>
        <p className="hint">
          Tell it what you&apos;re thinking about and it will help you reason through it — no right
          answer required.
        </p>
      </div>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested topics">
          {TOPIC_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="badge"
              onClick={() =>
                setAnswer((current) => (current.length > 0 ? current : `${chip.label}: `))
              }
            >
              {chip.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>What&apos;s on your mind?</span>
          <textarea
            className="textarea"
            name="answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="e.g. I think small cafes waste time on scheduling staff, but I'm not sure how big that problem really is."
            required
          />
        </label>
        <div>
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </form>
      {errorMessage === null ? null : <p className="alert">{errorMessage}</p>}
      {chronological.length === 0 ? null : (
        <ol className="stack" aria-label="Conversation">
          {chronological.map((message) => (
            <li key={message.id}>
              <p className="muted">{message.actor === 'founder' ? 'You' : 'Co-founder'}</p>
              <p>{message.text}</p>
            </li>
          ))}
        </ol>
      )}
      <div aria-live="polite">
        <p className="hint mb-1">Reply</p>
        <pre className="panel min-h-24 whitespace-pre-wrap font-sans text-sm">
          {stream.transcript.length > 0
            ? stream.transcript
            : 'Ask a question above to get started.'}
        </pre>
      </div>
    </section>
  );
}

function InterviewCapture({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const interviews = useQuery(trpc.evidence.listInterviews.queryOptions({ projectId }));
  const idempotencyKey = useRef(crypto.randomUUID());
  const [participantType, setParticipantType] =
    useState<(typeof InterviewParticipantTypes)[number]>('non_friend');
  const [consentGiven, setConsentGiven] = useState(true);
  const [quotesText, setQuotesText] = useState('');
  const mutation = useMutation(
    trpc.evidence.addInterview.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.evidence.listInterviews.queryKey() });
        await queryClient.invalidateQueries({
          queryKey: trpc.project.getDeskSummary.queryKey(),
        });
      },
    }),
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const quotes = quotesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (quotes.length === 0) {
      return;
    }
    try {
      await mutation.mutateAsync({
        projectId,
        participantType,
        consent: { given: consentGiven },
        quotes,
        idempotencyKey: idempotencyKey.current,
      });
      idempotencyKey.current = crypto.randomUUID();
      setQuotesText('');
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  const items = interviews.data ?? [];

  return (
    <section id="interviews" className="card stack scroll-mt-6">
      <div>
        <h2 className="card-title">Talk to real customers</h2>
        <p className="hint">
          After each conversation, log it here. Only interviews with people outside your friends and
          family count toward proof — be honest about who you talked to.
        </p>
      </div>
      <form className="stack" onSubmit={(event) => void onSubmit(event)}>
        <label className="field">
          <span>Who did you talk to?</span>
          <select
            className="input"
            value={participantType}
            onChange={(event) =>
              setParticipantType(event.target.value as (typeof InterviewParticipantTypes)[number])
            }
          >
            {InterviewParticipantTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="field flex-row items-center gap-2">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={(event) => setConsentGiven(event.target.checked)}
          />
          <span>They agreed to have this conversation recorded</span>
        </label>
        <label className="field">
          <span>What did they actually say? (one quote per line)</span>
          <textarea
            className="textarea"
            value={quotesText}
            onChange={(event) => setQuotesText(event.target.value)}
            placeholder="We lose two hours a week reconciling invoices."
            required
          />
        </label>
        <div>
          <button className="btn" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save interview'}
          </button>
        </div>
      </form>
      {errorMessageOf(mutation.error) === null ? null : (
        <p className="alert">{errorMessageOf(mutation.error)}</p>
      )}
      {items.length === 0 ? (
        <p className="hint">No interviews logged yet — this is where they&apos;ll show up.</p>
      ) : (
        <ul className="list">
          {items.map((item) => (
            <li key={item.interview.id} className="list-row">
              <span className="text-sm capitalize">
                {item.interview.participantType.replaceAll('_', ' ')}
              </span>
              <span className="muted">
                {item.quoteCount} quote{item.quoteCount === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BeachheadAndDmu({
  projectId,
  initialBeachhead,
  initialDmu,
}: {
  projectId: string;
  initialBeachhead: { id: string; segmentDefinition: string } | null;
  initialDmu: { id: string; buyer: string | null } | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [segmentDefinition, setSegmentDefinition] = useState(
    initialBeachhead?.segmentDefinition ?? '',
  );
  const [buyer, setBuyer] = useState(initialDmu?.buyer ?? '');
  const [beachheadId, setBeachheadId] = useState<string | null>(initialBeachhead?.id ?? null);
  const hydrated = useRef(false);
  const beachheadKey = useRef(crypto.randomUUID());
  const dmuKey = useRef(crypto.randomUUID());

  useEffect(() => {
    if (hydrated.current || initialBeachhead === null) {
      return;
    }
    setSegmentDefinition(initialBeachhead.segmentDefinition);
    setBeachheadId(initialBeachhead.id);
    setBuyer(initialDmu?.buyer ?? '');
    hydrated.current = true;
  }, [initialBeachhead, initialDmu]);

  const invalidateDesk = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.project.getDeskSummary.queryKey() });
  };

  const beachheadMutation = useMutation(
    trpc.pack.upsertBeachhead.mutationOptions({
      onSuccess: async (beachhead) => {
        setBeachheadId(beachhead.id);
        beachheadKey.current = crypto.randomUUID();
        await invalidateDesk();
      },
    }),
  );
  const dmuMutation = useMutation(
    trpc.pack.upsertDmu.mutationOptions({
      onSuccess: async () => {
        dmuKey.current = crypto.randomUUID();
        await invalidateDesk();
      },
    }),
  );

  async function onSaveBeachhead(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (segmentDefinition.trim().length === 0) {
      return;
    }
    try {
      await beachheadMutation.mutateAsync({
        projectId,
        segmentDefinition: segmentDefinition.trim(),
        idempotencyKey: beachheadKey.current,
      });
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  async function onSaveDmu(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (beachheadId === null || buyer.trim().length === 0) {
      return;
    }
    try {
      await dmuMutation.mutateAsync({
        projectId,
        beachheadId: BeachheadIdSchema.parse(beachheadId),
        buyer: buyer.trim(),
        idempotencyKey: dmuKey.current,
      });
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  return (
    <section id="beachhead" className="card stack scroll-mt-6">
      <div>
        <h2 className="card-title">Who exactly are you building this for?</h2>
        <p className="hint">
          Pick one narrow slice of customer to win first (your &quot;beachhead&quot;), and name the
          person who actually decides whether to pay.
        </p>
      </div>
      <form className="stack" onSubmit={(event) => void onSaveBeachhead(event)}>
        <label className="field">
          <span>Your first, narrow customer segment</span>
          <input
            className="input"
            value={segmentDefinition}
            onChange={(event) => setSegmentDefinition(event.target.value)}
            placeholder="Solo bookkeepers serving 5-20 small businesses"
            required
          />
        </label>
        <div>
          <button className="btn" type="submit" disabled={beachheadMutation.isPending}>
            {beachheadMutation.isPending ? 'Saving…' : beachheadId === null ? 'Save' : 'Update'}
          </button>
        </div>
      </form>
      {errorMessageOf(beachheadMutation.error) === null ? null : (
        <p className="alert">{errorMessageOf(beachheadMutation.error)}</p>
      )}
      <form className="stack" onSubmit={(event) => void onSaveDmu(event)}>
        <label className="field">
          <span>Who signs off on the money?</span>
          <input
            className="input"
            value={buyer}
            onChange={(event) => setBuyer(event.target.value)}
            placeholder="Owner-operator who signs off on spend"
            disabled={beachheadId === null}
            required
          />
          {beachheadId === null ? (
            <span className="hint">Save your customer segment above first.</span>
          ) : null}
        </label>
        <div>
          <button
            className="btn"
            type="submit"
            disabled={dmuMutation.isPending || beachheadId === null}
          >
            {dmuMutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
      {errorMessageOf(dmuMutation.error) === null ? null : (
        <p className="alert">{errorMessageOf(dmuMutation.error)}</p>
      )}
    </section>
  );
}

const DUMMY_SPRINT_ID = SprintIdSchema.parse('00000000-0000-4000-8000-000000000000');

const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  draft: 'Plan ready for your review',
  contracted: 'Approved, about to start',
  running: 'In progress',
  paused: 'Paused',
  stalled: 'Stalled',
  closed: 'Finished',
  failed: 'Failed',
  proposed: 'Proposed',
  queued: 'Queued',
  needs_founder: 'Needs you',
  needs_approval: 'Needs approval',
  complete: 'Complete',
  blocked: 'Blocked',
  canceled: 'Canceled',
  expired: 'Expired',
};

function SprintPanel({
  projectId,
  currentSprint,
}: {
  projectId: string;
  currentSprint: { id: string; status: SprintStatus; contractHash: string } | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const previewKey = useRef(crypto.randomUUID());
  const approveKey = useRef(crypto.randomUUID());

  const invalidateDesk = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.project.getDeskSummary.queryKey() });
  };

  const isDraft = currentSprint?.status === 'draft';
  const contract = useQuery({
    ...trpc.sprint.getContract.queryOptions({
      sprintId: currentSprint === null ? DUMMY_SPRINT_ID : SprintIdSchema.parse(currentSprint.id),
    }),
    enabled: isDraft,
  });

  const preview = useMutation(
    trpc.sprint.preview.mutationOptions({
      onSuccess: async () => {
        previewKey.current = crypto.randomUUID();
        await invalidateDesk();
      },
    }),
  );
  const approve = useMutation(
    trpc.sprint.approvePlan.mutationOptions({
      onSuccess: async () => {
        approveKey.current = crypto.randomUUID();
        await invalidateDesk();
      },
    }),
  );

  async function onPreview(): Promise<void> {
    try {
      await preview.mutateAsync({ projectId, idempotencyKey: previewKey.current });
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  async function onApprove(): Promise<void> {
    if (currentSprint === null) {
      return;
    }
    try {
      await approve.mutateAsync({
        sprintId: SprintIdSchema.parse(currentSprint.id),
        expectedContractHash: currentSprint.contractHash,
        idempotencyKey: approveKey.current,
      });
    } catch {
      // Keep the same idempotency key so a retry is safe (02 §7).
    }
  }

  const terminal =
    currentSprint === null ||
    currentSprint.status === 'closed' ||
    currentSprint.status === 'failed';

  return (
    <section id="sprint" className="card stack scroll-mt-6">
      <div>
        <h2 className="card-title">Let the AI do a work sprint</h2>
        <p className="hint">
          A sprint is a focused batch of work — like drafting your go-to-market plan — that the AI
          runs for you. You always approve the plan before it starts.
        </p>
      </div>
      <p className="muted">
        {currentSprint === null ? (
          'No sprint started yet.'
        ) : (
          <>
            Status:{' '}
            <span className="badge badge-info">{SPRINT_STATUS_LABELS[currentSprint.status]}</span>
          </>
        )}
      </p>
      {isDraft && contract.data !== undefined ? (
        <div className="panel stack">
          <p className="text-sm">{contract.data.sprint.contract.objective}</p>
          <p className="muted">
            Who works on it:{' '}
            {contract.data.sprint.contract.workers.map((worker) => worker.name).join(', ')}
          </p>
          <div>
            <button
              className="btn"
              type="button"
              disabled={approve.isPending}
              onClick={() => void onApprove()}
            >
              {approve.isPending ? 'Approving…' : 'Approve plan & start'}
            </button>
          </div>
        </div>
      ) : null}
      {terminal ? (
        <div>
          <button
            className="btn-secondary"
            type="button"
            disabled={preview.isPending}
            onClick={() => void onPreview()}
          >
            {preview.isPending ? 'Drafting a plan…' : 'Draft a sprint plan'}
          </button>
        </div>
      ) : null}
      {errorMessageOf(preview.error) === null ? null : (
        <p className="alert">{errorMessageOf(preview.error)}</p>
      )}
      {errorMessageOf(approve.error) === null ? null : (
        <p className="alert">{errorMessageOf(approve.error)}</p>
      )}
    </section>
  );
}

function GateAProgress({
  gateA,
}: {
  gateA: {
    qualifyingInterviews: number;
    requiredInterviews: number;
    passed: boolean;
    checks: { id: string; passed: boolean; detail: string }[];
  };
}) {
  if (gateA.passed) {
    return (
      <div className="card-done flex items-center gap-3">
        <span className="step-marker step-marker-done" aria-hidden="true">
          ✓
        </span>
        <div>
          <p className="card-title">You&apos;ve proven the problem is real</p>
          <p className="hint">Evidence checks (Gate A) are all satisfied. Keep going below.</p>
        </div>
      </div>
    );
  }

  const items: ChecklistItem[] = gateA.checks.map((check) => ({
    id: check.id,
    label: GATE_A_LABELS[check.id] ?? check.detail,
    done: check.passed,
  }));
  const percent =
    gateA.requiredInterviews === 0
      ? 0
      : Math.min(100, Math.round((gateA.qualifyingInterviews / gateA.requiredInterviews) * 100));

  return (
    <div className="card stack">
      <div>
        <h2 className="card-title">Proof checklist before you build anything</h2>
        <p className="hint">
          {gateA.qualifyingInterviews} of {gateA.requiredInterviews} real-customer interviews so
          far.
        </p>
        <div className="progress-track mt-2">
          <div className="progress-fill" style={{ width: `${String(percent)}%` }} />
        </div>
      </div>
      <Checklist items={items} />
    </div>
  );
}

function OverviewStrip({ overview }: { overview: OverviewSummary }) {
  return (
    <section className="card stack" aria-label="Plan overview">
      <div>
        <h2 className="card-title">Plan health</h2>
        <p className="hint">
          {overview.overallScore === null
            ? 'Score pending — the first draft is still assumption-heavy.'
            : `Overall score ${String(Math.round(overview.overallScore))} of 100. Missing data counts as unknown, not as a pass.`}
        </p>
      </div>
      <p className="muted">
        {overview.waitingFounderTasks} founder task
        {overview.waitingFounderTasks === 1 ? '' : 's'} waiting.
        {overview.revisionPendingReview ? ' A plan revision is ready to review.' : ''}
      </p>
      {overview.proposedResearchJob === null ? null : (
        <p>
          Proposed research: {overview.proposedResearchJob.objective}. Review it before it starts.
        </p>
      )}
    </section>
  );
}

function BusinessModelStatusList({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const sections = useQuery(trpc.pack.listBusinessModelSections.queryOptions({ projectId }));
  if (sections.data === undefined) {
    return null;
  }
  return (
    <section className="card stack" aria-label="Business model sections">
      <div>
        <h2 className="card-title">17-section business model</h2>
        <p className="hint">
          Status of each section. Open the pack below for the canonical details.
        </p>
      </div>
      <ul className="stack">
        {sections.data.map((section) => (
          <li key={section.key} className="flex flex-wrap gap-2">
            <span className="badge">{section.status.replaceAll('_', ' ')}</span>
            <span>{section.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProjectDesk({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const guide = nextActionGuide(desk.data?.nextAction, projectId);
  const step = desk.data === undefined ? null : journeyStep(desk.data.phase);

  return (
    <div className="stack">
      <header className="stack" style={{ gap: '0.75rem' }}>
        <div>
          <h1 className="page-title">{desk.data?.project.name ?? 'Your project'}</h1>
          <p className="lede">
            This desk is where you and your AI co-founder work through turning your idea into a real
            business, one step at a time.
          </p>
        </div>
        {desk.data === undefined ? null : (
          <>
            <JourneyStepper phase={desk.data.phase} />
            {step === null ? null : <p className="muted">{step.description}</p>}
          </>
        )}
      </header>

      {desk.data === undefined ? null : (
        <ModelProviderPanel workspaceId={desk.data.project.workspaceId} />
      )}

      <Callout
        eyebrow={guide.eyebrow}
        title={guide.title}
        action={
          guide.action === null ? null : (
            <Link href={guide.action.href} className="btn inline-flex no-underline">
              {guide.action.label}
            </Link>
          )
        }
      >
        {guide.description}
      </Callout>

      {desk.data === undefined ? null : <GateAProgress gateA={desk.data.gateA} />}
      {desk.data === undefined ? null : <OverviewStrip overview={desk.data.overview} />}
      {desk.data === undefined ? null : <BusinessModelStatusList projectId={projectId} />}

      <AskCoFounder projectId={projectId} />
      <InterviewCapture projectId={projectId} />
      <BeachheadAndDmu
        projectId={projectId}
        initialBeachhead={desk.data?.beachhead ?? null}
        initialDmu={desk.data?.dmu ?? null}
      />
      <SprintPanel projectId={projectId} currentSprint={desk.data?.currentSprint ?? null} />

      <section id="pack" className="card stack scroll-mt-6">
        <div>
          <h2 className="card-title">Your business plan (the Pack)</h2>
          <p className="hint">
            Everything you and the AI agree on lives here, organized into sections. Open any section
            to see what&apos;s recorded and what&apos;s still missing.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3" aria-label="Pack sections">
          {PackSectionKeys.map((section) => (
            <Link
              key={section}
              href={`/p/${projectId}/pack/${section}`}
              className="badge no-underline hover:text-text"
            >
              {packSectionLabel(section)}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
