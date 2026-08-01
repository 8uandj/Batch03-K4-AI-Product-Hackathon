import assert from "node:assert/strict";
import test from "node:test";

import { ModelRouter, tokenUsageFromOpenAI, withAgentRun } from "./model-router.ts";

test("tokenUsageFromOpenAI maps provider usage to agent_runs fields", () => {
  assert.deepEqual(tokenUsageFromOpenAI({ usage: { prompt_tokens: 123, completion_tokens: 45 } }), {
    inputTokens: 123,
    outputTokens: 45,
  });
  assert.deepEqual(tokenUsageFromOpenAI({}), { inputTokens: null, outputTokens: null });
});

test("ModelRouter maps expensive and frequent agents to the right tiers", () => {
  const router = new ModelRouter();
  assert.equal(router.routeForAgent("knowledge"), "gpt-4o");
  assert.equal(router.routeForAgent("deadline"), "gpt-4o-mini");
  assert.equal(router.route("rule"), null);
});

test("withAgentRun returns a deterministic fallback and records fallback metadata", async () => {
  const result = await withAgentRun({
    agent: "eq_radar",
    tier: "tier2",
    run: async () => { throw new Error("provider unavailable"); },
    fallback: () => ({ score: 0 }),
  });

  assert.deepEqual(result.data, { score: 0 });
  assert.equal(result.meta.fallback, true);
  assert.equal(result.meta.agent, "eq_radar");
});

test("withAgentRun retries before falling back on timeout", async () => {
  let attempts = 0;
  const result = await withAgentRun({
    agent: "knowledge",
    tier: "tier1",
    timeoutMs: 5,
    retries: 1,
    run: async () => {
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "unreachable";
    },
    fallback: () => "fallback",
  });

  assert.equal(attempts, 2);
  assert.equal(result.data, "fallback");
  assert.equal(result.meta.fallback, true);
  assert.equal(result.meta.attempts, 2);
});
