import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/features/workspace/access";
import { getSupabaseAdmin } from "@/features/document-rag/clients";

type Params = { params: Promise<{ id: string; sourceId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id, sourceId } = await params;
  await requireProjectAccess(id);
  const { data, error } = await getSupabaseAdmin()
    .from("documents")
    .select("filename,content,chunk_index")
    .eq("project_id", id)
    .eq("source_id", sourceId)
    .order("chunk_index", { ascending: true });

  if (error) return NextResponse.json({ error: "Không thể tải source." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Không tìm thấy source." }, { status: 404 });

  const filename = String(data[0].filename || "source").replace(/[^\w.\- ]/g, "_");
  const content = data.map((row) => String(row.content || "")).join("\n\n");
  return new NextResponse(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}.indexed.txt"`,
      "cache-control": "private, no-store",
    },
  });
}
