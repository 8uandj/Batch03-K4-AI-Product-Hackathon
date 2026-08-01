"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      className="mb-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition duration-200 hover:-translate-x-0.5 hover:border-cyan-200 hover:text-cyan-700"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      type="button"
    >
      <ArrowLeft size={16} /> Quay lại
    </button>
  );
}
