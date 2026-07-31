import {
  formatRemainingDeadline,
  selectProactiveCheckIn,
  type CheckInTask,
} from "@/features/proactive-checkin/checkin";
import {
  ProjectAccessError,
  requireProjectAccess,
} from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };

type UserRow = {
  name: string | null;
  email: string | null;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);

    if (!access.supabase) {
      return Response.json(
        { checkIn: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const { supabase, user } = access;
    const [{ data: projectData }, { data: profile, error: profileError }, { data: tasks, error: tasksError }] =
      await Promise.all([
        supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .maybeSingle(),
        supabase
          .from("users")
          .select("name,email")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("tasks")
          .select("id,title,status,priority,due_at,updated_at")
          .eq("project_id", projectId)
          .eq("assignee_id", user.id)
          .eq("status", "rework"), // STRICTLY filter tasks where PM dragged to "rework"
      ]);

    if (profileError) {
      throw new Error(`Không thể tải hồ sơ: ${profileError.message}`);
    }
    if (tasksError) {
      throw new Error(`Không thể tải task: ${tasksError.message}`);
    }

    // If member has no task in Rework, return checkIn: null (No bubble appears!)
    if (!tasks || tasks.length === 0) {
      return Response.json(
        { checkIn: null, projectName: projectData?.name || "Dự án" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const projectName = projectData?.name || "Dự án";
    const userProfile = profile as UserRow | null;
    const userName =
      userProfile?.name ||
      userProfile?.email?.split("@")[0] ||
      user.email?.split("@")[0] ||
      "bạn";

    const checkIn = selectProactiveCheckIn({
      projectId,
      userId: user.id,
      userName,
      tasks: tasks as CheckInTask[],
    });

    if (checkIn && checkIn.task) {
      checkIn.detail = `📁 Dự án: ${projectName}\n📌 Task: ${checkIn.task.title}\n⏳ Deadline còn lại: ${checkIn.task.remainingDeadline || formatRemainingDeadline(checkIn.task.dueAt)}`;
    }

    return Response.json(
      { checkIn, projectName },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return Response.json(
      { checkIn: null },
      { status },
    );
  }
}
