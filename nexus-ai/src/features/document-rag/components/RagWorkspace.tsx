import { requireProjectAccess } from "@/features/workspace/access";
import { listDocumentSources } from "../repository";
import type { KnowledgeProject } from "../types";

import { KnowledgeSourcesPanel } from "./KnowledgeSourcesPanel";
import { RagChat } from "./RagChat";

type RagWorkspaceProps = {
  projectId: string;
  projectName: string;
  projects: KnowledgeProject[];
};

export async function RagWorkspace({ projectId, projectName, projects }: RagWorkspaceProps) {
  await requireProjectAccess(projectId);
  const sources = await listDocumentSources(projectId);

  return (
    <section className="grid min-h-[calc(100vh-8rem)] gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <KnowledgeSourcesPanel initialSources={sources} projectId={projectId} projectName={projectName} projects={projects} />
      <RagChat key={projectId} projectId={projectId} projectName={projectName} />
    </section>
  );
}
