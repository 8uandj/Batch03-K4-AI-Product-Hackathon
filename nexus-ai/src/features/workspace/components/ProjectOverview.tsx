import Link from "next/link";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  FileText,
  KanbanSquare,
  MailPlus,
  UsersRound,
} from "lucide-react";

import { InviteMemberForm } from "./InviteMemberForm";
import { ProjectAnalysisForm } from "./ProjectAnalysisForm";

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
        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UsersRound aria-hidden="true" className="text-slate-500" size={18} />
            <h2 className="font-semibold text-slate-950">Thành viên & insight</h2>
          </div>
          {project.members.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {project.members.map((member) => (
                <article className="rounded-lg border border-slate-200 p-4" key={member.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{member.name}</h3>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {member.role}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {member.workload}% load
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {member.skills.length ? (
                      member.skills.map((skill) => (
                        <span
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                          key={skill}
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Chưa khai báo skills</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {member.eqSignal}
                  </p>
                </article>
              ))}
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

          {invites.length ? (
            <div className="mt-4 space-y-3">
              {invites.map((invite) => (
                <div
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                  key={invite.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{invite.email}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {invite.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Role: {invite.role}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Chưa có invite pending/accepted." />
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
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      {item.confidence}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {item.rationale}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState text="Chưa có AI recommendations. Sau khi RAG/Onboarding/Kanban hoàn thiện, worker AI sẽ ghi vào bảng này." />
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
            <EmptyState text="Chưa có risk event. Dashboard nâng cao sẽ ghi lịch sử cảnh báo vào bảng risk_events." />
          )}
        </section>
      </div>
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
