import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  FileText,
  KanbanSquare,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Radar,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";

import { getCurrentUserProjects } from "@/features/workspace/data";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const productModules = [
  {
    title: "Project planning",
    description: "Tạo workspace, gom thành viên, deadline và tài liệu theo từng project.",
    icon: KanbanSquare,
    tone: "from-blue-500 to-cyan-400",
  },
  {
    title: "Knowledge hub",
    description: "Upload tài liệu, index vector và hỏi Nexus Bot với citation rõ nguồn.",
    icon: FileText,
    tone: "from-violet-500 to-fuchsia-400",
  },
  {
    title: "Team alignment",
    description: "Tách Team Chat và Bot Chat để trao đổi người-người không bị lẫn với AI.",
    icon: MessageSquareText,
    tone: "from-emerald-500 to-teal-400",
  },
  {
    title: "PM radar",
    description: "Theo dõi progress, red flags, workload và tín hiệu rủi ro của team.",
    icon: Radar,
    tone: "from-rose-500 to-orange-400",
  },
];

const workflowSteps = [
  "Sign in",
  "Onboard",
  "Create project",
  "Upload docs",
  "Ask AI",
  "Execute",
  "Review risk",
];

export default async function HomePage() {
  const user = isSupabaseConfigured()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;
  const projects = user ? await getCurrentUserProjects() : [];
  const firstProjectHref = projects[0] ? `/project/${projects[0].id}` : "/project/demo";

  return (
    <section className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-200/80 md:p-8 lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.38),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.32),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,1))]" />
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 size-72 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-100 backdrop-blur">
              <Sparkles aria-hidden="true" size={14} />
              Nexus AI · project intelligence workspace
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
              Biến kế hoạch thành tiến độ có thể nhìn thấy.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Nexus tập hợp tài liệu, con người và công việc trong một workspace rõ ràng — để team ra quyết định nhanh hơn, giao việc công bằng hơn và không bỏ sót rủi ro.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-cyan-500/25"
                  href="/project/new"
                >
                  <Plus aria-hidden="true" size={17} />
                  Tạo project mới
                  <ArrowRight className="transition group-hover:translate-x-1" size={16} />
                </Link>
              ) : (
                <Link
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-50 hover:shadow-cyan-500/25"
                  href="/login"
                >
                  <LockKeyhole aria-hidden="true" size={17} />
                  Đăng nhập để bắt đầu
                  <ArrowRight className="transition group-hover:translate-x-1" size={16} />
                </Link>
              )}
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/15"
                href={firstProjectHref}
              >
                Mở workspace
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <TrustItem icon={CheckCircle2} text="Supabase Auth + RLS" />
              <TrustItem icon={Bot} text="RAG-ready Bot Chat" />
              <TrustItem icon={BarChart3} text="PM Dashboard live" />
            </div>
          </div>

          <div className="relative rounded-3xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:bg-white/[0.13]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Một workspace rõ ràng</p>
                  <h2 className="mt-1 font-semibold">Từ tài liệu đến hành động</h2>
                </div>
                <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                  AI native
                </span>
              </div>

              <div className="space-y-4">
                {[{ icon: FileText, title: "Knowledge Hub", text: "Tài liệu có cấu trúc, tìm kiếm đúng project và citation rõ ràng." }, { icon: KanbanSquare, title: "Smart Delegation", text: "Task được giao theo skill, capacity và mức độ khẩn cấp." }, { icon: Radar, title: "Team health", text: "Tín hiệu workload giúp PM hỗ trợ đúng lúc, tôn trọng privacy." }].map(({ icon: Icon, title, text }) => (
                  <div className="group flex gap-3 rounded-2xl bg-white/[0.06] p-4 transition duration-300 hover:bg-white/[0.11]" key={title}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-200"><Icon size={18} /></span>
                    <div><p className="font-semibold text-white">{title}</p><p className="mt-1 text-sm leading-6 text-slate-300">{text}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {productModules.map((module) => {
          const Icon = module.icon;

          return (
            <article
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/80"
              key={module.title}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${module.tone}`} />
              <div className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${module.tone} text-white shadow-lg transition duration-300 group-hover:scale-110`}>
                <Icon aria-hidden="true" size={21} />
              </div>
              <h2 className="mt-5 font-bold text-slate-950">{module.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{module.description}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-700">Workflow chuẩn MVP</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Một luồng làm việc liền mạch cho cả team
            </h2>
          </div>
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
            href="/pm-dashboard"
          >
                Khám phá dashboard <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-7">
          {workflowSteps.map((step, index) => (
            <div
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:bg-cyan-50"
              key={step}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-white text-xs font-black text-slate-500 shadow-sm group-hover:text-cyan-700">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-800">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-sm font-semibold text-violet-700">Workspace của bạn</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Workspace của bạn
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {user
                  ? "Các project bạn đang tham gia, được sắp xếp theo hoạt động gần nhất."
                  : "Đăng nhập để tạo workspace và cộng tác cùng team của bạn."}
              </p>
            </div>
            {user ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
                  href="/project"
                >
                  Quản trị project
                </Link>
                <Link
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                  href="/project/new"
                >
                  <Plus size={16} /> New project
                </Link>
              </div>
            ) : null}
          </div>

          {user && projects.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <Link
                  className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100"
                  href={`/project/${project.id}`}
                  key={project.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-slate-950 group-hover:text-violet-700">
                        {project.name}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                        {project.description || "Chưa có mô tả."}
                      </p>
                    </div>
                    <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                      {project.role}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                    <span>{project.status}</span>
                    <span className="inline-flex items-center gap-1 text-violet-700">
                      Open <ArrowRight className="transition group-hover:translate-x-1" size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
                <UsersRound size={22} />
              </div>
              <h3 className="mt-4 font-bold text-slate-950">
                {user ? "Bạn chưa có project nào" : "Bạn đang ở chế độ preview"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {user
                    ? "Tạo workspace đầu tiên để gom tài liệu, mời thành viên và bắt đầu sprint."
                  : "Bắt đầu bằng một workspace mới — Nexus sẽ đồng hành từ setup đến lúc bàn giao."}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Link
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
                  href={user ? "/project/new" : "/login"}
                >
                  {user ? "Tạo project" : "Đăng nhập"}
                </Link>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Zap size={20} />
              </div>
              <div>
                <h2 className="font-bold text-slate-950">Một flow liền mạch</h2>
                <p className="text-xs text-slate-500">Từ context đến hành động</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <SideMetric label="Knowledge Hub" value="Có citation" />
              <SideMetric label="Smart Delegation" value="Theo capacity" />
              <SideMetric label="Deadline Copilot" value="Theo thời gian thực" />
              <SideMetric label="Privacy" value="Member-first" />
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}

function TrustItem({ icon: Icon, text }: { icon: typeof CheckCircle2; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
      <Icon aria-hidden="true" className="text-cyan-200" size={15} />
      <span>{text}</span>
    </div>
  );
}

function SideMetric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={
          muted
            ? "font-bold text-slate-500"
            : "rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
        }
      >
        {value}
      </span>
    </div>
  );
}
