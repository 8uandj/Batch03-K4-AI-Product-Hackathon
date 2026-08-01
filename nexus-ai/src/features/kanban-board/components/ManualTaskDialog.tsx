"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, Plus, ShieldCheck, X } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@/types";
import type { KanbanMember } from "../types";

type CreatedTask = { id: string; title: string; description: string | null; status: TaskStatus; priority: TaskPriority; assignee_id: string; required_skills: string[]; due_at: string | null; created_at: string; updated_at: string };
type PreviewCandidate = { userId: string; name: string; score: number; capacity: number; capacityRisk: "low" | "moderate" | "high" | "critical"; skillFit: number; warnings: string[] };
type Preview = { phase: string; weights?: { skill: number; capacity: number; urgency: number; history: number; workStyle: number }; recommended?: PreviewCandidate | null; selectedCandidate?: PreviewCandidate | null; candidates?: PreviewCandidate[]; skillFitCandidate?: PreviewCandidate | null; capacityFitCandidate?: PreviewCandidate | null; splitTaskSuggestion?: string | null; supportSuggestion?: string; rationale?: string; forecastImpact?: string };
type Props = { projectId: string; members: KanbanMember[]; tasks?: Array<{ id: string; title: string; status: TaskStatus }>; onClose: () => void; onCreated: (task: CreatedTask) => void };

