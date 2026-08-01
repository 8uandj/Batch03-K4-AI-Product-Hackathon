import { KnowledgeProjectPicker } from "@/features/document-rag/components/KnowledgeProjectPicker";
import { getCurrentUserProjects } from "@/features/workspace/data";
import { BackButton } from "@/components/shared/BackButton";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const projects = await getCurrentUserProjects();
  return <><BackButton /><KnowledgeProjectPicker projects={projects} /></>;
}
