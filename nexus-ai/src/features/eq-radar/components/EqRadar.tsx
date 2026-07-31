"use client";

import { useState } from "react";
import {
  BrainCircuit,
  UserCheck,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Activity
} from "lucide-react";

import type { WorkspaceMemberProfile } from "@/features/workspace/types";

type CoachingResult = {
  stressAnalysis: string;
  tips: string[];
  actionPlan: string;
  mode?: string;
};

type EqRadarProps = {
  projectId: string;
  members: WorkspaceMemberProfile[];
};

export function EqRadar({ projectId, members }: EqRadarProps) {
  const [selectedMember, setSelectedMember] = useState<WorkspaceMemberProfile | null>(
    members.length > 0 ? members[0] : null
  );
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate overall team stress level (based on average workload)
  const averageWorkload = members.length
    ? Math.round(members.reduce((acc, m) => acc + m.workload, 0) / members.length)
    : 0;

  // Stress indicator color
  const stressColor =
    averageWorkload > 70 ? "text-rose-600 border-rose-200 bg-rose-50" :
    averageWorkload > 45 ? "text-amber-600 border-amber-200 bg-amber-50" :
    "text-emerald-600 border-emerald-200 bg-emerald-50";

  const stressStatus =
    averageWorkload > 70 ? "Căng thẳng cao (Rủi ro trễ việc)" :
    averageWorkload > 45 ? "Trung bình (Cân bằng tốt)" :
    "Thấp (Tải việc an toàn)";

  async function handleGetCoaching(memberId: string) {
    setIsLoading(true);
    setError(null);
    setCoaching(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/eq-radar/coaching`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tải gợi ý coaching.");

      setCoaching(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi kết nối API Coaching.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
      
      {/* LEFT PANEL: Stress Dial & Workload Distribution */}
      <div className="space-y-6">
        
        {/* 1. Stress Index Card */}
        <article className={`rounded-3xl border p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 ${stressColor}`}>
          <div className="relative flex size-24 shrink-0 items-center justify-center rounded-full bg-white shadow-inner">
            {/* Visual Dial representation */}
            <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className={averageWorkload > 70 ? "text-rose-500" : averageWorkload > 45 ? "text-amber-500" : "text-emerald-500"}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${averageWorkload}, 100`}
                strokeWidth="3.2"
              />
            </svg>
            <div className="text-center">
              <span className="text-2xl font-black text-slate-900">{averageWorkload}%</span>
              <p className="text-[9px] uppercase tracking-wide text-slate-500 font-bold">Stress Index</p>
            </div>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase shadow-sm inline-block">
              Team Stress Level: {stressStatus}
            </span>
            <h3 className="text-xl font-black text-slate-950">Chỉ số EQ & Sức khỏe Team</h3>
            <p className="text-xs leading-relaxed text-slate-700 max-w-md">
              Stress index được tính dựa trên sự mất cân bằng workload và task Doing quá 48h. Hãy sử dụng coaching trợ lý để tháo gỡ áp lực cho đội ngũ.
            </p>
          </div>
        </article>

        {/* 2. Workload Distribution Bar Chart */}
        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <header className="mb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Activity className="text-slate-600" size={18} />
              So sánh Workload & Tải việc
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Click chọn thành viên để xem phân tích EQ và tư vấn của AI.</p>
          </header>

          <div className="space-y-4">
            {members.map((member) => {
              const isSelected = selectedMember?.id === member.id;
              // Bar color
              const barColor =
                member.workload > 70 ? "bg-rose-500" :
                member.workload > 45 ? "bg-amber-500" :
                "bg-emerald-500";

              return (
                <button
                  className={`w-full text-left rounded-2xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? "border-violet-500 bg-violet-50/20 ring-2 ring-violet-100"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                  key={member.id}
                  onClick={() => {
                    setSelectedMember(member);
                    setCoaching(null);
                    setError(null);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white font-black text-xs uppercase">
                      {member.name.slice(0, 2)}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {member.name}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600 font-bold uppercase">
                          {member.role}
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{member.eqSignal}</p>
                    </div>
                  </div>

                  <div className="w-full sm:w-48 shrink-0 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-700">
                      <span>Khối lượng tải:</span>
                      <span>{member.workload}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${member.workload}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </article>

      </div>

      {/* RIGHT PANEL: AI Coaching Assistant */}
      <div className="rounded-3xl border bg-white p-6 shadow-sm flex flex-col">
        {selectedMember ? (
          <div className="flex-1 flex flex-col">
            <header className="border-b pb-4 text-center">
              <span className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-slate-950 text-white text-lg font-black uppercase">
                {selectedMember.name.slice(0, 2)}
              </span>
              <h3 className="mt-3 font-black text-slate-900 text-base">{selectedMember.name}</h3>
              <p className="text-xs text-slate-500 capitalize">{selectedMember.role} · Nexus Profile</p>
              
              <div className="mt-4 flex justify-center flex-wrap gap-1">
                {selectedMember.skills.map((skill) => (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            </header>

            <div className="flex-1 py-4 space-y-4 overflow-y-auto">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <span className="text-[10px] font-bold uppercase text-slate-500">Tín hiệu EQ hiện tại</span>
                <p className="text-xs text-slate-700 leading-relaxed mt-1 font-semibold">{selectedMember.eqSignal}</p>
              </div>

              {isLoading && (
                <div className="text-center py-8 space-y-3">
                  <div className="size-8 mx-auto animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                  <p className="text-xs text-slate-500 font-bold">Nexus AI đang phân tích dữ liệu EQ...</p>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 text-xs flex gap-2">
                  <AlertTriangle className="shrink-0" size={15} />
                  <p>{error}</p>
                </div>
              )}

              {coaching ? (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Stress Analysis */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-violet-600 flex items-center gap-1">
                      <ShieldAlert size={12} /> Phân tích stress & áp lực
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">{coaching.stressAnalysis}</p>
                  </div>

                  {/* 3 Tips */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-violet-600 flex items-center gap-1">
                      <Sparkles size={12} /> Gợi ý giao tiếp cho PM
                    </span>
                    <ul className="space-y-2">
                      {coaching.tips.map((tip, idx) => (
                        <li className="flex gap-2 text-xs text-slate-700 leading-relaxed" key={idx}>
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 font-black text-[9px] mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Plan */}
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4 border-l-4 border-l-violet-600">
                    <span className="text-[10px] font-black uppercase text-violet-700 flex items-center gap-1">
                      <UserCheck size={12} /> Hành động cụ thể tiếp theo
                    </span>
                    <p className="text-xs text-slate-800 font-bold mt-1.5 leading-relaxed">{coaching.actionPlan}</p>
                  </div>

                </div>
              ) : (
                !isLoading && (
                  <div className="text-center py-6">
                    <BrainCircuit className="mx-auto text-slate-300" size={32} />
                    <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                      Nexus AI sẽ phân tích các câu trả lời onboarding, kỹ năng và task Doing để đưa ra gợi ý giao tiếp cụ thể.
                    </p>
                  </div>
                )
              )}
            </div>

            {!coaching && !isLoading && (
              <button
                className="w-full rounded-2xl bg-slate-950 py-3 text-xs font-bold text-white transition hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
                onClick={() => handleGetCoaching(selectedMember.id)}
              >
                <Sparkles size={14} /> Phân tích EQ & Gợi ý Coaching
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <HelpCircle className="text-slate-300" size={36} />
            <h4 className="mt-3 font-bold text-slate-900 text-sm">Chưa chọn thành viên</h4>
            <p className="text-xs text-slate-500 max-w-xs mt-1.5">
              Hãy chọn một thành viên từ danh sách bên trái để mở rộng phân tích sức khỏe và tư vấn giao tiếp.
            </p>
          </div>
        )}
      </div>

    </section>
  );
}
