export type ModelTier = "tier1" | "tier2" | "rule";
export type AgentName = "knowledge" | "auto_tasking" | "deadline" | "eq_radar";

export type AgentRunMeta = {
  agent: AgentName;
  tier: ModelTier;
  model: string | null;
  fallback: boolean;
  latencyMs: number;
};

export type AgentTokenUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

/** Normalize OpenAI Chat Completions usage for the agent_runs audit schema. */
export function tokenUsageFromOpenAI(response: {
  usage?: { prompt_tokens?: number | null; completion_tokens?: number | null } | null;
}): AgentTokenUsage {
  return {
    inputTokens: response.usage?.prompt_tokens ?? null,
    outputTokens: response.usage?.completion_tokens ?? null,
  };
}

export class ModelRouter {
  route(tier: ModelTier) {
    return modelFor(tier);
  }

  routeForAgent(agent: AgentName) {
    if (agent === "knowledge" || agent === "auto_tasking") return this.route("tier1");
    if (agent === "deadline" || agent === "eq_radar") return this.route("tier2");
    return null;
  }
}

export function modelFor(tier: ModelTier) {
  if (tier === "tier1") return process.env.OPENAI_TIER1_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o";
  if (tier === "tier2") return process.env.OPENAI_TIER2_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  return null;
}

export async function withAgentRun<T>(input: {
  agent: AgentName;
  tier: ModelTier;
  run: () => Promise<T>;
  fallback: () => T | Promise<T>;
  timeoutMs?: number;
  retries?: number;
}) {
  const started = Date.now();
  const model = modelFor(input.tier);
  const timeoutMs = input.timeoutMs ?? 20_000;
  const retries = input.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const data = await Promise.race([
        input.run(),
        new Promise<never>((_, reject) => {
          const timer = setTimeout(() => reject(new Error(`Agent timeout after ${timeoutMs}ms`)), timeoutMs);
          timer.unref?.();
        }),
      ]);
      return { data, meta: { agent: input.agent, tier: input.tier, model, fallback: false, latencyMs: Date.now() - started, attempts: attempt + 1 } satisfies AgentRunMeta & { attempts: number } };
    } catch (error) {
      lastError = error;
    }
  }

  const data = await input.fallback();
  return { data, meta: { agent: input.agent, tier: input.tier, model, fallback: true, latencyMs: Date.now() - started, attempts: retries + 1, error: lastError instanceof Error ? lastError.message : "Agent failed" } satisfies AgentRunMeta & { attempts: number; error: string } };
}


type AgentAuditDb = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<unknown>;
  };
  rpc?: (name: string, args: Record<string, unknown>) => Promise<{ error?: { message?: string } | null }>;
};

export async function persistAgentRun(db: unknown, payload: Record<string, unknown>) {
  try {
    const auditDb = db as AgentAuditDb;
    if (auditDb.rpc) {
      const result = await auditDb.rpc("record_agent_run", {
        run_project_id: payload.project_id ?? null,
        run_agent: payload.agent,
        run_tier: payload.tier,
        run_model: payload.model ?? null,
        run_status: payload.status,
        run_latency_ms: payload.latency_ms ?? null,
        run_input_tokens: payload.input_tokens ?? null,
        run_output_tokens: payload.output_tokens ?? null,
        run_fallback: payload.fallback ?? false,
        run_error: payload.error ?? null,
      });
      if (!result.error) return;
    }
    // Compatibility fallback for admin clients during a rolling migration.
    await auditDb.from("agent_runs").insert(payload);
  } catch {
    // Observability must never break the user-facing agent flow.
  }
}
