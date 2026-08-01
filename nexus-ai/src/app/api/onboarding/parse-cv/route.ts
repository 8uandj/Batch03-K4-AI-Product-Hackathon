import { NextResponse } from "next/server";
import OpenAI from "openai";
import { modelFor, persistAgentRun, tokenUsageFromOpenAI } from "@/features/ai/model-router";
import { createAdminClient } from "@/lib/supabase/admin";

import { extractTextFromFile, isSupportedDocumentFile } from "@/features/document-rag/extract-text";

export const runtime = "nodejs";

const FALLBACK_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Python",
  "Supabase",
];
const MAX_CV_BYTES = 10 * 1024 * 1024;
const MAX_RAW_CV_CHARS = 30_000;

function fallbackExtractSkills(text: string, selected: string[]) {
  const lower = text.toLowerCase();
  const detected = FALLBACK_SKILLS.filter((skill) => lower.includes(skill.toLowerCase()));
  return Array.from(new Set([...selected, ...detected]));
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const rawCV = String(formData.get("rawCV") || "").slice(0, MAX_RAW_CV_CHARS);
    let parsedSkills: unknown = [];
    try {
      parsedSkills = JSON.parse(String(formData.get("skills") || "[]"));
    } catch {
      parsedSkills = [];
    }
    const selectedSkills = Array.isArray(parsedSkills)
      ? parsedSkills.filter((skill): skill is string => typeof skill === "string").map((skill) => skill.trim()).filter(Boolean).slice(0, 30)
      : [];
    const file = formData.get("file");
    let cvText = rawCV;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_CV_BYTES) return NextResponse.json({ success: false, error: "CV vượt quá giới hạn 10 MB." }, { status: 413 });
      if (!isSupportedDocumentFile(file)) return NextResponse.json({ success: false, error: "CV chỉ hỗ trợ PDF, DOCX, TXT, Markdown, CSV và JSON." }, { status: 415 });
      cvText = [cvText, await extractTextFromFile(file)].filter(Boolean).join("\n\n");
    }
    cvText = cvText.slice(0, MAX_RAW_CV_CHARS);

    let skills = fallbackExtractSkills(cvText, selectedSkills);
    const startedAt = Date.now();
    let tokenUsage = { inputTokens: null as number | null, outputTokens: null as number | null };
    let runError: string | null = null;
    let usedOpenAi = false;

    if (cvText.trim() && process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15_000, maxRetries: 2 });
        const response = await client.chat.completions.create({
          model: modelFor("tier1")!,
          messages: [
            {
              role: "system",
              content:
                'Trích xuất hard skills từ CV. Chỉ trả JSON dạng {"skills":["React"]}.',
            },
            { role: "user", content: cvText },
          ],
          response_format: { type: "json_object" },
        });
        tokenUsage = tokenUsageFromOpenAI(response);
        usedOpenAi = true;
        const content = response.choices[0]?.message?.content;
        const parsed = content ? JSON.parse(content) : null;
        if (Array.isArray(parsed?.skills)) {
          skills = Array.from(new Set([...skills, ...parsed.skills]));
        }
      } catch (error) {
        runError = error instanceof Error ? error.message : "CV parsing failed";
        console.error("[onboarding] OpenAI CV parse failed", error);
      }
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await persistAgentRun(createAdminClient(), {
          project_id: null,
          agent: "knowledge",
          tier: "tier1",
          model: usedOpenAi ? modelFor("tier1") : null,
          status: usedOpenAi ? "success" : "fallback",
          fallback: !usedOpenAi,
          latency_ms: Date.now() - startedAt,
          input_tokens: tokenUsage.inputTokens,
          output_tokens: tokenUsage.outputTokens,
          error: runError,
        });
      } catch {
        // Agent observability must never make onboarding fail.
      }
    }

    return NextResponse.json({ success: true, rawCV: cvText, skills });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể phân tích CV.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
