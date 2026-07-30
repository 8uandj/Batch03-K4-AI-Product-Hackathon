import Link from "next/link";

import { getCurrentUserProjects } from "@/features/workspace/data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const projects = user ? await getCurrentUserProjects() : [];

  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Workspace</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          Welcome to Nexus AI
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          PM tạo project, invite member, nạp tài liệu, chat với team và hỏi Nexus Bot trong cùng một workspace.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {user ? (
            <Link
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              href="/project/new"
            >
              Tạo project mới
            </Link>
          ) : (
            <Link
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              href="/login"
            >
              Đăng nhập
            </Link>
          )}
          <Link
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            href="/project/demo"
          >
            Mở demo workspace
          </Link>
        </div>
      </div>

      {user ? (
        <section className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Project của bạn</h2>
              <p className="mt-1 text-sm text-slate-500">Dữ liệu lấy theo membership trong Supabase.</p>
            </div>
          </div>

          {projects.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-400 hover:shadow-sm"
                  href={`/project/${project.id}`}
                  key={project.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-950">{project.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {project.role}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                    {project.description || "Chưa có mô tả."}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
              Chưa có project nào. Hãy tạo project mới hoặc dùng demo workspace để review flow.
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
