'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

import { ConversationThread } from '../conversation/conversation-thread';
import { useProjectStream } from '../../lib/stream/use-project-stream';

export function CofounderPanel() {
  const pathname = usePathname();
  const rawId = useParams().projectId;
  const projectId = typeof rawId === 'string' ? rawId : undefined;
  const stream = useProjectStream(projectId ?? '00000000-0000-4000-8000-000000000000');

  if (projectId === undefined) {
    return null;
  }
  if (pathname.startsWith(`/p/${projectId}/co-founder`)) {
    return null;
  }

  return (
    <aside className="cofounder-dock" aria-label="Co-founder panel">
      <div className="card stack">
        <div className="flex items-center justify-between gap-2">
          <p className="card-title">Co-founder</p>
          {stream.unreadCount === 0 ? null : (
            <span className="badge badge-info" aria-label={`${String(stream.unreadCount)} unread`}>
              {stream.unreadCount} new
            </span>
          )}
          <Link href={`/p/${projectId}/co-founder`} className="hint no-underline">
            Expand
          </Link>
        </div>
        <ConversationThread projectId={projectId} compact />
      </div>
    </aside>
  );
}

export function CofounderCollapsedLink({ projectId }: { projectId: string }) {
  const stream = useProjectStream(projectId);
  return (
    <Link href={`/p/${projectId}/co-founder`} className="cofounder-fab no-underline">
      Co-founder
      {stream.unreadCount === 0 ? null : (
        <span className="badge badge-info">{stream.unreadCount}</span>
      )}
    </Link>
  );
}
