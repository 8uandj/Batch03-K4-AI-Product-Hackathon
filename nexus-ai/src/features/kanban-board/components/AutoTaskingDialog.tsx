"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import type { KanbanMember, KanbanTask } from "../types";

type AutoDraft = {
  id?: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  priority: "low" | "medium" | "high";
  assignee_id: string;
  required_skills: string[];
  due_in_days: number;
  due_at?: string | null;
};

type AutoTaskingResponse = {
  tasks?: AutoDraft[];
  mode?: "openai" | "mock";
  warning?: string;
  error?: string;
  recommendationId?: string;
};

export function AutoTaskingDialog({
  initialSummary,
  members,
  onClose,
  onCreated,
  projectId,
}: {
  initialSummary: string;
  members: KanbanMember[];
  onClose: () => void;
  onCreated: (
    tasks: KanbanTask[],
    mode: "openai" | "mock",
    warning?: string,
  ) => void;
  projectId: string;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [taskCount, setTaskCount] = useState(6);
  const [pending, setPending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [drafts, setDrafts] = useState<AutoDraft[] | null>(null);
  const [recommendationId, setRecommendationId] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState<"openai" | "mock">("mock");
  const [draftWarning, setDraftWarning] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);

  async function submit() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/auto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          users: members.map(({ id, name, skills }) => ({ id, name, skills })),
          documentSummary: summary,
          taskCount,
        }),
      });
      const result = (await response.json()) as AutoTaskingResponse;

      if (!response.ok || !result.tasks?.length || !result.mode) {
        throw new Error(result.error || "Không thể tạo task từ AI.");
      }

      const normalized = result.tasks.map((task) => {
        const raw = task as AutoDraft & { assigneeId?: string; requiredSkills?: string[]; dueAt?: string | null };
        return {
          id: raw.id,
          title: raw.title,
          description: raw.description,
          acceptance_criteria: raw.acceptance_criteria || raw.description,
          priority: raw.priority,
          assignee_id: raw.assignee_id || raw.assigneeId || "",
          required_skills: raw.required_skills || raw.requiredSkills || [],
          due_in_days: raw.due_in_days || 1,
          due_at: raw.due_at || raw.dueAt || null,
        };
      });
      setDrafts(normalized);
      setRecommendationId(result.recommendationId || null);
      setDraftMode(result.mode);
      setDraftWarning(result.warning);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối Auto-Tasking.",
      );
    } finally {
      setPending(false);
    }
  }

  async function approveDraft() {
    if (!drafts) return;
    setApproving(true);
    setError(null);
    try {
      if (projectId !== "demo") {
        if (!recommendationId) throw new Error("Thiếu mã bản nháp để duyệt.");
        const response = await fetch(`/api/projects/${projectId}/tasks/auto/approve`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ recommendationId, tasks: drafts }),
        });
        const result = await response.json() as { tasks?: Array<Record<string, unknown>>; error?: string };
        if (!response.ok || !result.tasks) throw new Error(result.error || "Không thể duyệt task draft.");
        const tasks = result.tasks.map((task) => mapPersistedTask(task, members));
        onCreated(tasks, draftMode, draftWarning);
      } else {
        onCreated(drafts.map((draft, index) => mapDraftTask(draft, index, members)), draftMode, draftWarning);
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể duyệt task draft.");
    } finally {
      setApproving(false);
    }
  }

  function mapDraftTask(draft: AutoDraft, index: number, team: KanbanMember[]): KanbanTask {
    const member = team.find((item) => item.id === draft.assignee_id);
    const now = new Date().toISOString();
    return { id: draft.id || `draft-${Date.now()}-${index}`, title: draft.title, description: draft.description, acceptanceCriteria: draft.acceptance_criteria, status: "todo", priority: draft.priority, assigneeId: draft.assignee_id, assigneeName: member?.name || draft.assignee_id, assigneeAvatarUrl: member?.avatarUrl ?? null, requiredSkills: draft.required_skills, dueAt: draft.due_at || null, createdAt: now, updatedAt: now };
  }

  function mapPersistedTask(task: Record<string, unknown>, team: KanbanMember[]): KanbanTask {
    return mapDraftTask({ id: String(task.id), title: String(task.title), description: String(task.description || ""), acceptance_criteria: String(task.acceptance_criteria || task.description || ""), priority: task.priority === "high" || task.priority === "low" ? task.priority : "medium", assignee_id: String(task.assignee_id), required_skills: Array.isArray(task.required_skills) ? task.required_skills.filter((value): value is string => typeof value === "string") : [], due_in_days: 1, due_at: typeof task.due_at === "string" ? task.due_at : null }, 0, team);
  }

  const canSubmit = summary.trim().length >= 30 && members.length > 0 && !pending && !approving && !drafts;

  return (
    <div
      aria-labelledby="auto-tasking-title"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-white/20 bg-white shadow-2xl">
        <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-violet-700 px-6 py-6 text-white sm:px-8">
          <div className="absolute -right-16 -top-20 size-48 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Sparkles aria-hidden="true" size={22} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                  Nexus workflow agent
                </p>
                <h2 className="mt-1 text-2xl font-black" id="auto-tasking-title">
                  AI Auto-Tasking
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-violet-100">
                  AI đọc project brief, đối chiếu kỹ năng thành viên và tạo task
                  có người phụ trách rõ ràng.
                </p>
              </div>
            </div>
            <button
              aria-label="Đóng"
              className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              disabled={pending}
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
        </header>

        <div className="space-y-6 p-6 sm:p-8">
          <section>
            <label
              className="flex items-center gap-2 text-sm font-black text-slate-900"
              htmlFor="project-summary"
            >
              <FileText aria-hidden="true" className="text-violet-600" size={17} />
              Project brief / Document summary
            </label>
            <textarea
              className="mt-3 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              id="project-summary"
              maxLength={12000}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Mô tả mục tiêu, phạm vi và đầu ra của dự án..."
              value={summary}
            />
            <div className="mt-2 flex justify-between text-[10px] text-slate-400">
              <span>Tối thiểu 30 ký tự để AI có đủ ngữ cảnh.</span>
              <span>{summary.length.toLocaleString("vi-VN")}/12.000</span>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <UsersRound aria-hidden="true" className="text-cyan-600" size={17} />
                Thành viên được phân tích
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {members.map((member) => (
                  <span
                    className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 ring-1 ring-inset ring-cyan-100"
                    key={member.id}
                    title={member.skills.join(", ")}
                  >
                    {member.name}
                  </span>
                ))}
                {!members.length ? (
                  <span className="text-xs text-rose-600">
                    Project chưa có thành viên.
                  </span>
                ) : null}
              </div>
            </div>

            <label className="rounded-2xl border border-slate-200 p-4 text-sm font-black text-slate-900">
              Số task
              <select
                className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                onChange={(event) => setTaskCount(Number(event.target.value))}
                value={taskCount}
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                  <option key={count} value={count}>
                    {count} tasks
                  </option>
                ))}
              </select>
            </label>
          </section>

          {drafts ? <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-violet-950"><CheckCircle2 className="text-emerald-600" size={18} /> Draft đã sẵn sàng — PM review trước khi tạo task</div>
            {draftWarning ? <p className="mt-2 text-xs text-amber-700">{draftWarning}</p> : null}
            <div className="mt-3 space-y-2">{drafts.map((draft, index) => <div className="rounded-xl border border-violet-100 bg-white px-3 py-2" key={`${draft.title}-${index}`}><p className="text-sm font-bold text-slate-900">{index + 1}. {draft.title}</p><p className="mt-1 text-xs text-slate-500">{draft.description} · {members.find((member) => member.id === draft.assignee_id)?.name || draft.assignee_id}</p><p className="mt-1 text-xs text-emerald-700"><strong>Đạt khi:</strong> {draft.acceptance_criteria}</p></div>)}</div>
          </section> : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {drafts ? <>
              <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={approving}
              onClick={() => void approveDraft()}
              type="button"
            >
              {approving ? <Loader2 aria-hidden="true" className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
              {approving ? "Đang duyệt…" : "Duyệt và tạo task"}
              </button>
            </> : <>
              <button
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={pending}
              onClick={onClose}
              type="button"
            >
              Hủy
              </button>
              <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              disabled={!canSubmit}
              onClick={submit}
              type="button"
            >
              {pending ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={17} />
              ) : (
                <Sparkles aria-hidden="true" size={17} />
              )}
              {pending ? "AI đang chẻ task..." : `Tạo draft ${taskCount} tasks`}
              </button>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
