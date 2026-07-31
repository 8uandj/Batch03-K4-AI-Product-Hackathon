import { randomUUID } from "node:crypto";

import { ragConfig } from "@/features/document-rag/config";
import { chunkDocument } from "@/features/document-rag/chunking";
import { extractTextFromFile } from "@/features/document-rag/extract-text";
import { indexChunks } from "@/features/document-rag/repository";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  let projectId = "unknown";
  let filename = "unknown";

  try {
    ({ id: projectId } = await params);
    await requireProjectAccess(projectId);

    const data = await request.formData();
    const file = data.get("file");

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

    return Response.json({
      sourceId,
      filename: file.name,
      chunks: chunks.length,
      mode: ragConfig.mode,
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
