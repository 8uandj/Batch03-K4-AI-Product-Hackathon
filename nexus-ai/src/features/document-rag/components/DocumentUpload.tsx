"use client";

import { FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import type { UploadResult } from "../types";

type DocumentUploadProps = {
  projectId: string;
};

export function DocumentUpload({ projectId }: DocumentUploadProps) {
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
      const payload = (await response.json()) as UploadResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Upload thất bại.");
      setResult(payload);
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
    <section>
      <p className="eyebrow">Knowledge base</p>
      <h2>Nạp tài liệu</h2>
      <p className="muted">
        PDF, TXT, Markdown, CSV hoặc JSON. Tối đa 10 MB mỗi file.
      </p>

      <div className="upload-card">
        <div
          className={`upload-zone ${dragging ? "is-dragging" : ""}`}
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
          <UploadCloud size={28} />
          <strong>Kéo tài liệu vào đây</strong>
          <span className="muted">hoặc</span>
          <button
            className="secondary-button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {uploading ? "Đang lập chỉ mục…" : "Chọn tài liệu"}
          </button>
          <input
            ref={inputRef}
            accept=".pdf,.txt,.md,.markdown,.csv,.json"
            onChange={(event) => void upload(event.target.files?.[0])}
            type="file"
          />
        </div>

        {result ? (
          <div className="upload-result">
            <FileText size={15} /> <strong>{result.filename}</strong>
            <div className="muted">
              Đã tạo {result.chunks} đoạn tìm kiếm · chế độ {result.mode}
            </div>
          </div>
        ) : null}
        {error ? <div className="upload-result is-error">{error}</div> : null}
      </div>
    </section>
  );
}
