"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  KanbanSquare,
  ListTodo,
  Plus,
  Radar,
  ShieldCheck,
  Sparkles,
  User,
  UsersRound,
} from "lucide-react";

import type {
  DashboardStats,
  DashboardTaskItem,
  MemberWorkload,
  ProjectOption,
  ProjectProgressOverview,
  RoleDashboardData,
} from "./role-dashboard-data";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export function RoleDashboard({ data }: { data: RoleDashboardData }) {
  if (data.mode === "empty") return <EmptyDashboard userName={data.userName} />;

  return (
    <div className="space-y-6">
      {/* 1. Projects Progress Overview Header (Nằm ở trên cùng Dashboard) */}
      <ProjectsOverviewHeader
        projectsOverview={data.projectsOverview}
        selectedProjectId={data.selectedProjectId}
      />

      {/* 2. Project Selector Bar (Block Down Chọn Dự Án) */}
      <ProjectSelectorBar
        userProjects={data.userProjects}
        selectedProjectId={data.selectedProjectId}
        selectedProjectName={data.selectedProjectName}
        mode={data.mode}
      />

      {/* 3. Detailed Personalized Dashboard for Selected Project */}
      {data.mode === "member" ? <MemberDashboard data={data} /> : <PMDashboard data={data} />}
    </div>
  );
}

