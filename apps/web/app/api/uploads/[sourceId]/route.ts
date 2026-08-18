import { getSourceById, listWorkspaceMembershipsByUserId, withWorkspaceScope } from '@foundry/db';
import { SourceIdSchema, UserIdSchema } from '@foundry/domain';

import { headersWithAccessKey } from '../../../../lib/access-key';
import { getAuth } from '../../../../lib/auth';
import { getSql } from '../../../../lib/sql';
import { createContext } from '../../../../server/context';

export const runtime = 'nodejs';

export async function PUT(
  request: Request,
  context: { params: Promise<{ sourceId: string }> },
): Promise<Response> {
  const { sourceId: rawSourceId } = await context.params;
  const parsedId = SourceIdSchema.safeParse(rawSourceId);
  if (!parsedId.success) {
    return Response.json({ error: 'invalid_input' }, { status: 400 });
  }

  const session = await getAuth().api.getSession({ headers: headersWithAccessKey(request) });
  if (session === null) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sql = getSql();
  const memberships = await listWorkspaceMembershipsByUserId(
    sql,
    UserIdSchema.parse(session.user.id),
  );
  const source = await withWorkspaceScope(
    sql,
    memberships.map((item) => item.workspaceId),
    async (tx) => getSourceById(tx, parsedId.data),
  );
  if (source === null || source.s3Key === null) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  const ctx = await createContext(request);
  const body = Buffer.from(await request.arrayBuffer());
  await ctx.objectStore.put(source.s3Key, body, source.mimeType ?? 'application/octet-stream');
  return new Response(null, { status: 204 });
}
