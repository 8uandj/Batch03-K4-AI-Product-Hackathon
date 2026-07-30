import Link from "next/link";
import { BadgeCheck, FolderKanban } from "lucide-react";

import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { getProfilePageData } from "@/features/profile/data";

export const dynamic = "force-dynamic";

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
            <h2 className="font-bold text-slate-950">EQ summary</h2>
            <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">{JSON.stringify(profile.eq_summary ?? {}, null, 2)}</pre>
          </div>
        </aside>
        <ProfileForm profile={profile} />
      </section>
    </section>
  );
}
