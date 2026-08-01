import { requireProjectAccess } from "@/features/workspace/access";
import { getDeadlineBotNotifications } from "@/features/deadline-monitor/data";
import { listDocumentSources } from "../repository";
import { parseProjectBriefContent, type ProjectBrief } from "../project-brief";
import type { KnowledgeProject } from "../types";

import { KnowledgeSourcesPanel } from "./KnowledgeSourcesPanel";
import { RagChat } from "./RagChat";

type RagWorkspaceProps = {
  projectId: string;
  projectName: string;
  projects: KnowledgeProject[];
};

export async function RagWorkspace({ projectId, projectName, projects }: RagWorkspaceProps) {
  const access = await requireProjectAccess(projectId);
  let projectBrief: ProjectBrief | null = null;
  if (access.supabase) {
    const briefResult = await access.supabase
      .from("ai_summaries")
      .select("content")
      .eq("project_id", projectId)
      .eq("type", "project_brief")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!briefResult.error) projectBrief = parseProjectBriefContent(briefResult.data?.content);
  }
  const [sources, deadlineNotifications] = await Promise.all([
    listDocumentSources(projectId),
    getDeadlineBotNotifications(projectId),
  ]);

  return (
    <section className="notebook-shell flex min-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[28px] border border-[#343942] bg-[#17191f] text-slate-100 shadow-2xl shadow-slate-900/20">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30343b] px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[#5968f2] shadow-lg shadow-black/20">
            <span className="text-2xl font-black leading-none">⌒</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Nexus notebook</p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-2xl">{projectName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-[#3c414b] bg-[#202329] px-3 py-1.5 text-xs font-medium text-slate-300 sm:inline-flex">{sources.length} nguồn</span>
          <a className="rounded-full border border-[#3c414b] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-[#7680ff] hover:text-white" href={`/project/${projectId}`}>Workspace</a>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(270px,350px)_minmax(0,1fr)]">
        <KnowledgeSourcesPanel initialSources={sources} projectBrief={projectBrief} projectId={projectId} projectName={projectName} projects={projects} />
        <RagChat
          initialDeadlineNotifications={deadlineNotifications}
          key={projectId}
          projectId={projectId}
          projectName={projectName}
        />
      </div>
    </section>
  );
}
