import "server-only";

import {
  persistAgentRun,
  withAgentRun,
  type AgentName,
  type ModelTier,
} from "./model-router";

export type AgentExecution<Input, Output> = {
  run: (input: Input) => Promise<Output>;
  fallback: (input: Input) => Output | Promise<Output>;
};

export type OrchestratorOptions = { db?: unknown; projectId?: string | null };

export type OrchestratedResult<Output> = {
  data: Output;
  meta: { agent: AgentName; tier: ModelTier; model: string | null; fallback: boolean; latencyMs: number };
};

export class AgentOrchestrator {
  private readonly handlers = new Map<AgentName, AgentExecution<unknown, unknown>>();

  register<Input, Output>(agent: AgentName, execution: AgentExecution<Input, Output>) {
    this.handlers.set(agent, execution as AgentExecution<unknown, unknown>);
    return this;
  }

  async execute<Input, Output>(agent: AgentName, tier: ModelTier, input: Input, options: OrchestratorOptions = {}): Promise<OrchestratedResult<Output>> {
    const handler = this.handlers.get(agent);
    if (!handler) throw new Error(`Agent chưa được đăng ký: ${agent}`);
    const result = await withAgentRun({ agent, tier, run: () => handler.run(input), fallback: () => handler.fallback(input) });
    const usage = result.data && typeof result.data === "object" && "usage" in result.data
      ? (result.data as { usage?: { inputTokens?: number | null; outputTokens?: number | null } }).usage
      : undefined;
    await persistAgentRun(options.db, {
      project_id: options.projectId ?? null,
      agent: result.meta.agent,
      tier: result.meta.tier,
      model: result.meta.model,
      status: result.meta.fallback ? "fallback" : "success",
      fallback: result.meta.fallback,
      latency_ms: result.meta.latencyMs,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
      error: "error" in result.meta ? result.meta.error : null,
    });
    return result as OrchestratedResult<Output>;
  }
}

abstract class ConfiguredAgent {
  abstract readonly name: AgentName;
  abstract readonly tier: ModelTier;

  constructor(protected readonly execution: AgentExecution<unknown, unknown>) {}

  register(orchestrator: AgentOrchestrator) {
    orchestrator.register(this.name, this.execution);
    return orchestrator;
  }
}

export class KnowledgeHubAgent extends ConfiguredAgent {
  readonly name = "knowledge" as const;
  readonly tier = "tier1" as const;
}

export class AutoTaskingAgent extends ConfiguredAgent {
  readonly name = "auto_tasking" as const;
  readonly tier = "tier1" as const;
}

export class DeadlineCopilotAgent extends ConfiguredAgent {
  readonly name = "deadline" as const;
  readonly tier = "tier2" as const;
}

export class EqRadarAgent extends ConfiguredAgent {
  readonly name = "eq_radar" as const;
  readonly tier = "tier2" as const;
}

export function createAgentOrchestrator(agents: ConfiguredAgent[]) {
  const orchestrator = new AgentOrchestrator();
  for (const agent of agents) agent.register(orchestrator);
  return orchestrator;
}
