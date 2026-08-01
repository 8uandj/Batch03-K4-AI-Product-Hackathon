import {
  ProjectAccessError,
  requireProjectAccess,
} from "@/features/workspace/access";
import {
  PlannerValidationError,
  validatePlannerTasks,
} from "@/features/workspace/planner-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);

    if (access.role !== "pm") {
      return Response.json(
        { error: "Chỉ PM mới có quyền phê duyệt kế hoạch." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      recommendationId?: string;
      tasks?: unknown;
    };

    if (!body.recommendationId) {
      return Response.json(
        { error: "Thiếu mã bản nháp AI Planner." },
        { status: 400 },
      );
    }

    if (projectId === "demo") {
      const count = Array.isArray(body.tasks) ? body.tasks.length : 0;
      return Response.json({ success: true, count });
    }

    const supabase = access.supabase;
    if (!supabase) {
      throw new Error("Không thể kết nối dữ liệu project.");
    }

    const [membersResult, projectResult] = await Promise.all([
      supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId),
      supabase
        .from("projects")
        .select("deadline_at")
        .eq("id", projectId)
        .maybeSingle(),
    ]);

    if (membersResult.error) throw new Error(membersResult.error.message);
    if (projectResult.error || !projectResult.data) {
      return Response.json({ error: "Không tìm thấy dự án." }, { status: 404 });
    }

    let deadlineDays = 14;
    if (projectResult.data.deadline_at) {
      const diffTime =
        new Date(projectResult.data.deadline_at).getTime() - Date.now();
      deadlineDays = Math.max(
        2,
        Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
      );
    }

    const finalTasks = validatePlannerTasks(
      body.tasks,
      (membersResult.data ?? []).map((member) => member.user_id),
      { maxDueDays: deadlineDays },
    );

    const approved = await supabase.rpc("approve_planner_draft", {
      target_project_id: projectId,
      recommendation_id: body.recommendationId,
      approved_tasks: finalTasks,
    });
    if (approved.error) {
      if (approved.error.code === "P0002") return Response.json({ error: "Bản nháp không tồn tại hoặc đã được phê duyệt trước đó." }, { status: 409 });
      if (approved.error.code === "42501") return Response.json({ error: approved.error.message }, { status: 403 });
      if (approved.error.code === "23514") return Response.json({ error: approved.error.message }, { status: 400 });
      throw new Error(approved.error.message);
    }

    return Response.json({
      success: true,
      count: approved.data?.length ?? 0,
      tasks: approved.data ?? [],
      persisted: true,
    });
  } catch (error) {
    const status =
      error instanceof ProjectAccessError
        ? error.status
        : error instanceof PlannerValidationError
          ? 400
          : 500;
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể phê duyệt kế hoạch." },
      { status },
    );
  }
}
