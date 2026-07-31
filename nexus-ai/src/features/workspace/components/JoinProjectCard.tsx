"use client";

import { useActionState } from "react";
import { UserPlus, Info } from "lucide-react";
import { joinProjectWithInput } from "@/features/workspace/actions";

const initialState: { error?: string; message?: string } = {};

export function JoinProjectCard() {
  const [state, action, pending] = useActionState(joinProjectWithInput, initialState);

  return (
    <div className="rounded-3xl border border-cyan-100 bg-cyan-50/40 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-100">
          <UserPlus size={18} />
        </span>
        <div>
          <h2 className="font-black text-slate-900 text-base">Tham gia Project</h2>
          <p className="text-xs text-slate-500">Bằng Project ID hoặc Link mời</p>
        </div>
      </div>

      <form action={action} className="mt-5 space-y-4">
        <div>
          <label className="sr-only" htmlFor="project-join-input">
            Project ID hoặc Link Invite
          </label>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            id="project-join-input"
            name="input"
            placeholder="Nhập UUID dự án hoặc dán link mời..."
            required
            type="text"
          />
        </div>

        {state.error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
            {state.error}
          </div>
        )}
        {state.message && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
            {state.message}
          </div>
        )}

        <button
          className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={pending}
          type="submit"
        >
          {pending ? "Đang tham gia..." : "Tham gia ngay"}
        </button>
      </form>

      <div className="mt-4 flex gap-2 rounded-2xl bg-white/60 p-3 text-[10px] leading-relaxed text-slate-500">
        <Info className="shrink-0 text-cyan-600 mt-0.5" size={13} />
        <p>
          Bạn có thể nhập mã UUID của dự án (ví dụ: <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-700">d3b07384...</code>) 
          hoặc dán toàn bộ đường link mời dạng <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-700">/join/token</code>.
        </p>
      </div>
    </div>
  );
}
