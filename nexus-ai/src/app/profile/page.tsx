import Link from "next/link";
import { BadgeCheck, FolderKanban, BrainCircuit, Bug, ListTodo, MessageSquare, Scale, MessageCircleHeart } from "lucide-react";

import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { getProfilePageData } from "@/features/profile/data";

export const dynamic = "force-dynamic";

function EqSummaryDisplay({ eqSummary }: { eqSummary: Record<string, any> | string | null | undefined }) {
  if (!eqSummary || (typeof eqSummary === "object" && Object.keys(eqSummary).length === 0)) {
    return (
      <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        Chưa có dữ liệu trắc nghiệm EQ. Hãy hoàn thành Onboarding để khởi tạo.
      </p>
    );
  }

  let eqObj: Record<string, any> = {};
  if (typeof eqSummary === "string") {
    try {
      eqObj = JSON.parse(eqSummary);
    } catch {
      return (
        <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-700 border border-slate-200">
          {eqSummary}
        </div>
      );
    }
  } else {
    eqObj = eqSummary;
  }

  const items = [
    {
      label: "Xử lý Bug kỹ thuật",
      value: eqObj.bug_handling || eqObj.q1_bugHandling || eqObj.q1,
      icon: Bug,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      label: "Phân chia Task",
      value: eqObj.task_preference || eqObj.q2_taskPreference || eqObj.q2,
      icon: ListTodo,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      label: "Kênh trao đổi",
      value: eqObj.communication || eqObj.q3_communication || eqObj.q3,
      icon: MessageSquare,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      label: "Giải quyết Bất đồng",
      value: eqObj.conflict_resolution || eqObj.q4_conflictResolution || eqObj.q4,
      icon: Scale,
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      label: "Tiếp nhận Feedback",
      value: eqObj.feedback_handling || eqObj.q5_feedbackHandling || eqObj.q5,
      icon: MessageCircleHeart,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
  ].filter((item) => Boolean(item.value));

  const summaryText = eqObj.summary && typeof eqObj.summary === "string" ? eqObj.summary : null;

  return (
    <div className="mt-4 space-y-3">
      {summaryText && (
        <div className="rounded-2xl bg-violet-50/80 p-3.5 border border-violet-100 text-xs text-violet-900 leading-relaxed font-medium">
          <span className="font-bold text-violet-700">💡 Tổng quan:</span> {summaryText}
        </div>
      )}

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const IconComponent = item.icon;
          return (
            <div key={idx} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 flex flex-col gap-1 transition hover:bg-slate-50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span className={`p-1 rounded-md border ${item.color}`}>
                  <IconComponent size={13} />
                </span>
                {item.label}
              </span>
              <span className="text-xs font-semibold text-slate-800 pl-6 leading-snug">
                {String(item.value)}
              </span>
            </div>
          );
        })}
      </div>

      {items.length === 0 && !summaryText && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
          Chưa có thông tin EQ chi tiết.
        </div>
      )}
    </div>
  );
}

export default async function ProfilePage() {
  let data;
  try {
    data = await getProfilePageData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải profile.";
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Profile error</p>
        <h1 className="mt-3 text-2xl font-black text-red-950">Không thể tải profile</h1>
        <p className="mt-3 text-sm leading-6">{message}</p>
      </section>
    );
  }

  const { profile, projects } = data;

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="grid gap-6 rounded-3xl border bg-white p-6 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-700">User profile</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{profile.name || profile.email}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{profile.bio || "Cập nhật bio để PM và Nexus AI hiểu cách bạn làm việc."}</p>
        </div>
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-950"><BadgeCheck size={18} /> Public user code</div>
          <div className="mt-3 rounded-xl bg-white px-4 py-3 font-mono text-lg font-black text-slate-950 shadow-sm">{profile.user_code || "Đang tạo"}</div>
          <p className="mt-3 text-xs leading-5 text-slate-500">PM có thể mời bạn bằng mã này thay vì UUID.</p>
        </aside>
      </header>

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><FolderKanban className="text-slate-500" size={18} /><h2 className="font-bold text-slate-950">Projects</h2></div>
            <div className="mt-4 space-y-3">
              {projects.length ? projects.map((project) => (
                <Link className="block rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 hover:bg-violet-50" href={`/project/${project.id}`} key={project.id}>
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-900">{project.name}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-violet-700">{project.role}</span></div>
                </Link>
              )) : <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Chưa tham gia project nào.</p>}
            </div>
          </div>
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BrainCircuit className="text-violet-600" size={18} />
              <h2 className="font-bold text-slate-950">EQ summary</h2>
            </div>
            <EqSummaryDisplay eqSummary={profile.eq_summary as any} />
          </div>
        </aside>
        <ProfileForm profile={profile} />
      </section>
    </section>
  );
}