export function ManualTaskDialog({ projectId, members, tasks = [], onClose, onCreated }: Props) {
  const [form, setForm] = useState({ title: "", description: "", source_type: "other", priority: "medium", effort_size: "medium", due_at: "", assignee_id: "", required_skills: "", acceptance_criteria: "", blocked_by_task_id: "", source_task_id: "", is_urgent: false });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [mitigation, setMitigation] = useState("rebalance");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true); setError("");
    const payload = { ...form, required_skills: form.required_skills.split(",").map((item) => item.trim()).filter(Boolean), due_at: form.due_at ? new Date(form.due_at).toISOString() : null, override_reason: overrideReason, mitigation };
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (response.status === 409 && data.preview) { setPreview(data.preview); setError(data.error); return; }
      if (!response.ok) throw new Error(data.error || "Không thể tạo task.");
      onCreated(data.task); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể tạo task."); } finally { setPending(false); }
  }

  async function loadPreview() {
    setPreviewPending(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/assignment-preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ required_skills: form.required_skills.split(",").map((item) => item.trim()).filter(Boolean), is_urgent: form.is_urgent, due_at: form.due_at ? new Date(form.due_at).toISOString() : null }),
      });
      const data = await response.json() as Preview & { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể tạo assignment preview.");
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo assignment preview.");
    } finally {
      setPreviewPending(false);
    }
  }

  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const riskCandidate = preview?.selectedCandidate || preview?.candidates?.find((candidate) => candidate.userId === form.assignee_id) || preview?.recommended;
  const requiresOverride = riskCandidate?.capacityRisk === "high" || riskCandidate?.capacityRisk === "critical";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600">Ad-hoc task</p><h2 className="mt-1 text-2xl font-black text-slate-900">Tạo task phát sinh</h2><p className="mt-1 text-sm text-slate-500">Nexus sẽ gợi ý người nhận dựa trên skill và capacity.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">Tiêu đề<input required minLength={3} value={form.title} onChange={(e) => update("title", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Ví dụ: Sửa gấp lỗi giao diện trang chủ" /></label>
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">Mô tả<textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          <Select label="Loại task" value={form.source_type} onChange={(v) => update("source_type", v)} options={[["other","Khác"],["feedback_change","Feedback / sửa đổi"],["bug_fix","Fix bug"],["urgent_request","Yêu cầu gấp"],["admin_logistics","Hành chính / logistics"]]} />
          <Select label="Priority" value={form.priority} onChange={(v) => update("priority", v)} options={[["low","Low"],["medium","Medium"],["high","High"]]} />
          <Select label="Effort" value={form.effort_size} onChange={(v) => update("effort_size", v)} options={[["small","Small"],["medium","Medium"],["large","Large"]]} />
          <label className="text-sm font-bold text-slate-700">Deadline<input type="datetime-local" value={form.due_at} onChange={(e) => update("due_at", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          <label className="text-sm font-bold text-slate-700">Gợi ý kỹ năng<input value={form.required_skills} onChange={(e) => update("required_skills", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="React, UI/UX" /></label>
          <label className="text-sm font-bold text-slate-700">Người nhận<select value={form.assignee_id} onChange={(e) => update("assignee_id", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Nexus đề xuất</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">Task đang chặn (tuỳ chọn)<select value={form.blocked_by_task_id} onChange={(e) => update("blocked_by_task_id", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Không có dependency</option>{tasks.filter((task) => task.status !== "done").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><span className="mt-1 block text-[11px] font-normal text-slate-500">Nexus sẽ nhắc PM nếu task này chưa thể bắt đầu vì task được chọn chưa hoàn tất.</span></label>
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">Task gốc cho feedback / bug fix (tuỳ chọn)<select value={form.source_task_id} onChange={(e) => update("source_task_id", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Không liên kết task gốc</option>{tasks.filter((task) => task.status === "done").map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><span className="mt-1 block text-[11px] font-normal text-slate-500">Chỉ chọn task đã hoàn tất và dùng cho loại Feedback / sửa đổi hoặc Fix bug. Task mới sẽ được ghi là rework.</span></label>
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">Acceptance criteria<textarea value={form.acceptance_criteria} onChange={(e) => update("acceptance_criteria", e.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_urgent} onChange={(e) => update("is_urgent", e.target.checked)} /> Đây là task khẩn cấp</label>
        </div>
        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-black text-violet-950">Smart Delegation</p><p className="mt-1 text-xs text-violet-800">Xem phase, người phù hợp nhất và phương án san tải trước khi tạo task.</p></div><button type="button" onClick={() => void loadPreview()} disabled={previewPending} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-800 disabled:opacity-50">{previewPending ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />} {previewPending ? "Đang phân tích…" : "Xem gợi ý giao task"}</button></div>{preview ? <div className="mt-3 space-y-2 text-xs text-slate-700"><p><strong>Phase:</strong> {preview.phase} · <strong>Đề xuất:</strong> {preview.recommended?.name || "Chưa có"}{preview.recommended ? ` · score ${preview.recommended.score}/100 · capacity ${preview.recommended.capacity}/100` : ""}</p>{preview.weights ? <p className="text-slate-500">Weights — skill {preview.weights.skill}% · capacity {preview.weights.capacity}% · urgency {preview.weights.urgency}% · history {preview.weights.history}% · work-style {preview.weights.workStyle}%</p> : null}{preview.rationale ? <p>{preview.rationale}</p> : null}{preview.splitTaskSuggestion ? <p className="rounded-lg bg-white/80 px-3 py-2">{preview.splitTaskSuggestion}</p> : null}{preview.supportSuggestion ? <p className="rounded-lg bg-white/80 px-3 py-2">{preview.supportSuggestion}</p> : null}{preview.candidates?.slice(0, 3).map((candidate) => <div className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2" key={candidate.userId}><span className="font-semibold">{candidate.name}</span><span>{candidate.capacityRisk} · {candidate.skillFit}% skill · {candidate.capacity}% capacity</span></div>)}</div> : null}</div>
        {requiresOverride && riskCandidate ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-2 text-sm font-black text-amber-900"><AlertTriangle size={17} /> Risk cao — cần xác nhận</div><p className="mt-2 text-sm text-amber-800">Bạn đang chọn {riskCandidate.name}; phase hiện tại: {preview?.phase}. Thành viên có dấu hiệu quá tải.</p><label className="mt-3 block text-sm font-bold text-amber-900">Lý do override<input required value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2" /></label><label className="mt-3 block text-sm font-bold text-amber-900">Phương án giảm tải<select value={mitigation} onChange={(e) => setMitigation(e.target.value)} className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-3 py-2"><option value="rebalance">Dời task khác</option><option value="add_support">Thêm người hỗ trợ</option><option value="reduce_scope">Giảm scope</option><option value="extend_deadline">Lùi deadline</option><option value="emergency">Đánh dấu emergency</option></select></label></div> : null}
        {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Hủy</button><button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{pending ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /><ShieldCheck size={16} /></>} Tạo task</button></div>
      </form>
    </div>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="text-sm font-bold text-slate-700">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;

}
