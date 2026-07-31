"use client";

import { FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import type { UploadResult } from "../types";

type DocumentUploadProps = {
  projectId: string;
  onUploaded?: (result: UploadResult) => void;
};

export function DocumentUpload({ projectId, onUploaded }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult>();
  const [error, setError] = useState("");

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
          PDF, TXT, Markdown, CSV hoặc JSON. Tối đa 10 MB mỗi file.
        </p>
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
            accept=".pdf,.txt,.md,.markdown,.csv,.json"
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
