'use client';

import { ConversationThread } from '../conversation/conversation-thread';
import { useProjectStream } from '../../lib/stream/use-project-stream';

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
