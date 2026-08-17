export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <main>
      <h1>Workspace</h1>
      <p>{workspaceId}</p>
    </main>
  );
}
