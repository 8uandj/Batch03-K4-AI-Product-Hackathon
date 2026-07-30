import { Sparkles } from "lucide-react";

import { DocumentUpload } from "./DocumentUpload";
import { RagChat } from "./RagChat";

type RagWorkspaceProps = {
  projectId: string;
};

export function RagWorkspace({ projectId }: RagWorkspaceProps) {
  return (
    <main className="rag-shell">
      <aside className="rag-sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={17} />
          </span>
          Nexus AI
        </div>
        <DocumentUpload projectId={projectId} />
      </aside>
      <div className="rag-main">
        <RagChat projectId={projectId} />
      </div>
    </main>
  );
}
