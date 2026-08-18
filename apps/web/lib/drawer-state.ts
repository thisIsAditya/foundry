'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { isProjectPanel, type ProjectPanel, type ProjectPanelQuery } from './project-href';

export type DrawerState = {
  panel: ProjectPanel | null;
  section: string | null;
  job: string | null;
  task: string | null;
  view: string | null;
  filter: string | null;
};

export type DrawerControls = DrawerState & {
  open: (panel: ProjectPanel, extras?: ProjectPanelQuery) => void;
  close: () => void;
};

export function useDrawerState(): DrawerControls {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo<DrawerState>(() => {
    const raw = searchParams.get('panel');
    return {
      panel: isProjectPanel(raw) ? raw : null,
      section: searchParams.get('section'),
      job: searchParams.get('job'),
      task: searchParams.get('task'),
      view: searchParams.get('view'),
      filter: searchParams.get('filter'),
    };
  }, [searchParams]);

  const apply = useCallback(
    (next: DrawerState) => {
      const params = new URLSearchParams();
      if (next.panel !== null) params.set('panel', next.panel);
      if (next.section !== null) params.set('section', next.section);
      if (next.job !== null) params.set('job', next.job);
      if (next.task !== null) params.set('task', next.task);
      if (next.view !== null) params.set('view', next.view);
      if (next.filter !== null) params.set('filter', next.filter);
      const qs = params.toString();
      router.replace(qs.length === 0 ? pathname : `${pathname}?${qs}`, { scroll: false });
    },
    [pathname, router],
  );

  const open = useCallback(
    (panel: ProjectPanel, extras: ProjectPanelQuery = {}) => {
      apply({
        panel,
        section: extras.section ?? null,
        job: extras.job ?? null,
        task: extras.task ?? null,
        view: extras.view ?? null,
        filter: extras.filter ?? null,
      });
    },
    [apply],
  );

  const close = useCallback(() => {
    apply({
      panel: null,
      section: null,
      job: null,
      task: null,
      view: null,
      filter: null,
    });
  }, [apply]);

  return { ...state, open, close };
}
