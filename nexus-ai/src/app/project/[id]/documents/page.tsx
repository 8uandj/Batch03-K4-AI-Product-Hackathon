import { RagWorkspace } from "@/features/document-rag/components/RagWorkspace";

type ProjectDocumentsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDocumentsPage({
  params,
}: ProjectDocumentsPageProps) {
  const { id } = await params;

  return <RagWorkspace projectId={id} />;
}
