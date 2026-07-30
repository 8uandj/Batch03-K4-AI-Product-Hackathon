import { createClient } from "@/lib/supabase/server";

export class ProjectAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "ProjectAccessError";
    this.status = status;
  }
}

export async function requireProjectAccess(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ProjectAccessError("Bạn cần đăng nhập để truy cập project.", 401);
  }

  if (projectId === "demo") {
    return { supabase, user, role: "pm" as const };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new ProjectAccessError("Bạn không có quyền truy cập project này.", 403);
  }

  return { supabase, user, role: membership.role as "pm" | "member" };
}
