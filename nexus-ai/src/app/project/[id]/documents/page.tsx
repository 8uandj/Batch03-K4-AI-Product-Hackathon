import { RagWorkspace } from "@/features/document-rag/components/RagWorkspace";
import { getCurrentUserProjects } from "@/features/workspace/data";

type ProjectDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDocumentsPage({
  params,
}: ProjectDocumentsPageProps) {
  const { id } = await params;
  const projects = await getCurrentUserProjects();
  const projectName =
    projects.find((project) => project.id === id)?.name ??
    (id === "demo" ? "Demo project" : "Project");

  return (
    <RagWorkspace
      projectId={id}
      projectName={projectName}
      projects={projects}
    />
  );
}
