"use client";

import {
  Check,
  ChevronDown,
  Download,
  FileText,
  FolderKanban,
  PanelLeft,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { ProjectBrief } from "../project-brief";
import type { DocumentSource, KnowledgeProject, UploadResult } from "../types";
import { DocumentUpload } from "./DocumentUpload";

type KnowledgeSourcesPanelProps = {
  projectId: string;
  projectName: string;
  projects: KnowledgeProject[];
  initialSources: DocumentSource[];
  projectBrief: ProjectBrief | null;
};

function fileType(source: DocumentSource) {
  const extension = source.filename.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "FILE";
}

export function KnowledgeSourcesPanel({
  initialSources,
  projectId,
  projectName,
  projects,
  projectBrief,
}: KnowledgeSourcesPanelProps) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialSources.map((source) => source.sourceId)));

  const filteredSources = useMemo(
    () => sources.filter((source) => source.filename.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
    [query, sources],
  );

  function handleUploaded(result: UploadResult) {
    const source = {
      sourceId: result.sourceId,
      filename: result.filename,
      chunks: result.chunks,
      mimeType: "application/octet-stream",
      createdAt: new Date().toISOString(),
    } satisfies DocumentSource;
    setSources((current) => [source, ...current.filter((item) => item.sourceId !== source.sourceId)]);
    setSelectedIds((current) => new Set(current).add(source.sourceId));
  }

  function toggleSource(sourceId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  const allVisibleSelected = filteredSources.length > 0 && filteredSources.every((source) => selectedIds.has(source.sourceId));

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[#343942] bg-[#202329] shadow-xl shadow-black/10">
      <div className="flex items-center justify-between border-b border-[#343942] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <PanelLeft aria-hidden="true" className="text-slate-300" size={19} />
          <h2 className="text-lg font-semibold text-white">Nguồn</h2>
        </div>
        <span className="rounded-full bg-[#2b3038] px-2.5 py-1 text-[11px] font-bold text-slate-300">{selectedIds.size}/{sources.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-[#343942] p-4">
          <DocumentUpload compact onUploaded={handleUploaded} projectId={projectId} />
        </div>

        <div className="border-b border-[#343942] p-4">
          <label className="flex items-center gap-2 rounded-xl border border-[#3b414a] bg-[#191b20] px-3 py-2.5 text-sm text-slate-400 transition focus-within:border-[#7a83ff]">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Tìm nguồn</span>
            <input className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nguồn…" value={query} />
          </label>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <button className="inline-flex items-center gap-2 transition hover:text-white" onClick={() => setSelectedIds((current) => {
              const next = new Set(current);
              filteredSources.forEach((source) => allVisibleSelected ? next.delete(source.sourceId) : next.add(source.sourceId));
              return next;
            })} type="button">
              <span className={`flex size-4 items-center justify-center rounded border ${allVisibleSelected ? "border-[#7d86ff] bg-[#6872f7] text-white" : "border-[#59606c]"}`}>
                {allVisibleSelected ? <Check size={11} /> : null}
              </span>
              Chọn tất cả
            </button>
            <span>{filteredSources.length} nguồn hiển thị</span>
          </div>
        </div>

        <div className="max-h-[min(52vh,520px)] overflow-y-auto p-2.5">
          {filteredSources.length ? filteredSources.map((source) => {
            const selected = selectedIds.has(source.sourceId);
            return (
              <div className={`group flex items-center gap-2 rounded-xl px-2.5 py-2.5 transition duration-200 hover:bg-[#2a2f37] ${selected ? "bg-[#272c34]" : "opacity-70"}`} key={source.sourceId}>
                <button aria-label={`${selected ? "Bỏ chọn" : "Chọn"} ${source.filename}`} className={`flex size-5 shrink-0 items-center justify-center rounded border transition ${selected ? "border-[#7d86ff] bg-[#6872f7] text-white" : "border-[#59606c] text-transparent"}`} onClick={() => toggleSource(source.sourceId)} type="button">
                  <Check size={12} />
                </button>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#343944] text-[9px] font-black text-slate-300">{fileType(source)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100" title={source.filename}>{source.filename}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{source.chunks} đoạn đã index</p>
                </div>
                <a aria-label={`Tải ${source.filename}`} className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-[#3a404a] hover:text-white group-hover:opacity-100" download href={`/api/projects/${projectId}/documents/${source.sourceId}/download`} title="Tải nội dung đã lập chỉ mục">
                  <Download size={14} />
                </a>
              </div>
            );
          }) : (
            <div className="rounded-xl border border-dashed border-[#4a515c] p-6 text-center">
              <FileText className="mx-auto text-slate-500" size={24} />
              <p className="mt-3 text-sm font-semibold text-slate-200">Chưa có nguồn</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Thêm tài liệu để bắt đầu trò chuyện theo ngữ cảnh project.</p>
            </div>
          )}
        </div>

        <div className="border-t border-[#343942] p-3">
          <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500" htmlFor="knowledge-project-picker">
            <FolderKanban size={13} /> Project notebook
          </label>
          <span className="relative block">
            <select aria-label="Chuyển project Knowledge" className="w-full appearance-none rounded-xl border border-[#3b414a] bg-[#191b20] px-3 py-2.5 pr-9 text-sm font-semibold text-slate-200 outline-none transition focus:border-[#7a83ff]" id="knowledge-project-picker" onChange={(event) => router.push(`/project/${event.target.value}/documents`)} value={projectId}>
              {!projects.some((project) => project.id === projectId) ? <option value={projectId}>{projectName}</option> : null}
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          </span>
          {projectBrief ? <details className="mt-3 rounded-xl border border-[#343942] bg-[#191b20] p-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">Project Brief <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">đã chuẩn hóa</span></summary>
            <div className="mt-3 max-h-48 space-y-3 overflow-y-auto text-xs leading-5 text-slate-400">
              <div><p className="font-bold text-slate-200">Mục tiêu</p><p>{projectBrief.objective}</p></div>
              <div><p className="font-bold text-slate-200">Phạm vi</p><p>{projectBrief.scope}</p></div>
              <BriefList label="Deliverables" values={projectBrief.deliverables} />
              <div><p className="font-bold text-slate-200">Deadline</p><p>{projectBrief.deadline}</p></div>
              <BriefList label="Acceptance criteria" values={projectBrief.acceptance_criteria} />
              <BriefList label="Constraints" values={projectBrief.constraints} />
              <BriefList label="Unknowns" values={projectBrief.unknowns} />
              <BriefList label="Risks" values={projectBrief.risks} />
            </div>
          </details> : null}
        </div>
      </div>
    </aside>
  );
}

function BriefList({ label, values }: { label: string; values: string[] }) {
  if (!values.length) return null;
  return <div><p className="font-bold text-slate-200">{label}</p><ul className="mt-1 list-disc space-y-0.5 pl-4">{values.map((value) => <li key={`${label}-${value}`}>{value}</li>)}</ul></div>;
}
