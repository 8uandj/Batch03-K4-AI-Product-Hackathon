import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types";

export type ProfileProject = { id: string; name: string; role: "pm" | "member" };

export async function getProfilePageData(): Promise<{ profile: User; projects: ProfileProject[] }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Bạn cần đăng nhập để xem profile.");

  const { data: ensured, error: ensureError } = await supabase.rpc("ensure_user_profile");
  let profile = ensured as User | null;

  if (ensureError || !profile) {
    const { data: fallbackProfile, error: fallbackError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (fallbackError || !fallbackProfile) {
      throw new Error(
        `${ensureError?.message || fallbackError?.message || "Không thể tải profile."} Hãy chạy migration 006_invites_profile_user_code.sql nếu chưa chạy.`,
      );
    }

    profile = fallbackProfile as User;
  }
  const { data: memberships, error: memberError } = await supabase
    .from("project_members")
    .select("project_id,role")
    .eq("user_id", profile.id);
  if (memberError) throw new Error(memberError.message);

  const projectIds = (memberships ?? []).map((item) => item.project_id);
  const roleByProject = new Map((memberships ?? []).map((item) => [item.project_id, item.role]));
  const { data: projects, error: projectError } = projectIds.length
    ? await supabase.from("projects").select("id,name").in("id", projectIds)
    : { data: [], error: null };
  if (projectError) throw new Error(projectError.message);

  return {
    profile,
    projects: (projects ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      role: roleByProject.get(project.id) ?? "member",
    })),
  };
}
