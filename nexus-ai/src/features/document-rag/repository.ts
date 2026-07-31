import { ragConfig } from "./config";
import { getOpenAIClient, getSupabaseAdmin } from "./clients";
import { listMockSources, saveMockChunks, searchMockChunks } from "./mock-store";
import type { DocumentChunk, DocumentSource, RagSource } from "./types";

export async function indexChunks(chunks: DocumentChunk[]) {
  if (ragConfig.mode === "mock") {
    saveMockChunks(chunks[0].projectId, chunks);
    return;
  }

  const openai = getOpenAIClient();
  const supabase = getSupabaseAdmin();

  for (let start = 0; start < chunks.length; start += 100) {
    const batch = chunks.slice(start, start + 100);
    const response = await openai.embeddings.create({
      model: ragConfig.embeddingModel,
      input: batch.map((chunk) => chunk.content),
    });

    const rows = batch.map((chunk, index) => ({
      project_id: chunk.projectId,
      source_id: chunk.sourceId,
      filename: chunk.filename,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      embedding: response.data[index].embedding,
      metadata: chunk.metadata,
    }));

    const { error } = await supabase.from("documents").insert(rows);
    if (error) throw new Error(`Không thể lưu vector: ${error.message}`);
  }
}

export async function retrieveContext(
  projectId: string,
  query: string,
): Promise<RagSource[]> {
  if (ragConfig.mode === "mock") return searchMockChunks(projectId, query);

  const embedding = await getOpenAIClient().embeddings.create({
    model: ragConfig.embeddingModel,
    input: query,
  });

  const { data, error } = await getSupabaseAdmin().rpc("match_documents", {
    query_embedding: embedding.data[0].embedding,
    filter_project_id: projectId,
    match_threshold: ragConfig.matchThreshold,
    match_count: ragConfig.matchCount,
  });

  if (error) throw new Error(`Không thể tìm kiếm tài liệu: ${error.message}`);

  return ((data ?? []) as Array<{
    id: string;
    filename: string;
    chunk_index: number;
    content: string;
    similarity: number;
  }>).map((row) => ({
    id: row.id,
    filename: row.filename,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
  }));
}


export async function listDocumentSources(
  projectId: string,
): Promise<DocumentSource[]> {
  if (ragConfig.mode === "mock") return listMockSources(projectId);

  const { data, error } = await getSupabaseAdmin()
    .from("documents")
    .select("source_id,filename,metadata,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Không thể tải danh sách tài liệu: ${error.message}`);

  const sources = new Map<string, DocumentSource>();
  for (const row of (data ?? []) as Array<{
    source_id: string;
    filename: string;
    metadata: { mimeType?: string; totalChunks?: number } | null;
    created_at: string | null;
  }>) {
    if (sources.has(row.source_id)) continue;

    sources.set(row.source_id, {
      sourceId: row.source_id,
      filename: row.filename,
      chunks: row.metadata?.totalChunks ?? 0,
      mimeType: row.metadata?.mimeType ?? "application/octet-stream",
      createdAt: row.created_at,
    });
  }

  return [...sources.values()];
}
