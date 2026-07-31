import {
  ProjectAccessError,
  requireProjectAccess,
} from "@/features/workspace/access";
import {
  PlannerValidationError,
  validatePlannerTasks,
} from "@/features/workspace/planner-validation";

type RouteContext = { params: Promise<{ id: string }> };

function dueDate(days: number) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  // Set due time to end of day: 16:59:00 UTC (which is 23:59:00 in UTC+7 / Indochina time)
  value.setUTCHours(16, 59, 0, 0);
  return value.toISOString();
}

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

    // Claim the draft before inserting. The conditional update makes retries
    // idempotent and prevents two concurrent approvals from duplicating tasks.
    const { data: claimedRecommendation, error: claimError } = await supabase
      .from("ai_recommendations")
      .update({
        status: "accepted",
        payload: { tasks: finalTasks, deadlineDays, mode: "approved" },
      })
      .eq("id", body.recommendationId)
      .eq("project_id", projectId)
      .eq("type", "task_assignment")
      .eq("status", "suggested")
      .select("id")
      .maybeSingle();

    if (claimError) throw new Error(claimError.message);
    if (!claimedRecommendation) {
      return Response.json(
        { error: "Bản nháp không tồn tại hoặc đã được phê duyệt trước đó." },
        { status: 409 },
      );
    }

    // Map validated tasks to database schema
    const taskRows = finalTasks.map((task) => ({
      project_id: projectId,
      title: task.title.trim().slice(0, 160),
      description: task.description?.trim().slice(0, 1200) || null,
      status: "todo" as const,
      priority: task.priority,
      assignee_id: task.assignee_id,
      required_skills: task.required_skills,
      due_at: dueDate(task.due_in_days),
    }));

    // Insert tasks in database
    const { error: insertError } = await supabase
      .from("tasks")
      .insert(taskRows);

    if (insertError) {
      // Release the claim so the PM can retry after a transient database error.
      await supabase
        .from("ai_recommendations")
        .update({ status: "suggested" })
        .eq("id", body.recommendationId)
        .eq("project_id", projectId)
        .eq("status", "accepted");
      throw new Error(insertError.message);
    }

    return Response.json({
      success: true,
      count: finalTasks.length,
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
