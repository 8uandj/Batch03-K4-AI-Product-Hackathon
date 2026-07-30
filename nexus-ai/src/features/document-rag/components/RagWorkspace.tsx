import { Sparkles } from "lucide-react";

import { DocumentUpload } from "./DocumentUpload";
import { RagChat } from "./RagChat";

type RagWorkspaceProps = {
  projectId: string;
};

export function RagWorkspace({ projectId }: RagWorkspaceProps) {
  return (
    <section className="grid min-h-[calc(100vh-8rem)] gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5 rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 border-b pb-4">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Sparkles aria-hidden="true" size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950">Nexus AI</p>
            <p className="text-xs text-slate-500">Knowledge Hub</p>
          </div>
        </div>
        <DocumentUpload projectId={projectId} />
      </aside>

      <RagChat projectId={projectId} />
    </section>
  );
}
