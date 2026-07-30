"use client";

import { useActionState } from "react";
import { BrainCircuit } from "lucide-react";

import { generateProjectRecommendations } from "@/features/workspace/actions";

const initialState: { error?: string; message?: string } = {};

export function ProjectAnalysisForm({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(generateProjectRecommendations, initialState);

  return (
    <form action={action} className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
      <input name="projectId" type="hidden" value={projectId} />
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
          <BrainCircuit size={18} />
        </span>
        <div>
          <h3 className="font-bold text-violet-950">AI phân tích & gợi ý chia việc</h3>
          <p className="mt-1 text-sm leading-6 text-violet-800">
            Quét tài liệu đã import và profile thành viên để tạo đề xuất task assignment cho PM review.
          </p>
        </div>
      </div>
      {state.error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.message ? <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.message}</p> : null}
      <button
        className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-violet-300"
        disabled={pending || disabled}
        type="submit"
      >
        {pending ? "Đang phân tích..." : disabled ? "Cần tài liệu và thành viên trước" : "Chạy AI analysis"}
      </button>
    </form>
  );
}
