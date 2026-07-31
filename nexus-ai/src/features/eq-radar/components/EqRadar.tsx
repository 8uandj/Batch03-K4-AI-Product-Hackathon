"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  EyeOff,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";

import type {
  CoachingPlan,
  PersonalityAnalysis,
  WorkloadAnalysis,
} from "@/features/eq-radar/analysis";
import { workloadRiskLevel } from "@/features/eq-radar/analysis";
import type { WorkspaceMemberProfile } from "@/features/workspace/types";

type CoachingResult = {
  personalityAnalysis: PersonalityAnalysis;
  workloadAnalysis: WorkloadAnalysis;
  coaching: CoachingPlan;
  mode: "openai" | "fallback";
  generatedAt: string;
};

type EqRadarProps = {
  projectId: string;
  members: WorkspaceMemberProfile[];
};

const CONFIDENCE_LABELS = {
  low: "Dữ liệu còn ít",
  medium: "Độ tin cậy vừa",
  high: "Đủ 5/5 câu trả lời",
} as const;

function riskLabel(level: WorkloadAnalysis["level"]) {
  if (level === "high") return "Rủi ro cao";
  if (level === "moderate") return "Cần theo dõi";
  return "Rủi ro thấp";
}

function riskClasses(level: WorkloadAnalysis["level"]) {
  if (level === "high") return "border-rose-200 bg-rose-50 text-rose-700";
  if (level === "moderate") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function EqRadar({ projectId, members }: EqRadarProps) {
  const [selectedMember, setSelectedMember] =
    useState<WorkspaceMemberProfile | null>(members[0] ?? null);
  const [result, setResult] = useState<CoachingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const averageRiskScore = members.length
    ? Math.round(
        members.reduce((total, member) => total + member.workload, 0) /
          members.length,
      )
    : 0;
  const teamRiskLevel = workloadRiskLevel(averageRiskScore);

  async function handleGetCoaching(memberId: string) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/eq-radar/coaching`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId }),
        },
      );
      const data = (await response.json()) as CoachingResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Không thể tải gợi ý coaching.");
      }
      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Lỗi kết nối API Coaching.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
      <div className="space-y-6">
        <article
          className={`flex flex-col items-center gap-6 rounded-3xl border p-6 shadow-sm sm:flex-row ${riskClasses(teamRiskLevel)}`}
        >
          <div className="relative flex size-24 shrink-0 items-center justify-center rounded-full bg-white shadow-inner">
            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-slate-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className={
                  teamRiskLevel === "high"
                    ? "text-rose-500"
                    : teamRiskLevel === "moderate"
                      ? "text-amber-500"
                      : "text-emerald-500"
                }
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${averageRiskScore}, 100`}
                strokeWidth="3.2"
              />
            </svg>
            <div className="text-center">
              <span className="text-2xl font-black text-slate-900">
                {averageRiskScore}
              </span>
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                Load risk
              </p>
            </div>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase shadow-sm">
              Team Health: {riskLabel(teamRiskLevel)}
            </span>
            <h3 className="text-xl font-black text-slate-950">
              EQ Radar & Sức khỏe vận hành
            </h3>
            <p className="max-w-xl text-xs leading-relaxed text-slate-700">
              Điểm tổng hợp từ số task mở, trạng thái Doing, deadline, độ trễ cập
              nhật và mức ưu tiên. Đây là tín hiệu để PM mở cuộc trao đổi, không
              phải chỉ số stress hay chẩn đoán tâm lý.
            </p>
          </div>
        </article>

        <article className="rounded-3xl border bg-white p-6 shadow-sm">
          <header className="mb-4">
            <h3 className="flex items-center gap-2 text-base font-black text-slate-900">
              <Activity className="text-slate-600" size={18} />
              Thành viên & rủi ro tải việc
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Chọn thành viên để tách riêng phân tích phong cách làm việc và kế
              hoạch coaching.
            </p>
          </header>

          <div className="space-y-4">
            {members.map((member) => {
              const isSelected = selectedMember?.id === member.id;
              const memberRisk = workloadRiskLevel(member.workload);
              const barColor =
                memberRisk === "high"
                  ? "bg-rose-500"
                  : memberRisk === "moderate"
                    ? "bg-amber-500"
                    : "bg-emerald-500";

              return (
                <button
                  className={`flex w-full flex-col justify-between gap-4 rounded-2xl border p-4 text-left transition sm:flex-row sm:items-center ${
                    isSelected
                      ? "border-violet-500 bg-violet-50/20 ring-2 ring-violet-100"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                  key={member.id}
                  onClick={() => {
                    setSelectedMember(member);
                    setResult(null);
                    setError(null);
                  }}
                  type="button"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black uppercase text-white">
                      {member.name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        {member.name}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                          {member.role}
                        </span>
                      </h4>
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">
                        {member.eqSignal}
                      </p>
                    </div>
                  </div>

                  <div className="w-full shrink-0 space-y-1 sm:w-48">
                    <div className="flex justify-between text-[10px] font-bold text-slate-700">
                      <span>{riskLabel(memberRisk)}:</span>
                      <span>{member.workload}/100</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${member.workload}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}

            {members.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                Project chưa có thành viên để phân tích.
              </div>
            )}
          </div>
        </article>
      </div>

      <aside className="flex flex-col rounded-3xl border bg-white p-6 shadow-sm">
        {selectedMember ? (
          <div className="flex flex-1 flex-col">
            <header className="border-b pb-4 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black uppercase text-white">
                {selectedMember.name.slice(0, 2)}
              </span>
              <h3 className="mt-3 text-base font-black text-slate-900">
                {selectedMember.name}
              </h3>
              <p className="text-xs capitalize text-slate-500">
                {selectedMember.role} · Nexus Profile
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1">
                {selectedMember.skills.map((skill) => (
                  <span
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                    key={skill}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </header>

            <div className="flex-1 space-y-4 py-4">
              {!result && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Tín hiệu onboarding
                  </span>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">
                    {selectedMember.eqSignal}
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="space-y-3 py-10 text-center">
                  <div className="mx-auto size-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                  <p className="text-xs font-bold text-slate-500">
                    Đang đối chiếu onboarding với dữ liệu task...
                  </p>
                </div>
              )}

              {error && (
                <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                  <AlertTriangle className="shrink-0" size={15} />
                  <p>{error}</p>
                </div>
              )}

              {result && (
                <div className="space-y-5 animate-in fade-in">
                  <section className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase text-violet-600">
                          <BrainCircuit size={12} /> 1. Phong cách làm việc
                        </span>
                        <h4 className="mt-1 text-sm font-black text-slate-950">
                          {result.personalityAnalysis.headline}
                        </h4>
                      </div>
                      <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">
                        {CONFIDENCE_LABELS[result.personalityAnalysis.confidence]}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-700">
                      {result.personalityAnalysis.summary}
                    </p>

                    <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                      <InsightCard
                        label="Cách nhận task"
                        value={result.personalityAnalysis.workStyle}
                      />
                      <InsightCard
                        label="Kênh giao tiếp"
                        value={result.personalityAnalysis.communicationStyle}
                      />
                      <InsightCard
                        label="Cách ra quyết định"
                        value={result.personalityAnalysis.decisionStyle}
                      />
                      <InsightCard
                        label="Cách nhận feedback"
                        value={result.personalityAnalysis.feedbackStyle}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700">
                          <CheckCircle2 size={11} /> Điểm có thể phát huy
                        </span>
                        <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-emerald-950">
                          {result.personalityAnalysis.strengths.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-700">
                          <AlertTriangle size={11} /> Điểm cần kiểm chứng
                        </span>
                        <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-amber-950">
                          {result.personalityAnalysis.watchouts.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer text-[10px] font-bold text-slate-600">
                        Xem căn cứ từ {result.personalityAnalysis.answeredQuestions}
                        /5 câu onboarding
                      </summary>
                      <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-slate-600">
                        {result.personalityAnalysis.evidence.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </details>
                  </section>

                  <section className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-violet-600">
                        <Activity size={12} /> 2. Tín hiệu tải việc
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${riskClasses(result.workloadAnalysis.level)}`}
                      >
                        {result.workloadAnalysis.score}/100 ·{" "}
                        {riskLabel(result.workloadAnalysis.level)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">
                      {result.workloadAnalysis.summary}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.workloadAnalysis.signals.map((signal) => (
                        <span
                          className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600"
                          key={signal}
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                    <p className="text-[9px] italic leading-relaxed text-slate-500">
                      {result.workloadAnalysis.disclaimer}
                    </p>
                  </section>

                  <section className="space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase text-violet-600">
                        <UserCheck size={12} /> 3. Coaching cho PM
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                        {result.mode === "openai" ? "AI coaching" : "Coaching dự phòng"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-violet-700">
                        <Target size={11} /> Mục tiêu
                      </span>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-violet-950">
                        {result.coaching.goal}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {result.coaching.tips.map((tip, index) => (
                        <article
                          className="rounded-xl border border-slate-200 p-3"
                          key={`${tip.title}-${index}`}
                        >
                          <h5 className="text-[11px] font-black text-slate-900">
                            {index + 1}. {tip.title}
                          </h5>
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                            Vì sao: {tip.rationale}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-700">
                            {tip.suggestion}
                          </p>
                        </article>
                      ))}
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-blue-700">
                        <MessageSquare size={11} /> Câu mở đầu gợi ý
                      </span>
                      <p className="mt-1 text-xs italic leading-relaxed text-blue-950">
                        “{result.coaching.conversationStarter}”
                      </p>
                    </div>

                    <div className="rounded-xl border-l-4 border-violet-600 bg-slate-50 p-3">
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-600">
                        <ClipboardList size={11} /> Hành động tiếp theo
                      </span>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-slate-800">
                        {result.coaching.actionPlan}
                      </p>
                    </div>

                    <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-700">
                        <EyeOff size={11} /> Nên tránh
                      </span>
                      <ul className="mt-1.5 space-y-1 text-[10px] leading-relaxed text-rose-900">
                        {result.coaching.avoid.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </div>
              )}

              {!result && !isLoading && !error && (
                <div className="py-6 text-center">
                  <ShieldCheck className="mx-auto text-slate-300" size={32} />
                  <p className="mx-auto mt-2 max-w-xs text-xs text-slate-500">
                    Kết quả sẽ nêu rõ dữ liệu nào đến từ onboarding, dữ liệu nào
                    đến từ task và đâu là đề xuất cần PM kiểm chứng.
                  </p>
                </div>
              )}
            </div>

            {!result && !isLoading && (
              <button
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-slate-950 py-3 text-xs font-bold text-white transition hover:bg-slate-800"
                onClick={() => handleGetCoaching(selectedMember.id)}
                type="button"
              >
                <Sparkles size={14} /> Phân tích thành viên & tạo coaching
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <HelpCircle className="text-slate-300" size={36} />
            <h4 className="mt-3 text-sm font-bold text-slate-900">
              Chưa chọn thành viên
            </h4>
            <p className="mt-1.5 max-w-xs text-xs text-slate-500">
              Chọn một thành viên để xem phong cách làm việc, tín hiệu tải việc và
              kế hoạch coaching.
            </p>
          </div>
        )}
      </aside>
    </section>
  );
}

function InsightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
      <span className="text-[9px] font-black uppercase text-slate-500">
        {label}
      </span>
      <p className="mt-1 leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}
