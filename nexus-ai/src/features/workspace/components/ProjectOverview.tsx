"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileText,
  KanbanSquare,
  MailPlus,
  UsersRound,
  Sparkles,
  X,
} from "lucide-react";

import { InviteApprovalActions } from "./InviteApprovalActions";
import { InviteMemberForm } from "./InviteMemberForm";
import { ProjectAnalysisForm } from "./ProjectAnalysisForm";
import { ProjectAiPlanner } from "./ProjectAiPlanner";
import { EqRadar } from "@/features/eq-radar/components/EqRadar";

import type {
  WorkspaceInvite,
  WorkspaceProject,
  WorkspaceRecommendation,
  WorkspaceRiskEvent,
} from "../types";

type ProjectOverviewProps = {
  project: WorkspaceProject;
  invites: WorkspaceInvite[];
  recommendations: WorkspaceRecommendation[];
  risks: WorkspaceRiskEvent[];
  currentRole: "pm" | "member";
  dataSource: "supabase" | "mock";
};

export function ProjectOverview({
  project,
  invites,
  recommendations,
  risks,
  currentRole,
  dataSource,
}: ProjectOverviewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "planner" | "eq-radar">("overview");
  const [selectedMember, setSelectedMember] = useState<WorkspaceProject["members"][number] | null>(null);
  const pendingInvites = invites.filter(
    (invite) => invite.status === "pending" || invite.status === "awaiting_approval",
  );

  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Project workspace
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                {dataSource}
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              {project.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {project.description}
            </p>
            <p className="mt-3 max-w-3xl text-xs text-slate-500">
              Project UUID: <code className="break-all rounded bg-slate-100 px-1.5 py-1 font-mono text-[11px] text-slate-700">{project.id}</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href={`/project/${project.id}/documents`}
            >
              <FileText aria-hidden="true" size={16} /> Documents
            </Link>
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href={`/project/${project.id}/board`}
            >
              <KanbanSquare aria-hidden="true" size={16} /> Board
            </Link>
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              href={`/project/${project.id}/chat`}
            >
              <BrainCircuit aria-hidden="true" size={16} /> Chat
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="Tiến độ" value={`${project.progress}%`} />
          <MetricCard label="Tài liệu đã index" value={project.documentsIndexed} />
          <MetricCard label="Task đang mở" value={project.activeTasks} />
        </div>
      </div>

      {/* Tab Triggers */}
      <div className="flex border-b border-slate-200 bg-white rounded-lg p-1 shadow-sm gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex-1 sm:flex-initial text-center px-6 py-2.5 text-sm font-black rounded-xl transition ${
            activeTab === "overview"
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
          }`}
        >
          Tổng quan & Sức khỏe
        </button>
        <button
          onClick={() => setActiveTab("planner")}
          className={`flex-1 sm:flex-initial text-center px-6 py-2.5 text-sm font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "planner"
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
          }`}
        >
          <Sparkles size={14} className={activeTab === "planner" ? "text-cyan-300 animate-pulse" : ""} />
          Nexus AI Task Planner
        </button>
        <button
          onClick={() => setActiveTab("eq-radar")}
          className={`flex-1 sm:flex-initial text-center px-6 py-2.5 text-sm font-black rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "eq-radar"
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
          }`}
        >
          <BrainCircuit size={14} className={activeTab === "eq-radar" ? "text-violet-300 animate-pulse" : ""} />
          EQ Radar & Team Health
        </button>
      </div>
      {activeTab === "overview" && (
        <>
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">Project setup pipeline</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Từ project mới đến AI chia việc</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Sau khi tạo project, PM nên import tài liệu, invite thành viên, rồi chạy AI analysis để Nexus đề xuất phương án chia task dựa trên knowledge base và hồ sơ thành viên.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <SetupStep
                actionHref={`/project/${project.id}/documents`}
                actionLabel="Import tài liệu"
                done={project.documentsIndexed > 0}
                index={1}
                title="Knowledge"
                value={`${project.documentsIndexed} chunks`}
              />
              <SetupStep
                actionHref="#invite-team"
                actionLabel="Invite team"
                done={project.members.length > 1 || invites.length > 0}
                index={2}
                title="Members"
                value={`${project.members.length} members · ${invites.length} invites`}
              />
              <div>
                <ProjectAnalysisForm
                  disabled={project.documentsIndexed === 0 || project.members.length === 0 || currentRole !== "pm"}
                  projectId={project.id}
                />
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <UsersRound aria-hidden="true" className="text-slate-500" size={18} />
                <h2 className="font-black text-slate-955 text-base">Thành viên & insight</h2>
              </div>
              {project.members.length ? (
                <div className="space-y-3">
                  {project.members.map((member) => {
                    const workloadColor =
                      member.workload > 70
                        ? "bg-rose-500"
                        : member.workload > 45
                          ? "bg-amber-500"
                          : "bg-emerald-500";
                    const workloadBg =
                      member.workload > 70
                        ? "bg-rose-50 text-rose-700"
                        : member.workload > 45
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700";

                    return (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md hover:shadow-cyan-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white font-black text-xs uppercase">
                            {member.name.slice(0, 2)}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-955 text-sm flex items-center gap-2">
                              {member.name}
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-bold uppercase">
                                {member.role}
                              </span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {member.eqSignal}
                            </p>
                          </div>
                        </div>

                        <div className="w-full sm:w-48 shrink-0 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-705">
                            <span>Workload:</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${workloadBg}`}>
                              {member.workload}% load
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${workloadColor}`} style={{ width: `${member.workload}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState text="Chưa có member trong project_members." />
              )}
            </section>

            <section id="invite-team" className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MailPlus aria-hidden="true" className="text-slate-500" size={18} />
                <h2 className="font-semibold text-slate-950">Invite queue</h2>
              </div>
              {currentRole === "pm" ? <InviteMemberForm projectId={project.id} /> : null}

              {pendingInvites.length ? (
                <div className="mt-4 space-y-3">
                  {pendingInvites.map((invite) => (
                    <div
                      className="rounded-lg border border-slate-200 p-3 text-sm"
                      key={invite.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 break-all font-medium text-slate-800">{invite.email}</span>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${invite.status === "awaiting_approval" ? "bg-amber-50 text-amber-700" : invite.status === "accepted" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {invite.status === "pending" || invite.status === "awaiting_approval" ? "Chờ duyệt" : invite.status}
                        </span>
                      </div>
                      <p className="mt-1 break-all text-xs text-slate-500">Role: {invite.role} · /join/{invite.token}</p>
                      {currentRole === "pm" && (invite.status === "pending" || invite.status === "awaiting_approval") ? <InviteApprovalActions inviteId={invite.id} projectId={project.id} /> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="Không có invite nào đang chờ duyệt." />
              )}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BrainCircuit aria-hidden="true" className="text-slate-500" size={18} />
                <h2 className="font-semibold text-slate-950">AI đề xuất chia việc</h2>
              </div>
              {recommendations.length ? (
                <div className="space-y-3">
                  {recommendations.map((item) => (
                    <article className="rounded-lg border border-slate-200 p-4" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{item.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">Cho: {item.member}</p>
                        </div>
                        {item.confidence > 0 ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            {item.confidence}%
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {item.rationale}
                      </p>
                      {item.suggestedTasks.length ? (
                        <ul className="mt-3 space-y-2">
                          {item.suggestedTasks.map((task, index) => (
                            <li
                              className="flex gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700"
                              key={`${item.id}-${index}`}
                            >
                              <CheckCircle2
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-emerald-600"
                                size={15}
                              />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState text="Chưa có đề xuất. Bấm “Chạy AI analysis” để tạo task từ tài liệu và hồ sơ thành viên." />
              )}
            </section>

            <section className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle aria-hidden="true" className="text-red-500" size={18} />
                <h2 className="font-semibold text-slate-950">Risk events</h2>
              </div>
              {risks.length ? (
                <div className="space-y-3">
                  {risks.map((risk) => (
                    <article className="rounded-lg border border-red-100 bg-red-50 p-4" key={risk.id}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-red-950">{risk.type}</span>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-red-700">
                          {risk.severity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-red-800">{risk.summary}</p>
                      <p className="mt-2 text-xs text-red-600">Owner: {risk.owner}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState text="Chưa phát hiện overdue hoặc overload. Risk mới sẽ hiện tại đây sau AI analysis." />
              )}
            </section>
          </div>
        </>
      )}

      {activeTab === "planner" && (
        <ProjectAiPlanner
          projectId={project.id}
          initialDeadline={project.deadlineAt ?? null}
          members={project.members}
          documentsIndexed={project.documentsIndexed}
          currentRole={currentRole}
        />
      )}

      {activeTab === "eq-radar" && (
        <EqRadar projectId={project.id} members={project.members} />
      )}

      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <header className="text-center border-b border-slate-100 pb-5">
              <span className="flex size-16 mx-auto items-center justify-center rounded-2xl bg-slate-950 text-white text-xl font-black uppercase shadow-lg shadow-slate-100">
                {selectedMember.name.slice(0, 2)}
              </span>
              <h3 className="mt-3 text-xl font-black text-slate-950">{selectedMember.name}</h3>
              <span className="mt-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider inline-block">
                {selectedMember.role}
              </span>
            </header>

            <div className="mt-5 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase text-slate-505">Skills & Chuyên môn</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMember.skills.length ? (
                    selectedMember.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200/40"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-405 italic">Chưa khai báo skills</span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase text-slate-505">Tín hiệu EQ & Phong cách</h4>
                <p className="rounded-2xl border border-cyan-100 bg-cyan-50/20 p-4 text-sm text-slate-800 leading-relaxed font-medium">
                  {selectedMember.eqSignal}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase text-slate-505">
                  Phân tải & Task hiện tại ({Math.round(selectedMember.workload / 20)} tasks)
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          selectedMember.workload > 70
                            ? "bg-rose-500"
                            : selectedMember.workload > 45
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${selectedMember.workload}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-705">{selectedMember.workload}% workload</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    *Mức tải được tự động tối ưu hóa dựa trên mức độ ưu tiên và thời hạn hoàn thành các task được giao.
                  </p>
                </div>
              </div>
            </div>

            <footer className="mt-6 pt-4 border-t border-slate-105 flex justify-end">
              <button
                onClick={() => setSelectedMember(null)}
                className="rounded-xl bg-slate-955 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Đóng
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}

function SetupStep({
  actionHref,
  actionLabel,
  done,
  index,
  title,
  value,
}: {
  actionHref: string;
  actionLabel: string;
  done: boolean;
  index: number;
  title: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-9 items-center justify-center rounded-xl text-sm font-black ${done ? "bg-emerald-600 text-white" : "bg-white text-slate-500"}`}>
          {done ? "✓" : index}
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500">{value}</span>
      </div>
      <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
      <Link className="mt-3 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-900" href={actionHref}>
        {actionLabel} →
      </Link>
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <CheckCircle2 aria-hidden="true" size={16} /> {label}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
      {text}
    </div>
  );
}
