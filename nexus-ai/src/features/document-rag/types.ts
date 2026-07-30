export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sources?: RagSourceReference[];
};

export type DocumentChunk = {
  projectId: string;
  sourceId: string;
  filename: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
  metadata: {
    mimeType: string;
    totalChunks: number;
  };
};

export type RagSource = {
  id: string;
  filename: string;
  chunkIndex: number;
  content: string;
  similarity: number;
};

export type RagSourceReference = Omit<RagSource, "content">;

export type UploadResult = {
  sourceId: string;
  filename: string;
  chunks: number;
  mode: "mock" | "supabase";
};
