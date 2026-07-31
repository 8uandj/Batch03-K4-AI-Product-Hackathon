import {
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

type ProjectRow = {
  name: string;
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
    const [
      { data: profile, error: profileError },
      { data: project, error: projectError },
      { data: tasks, error: tasksError },
    ] =
      await Promise.all([
        supabase
          .from("users")
          .select("name,email")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .maybeSingle(),
        supabase
          .from("tasks")
          .select("id,title,status,priority,due_at,updated_at")
          .eq("project_id", projectId)
          .eq("assignee_id", user.id)
          .neq("status", "done"),
      ]);

    if (profileError) {
      throw new Error(`Không thể tải hồ sơ: ${profileError.message}`);
    }
    if (projectError || !project) {
      throw new Error(
        `Không thể tải dự án: ${projectError?.message ?? "Không tìm thấy dự án."}`,
      );
    }
    if (tasksError) {
      throw new Error(`Không thể tải task: ${tasksError.message}`);
    }

    const userProfile = profile as UserRow | null;
    const userName =
      userProfile?.name ||
      userProfile?.email?.split("@")[0] ||
      user.email?.split("@")[0] ||
      "bạn";
    const checkIn = selectProactiveCheckIn({
      projectId,
      projectName: (project as ProjectRow).name,
      userId: user.id,
      userName,
      tasks: (tasks ?? []) as CheckInTask[],
    });

    return Response.json(
      { checkIn },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể kiểm tra tín hiệu nhắc việc.",
      },
      { status },
    );
  }
}
