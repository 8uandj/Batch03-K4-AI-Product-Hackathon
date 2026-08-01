import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/shared/BackButton";
import { ProjectAiPlanner } from "@/features/workspace/components/ProjectAiPlanner";
import { getWorkspaceOverview } from "@/features/workspace/data";

type PlannerPageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function PlannerPage({ params }: PlannerPageProps) {
  const { id } = await params;
  if (id === "demo") redirect("/project");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const overview = await getWorkspaceOverview(id);
  if (!overview) notFound();

  return (
    <>
      <BackButton fallback={`/project/${id}`} />
      <section className="mb-5 rounded-3xl border border-cyan-100 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Nexus AI workspace</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Nexus AI chia việc</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Tạo bản nháp task từ project brief, chỉnh sửa và để PM review trước khi đưa vào Kanban.</p>
      </section>
      <ProjectAiPlanner
        currentRole={overview.currentRole}
        documentsIndexed={overview.project.documentsIndexed}
        initialDeadline={overview.project.deadlineAt ?? null}
        members={overview.project.members}
        projectId={id}
      />
    </>
  );
}
