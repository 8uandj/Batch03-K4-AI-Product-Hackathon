import { scanDeadlineTasks } from "@/features/deadline-monitor/service";
import {
  ProjectAccessError,
  requireProjectAccess,
} from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);

    if (access.role !== "pm") {
      return Response.json(
        { error: "Chỉ PM mới có thể chạy quét tiến độ." },
        { status: 403 },
      );
    }

    const result = await scanDeadlineTasks({ projectId });
    return Response.json({ success: true, ...result });
  } catch (error) {
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể chạy Deadline Monitor.",
      },
      { status },
    );
  }
}
