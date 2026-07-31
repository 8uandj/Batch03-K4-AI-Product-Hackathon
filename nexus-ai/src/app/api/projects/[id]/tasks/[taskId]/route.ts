import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";
import type { TaskStatus } from "@/types";

type RouteContext = {
  params: Promise<{ id: string; taskId: string }>;
};

const allowedStatuses: TaskStatus[] = ["todo", "doing", "done"];

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId, taskId } = await params;
    const body = (await request.json()) as { status?: string };
    const status = body.status as TaskStatus;

    if (!allowedStatuses.includes(status)) {
      return Response.json(
        { error: "Trạng thái task phải là todo, doing hoặc done." },
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

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("tasks")
      .update({ status, updated_at: updatedAt })
      .eq("id", taskId)
      .eq("project_id", projectId)
      .select("id,status,updated_at")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      return Response.json(
        { error: "Không tìm thấy task trong project này." },
        { status: 404 },
      );
    }

    return Response.json({ task: data, persisted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể cập nhật task.";
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
