import { Bot, MessageSquare } from "lucide-react";
import Link from "next/link";

import { RagWorkspace } from "@/features/document-rag/components/RagWorkspace";
import { getCurrentUserProjects } from "@/features/workspace/data";

import { TeamChat } from "./TeamChat";

type ChatHubProps = {
  projectId: string;
  active?: "overview" | "team" | "bot";
};

export async function ChatHub({ projectId, active = "overview" }: ChatHubProps) {
  if (active === "team") return <TeamChat projectId={projectId} />;
  if (active === "bot") {
    const projects = await getCurrentUserProjects();
    const projectName =
      projects.find((project) => project.id === projectId)?.name ??
      (projectId === "demo" ? "Demo project" : "Project");
    return (
      <RagWorkspace
        projectId={projectId}
        projectName={projectName}
        projects={projects}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Project chat spaces
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Chọn không gian chat
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Team Chat dùng cho trao đổi giữa thành viên. Bot Chat dùng để hỏi Nexus AI về tài liệu, scope, deadline và context dự án.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChatSpaceCard
          description="Không gian trao đổi nội bộ, có AI conflict support ở mock mode."
          href={`/project/${projectId}/chat/team`}
          icon="team"
          title="Team Chat"
        />
        <ChatSpaceCard
          description="Hỏi đáp với Knowledge Bot, upload tài liệu và xem nguồn RAG."
          href={`/project/${projectId}/chat/bot`}
          icon="bot"
          title="Bot Chat"
        />
      </div>
    </section>
  );
}

function ChatSpaceCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: "team" | "bot";
  title: string;
}) {
  const Icon = icon === "team" ? MessageSquare : Bot;

  return (
    <Link
      className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md"
      href={href}
    >
      <span className="flex size-11 items-center justify-center rounded-lg bg-slate-950 text-white">
        <Icon aria-hidden="true" size={20} />
      </span>
      <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
