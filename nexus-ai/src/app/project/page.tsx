import Link from "next/link";
import { FolderKanban, Plus, Search } from "lucide-react";

import { getCurrentUserProjects } from "@/features/workspace/data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getCurrentUserProjects();

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border bg-slate-950 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.28),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.24),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">Project management</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Quản trị project</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Xem các project bạn đang tham gia, mở workspace, quản lý knowledge, invite team và chạy AI analysis.
            </p>
          </div>
          <Link className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-50" href="/project/new">
            <Plus size={17} /> Tạo project mới
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><FolderKanban size={20} /></span>
          <div>
            <h2 className="font-bold text-slate-950">Project hiện có</h2>
            <p className="text-sm text-slate-500">Dữ liệu thật từ Supabase theo project_members.</p>
          </div>
        </div>

        {projects.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-100" href={`/project/${project.id}`} key={project.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-950 group-hover:text-cyan-700">{project.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{project.description || "Chưa có mô tả."}</p>
                  </div>
                  <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">{project.role}</span>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
                  <span>{project.status}</span>
                  <span className="inline-flex items-center gap-1 text-cyan-700">Mở workspace →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Search className="mx-auto text-slate-400" size={28} />
            <h3 className="mt-4 font-bold text-slate-950">Chưa có project nào</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Tạo project mới hoặc accept invite từ PM để project xuất hiện ở đây.</p>
          </div>
        )}
      </section>
    </section>
  );
}
