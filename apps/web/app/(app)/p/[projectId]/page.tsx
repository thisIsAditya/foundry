export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <main>
      <h1>Project</h1>
      <p>{projectId}</p>
    </main>
  );
}
