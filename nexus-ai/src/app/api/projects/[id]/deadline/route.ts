import { requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const body = (await request.json()) as { deadlineAt: string | null };
    const deadlineAt = body.deadlineAt ? new Date(body.deadlineAt).toISOString() : null;

    const access = await requireProjectAccess(projectId);
    if (access.role !== "pm") {
      return Response.json(
        { error: "Chỉ PM của project mới có thể cập nhật deadline." },
        { status: 403 },
      );
    }

    if (projectId === "demo") {
      return Response.json({ success: true, mode: "mock" });
    }

    const supabase = access.supabase;
    if (!supabase) {
      throw new Error("Không thể kết nối dữ liệu project.");
    }

    const { error } = await supabase
      .from("projects")
      .update({ deadline_at: deadlineAt, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (error) throw new Error(error.message);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Không thể cập nhật deadline." },
      { status: 500 },
    );
  }
}
