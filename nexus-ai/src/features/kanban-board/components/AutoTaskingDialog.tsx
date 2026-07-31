"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  FileText,
  Loader2,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import type { KanbanMember, KanbanTask } from "../types";

type AutoTaskingResponse = {
  tasks?: KanbanTask[];
  mode?: "openai" | "mock";
  warning?: string;
  error?: string;
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

      onCreated(result.tasks, result.mode, result.warning);
      onClose();
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

  const canSubmit = summary.trim().length >= 30 && members.length > 0 && !pending;

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

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
              {pending ? "AI đang chẻ task..." : `Tạo ${taskCount} tasks`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
