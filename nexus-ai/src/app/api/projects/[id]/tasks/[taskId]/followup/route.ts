import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId, taskId } = await params;
    const access = await requireProjectAccess(projectId);
    if (!access.supabase) return Response.json({ resolved: false, persisted: false });
    const body = await request.json().catch(() => ({})) as { note?: string };
    const result = await access.supabase.rpc("respond_assignment_followup", {
      target_project_id: projectId,
      target_task_id: taskId,
      response_note: typeof body.note === "string" ? body.note : null,
    });
    if (result.error) {
      if (result.error.code === "P0002") return Response.json({ error: "Follow-up này đã được xử lý hoặc không còn hiệu lực." }, { status: 409 });
      if (result.error.code === "42501") return Response.json({ error: result.error.message }, { status: 403 });
      throw new Error(result.error.message);
    }
    return Response.json({ resolved: result.data === true, persisted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không thể phản hồi follow-up." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}
