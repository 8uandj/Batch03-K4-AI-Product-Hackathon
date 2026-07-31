import { KnowledgeProjectPicker } from "@/features/document-rag/components/KnowledgeProjectPicker";
import { getCurrentUserProjects } from "@/features/workspace/data";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const projects = await getCurrentUserProjects();
  return <KnowledgeProjectPicker projects={projects} />;
}
