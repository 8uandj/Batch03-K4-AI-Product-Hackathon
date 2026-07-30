import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types";

export type ProfileProject = { id: string; name: string; role: "pm" | "member" };

export async function getProfilePageData(): Promise<{ profile: User; projects: ProfileProject[] }> {
  const supabase = await createClient();
  const { data: ensured, error: ensureError } = await supabase.rpc("ensure_user_profile");
  if (ensureError || !ensured) throw new Error(ensureError?.message || "Không thể tải profile.");

  const profile = ensured as User;
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
