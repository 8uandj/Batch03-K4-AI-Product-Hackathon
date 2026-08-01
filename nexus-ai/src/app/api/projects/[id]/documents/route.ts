import { randomUUID } from "node:crypto";

import { ragConfig } from "@/features/document-rag/config";
import { chunkDocument } from "@/features/document-rag/chunking";
import { extractTextFromFile, extractTextFromPublicUrl, isSupportedDocumentFile } from "@/features/document-rag/extract-text";
import { indexChunks } from "@/features/document-rag/repository";
import { generateAndStoreProjectBrief } from "@/features/document-rag/project-brief";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  let projectId = "unknown";
  let filename = "unknown";

  try {
    ({ id: projectId } = await params);
    const access = await requireProjectAccess(projectId);
    let projectName = "Nexus AI demo";
    if (access.supabase) {
      const { data: project, error: projectError } = await access.supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .maybeSingle();
      if (projectError || !project) {
        return Response.json({ error: "Không tìm thấy dự án." }, { status: 404 });
      }
      projectName = project.name;
    }

    const data = await request.formData();
    const file = data.get("file");
    const sourceUrl = typeof data.get("sourceUrl") === "string" ? String(data.get("sourceUrl")).trim() : "";

    if (sourceUrl) {
      const sourceId = randomUUID();
      const source = await extractTextFromPublicUrl(sourceUrl);
      const chunks = await chunkDocument({
        projectId,
        sourceId,
        filename: source.title,
        mimeType: "text/html",
        text: source.text,
      });
      await indexChunks(chunks);
      const brief = access.supabase && access.role === "pm"
        ? await generateAndStoreProjectBrief({ db: access.supabase, projectId, projectName, sourceId, sourceName: source.title, text: source.text })
        : null;
      return Response.json({ sourceId, filename: source.title, chunks: chunks.length, mode: ragConfig.mode, briefMode: brief?.mode ?? "mock", sourceUrl });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: "Vui lòng chọn một tài liệu." }, { status: 400 });
    }
    filename = file.name;
    if (file.size === 0) {
      return Response.json({ error: "Tài liệu đang rỗng." }, { status: 400 });
    }
    if (file.size > ragConfig.maxFileBytes) {
      return Response.json(
        { error: "Tài liệu vượt quá giới hạn 10 MB." },
        { status: 413 },
      );
    }
    if (!isSupportedDocumentFile(file)) {
      return Response.json({ error: "Chỉ hỗ trợ PDF, DOCX, TXT, Markdown, CSV và JSON." }, { status: 415 });
    }

    const sourceId = randomUUID();
    const text = await extractTextFromFile(file);
    const chunks = await chunkDocument({
      projectId,
      sourceId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      text,
    });
    await indexChunks(chunks);
    const brief = access.supabase && access.role === "pm"
      ? await generateAndStoreProjectBrief({ db: access.supabase, projectId, projectName, sourceId, sourceName: file.name, text })
      : null;

    return Response.json({
      sourceId,
      filename: file.name,
      chunks: chunks.length,
      mode: ragConfig.mode,
      briefMode: brief?.mode ?? "mock",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể xử lý tài liệu.";
    console.error("[document-rag] Document ingestion failed", {
      projectId,
      filename,
      errorName: error instanceof Error ? error.name : "UnknownError",
      message,
    });
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
