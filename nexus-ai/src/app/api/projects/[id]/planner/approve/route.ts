import { requireProjectAccess } from "@/features/workspace/access";
import type { TaskPriority } from "@/types";

type RouteContext = { params: Promise<{ id: string }> };

type TaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee_id: string;
  required_skills: string[];
  due_in_days: number;
};

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
      tasks?: TaskDraft[];
    };

    const finalTasks = body.tasks ?? [];
    if (!finalTasks.length) {
      return Response.json({ error: "Không có task nào để phê duyệt." }, { status: 400 });
    }

    if (projectId === "demo") {
      return Response.json({ success: true, count: finalTasks.length });
    }

    const supabase = access.supabase;
    if (!supabase) {
      throw new Error("Không thể kết nối dữ liệu project.");
    }

    // Map tasks to database schema
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

    if (insertError) throw new Error(insertError.message);

    // Update recommendation status to accepted
    if (body.recommendationId) {
      await supabase
        .from("ai_recommendations")
        .update({ status: "accepted" })
        .eq("id", body.recommendationId);
    }

    return Response.json({
      success: true,
      count: finalTasks.length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể phê duyệt kế hoạch." },
      { status: 500 },
    );
  }
}
