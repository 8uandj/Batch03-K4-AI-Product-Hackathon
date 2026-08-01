import { NextResponse } from "next/server";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const access = await requireProjectAccess(id);
    if (!access.supabase) return NextResponse.json({ allowMemberTaskCreation: false });
    const result = await access.supabase.from("projects").select("allow_member_task_creation").eq("id", id).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ allowMemberTaskCreation: result.data?.allow_member_task_creation === true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải cài đặt project." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const access = await requireProjectAccess(id);
    if (access.role !== "pm" || !access.supabase) return NextResponse.json({ error: "Chỉ PM mới có thể đổi cài đặt project." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { allowMemberTaskCreation?: unknown };
    const enabled = body.allowMemberTaskCreation === true;
    const result = await access.supabase.from("projects").update({ allow_member_task_creation: enabled, updated_at: new Date().toISOString() }).eq("id", id).select("allow_member_task_creation").single();
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ allowMemberTaskCreation: result.data.allow_member_task_creation === true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể cập nhật cài đặt project." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}
