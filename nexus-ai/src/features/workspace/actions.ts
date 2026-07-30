"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type WorkspaceActionState = {
  error?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
  }

  await supabase.from("users").upsert({
    id: user.id,
    name: user.user_metadata?.name || user.email || null,
  });

  return { supabase, user };
}

export async function createProject(
  _previousState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const name = getString(formData, "name");
    const description = getString(formData, "description");

    if (!name) return { error: "Tên project không được để trống." };

    const { supabase } = await requireUser();
    const { data: projectId, error: projectError } = await supabase.rpc(
      "create_project_with_pm",
      {
        project_name: name,
        project_description: description || null,
      },
    );

    if (projectError || !projectId) {
      return { error: projectError?.message || "Không thể tạo project." };
    }

    redirect(`/project/${projectId}`);
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? String(error.digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;

    return {
      error: error instanceof Error ? error.message : "Không thể tạo project.",
    };
  }
}

export async function inviteMember(
  _previousState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const projectId = getString(formData, "projectId");
    const email = getString(formData, "email");
    const role = getString(formData, "role") === "pm" ? "pm" : "member";

    if (!projectId || !email) {
      return { error: "Thiếu project hoặc email invite." };
    }

    const { supabase, user } = await requireUser();
    const { data: membership } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership?.role !== "pm") {
      return { error: "Chỉ PM của project mới được mời thành viên." };
    }

    const { error } = await supabase.from("project_invites").insert({
      project_id: projectId,
      email,
      role,
    });

    if (error) return { error: error.message };
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể tạo invite.",
    };
  }
}
