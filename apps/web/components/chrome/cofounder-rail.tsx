'use client';

import { useEffect, useState, type KeyboardEvent, type PointerEvent } from 'react';

import {
  clampCofounderRailWidth,
  COFOUNDER_RAIL_DEFAULT_PX,
  COFOUNDER_RAIL_MIN_PX,
} from '../../lib/cofounder-rail-layout';
import { useProjectStream } from '../../lib/stream/use-project-stream';
import { ConversationThread } from '../conversation/conversation-thread';

const STORAGE_KEY = 'foundry.cofounder-rail';
const BODY_ID = 'cofounder-rail-body';

type RailLayout = {
  width: number;
  collapsed: boolean;
};

function readLayout(): RailLayout | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const width = 'width' in parsed && typeof parsed.width === 'number' ? parsed.width : null;
    const collapsed =
      'collapsed' in parsed && typeof parsed.collapsed === 'boolean' ? parsed.collapsed : null;
    if (width === null || collapsed === null) {
      return null;
    }
    return { width, collapsed };
  } catch {
    return null;
  }
}

function writeLayout(layout: RailLayout): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Private mode and quota errors should not block the rail.
  }
}

export function CofounderRail({ projectId }: { projectId: string }) {
  const stream = useProjectStream(projectId);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(COFOUNDER_RAIL_DEFAULT_PX);
  const [ready, setReady] = useState(false);
  const [resizing, setResizing] = useState(false);
  const markRead = stream.markRead;
  const unreadCount = stream.unreadCount;

  useEffect(() => {
    const stored = readLayout();
    const viewport = window.innerWidth;
    if (stored === null) {
      setWidth(clampCofounderRailWidth(COFOUNDER_RAIL_DEFAULT_PX, viewport));
    } else {
      setCollapsed(stored.collapsed);
      setWidth(clampCofounderRailWidth(stored.width, viewport));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    writeLayout({ width, collapsed });
  }, [collapsed, ready, width]);

  useEffect(() => {
    function onResize(): void {
      setWidth((current) => clampCofounderRailWidth(current, window.innerWidth));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (collapsed) {
      return;
    }
    markRead();
  }, [collapsed, markRead, unreadCount]);

  useEffect(() => {
    if (collapsed) {
      return;
    }
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')
      ) {
        return;
      }
      setCollapsed(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed]);

  useEffect(() => {
    if (!resizing) {
      return;
    }
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [resizing]);

  function expand(): void {
    setCollapsed(false);
  }

  function collapse(): void {
    setCollapsed(true);
  }

  function onResizerPointerDown(event: PointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    const originX = event.clientX;
    const originWidth = width;
    handle.setPointerCapture(pointerId);
    setResizing(true);

    function onMove(move: globalThis.PointerEvent): void {
      setWidth(clampCofounderRailWidth(originWidth + (move.clientX - originX), window.innerWidth));
    }

    function onUp(): void {
      setResizing(false);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      if (handle.hasPointerCapture(pointerId)) {
        handle.releasePointerCapture(pointerId);
      }
    }

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

  function onResizerKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setWidth((current) => clampCofounderRailWidth(current - 16, window.innerWidth));
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setWidth((current) => clampCofounderRailWidth(current + 16, window.innerWidth));
    }
  }

  return (
    <>
      {collapsed ? null : (
        <button
          type="button"
          className="cofounder-rail-scrim"
          aria-label="Collapse co-founder"
          onClick={collapse}
        />
      )}
      <aside
        className={collapsed ? 'project-rail project-rail-collapsed' : 'project-rail'}
        style={collapsed ? undefined : { width: `${String(width)}px` }}
        data-resizing={resizing ? 'true' : 'false'}
        aria-label="Co-founder"
      >
        {collapsed ? (
          <>
            <button
              type="button"
              className="project-rail-expand"
              aria-expanded={false}
              aria-controls={BODY_ID}
              aria-label={
                unreadCount === 0
                  ? 'Expand co-founder'
                  : `Expand co-founder, ${String(unreadCount)} unread`
              }
              onClick={expand}
            >
              {unreadCount === 0 ? null : (
                <span className="header-badge" aria-hidden="true">
                  {unreadCount > 9 ? '9+' : String(unreadCount)}
                </span>
              )}
              <span className="project-rail-expand-label">Co-founder</span>
            </button>
            {unreadCount === 0 ? null : (
              <span className="sr-only" role="status" aria-atomic="true">
                {`${String(unreadCount)} unread from co-founder`}
              </span>
            )}
          </>
        ) : (
          <div className="project-rail-header">
            <p className="card-title">Co-founder</p>
            <button
              type="button"
              className="project-rail-icon-btn"
              aria-expanded={true}
              aria-controls={BODY_ID}
              aria-label="Collapse co-founder"
              onClick={collapse}
            >
              <CollapseGlyph />
            </button>
          </div>
        )}
        <div id={BODY_ID} className="project-rail-body" hidden={collapsed} inert={collapsed}>
          <ConversationThread projectId={projectId} />
        </div>
        {collapsed ? null : (
          <div
            className="project-rail-resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize co-founder"
            aria-valuemin={COFOUNDER_RAIL_MIN_PX}
            aria-valuenow={width}
            tabIndex={0}
            onPointerDown={onResizerPointerDown}
            onKeyDown={onResizerKeyDown}
          />
        )}
      </aside>
    </>
  );
}

function CollapseGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3.5 5.5 8 10 12.5" />
    </svg>
  );
}
