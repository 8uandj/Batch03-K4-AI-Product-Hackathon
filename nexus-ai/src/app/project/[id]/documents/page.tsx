import { notFound, redirect } from "next/navigation";
import { RagWorkspace } from "@/features/document-rag/components/RagWorkspace";
import { getCurrentUserProjects } from "@/features/workspace/data";

type ProjectDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDocumentsPage({
  params,
}: ProjectDocumentsPageProps) {
  const { id } = await params;

  if (id === "demo") {
    redirect("/knowledge");
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const projects = await getCurrentUserProjects();
  const projectName =
    projects.find((project) => project.id === id)?.name ?? "Project";

  return (
    <RagWorkspace
      projectId={id}
      projectName={projectName}
      projects={projects}
    />
  );
}
