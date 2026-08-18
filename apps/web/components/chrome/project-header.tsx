'use client';

import { Gauge } from '@foundry/ui';
import { useQuery } from '@tanstack/react-query';

import type { DrawerControls } from '../../lib/drawer-state';
import { useTRPC } from '../../lib/trpc/client';

export function ProjectHeader({
  projectId,
  drawer,
}: {
  projectId: string;
  drawer: DrawerControls;
}) {
  const trpc = useTRPC();
  const desk = useQuery(trpc.project.getDeskSummary.queryOptions({ projectId }));
  const score = useQuery(trpc.score.getCurrent.queryOptions({ projectId }));
  const name = desk.data?.project.name ?? 'Venture';
  const overall = score.data === undefined || score.data === null ? null : score.data.overall;

  return (
    <header className="project-header">
      <p className="font-display truncate text-sm font-medium">{name}</p>
      <nav className="project-header-cluster" aria-label="Venture drawers">
        <button
          type="button"
          className="project-header-btn"
          aria-pressed={drawer.panel === 'plan'}
          aria-label="Open plan"
          onClick={() => (drawer.panel === 'plan' ? drawer.close() : drawer.open('plan'))}
        >
          <Gauge value={overall} size="sm" label="Open plan" />
        </button>
        <HeaderButton
          label="Work"
          pressed={drawer.panel === 'work'}
          onClick={() => (drawer.panel === 'work' ? drawer.close() : drawer.open('work'))}
        />
        <HeaderButton
          label="Research"
          pressed={drawer.panel === 'research'}
          onClick={() => (drawer.panel === 'research' ? drawer.close() : drawer.open('research'))}
        />
        <HeaderButton
          label="Decisions"
          pressed={drawer.panel === 'decisions'}
          onClick={() => (drawer.panel === 'decisions' ? drawer.close() : drawer.open('decisions'))}
        />
        <button
          type="button"
          className="project-header-btn project-header-btn-quiet"
          aria-pressed={drawer.panel === 'settings'}
          aria-label="Open settings"
          onClick={() => (drawer.panel === 'settings' ? drawer.close() : drawer.open('settings'))}
        >
          <SettingsGlyph />
        </button>
      </nav>
    </header>
  );
}

function HeaderButton({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="project-header-btn" aria-pressed={pressed} onClick={onClick}>
      {label}
    </button>
  );
}

function SettingsGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.3 1.5h3.4l.4 1.4a5 5 0 0 1 1.3.8l1.4-.4 1.7 2.9-1.1 1c.1.4.1.8.1 1.2s0 .8-.1 1.2l1.1 1-1.7 2.9-1.4-.4a5 5 0 0 1-1.3.8l-.4 1.4H6.3l-.4-1.4a5 5 0 0 1-1.3-.8l-1.4.4L1.5 10l1.1-1A5 5 0 0 1 2.5 8c0-.4 0-.8.1-1.2l-1.1-1 1.7-2.9 1.4.4a5 5 0 0 1 1.3-.8l.4-1.4ZM8 6.2A1.8 1.8 0 1 0 8 9.8 1.8 1.8 0 0 0 8 6.2Z"
      />
    </svg>
  );
}
