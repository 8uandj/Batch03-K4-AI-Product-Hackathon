import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";
import type { TaskStatus } from "@/types";

type RouteContext = {
  params: Promise<{ id: string; taskId: string }>;
};

const allowedStatuses: TaskStatus[] = ["todo", "doing", "rework", "done"];

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId, taskId } = await params;
    const body = (await request.json()) as { status?: string; action?: "blocker_reported" | "support_requested"; note?: string };

    if (body.action) {
      if (projectId === "demo") return Response.json({ success: true, persisted: false, action: body.action });
      const { supabase } = await requireProjectAccess(projectId);
      if (!supabase) throw new Error("Không thể kết nối dữ liệu project.");
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
      const actionResult = await supabase.rpc("record_task_action", { target_project_id: projectId, target_task_id: taskId, action: body.action, note: note || null });
      if (actionResult.error) {
        if (actionResult.error.code === "P0002") return Response.json({ error: "Không tìm thấy task trong project này." }, { status: 404 });
        if (actionResult.error.code === "42501") return Response.json({ error: actionResult.error.message }, { status: 403 });
        throw new Error(actionResult.error.message);
      }
      return Response.json({ success: true, persisted: true, action: body.action });
    }

    const status = body.status as TaskStatus;

    if (!allowedStatuses.includes(status)) {
      return Response.json(
        { error: "Trạng thái task phải là todo, doing, rework hoặc done." },
        { status: 400 },
      );
    }

    if (projectId === "demo") {
      return Response.json({
        task: { id: taskId, status, updated_at: new Date().toISOString() },
        persisted: false,
      });
    }

    const { supabase } = await requireProjectAccess(projectId);
    if (!supabase) {
      throw new Error("Không thể kết nối dữ liệu project.");
    }

    const result = await supabase.rpc("update_task_status", {
      target_project_id: projectId,
      target_task_id: taskId,
      next_status: status,
    });
    if (result.error) {
      if (result.error.code === "P0002") return Response.json({ error: "Không tìm thấy task trong project này." }, { status: 404 });
      if (result.error.code === "42501") return Response.json({ error: result.error.message }, { status: 403 });
      if (result.error.code === "23514") return Response.json({ error: result.error.message }, { status: 409 });
      throw new Error(result.error.message);
    }
    return Response.json({ task: result.data?.[0] ?? null, persisted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật task.";
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
