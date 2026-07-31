"use client";

import { useActionState } from "react";
import { PlusCircle } from "lucide-react";

import { createProject } from "@/features/workspace/actions";

export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProject, {});

  return (
    <form action={action} className="mx-auto max-w-3xl rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
          <PlusCircle aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            PM action
          </p>
          <h1 className="text-2xl font-bold text-slate-950">Tạo project mới</h1>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Tên project
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            name="name"
            placeholder="Nexus AI MVP"
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Mô tả
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-200"
            name="description"
            placeholder="Workspace quản lý dự án với AI đồng hành."
          />
        </label>

        {state.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        <button
          className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={pending}
          type="submit"
        >
          {pending ? "Đang tạo..." : "Tạo project"}
        </button>
      </div>
    </form>
  );
}
