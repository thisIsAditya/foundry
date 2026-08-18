'use client';

import { useEffect, useState } from 'react';

import { useDrawerState } from '../../lib/drawer-state';
import { useProjectStream } from '../../lib/stream/use-project-stream';
import { DecisionsList } from '../decisions/decisions-list';
import { PlanDrawer } from '../plan/plan-drawer';
import { ResearchView } from '../research/research-view';
import { SettingsPanel } from '../settings/settings-panel';
import { WorkDrawer } from '../work/work-drawer';
import { CofounderRail } from './cofounder-rail';
import { DrawerShell } from './drawer-shell';
import { PhaseFocus } from './phase-focus';
import { ProjectHeader } from './project-header';

export function ProjectShell({ projectId }: { projectId: string }) {
  const drawer = useDrawerState();
  const stream = useProjectStream(projectId);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (drawer.panel !== null) {
      setSheetOpen(false);
    }
  }, [drawer.panel]);

  return (
    <div className="project-shell">
      <ProjectHeader projectId={projectId} drawer={drawer} />
      <div className="project-body">
        <CofounderRail
          projectId={projectId}
          sheetOpen={sheetOpen}
          onCloseSheet={() => setSheetOpen(false)}
        />
        <main className="project-focus">
          <PhaseFocus projectId={projectId} />
        </main>
      </div>
      {sheetOpen ? null : (
        <button type="button" className="cofounder-fab" onClick={() => setSheetOpen(true)}>
          Co-founder
          {stream.unreadCount === 0 ? null : (
            <span className="badge badge-info">{stream.unreadCount}</span>
          )}
        </button>
      )}
      <DrawerShell title="Plan" open={drawer.panel === 'plan'} onClose={drawer.close}>
        <PlanDrawer projectId={projectId} section={drawer.section} />
      </DrawerShell>
      <DrawerShell title="Work" open={drawer.panel === 'work'} onClose={drawer.close}>
        <WorkDrawer projectId={projectId} view={drawer.view} job={drawer.job} task={drawer.task} />
      </DrawerShell>
      <DrawerShell title="Research" open={drawer.panel === 'research'} onClose={drawer.close}>
        <ResearchView
          projectId={projectId}
          {...(drawer.filter === null ? {} : { filter: drawer.filter })}
          {...(drawer.finding === null ? {} : { finding: drawer.finding })}
        />
      </DrawerShell>
      <DrawerShell title="Decisions" open={drawer.panel === 'decisions'} onClose={drawer.close}>
        <DecisionsList projectId={projectId} />
      </DrawerShell>
      <DrawerShell title="Settings" open={drawer.panel === 'settings'} onClose={drawer.close} quiet>
        <SettingsPanel projectId={projectId} />
      </DrawerShell>
    </div>
  );
}
