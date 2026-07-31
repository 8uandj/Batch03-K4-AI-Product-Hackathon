import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ListTodo,
  Plus,
  Radar,
  UsersRound,
} from "lucide-react";

import type {
  DashboardStats,
  DashboardTaskItem,
  MemberWorkload,
  RoleDashboardData,
} from "./role-dashboard-data";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export function RoleDashboard({ data }: { data: RoleDashboardData }) {
  if (data.mode === "empty") return <EmptyDashboard userName={data.userName} />;
  if (data.mode === "member") return <MemberDashboard data={data} />;
  return <PMDashboard data={data} />;
}

function PMDashboard({ data }: { data: Extract<RoleDashboardData, { mode: "pm" }> }) {
  return (
    <section className="space-y-6">
      <DashboardHeader
        eyebrow="PM dashboard"
        title={`Xin chào ${data.userName}`}
        description={`Bạn đang quản trị ${data.projectCount} project. Dashboard này chỉ tính project mà bạn có role PM.`}
      />

      <StatsGrid stats={data.stats} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`${cardClass} overflow-hidden p-0`}>
          <SectionHeader
            icon={AlertTriangle}
            title="Red Flags"
            description="Task overdue hoặc Doing quá 48 giờ"
            tone="red"
            count={data.redFlags.length}
          />
          <TaskList
            empty="Chưa có red flag nào. Team đang khá sạch sẽ, tạm thở được một nhịp."
            tasks={data.redFlags}
            variant="risk"
          />
        </div>

        <div className={cardClass}>
          <div className="mb-4 flex items-center gap-2">
            <UsersRound className="text-slate-500" size={18} />
            <h2 className="font-bold text-slate-950">Member workload</h2>
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
          title="Risk event history"
          description="Lịch sử cảnh báo từ bảng risk_events"
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
                <span className="text-sm text-slate-500">Owner: {risk.ownerName}</span>
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
        eyebrow="Personal dashboard"
        title={`Việc của bạn, ${data.userName}`}
        description="Dashboard này chỉ hiển thị task được assign cho bạn trong các project bạn tham gia."
      />

      <StatsGrid stats={data.stats} />

      <section className="grid gap-6 xl:grid-cols-3">
        <div className={`${cardClass} overflow-hidden p-0`}>
          <SectionHeader
            icon={CalendarClock}
            title="Deadline sắp tới"
            description="Task chưa done có due date gần nhất"
            tone="blue"
            count={data.upcomingTasks.length}
          />
          <TaskList empty="Bạn chưa có deadline sắp tới." tasks={data.upcomingTasks} />
        </div>

        <div className={`${cardClass} overflow-hidden p-0`}>
          <SectionHeader
            icon={AlertTriangle}
            title="Quá hạn"
            description="Task đã vượt due date"
            tone="red"
            count={data.overdueTasks.length}
          />
          <TaskList empty="Không có task quá hạn." tasks={data.overdueTasks} variant="risk" />
        </div>

        <div className={`${cardClass} overflow-hidden p-0`}>
          <SectionHeader
            icon={Clock3}
            title="Doing quá 48h"
            description="Task có thể đang bị blocker"
            tone="amber"
            count={data.doingTooLongTasks.length}
          />
          <TaskList empty="Không có task Doing quá 48 giờ." tasks={data.doingTooLongTasks} />
        </div>
      </section>
    </section>
  );
}

function EmptyDashboard({ userName }: { userName: string }) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Plus size={24} />
      </div>
      <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
        {userName}, bạn chưa thuộc project nào
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
        Hãy tạo project mới nếu bạn là PM, hoặc yêu cầu PM invite bạn vào workspace để xem tiến độ cá nhân.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800" href="/project/new">
          Tạo project
        </Link>
        <Link className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50" href="/project/demo">
          Xem demo
        </Link>
      </div>
    </section>
  );
}

function DashboardHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl shadow-slate-200/70">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.32),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.22),transparent_30%)]" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
      </div>
    </header>
  );
}

function StatsGrid({ stats }: { stats: DashboardStats }) {
  const cards = [
    { label: "Todo", value: stats.todo, icon: ListTodo, tone: "bg-blue-50 text-blue-700" },
    { label: "Doing", value: stats.doing, icon: Clock3, tone: "bg-amber-50 text-amber-700" },
    { label: "Done", value: stats.done, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Progress", value: `${stats.completionPercentage}%`, icon: BarChart3, tone: "bg-violet-50 text-violet-700" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg" key={label}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">{label}</span>
            <span className={`rounded-xl p-2.5 ${tone}`}>
              <Icon size={18} />
            </span>
          </div>
          <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
        </article>
      ))}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  tone,
  count,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  tone: "red" | "amber" | "blue";
  count: number;
}) {
  const toneClass = {
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
  }[tone];

  return (
    <div className={`flex items-center gap-3 border-b px-5 py-4 ${toneClass}`}>
      <span className="rounded-xl bg-white p-2 shadow-sm">
        <Icon size={18} />
      </span>
      <div>
        <h2 className="font-bold text-slate-950">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <span className="ml-auto rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700 shadow-sm">
        {count}
      </span>
    </div>
  );
}

function TaskList({ tasks, empty, variant = "default" }: { tasks: DashboardTaskItem[]; empty: string; variant?: "default" | "risk" }) {
  if (tasks.length === 0) {
    return <div className="p-5"><EmptyBlock text={empty} /></div>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {tasks.map((task) => (
        <li className="px-5 py-4" key={task.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{task.title}</p>
              <p className="mt-1 text-sm text-slate-500">{task.projectName} · {task.assigneeName}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${variant === "risk" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
              {task.status}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2 py-1">Priority: {task.priority}</span>
            {task.dueAt ? <span className="rounded-full bg-slate-100 px-2 py-1">Due: {formatDate(task.dueAt)}</span> : null}
            {task.status === "doing" ? <span className="rounded-full bg-slate-100 px-2 py-1">Doing {task.delayHours}h</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function WorkloadCard({ member }: { member: MemberWorkload }) {
  const riskClass = member.overdueTasks > 0 ? "text-red-700 bg-red-50" : "text-emerald-700 bg-emerald-50";

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{member.name}</h3>
        <span className={`rounded-full px-2 py-1 text-xs font-bold ${riskClass}`}>
          {member.overdueTasks} overdue
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{member.openTasks} open tasks</p>
    </article>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm leading-6 text-slate-500">
      {text}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
