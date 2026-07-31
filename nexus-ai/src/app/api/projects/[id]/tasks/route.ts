import { NextResponse } from "next/server";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const { supabase } = await requireProjectAccess(projectId);
    if (!supabase || projectId === "demo") {
      return NextResponse.json({ tasks: [] });
    }

    const { data: rawTasks, error } = await supabase
      .from("tasks")
      .select("id,status,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      tasks: (rawTasks ?? []).map((task) => ({
        id: task.id,
        status: task.status,
        updatedAt: task.updated_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải danh sách task.";
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
