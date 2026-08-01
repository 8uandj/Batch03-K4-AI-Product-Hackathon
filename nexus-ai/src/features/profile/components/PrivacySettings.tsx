"use client";

import { useEffect, useState } from "react";
import { EyeOff, Loader2, ShieldCheck } from "lucide-react";

type Project = { id: string; name: string };
type Preferences = { behavioral_insights_enabled: boolean; late_night_signal_enabled: boolean; chat_analysis_enabled: boolean; timezone: string; behavioralData?: { windowDays: number; daysObserved: number; overdueTasks: number; staleDoingTasks: number; reminderCount: number; completedTasks: number; lateNightUpdates: number } };

export function PrivacySettings({ projects }: { projects: Project[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!projectId) return;
    fetch("/api/projects/" + projectId + "/privacy").then((response) => response.json()).then(setPreferences).catch(() => setMessage("Không thể tải cài đặt privacy."));
  }, [projectId]);

  async function save() {
    if (!projectId || !preferences) return;
    setPending(true);
    try {
      const response = await fetch("/api/projects/" + projectId + "/privacy", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ behavioralInsightsEnabled: preferences.behavioral_insights_enabled, lateNightSignalEnabled: preferences.late_night_signal_enabled, chatAnalysisEnabled: preferences.chat_analysis_enabled, timezone: preferences.timezone }) });
      if (!response.ok) throw new Error("save");
      setPreferences(await response.json());
      setMessage("Đã lưu cài đặt privacy.");
    } catch {
      setMessage("Không thể lưu cài đặt privacy.");
    } finally {
      setPending(false);
    }
  }

  async function deleteBehavioralData() {
    if (!projectId || !window.confirm("Xóa toàn bộ aggregate behavioral của bạn trong project này?")) return;
    setPending(true);
    try {
      const response = await fetch("/api/projects/" + projectId + "/privacy", { method: "DELETE" });
      if (!response.ok) throw new Error("delete");
      setMessage("Đã xóa dữ liệu behavioral aggregate.");
    } catch {
      setMessage("Không thể xóa dữ liệu behavioral.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><ShieldCheck size={18} /></span>
        <div><h2 className="font-bold text-slate-950">Privacy & behavioral insights</h2><p className="mt-1 text-xs leading-5 text-slate-500">Nexus chỉ dùng dữ liệu task aggregate để đề xuất hỗ trợ. Không theo dõi online presence hoặc màn hình.</p></div>
      </div>
      {projects.length ? <label className="mt-4 block text-sm font-semibold text-slate-700">Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"><option value="">Chọn project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label> : <p className="mt-4 text-sm text-slate-500">Tham gia project để quản lý privacy settings.</p>}
      {preferences ? <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600"><p className="font-bold text-slate-800">Dữ liệu behavioral đang lưu</p><p className="mt-1">Aggregate {preferences.behavioralData?.daysObserved ?? 0}/{preferences.behavioralData?.windowDays ?? 30} ngày · {preferences.behavioralData?.overdueTasks ?? 0} overdue · {preferences.behavioralData?.lateNightUpdates ?? 0} late-night signal · {preferences.behavioralData?.reminderCount ?? 0} reminder.</p><p className="mt-1 text-slate-500">Không lưu online presence, màn hình hoặc hoạt động ngoài NexusAI.</p></div>
        <Toggle label="Behavioral insights" checked={preferences.behavioral_insights_enabled} onChange={(value) => setPreferences({ ...preferences, behavioral_insights_enabled: value })} />
        <Toggle label="Late-night signal" checked={preferences.late_night_signal_enabled} onChange={(value) => setPreferences({ ...preferences, late_night_signal_enabled: value })} />
        <Toggle label="Phân tích nội dung chat (opt-in)" checked={preferences.chat_analysis_enabled} onChange={(value) => setPreferences({ ...preferences, chat_analysis_enabled: value })} />
        <label className="block text-sm font-semibold text-slate-700">Timezone<input value={preferences.timezone} onChange={(event) => setPreferences({ ...preferences, timezone: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2" /></label>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void save()} disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{pending ? <Loader2 className="animate-spin" size={15} /> : <EyeOff size={15} />} Lưu cài đặt</button><button type="button" onClick={() => void deleteBehavioralData()} disabled={pending} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-50">Xóa dữ liệu behavioral</button></div>
      </div> : null}
      {message ? <p className="mt-3 text-xs font-semibold text-slate-600">{message}</p> : null}
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
