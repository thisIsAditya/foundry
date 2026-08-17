import { ConversationThread } from '../../../../../components/conversation/conversation-thread';

export default async function CofounderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Co-founder</h1>
        <p className="lede">
          This is the only founder-facing AI identity. The conversation stays here when you move
          between plan, work, and research.
        </p>
      </header>
      <div className="card">
        <ConversationThread projectId={projectId} />
      </div>
    </div>
  );
}
