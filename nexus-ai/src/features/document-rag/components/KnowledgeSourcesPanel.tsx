"use client";

import { ChevronDown, FileText, FolderKanban, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DocumentUpload } from "./DocumentUpload";
import type { DocumentSource, KnowledgeProject, UploadResult } from "../types";

type KnowledgeSourcesPanelProps = {
  projectId: string;
  projectName: string;
  projects: KnowledgeProject[];
  initialSources: DocumentSource[];
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
}: KnowledgeSourcesPanelProps) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [query, setQuery] = useState("");

  const filteredSources = useMemo(
    () =>
      sources.filter((source) =>
        source.filename.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      ),
    [query, sources],
  );

  function handleUploaded(result: UploadResult) {
    setSources((current) => [
      {
        sourceId: result.sourceId,
        filename: result.filename,
        chunks: result.chunks,
        mimeType: "application/octet-stream",
        createdAt: new Date().toISOString(),
      },
      ...current.filter((source) => source.sourceId !== result.sourceId),
    ]);
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Sparkles aria-hidden="true" size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-950">Nexus AI</p>
            <p className="text-xs text-slate-500">Knowledge Hub</p>
          </div>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <FolderKanban size={13} /> Knowledge hub
          </span>
          <span className="relative block">
            <select
              aria-label="Chuyển project Knowledge"
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => router.push(`/project/${event.target.value}/documents`)}
              value={projectId}
            >
              {!projects.some((project) => project.id === projectId) ? (
                <option value={projectId}>{projectName}</option>
              ) : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </span>
        </label>
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Project sources</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Tài liệu của project này</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Knowledge chỉ tìm kiếm trong các nguồn đã thêm vào project.</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Sources</h2>
              <p className="mt-1 text-xs text-slate-500">{sources.length} tài liệu đã thêm</p>
            </div>
            <FileText className="text-slate-400" size={18} />
          </div>
          {sources.length > 0 ? (
            <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500">
              <Search size={15} />
              <span className="sr-only">Tìm trong sources</span>
              <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tài liệu…" value={query} />
            </label>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filteredSources.length ? (
            <div className="space-y-2">
              {filteredSources.map((source) => (
                <div className="rounded-xl border border-slate-200 p-3 transition-colors hover:border-cyan-200 hover:bg-cyan-50/40" key={source.sourceId}>
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[10px] font-black text-red-600">{fileType(source)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900" title={source.filename}>{source.filename}</p>
                      <p className="mt-1 text-xs text-slate-500">{source.chunks} đoạn đã index</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
              <FileText className="mx-auto text-slate-300" size={25} />
              <p className="mt-3 text-sm font-semibold text-slate-800">Chưa có source</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Thêm tài liệu để hỏi AI dựa trên ngữ cảnh project.</p>
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <DocumentUpload onUploaded={handleUploaded} projectId={projectId} />
        </div>
      </div>
    </aside>
  );
}
