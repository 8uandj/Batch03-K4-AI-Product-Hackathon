import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import type { DocumentChunk } from "./types";

export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 80;

export async function chunkDocument(input: {
  projectId: string;
  sourceId: string;
  filename: string;
  mimeType: string;
  text: string;
}): Promise<DocumentChunk[]> {
  const normalized = input.text
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
  if (!normalized) {
    throw new Error("Tài liệu không chứa văn bản có thể lập chỉ mục.");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });
  const pieces = (await splitter.splitText(normalized)).filter(Boolean);

  return pieces.map((content, chunkIndex) => ({
    projectId: input.projectId,
    sourceId: input.sourceId,
    filename: input.filename,
    chunkIndex,
    content,
    metadata: {
      mimeType: input.mimeType,
      totalChunks: pieces.length,
    },
  }));
}
