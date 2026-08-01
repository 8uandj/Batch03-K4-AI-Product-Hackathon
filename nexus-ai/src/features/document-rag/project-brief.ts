import OpenAI from "openai";

import { createAgentOrchestrator, KnowledgeHubAgent } from "@/features/ai/orchestrator";
import { tokenUsageFromOpenAI } from "@/features/ai/model-router";

export type ProjectBrief = {
  objective: string;
  scope: string;
  deliverables: string[];
  deadline: string;
  constraints: string[];
  acceptance_criteria: string[];
  unknowns: string[];
  risks: string[];
};

type BriefDb = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error?: { message: string } | null }>;
  };
};

function fallbackBrief(projectName: string, text: string): ProjectBrief {
  const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 500);
  return {
    objective: `Làm rõ và triển khai mục tiêu của dự án ${projectName}.`,
    scope: excerpt || "Chưa đủ dữ liệu để xác định phạm vi; cần PM bổ sung.",
    deliverables: ["Project brief đã được chuẩn hóa", "Danh sách task có tiêu chí nghiệm thu"],
    deadline: "Chưa xác định",
    constraints: [],
    acceptance_criteria: ["Các deliverable được PM xác nhận", "Task có owner và deadline rõ ràng"],
    unknowns: ["Deadline tổng và các phụ thuộc chưa được xác nhận"],
    risks: ["Tài liệu đầu vào có thể chưa đầy đủ hoặc đã cũ"],
  };
}

export function isProjectBrief(value: unknown): value is ProjectBrief {
  if (!value || typeof value !== "object") return false;
  const brief = value as Partial<ProjectBrief>;
  return ["objective", "scope", "deadline"].every((key) => typeof brief[key as keyof ProjectBrief] === "string") &&
    ["deliverables", "constraints", "acceptance_criteria", "unknowns", "risks"].every((key) => {
      const list = brief[key as keyof ProjectBrief];
      return Array.isArray(list) && list.every((item) => typeof item === "string");
    });
}

export function parseProjectBriefContent(content: string | null | undefined): ProjectBrief | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as unknown;
    return isProjectBrief(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function generateBriefWithOrchestrator(input: {
  projectId: string;
  projectName: string;
  sourceText: string;
  db: unknown;
}) {
  let tokenUsage = { inputTokens: null as number | null, outputTokens: null as number | null };
  const orchestrator = createAgentOrchestrator([
    new KnowledgeHubAgent({
      run: async () => {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15_000, maxRetries: 0 });
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_TIER1_MODEL || process.env.OPENAI_CHAT_MODEL || "gpt-4o",
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content: "Bạn là NexusAI Knowledge Hub. Hãy chuẩn hóa tài liệu thành project brief ngắn gọn, không bịa dữ kiện; nếu thiếu hãy ghi vào unknowns.",
            },
            { role: "user", content: JSON.stringify({ project_name: input.projectName, source: input.sourceText }) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "nexus_project_brief",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  objective: { type: "string" },
                  scope: { type: "string" },
                  deadline: { type: "string" },
                  deliverables: { type: "array", items: { type: "string" } },
                  constraints: { type: "array", items: { type: "string" } },
                  acceptance_criteria: { type: "array", items: { type: "string" } },
                  unknowns: { type: "array", items: { type: "string" } },
                  risks: { type: "array", items: { type: "string" } },
                },
                required: ["objective", "scope", "deadline", "deliverables", "constraints", "acceptance_criteria", "unknowns", "risks"],
              },
            },
          },
        });
        tokenUsage = tokenUsageFromOpenAI(response);
        const content = response.choices[0]?.message?.content;
        const parsed = content ? JSON.parse(content) as unknown : null;
        if (!isProjectBrief(parsed)) throw new Error("Project brief JSON schema validation failed");
        return parsed;
      },
      fallback: () => null,
    }),
  ]);

  const result = await orchestrator.execute("knowledge", "tier1", undefined, {
    db: input.db,
    projectId: input.projectId,
  });
  return { result, tokenUsage };
}

export async function generateAndStoreProjectBrief(input: {
  db: unknown;
  projectId: string;
  projectName: string;
  sourceId: string;
  sourceName: string;
  text: string;
}): Promise<{ brief: ProjectBrief; mode: "openai" | "fallback" }> {
  const sourceText = input.text.replace(/\s+/g, " ").trim().slice(0, 18000);
  let brief = fallbackBrief(input.projectName, sourceText);
  let mode: "openai" | "fallback" = "fallback";

  if (sourceText) {
    const { result } = await generateBriefWithOrchestrator({
      projectId: input.projectId,
      projectName: input.projectName,
      sourceText,
      db: input.db,
    });
    if (result.data && isProjectBrief(result.data)) {
      brief = result.data;
      mode = "openai";
    }
  }

  const { error } = await (input.db as BriefDb).from("ai_summaries").insert({
    project_id: input.projectId,
    type: "project_brief",
    title: `Project brief — ${input.sourceName}`,
    content: JSON.stringify(brief),
    metadata: { source_id: input.sourceId, source_name: input.sourceName, mode, citation: input.sourceName },
  });
  if (error) throw new Error(`Không thể lưu project brief: ${error.message}`);
  return { brief, mode };
}
