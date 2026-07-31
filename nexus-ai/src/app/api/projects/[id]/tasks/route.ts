import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    const { supabase } = access;

    let dbClient = supabase;
    try {
      dbClient = createAdminClient();
    } catch {
      // fallback
    }

    if (!dbClient || projectId === "demo") {
      return NextResponse.json({ tasks: [] });
    }

    const { data: rawTasks, error } = await dbClient
      .from("tasks")
      .select("id, title, status, updated_at, assignee_id")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      tasks: (rawTasks ?? []).map((t: any) => ({
        id: t.id,
        status: t.status,
        updatedAt: t.updated_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải danh sách task.";
    const status = error instanceof ProjectAccessError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
