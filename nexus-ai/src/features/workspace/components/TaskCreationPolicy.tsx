"use client";

import { useState } from "react";

export function TaskCreationPolicy({ projectId, initialEnabled }: { projectId: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ allowMemberTaskCreation: next }) });
      const result = await response.json() as { allowMemberTaskCreation?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Không thể lưu cài đặt.");
      setEnabled(result.allowMemberTaskCreation === true);
      setMessage("Đã lưu");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu cài đặt.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-slate-900">Quyền tạo task phát sinh</p><p className="mt-1 text-xs leading-5 text-slate-500">Cho phép member tự tạo blocker, bug hoặc việc ad-hoc; PM vẫn kiểm soát assignment và risk.</p></div><button type="button" disabled={saving} onClick={() => void toggle()} className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-violet-600" : "bg-slate-300"}`} aria-label="Bật hoặc tắt quyền member tạo task"><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${enabled ? "left-6" : "left-1"}`} /></button></div>{message ? <p className="mt-2 text-[11px] font-semibold text-slate-500">{message}</p> : null}</div>;
}
