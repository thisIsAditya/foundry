import { StreamEventSchema } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import { getProjectById, listWorkspaceMembershipsByUserId, withWorkspaceScope } from '@foundry/db';
import { ProjectIdSchema, UserIdSchema } from '@foundry/domain';

import { getAuth } from '../../../../lib/auth';
import { getSql } from '../../../../lib/sql';
import { createContext } from '../../../../server/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sseChunk(id: number, data: unknown): string {
  return `id: ${id}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<Response> {
  const { projectId: rawProjectId } = await context.params;
  const parsedId = ProjectIdSchema.safeParse(rawProjectId);
  if (!parsedId.success) {
    return Response.json({ error: 'invalid_input' }, { status: 400 });
  }

  const session = await getAuth().api.getSession({ headers: request.headers });
  if (session === null) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sql = getSql();
  const userId = UserIdSchema.parse(session.user.id);
  const memberships = await listWorkspaceMembershipsByUserId(sql, userId);
  const project = await withWorkspaceScope(
    sql,
    memberships.map((item) => item.workspaceId),
    async (tx) => getProjectById(tx, parsedId.data),
  );
  if (project === null) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  const ctx = await createContext(request);
  const lastEventId = Number(request.headers.get('last-event-id') ?? '0');
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const replay = await ctx.streamBus.replayAfter(
        project.id,
        Number.isFinite(lastEventId) ? lastEventId : 0,
      );
      for (const entry of replay) {
        const parsed = StreamEventSchema.safeParse(entry.event);
        if (parsed.success) {
          controller.enqueue(encoder.encode(sseChunk(entry.seq, parsed.data)));
        }
      }

      const unsubscribe = await ctx.streamBus.subscribe(project.id, (entry) => {
        const parsed = StreamEventSchema.safeParse(entry.event);
        if (parsed.success) {
          controller.enqueue(encoder.encode(sseChunk(entry.seq, parsed.data)));
        }
      });

      const ping = setInterval(() => {
        controller.enqueue(encoder.encode(': ping\n\n'));
      }, limits.stream.keepaliveMs);

      const abort = () => {
        clearInterval(ping);
        void unsubscribe().then(() => controller.close());
      };
      request.signal.addEventListener('abort', abort);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
