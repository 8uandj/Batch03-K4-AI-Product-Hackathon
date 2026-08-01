import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/shared/BackButton";
import { EqRadar } from "@/features/eq-radar/components/EqRadar";
import { getWorkspaceOverview } from "@/features/workspace/data";

type EqRadarPageProps = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function EqRadarPage({ params }: EqRadarPageProps) {
  const { id } = await params;
  if (id === "demo") redirect("/project");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const overview = await getWorkspaceOverview(id);
  if (!overview) notFound();

  return (
    <>
      <BackButton fallback={`/project/${id}`} />
      <section className="mb-5 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-cyan-50 p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Team health · privacy-aware</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">EQ Radar & phân tích thành viên</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Xem workload risk, phong cách phối hợp và gợi ý hỗ trợ theo dữ liệu aggregate. Đây không phải chẩn đoán tâm lý.</p>
      </section>
      <EqRadar members={overview.project.members} projectId={id} />
    </>
  );
}
