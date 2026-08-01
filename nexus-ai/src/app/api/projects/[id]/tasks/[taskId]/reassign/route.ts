import { NextResponse } from "next/server";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId, taskId } = await params;
    const access = await requireProjectAccess(projectId);
    if (access.role !== "pm" || !access.supabase) return NextResponse.json({ error: "Chỉ PM mới có quyền đổi assignee." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const assigneeId = typeof body.assignee_id === "string" ? body.assignee_id.trim() : "";
    if (!assigneeId) return NextResponse.json({ error: "Thiếu assignee_id." }, { status: 400 });
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = access.supabase as any;
    const decisionInput = {
      project_phase: typeof body.project_phase === "string" ? body.project_phase : "normal",
      risk_level: typeof body.risk_level === "string" ? body.risk_level : "low",
      suggested_user_id: typeof body.suggested_user_id === "string" ? body.suggested_user_id : null,
      weights: body.weights && typeof body.weights === "object" ? body.weights : {},
      evidence: body.evidence && typeof body.evidence === "object" ? body.evidence : { source: "manual_reassign" },
      override_reason: typeof body.override_reason === "string" ? body.override_reason : null,
      mitigation: typeof body.mitigation === "string" ? body.mitigation : null,
    };
    const result = await db.rpc("reassign_task", {
      target_project_id: projectId,
      target_task_id: taskId,
      target_assignee_id: assigneeId,
      decision_input: decisionInput,
    });
    if (result.error) {
      if (result.error.code === "P0002") return NextResponse.json({ error: "Không tìm thấy task." }, { status: 404 });
      if (result.error.code === "42501") return NextResponse.json({ error: result.error.message }, { status: 403 });
      if (result.error.code === "23514") return NextResponse.json({ error: result.error.message }, { status: 409 });
      throw new Error(result.error.message);
    }
    return NextResponse.json({ task: result.data?.[0] ?? null, persisted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể đổi assignee." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}
