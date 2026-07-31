import Link from "next/link";
import { ArrowRight, FolderKanban, Search, Sparkles } from "lucide-react";

type KanbanProjectPickerProps = {
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    role: "pm" | "member";
  }>;
};

export function KanbanProjectPicker({ projects }: KanbanProjectPickerProps) {
  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border bg-slate-950 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(166,25,46,0.25),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(0,32,91,0.35),transparent_30%)]" />
        <div className="relative flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-rose-300">
            <Sparkles size={23} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-rose-300">Kanban Space</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Chọn project để xem Kanban</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Mỗi dự án có bảng phân chia công việc (Kanban Board) riêng biệt. Chọn dự án của bạn để tiếp tục.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-red-50 text-[#A6192E]">
            <FolderKanban size={20} />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">Dự án của bạn</h2>
            <p className="text-sm text-slate-500">Chọn dự án để bắt đầu quản lý task và cập nhật trạng thái công việc.</p>
          </div>
        </div>

        {projects.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 transition hover:-translate-y-1 hover:border-[#00205B] hover:shadow-xl hover:shadow-blue-50"
                href={`/project/${project.id}/board`}
                key={project.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-950 group-hover:text-[#00205B]">
                      {project.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                      {project.description || "Chưa có mô tả."}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                    {project.role}
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4 text-xs font-semibold text-[#00205B]">
                  Mở Kanban Board <ArrowRight size={14} className="ml-1" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <Search className="mx-auto text-slate-400" size={28} />
            <h3 className="mt-4 font-bold text-slate-950">Chưa có dự án nào</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Hãy tạo dự án mới hoặc nhập mã mời từ PM ở trang danh sách dự án để bắt đầu sử dụng bảng Kanban.
            </p>
            <Link
              className="mt-5 inline-flex rounded-xl bg-[#00205B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#001844]"
              href="/project"
            >
              Xem danh sách dự án
            </Link>
          </div>
        )}
      </section>
    </section>
  );
}
