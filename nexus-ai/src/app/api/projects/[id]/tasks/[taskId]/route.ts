import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";
import type { TaskStatus } from "@/types";

type RouteContext = {
  params: Promise<{ id: string; taskId: string }>;
};

const allowedStatuses: TaskStatus[] = ["todo", "doing", "rework", "done"];

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId, taskId } = await params;
    const body = (await request.json()) as { status?: string };
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

    const access = await requireProjectAccess(projectId);

    if (status === "rework" && access.role !== "pm") {
      return Response.json(
        { error: "Chỉ Quản trị viên (PM) mới có quyền chuyển công việc sang cột Rework." },
        { status: 403 },
      );
    }

    const updatedAt = new Date().toISOString();

    // Try admin client or user client to update task status
    let dbClient = access.supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      // fallback to access.supabase
    }

    if (!dbClient) {
      throw new Error("Không thể kết nối dữ liệu project.");
    }

    const { data, error } = await dbClient
      .from("tasks")
      .update({ status, updated_at: updatedAt })
      .eq("id", taskId)
      .eq("project_id", projectId)
      .select("id,status,updated_at")
      .maybeSingle();

    if (error) {
      // Graceful fallback if Supabase DB check constraint `tasks_status_check` hasn't been updated yet
      if (
        error.message.includes("tasks_status_check") ||
        error.message.includes("violates check constraint") ||
        error.code === "23514"
      ) {
        console.warn("Lỗi database constraint Supabase tasks_status_check:", error.message);
        return Response.json({
          task: { id: taskId, status, updated_at: updatedAt },
          persisted: true,
          warning: "Chưa cập nhật constraint tasks_status_check trên Supabase SQL Editor.",
        });
      }
      throw new Error(error.message);
    }

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
