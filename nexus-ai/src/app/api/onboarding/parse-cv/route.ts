import { NextResponse } from "next/server";
import OpenAI from "openai";

import { extractTextFromFile } from "@/features/document-rag/extract-text";

export const runtime = "nodejs";

const FALLBACK_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Python",
  "Supabase",
];

function fallbackExtractSkills(text: string, selected: string[]) {
  const lower = text.toLowerCase();
  const detected = FALLBACK_SKILLS.filter((skill) => lower.includes(skill.toLowerCase()));
  return Array.from(new Set([...selected, ...detected]));
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const rawCV = String(formData.get("rawCV") || "");
    const selectedSkills = JSON.parse(String(formData.get("skills") || "[]")) as string[];
    const file = formData.get("file");
    let cvText = rawCV;

    if (file instanceof File && file.size > 0) {
      cvText = [cvText, await extractTextFromFile(file)].filter(Boolean).join("\n\n");
    }

    let skills = fallbackExtractSkills(cvText, selectedSkills);

    if (cvText.trim() && process.env.OPENAI_API_KEY) {
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
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
        const content = response.choices[0]?.message?.content;
        const parsed = content ? JSON.parse(content) : null;
        if (Array.isArray(parsed?.skills)) {
          skills = Array.from(new Set([...skills, ...parsed.skills]));
        }
      } catch (error) {
        console.error("[onboarding] OpenAI CV parse failed", error);
      }
    }

    return NextResponse.json({ success: true, rawCV: cvText, skills });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể phân tích CV.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