function ProjectsOverviewHeader({
  projectsOverview,
  selectedProjectId,
}: {
  projectsOverview: ProjectProgressOverview[];
  selectedProjectId: string;
}) {
  const router = useRouter();

  const handleSelect = (id: string) => {
    router.push(`/dashboard?projectId=${id}`);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-violet-600" size={20} />
          <h2 className="text-lg font-black text-slate-950">
            Tổng quan Tiến độ Tất cả Dự án Đang Tham gia
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {projectsOverview.length} dự án đang hoạt động
        </span>
      </div>

      {/* Projects Overview Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projectsOverview.map((p) => {
          const isSelected = p.id === selectedProjectId;

          return (
            <div
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className={`group cursor-pointer rounded-3xl border p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg ${
                isSelected
                  ? "border-violet-500 bg-gradient-to-br from-violet-950 via-slate-900 to-indigo-950 text-white shadow-md ring-2 ring-violet-400"
                  : "border-slate-200 bg-white text-slate-900 hover:border-violet-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      isSelected
                        ? p.role === "pm"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                        : p.role === "pm"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                    }`}
                  >
                    Role: {p.role === "pm" ? "PM" : "Member"}
                  </span>
                  <h3
                    className={`mt-2 font-bold text-base line-clamp-1 ${
                      isSelected ? "text-white" : "text-slate-950"
                    }`}
                  >
                    {p.name}
                  </h3>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xl font-black ${
                      isSelected
                        ? p.progressPercentage > 70
                          ? "text-emerald-400"
                          : "text-amber-300"
                        : p.progressPercentage > 70
                          ? "text-emerald-600"
                          : "text-amber-600"
                    }`}
                  >
                    {p.progressPercentage}%
                  </span>
                  <span className="block text-[10px] uppercase font-extrabold text-slate-400">
                    Tiến độ
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="h-2 w-full bg-slate-100/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      p.progressPercentage > 70
                        ? "bg-emerald-500"
                        : p.progressPercentage > 40
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                    style={{ width: `${p.progressPercentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-medium pt-1">
                  <span className={isSelected ? "text-slate-300" : "text-slate-600"}>
                    {p.completedTasks}/{p.totalTasks} tasks hoàn thành
                  </span>

                  {p.overdueTasks > 0 ? (
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      ⚠️ {p.overdueTasks} trễ hạn
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-400">✓ Đúng hạn</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProjectSelectorBar({
  userProjects,
  selectedProjectId,
  selectedProjectName,
  mode,
}: {
  userProjects: ProjectOption[];
  selectedProjectId: string;
  selectedProjectName: string;
  mode: "pm" | "member";
}) {
  const router = useRouter();

  const handleSelectProject = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    router.push(`/dashboard?projectId=${val}`);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-md">
          <FolderKanban size={22} />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Chi tiết Cá nhân hóa Dashboard Dự án
          </span>
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            {selectedProjectName}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                mode === "pm"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-cyan-50 text-cyan-700 border border-cyan-200"
              }`}
            >
              Role: {mode === "pm" ? "Quản trị viên (PM)" : "Thành viên (Member)"}
            </span>
          </h2>
        </div>
      </div>

      <div className="w-full sm:w-80">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
          Chọn dự án xem chi tiết:
        </label>
        <select
          value={selectedProjectId}
          onChange={handleSelectProject}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 outline-none transition hover:border-slate-400 focus:bg-white focus:ring-2 focus:ring-violet-200 cursor-pointer"
        >
          {userProjects.map((p) => (
            <option key={p.id} value={p.id} className="text-slate-900 font-medium">
              📁 {p.name} [{p.role === "pm" ? "Role: PM" : "Role: Member"}]
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PMDashboard({ data }: { data: Extract<RoleDashboardData, { mode: "pm" }> }) {
  return (
    <section className="space-y-6">
      <DashboardHeader
        eyebrow="PM dashboard overview"
        title={`Báo cáo Toàn bộ Tiến độ & Sức khỏe Đội ngũ`}
        description={`Chế độ Quản trị viên (PM): Cho phép bạn theo dõi toàn bộ tiến độ, phân tải công việc và rủi ro trễ hạn của TẤT CẢ THÀNH VIÊN trong dự án ${data.selectedProjectName}.`}
      />

      <StatsGrid stats={data.stats} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`${cardClass} overflow-hidden p-0`}>
          <SectionHeader
            icon={AlertTriangle}
            title="Red Flags Toàn Đội"
            description="Task overdue hoặc Doing quá 48 giờ"
            tone="red"
            count={data.redFlags.length}
          />
          <TaskList
            empty="Chưa có red flag nào. Team đang duy trì đúng tiến độ!"
            tasks={data.redFlags}
            variant="risk"
          />
        </div>

        <div className={cardClass}>
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UsersRound className="text-violet-600" size={18} />
            <h2 className="font-bold text-slate-950 text-base">Phân tải Thành viên (Workload)</h2>
          </div>
          {data.workload.length ? (
            <div className="space-y-3">
              {data.workload.map((member) => (
                <WorkloadCard key={member.userId} member={member} />
              ))}
            </div>
          ) : (
            <EmptyBlock text="Chưa có task open được assign cho member." />
          )}
        </div>
      </section>

      <section className={`${cardClass} overflow-hidden p-0`}>
        <SectionHeader
          icon={Radar}
          title="Lịch sử Cảnh báo Rủi ro (Risk Events)"
          description="Ghi nhận các cảnh báo tiến độ tự động"
          tone="amber"
          count={data.riskEvents.length}
        />
        {data.riskEvents.length ? (
          <ul className="divide-y divide-slate-100">
            {data.riskEvents.map((risk) => (
              <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={risk.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{risk.type}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {risk.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{risk.summary}</p>
                </div>
                <span className="text-sm text-slate-500">Người phụ trách: {risk.ownerName}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <EmptyBlock text="Chưa có bản ghi risk_events." />
          </div>
        )}
      </section>
    </section>
  );
}

function MemberDashboard({ data }: { data: Extract<RoleDashboardData, { mode: "member" }> }) {
  return (
    <section className="space-y-6">
      <DashboardHeader
        eyebrow="Member personal dashboard"
        title={`Tiến trình Công việc Cá nhân`}
        description={`Chế độ Thành viên (Member): Cá nhân hóa chỉ hiển thị các công việc, hạn hoàn thành và thông báo tiến độ của CÁ NHÂN BẠN trong dự án ${data.selectedProjectName}.`}
      />

      <StatsGrid stats={data.stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${cardClass} overflow-hidden p-0`}>
          <SectionHeader
            icon={CalendarClock}
            title="Task Sắp đến Hạn của Tôi"
            description="Các công việc cá nhân cần ưu tiên"
            tone="cyan"
            count={data.upcomingTasks.length}
          />
          <TaskList
            empty="Bạn hiện không có task nào sắp đến hạn."
            tasks={data.upcomingTasks}
            variant="upcoming"
          />
        </div>

        <div className={`${cardClass} overflow-hidden p-0`}>
          <SectionHeader
            icon={Clock3}
            title="Task Quá Hạn / Làm Dở Quá Lâu"
            description="Các công việc cá nhân cần chú ý gỡ blocker"
            tone="red"
            count={data.overdueTasks.length + data.doingTooLongTasks.length}
          />
          <TaskList
            empty="Tuyệt vời! Bạn không có task nào bị trễ hạn."
            tasks={[...data.overdueTasks, ...data.doingTooLongTasks]}
            variant="risk"
          />
        </div>
      </div>
    </section>
  );
}

function DashboardHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function StatsGrid({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Task Cần Làm (Todo)" tone="slate" value={stats.todo} />
      <StatCard label="Đang Thực Hiện (Doing)" tone="indigo" value={stats.doing} />
      <StatCard label="Đã Hoàn Thành (Done)" tone="emerald" value={stats.done} />
      <StatCard label="Tiến Độ Hoàn Thành" tone="cyan" value={`${stats.completionPercentage}%`} />
    </div>
  );
}

function StatCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "slate" | "indigo" | "emerald" | "cyan";
  value: number | string;
}) {
  const toneClass =
    tone === "indigo"
      ? "text-indigo-600 bg-indigo-50 border-indigo-100"
      : tone === "emerald"
        ? "text-emerald-600 bg-emerald-50 border-emerald-100"
        : tone === "cyan"
          ? "text-cyan-600 bg-cyan-50 border-cyan-100"
          : "text-slate-700 bg-slate-50 border-slate-200";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${toneClass}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function SectionHeader({
  count,
  description,
  icon: Icon,
  title,
  tone,
}: {
  count: number;
  description: string;
  icon: React.ElementType;
  title: string;
  tone: "red" | "cyan" | "amber";
}) {
  const toneColor =
    tone === "red" ? "text-rose-600" : tone === "cyan" ? "text-cyan-600" : "text-amber-600";

  return (
    <div className="border-b border-slate-100 bg-slate-50/50 p-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className={toneColor} size={20} />
        <div>
          <h3 className="font-bold text-slate-950 text-base">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 border shadow-sm">
        {count}
      </span>
    </div>
  );
}

function TaskList({
  empty,
  tasks,
  variant,
}: {
  empty: string;
  tasks: DashboardTaskItem[];
  variant: "risk" | "upcoming";
}) {
  if (!tasks.length) return <div className="p-5"><EmptyBlock text={empty} /></div>;

  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((task) => (
        <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between transition hover:bg-slate-50" key={task.id}>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">{task.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>{task.projectName}</span>
              <span>·</span>
              <span>Phụ trách: <strong>{task.assigneeName}</strong></span>
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shrink-0 ${
              task.status === "doing"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                : task.status === "done"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            {task.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WorkloadCard({ member }: { member: MemberWorkload }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-950 text-white font-bold text-[11px] uppercase">
          {member.name.slice(0, 2)}
        </span>
        <span className="font-bold text-slate-900 text-xs">{member.name}</span>
      </div>
      <div className="flex items-center gap-3 font-semibold">
        <span className="text-slate-600">{member.openTasks} task mở</span>
        {member.overdueTasks > 0 ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
            {member.overdueTasks} trễ
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 text-center">
      {text}
    </div>
  );
}

function EmptyDashboard({ userName }: { userName: string }) {
  return (
    <section className="rounded-3xl border bg-white p-8 text-center text-slate-500 shadow-sm space-y-4">
      <User size={36} className="mx-auto text-slate-400" />
      <h2 className="text-xl font-bold text-slate-900">Xin chào {userName}</h2>
      <p className="max-w-md mx-auto text-xs leading-relaxed">
        Bạn hiện chưa tham gia dự án nào. Hãy yêu cầu PM gửi lời mời hoặc tạo dự án mới để bắt đầu theo dõi tiến độ!
      </p>
    </section>
  );
}
