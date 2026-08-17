import { ProjectDesk } from './project-desk';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectDesk projectId={projectId} />;
}
