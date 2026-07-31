import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

import { ragConfig } from "@/features/document-rag/config";
import { buildMockAnswer, buildRagSystemPrompt } from "@/features/document-rag/prompt";
import { retrieveContext } from "@/features/document-rag/repository";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };
type IncomingMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const { supabase } = await requireProjectAccess(projectId);
    let projectName = "Demo project";

    if (projectId !== "demo") {
      if (!supabase) {
        throw new Error("Không thể kết nối dữ liệu project.");
      }

      projectName =
        (
          await supabase
            .from("projects")
            .select("name")
            .eq("id", projectId)
            .maybeSingle()
        ).data?.name ?? "Project";
    }

    const body = (await request.json()) as {
      message?: string;
      history?: IncomingMessage[];
    };
    const message = body.message?.trim();

    if (!message) {
      return Response.json({ error: "Câu hỏi không được để trống." }, { status: 400 });
    }

    const sources = await retrieveContext(projectId, message);
    const sourceHeader = encodeURIComponent(
      JSON.stringify(
        sources.map(({ id, filename, chunkIndex, similarity }) => ({
          id,
          filename,
          chunkIndex,
          similarity,
        })),
      ),
    );

    if (!process.env.OPENAI_API_KEY) {
      return new Response(buildMockAnswer(sources, projectName), {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-rag-mode": "mock",
          "x-rag-sources": sourceHeader,
        },
      });
    }

    const history = (body.history ?? []).slice(-6);
    const result = streamText({
      model: openai(ragConfig.chatModel),
      system: buildRagSystemPrompt(sources, projectName),
      messages: [...history, { role: "user", content: message }],
      temperature: 0.2,
    });

    return result.toTextStreamResponse({
      headers: {
        "x-rag-mode": "supabase",
        "x-rag-sources": sourceHeader,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể trả lời câu hỏi.";
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
