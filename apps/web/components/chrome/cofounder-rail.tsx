'use client';

import { useEffect, useState } from 'react';

import { useProjectStream } from '../../lib/stream/use-project-stream';
import { ConversationThread } from '../conversation/conversation-thread';

function useDesktopRail(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return desktop;
}

export function CofounderRail({
  projectId,
  sheetOpen,
  onCloseSheet,
}: {
  projectId: string;
  sheetOpen: boolean;
  onCloseSheet: () => void;
}) {
  const stream = useProjectStream(projectId);
  const visible = useDesktopRail() || sheetOpen;
  const markRead = stream.markRead;
  const unreadCount = stream.unreadCount;

  useEffect(() => {
    if (visible) {
      markRead();
    }
  }, [markRead, unreadCount, visible]);

  return (
    <aside
      className={sheetOpen ? 'project-rail project-rail-sheet' : 'project-rail'}
      aria-label="Co-founder"
    >
      <div className="project-rail-header">
        <p className="card-title">Co-founder</p>
        <div className="flex items-center gap-2">
          {stream.unreadCount === 0 ? null : (
            <span className="badge badge-info" aria-label={`${String(stream.unreadCount)} unread`}>
              {stream.unreadCount} new
            </span>
          )}
          <button type="button" className="btn-secondary lg:hidden" onClick={onCloseSheet}>
            Close
          </button>
        </div>
      </div>
      <div className="project-rail-body">
        <ConversationThread projectId={projectId} />
      </div>
    </aside>
  );
}
