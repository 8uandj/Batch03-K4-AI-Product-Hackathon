import type { DocumentChunk, DocumentSource, RagSource } from "./types";

const FALLBACK_CONTEXT =
  "Dự án Nexus AI dùng Next.js và Supabase. Nexus kết hợp quản lý công việc với hỗ trợ sức khỏe đội nhóm.";

declare global {
  var nexusMockDocuments: Map<string, DocumentChunk[]> | undefined;
}

const store =
  globalThis.nexusMockDocuments ??
  (globalThis.nexusMockDocuments = new Map<string, DocumentChunk[]>());

export function saveMockChunks(projectId: string, chunks: DocumentChunk[]) {
  const current = store.get(projectId) ?? [];
  store.set(projectId, [...current, ...chunks]);
}

export function listMockSources(projectId: string): DocumentSource[] {
  const chunks = store.get(projectId) ?? [];
  const sources = new Map<string, DocumentSource>();

  for (const chunk of chunks) {
    const existing = sources.get(chunk.sourceId);
    if (existing) {
      existing.chunks += 1;
      continue;
    }

    sources.set(chunk.sourceId, {
      sourceId: chunk.sourceId,
      filename: chunk.filename,
      chunks: 1,
      mimeType: chunk.metadata.mimeType,
      createdAt: null,
    });
  }

  return [...sources.values()];
}

export function searchMockChunks(projectId: string, query: string): RagSource[] {
  const chunks = store.get(projectId) ?? [];
  const terms = normalizeTerms(query);

  const ranked = chunks
    .map((chunk) => {
      const haystack = chunk.content.toLocaleLowerCase("vi");
      const hits = terms.filter((term) => haystack.includes(term)).length;
      return { chunk, similarity: terms.length ? hits / terms.length : 0 };
    })
    .filter(({ similarity }) => similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5)
    .map(({ chunk, similarity }) => ({
      id: `${chunk.sourceId}:${chunk.chunkIndex}`,
      filename: chunk.filename,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      similarity,
    }));

  if (ranked.length > 0) return ranked;

  return [
    {
      id: "mock-context",
      filename: "mock-context.txt",
      chunkIndex: 0,
      content: FALLBACK_CONTEXT,
      similarity: 1,
    },
  ];
}

function normalizeTerms(query: string) {
  return [
    ...new Set(
      query
        .toLocaleLowerCase("vi")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2),
    ),
  ];
}
