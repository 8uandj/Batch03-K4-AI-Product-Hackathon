"use client";

import { FileText, Globe2, Plus, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import type { UploadResult } from "../types";

type DocumentUploadProps = {
  projectId: string;
  onUploaded?: (result: UploadResult) => void;
  compact?: boolean;
};

export function DocumentUpload({ projectId, onUploaded, compact = false }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult>();
  const [error, setError] = useState("");
  const [notionUrl, setNotionUrl] = useState("");

  async function upload(file?: File) {
    if (!file || uploading) return;
    setUploading(true);
    setResult(undefined);
    setError("");

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as UploadResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Upload thất bại.");
      setResult(payload);
      onUploaded?.(payload);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload thất bại.",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function uploadNotion() {
    if (!notionUrl.trim() || uploading) return;
    setUploading(true);
    setResult(undefined);
    setError("");
    try {
      const body = new FormData();
      body.append("sourceUrl", notionUrl.trim());
      const response = await fetch("/api/projects/" + projectId + "/documents", { method: "POST", body });
      const payload = (await response.json()) as UploadResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Không thể tải Notion page.");
      setResult(payload);
      setNotionUrl("");
      onUploaded?.(payload);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải Notion page.");
    } finally {
      setUploading(false);
    }
  }

  if (compact) {
    return (
      <section className="space-y-3">
        <button className="flex w-full items-center justify-center gap-2 rounded-full border border-[#4a505a] bg-[#252a31] px-4 py-3 text-sm font-semibold text-slate-100 transition duration-200 hover:-translate-y-0.5 hover:border-[#7a83ff] hover:bg-[#2d333d] disabled:cursor-wait disabled:opacity-60" disabled={uploading} onClick={() => inputRef.current?.click()} type="button">
          <Plus size={17} /> {uploading ? "Đang lập chỉ mục…" : "Thêm nguồn"}
        </button>
        <input className="hidden" ref={inputRef} accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json" onChange={(event) => void upload(event.target.files?.[0])} type="file" />
        <div className="rounded-2xl border border-[#343942] bg-[#191b20] p-3">
          <p className="text-sm font-medium text-slate-300">Tìm nguồn mới trên web</p>
          <div className="mt-3 flex gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#3b414a] text-slate-400"><Globe2 size={17} /></span>
            <input className="min-w-0 flex-1 rounded-xl border border-[#3b414a] bg-[#202329] px-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-[#7a83ff]" onChange={(event) => setNotionUrl(event.target.value)} placeholder="Dán public Notion URL…" value={notionUrl} />
            <button aria-label="Nạp nguồn web" className="rounded-xl bg-[#6872f7] px-3 text-xs font-bold text-white transition hover:bg-[#7b84ff] disabled:cursor-not-allowed disabled:opacity-40" disabled={!notionUrl.trim() || uploading} onClick={() => void uploadNotion()} type="button">Nạp</button>
          </div>
        </div>
        <div className={`rounded-xl border border-dashed p-3 text-center text-xs transition ${dragging ? "border-[#7a83ff] bg-[#2b3040] text-white" : "border-[#444b56] text-slate-500"}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }}>
          <UploadCloud className="mx-auto mb-1" size={17} /> Kéo file vào đây · PDF, DOCX, TXT…
        </div>
        {result ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2 text-xs text-emerald-300">Đã thêm {result.filename} · {result.chunks} đoạn</p> : null}
        {error ? <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-2 text-xs leading-5 text-rose-300">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Knowledge base
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          Nạp tài liệu
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          PDF, DOCX, TXT, Markdown, CSV, JSON hoặc public Notion URL. Tối đa 10 MB mỗi file.
        </p>
      </div>

      <div className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <input value={notionUrl} onChange={(event) => setNotionUrl(event.target.value)} placeholder="https://www.notion.so/..." className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <button type="button" onClick={() => void uploadNotion()} disabled={!notionUrl.trim() || uploading} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Nạp Notion</button>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div
          className={`flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-5 text-center transition-colors ${
            dragging
              ? "border-slate-950 bg-white text-slate-950"
              : "border-slate-300 bg-white text-slate-600"
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void upload(event.dataTransfer.files[0]);
          }}
        >
          <span className="flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <UploadCloud aria-hidden="true" size={28} />
          </span>
          <strong className="text-sm text-slate-900">Kéo tài liệu vào đây</strong>
          <span className="text-xs text-slate-500">hoặc</span>
          <button
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {uploading ? "Đang lập chỉ mục…" : "Chọn tài liệu"}
          </button>
          <input
            className="hidden"
            ref={inputRef}
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json"
            onChange={(event) => void upload(event.target.files?.[0])}
            type="file"
          />
        </div>

        {result ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-semibold">
              <FileText aria-hidden="true" size={15} /> {result.filename}
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              Đã tạo {result.chunks} đoạn tìm kiếm · chế độ {result.mode}
            </p>
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}
