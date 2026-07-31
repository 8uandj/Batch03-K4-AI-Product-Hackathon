const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_MATCH_THRESHOLD = 0.35;

function asNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const ragConfig = {
  mode: process.env.RAG_MODE === "supabase" ? "supabase" : "mock",
  chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
  embeddingModel:
    process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  matchCount: asNumber(process.env.RAG_MATCH_COUNT, DEFAULT_MATCH_COUNT),
  matchThreshold: asNumber(
    process.env.RAG_MATCH_THRESHOLD,
    DEFAULT_MATCH_THRESHOLD,
  ),
  maxFileBytes: 10 * 1024 * 1024,
} as const;

export function assertProductionConfig() {
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    ["OPENAI_API_KEY", process.env.OPENAI_API_KEY],
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["SUPABASE_KEY", supabaseKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(", ")}`);
  }
}
