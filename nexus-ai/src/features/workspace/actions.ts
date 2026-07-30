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

  await supabase.rpc("ensure_user_profile");

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

export async function createInvite(
  _previousState: WorkspaceActionState & { inviteLink?: string },
  formData: FormData,
): Promise<WorkspaceActionState & { inviteLink?: string }> {
  try {
    const projectId = getString(formData, "projectId");
    const email = getString(formData, "email");
    const userCode = getString(formData, "userCode");
    const role = getString(formData, "role") === "pm" ? "pm" : "member";

    if (!projectId) return { error: "Thiếu project id." };
    if (!email && !userCode) return { error: "Nhập email hoặc user code để mời." };

    const { supabase } = await requireUser();
    const { data: invite, error } = await supabase.rpc("create_project_invite", {
      target_project_id: projectId,
      invitee_email: email || null,
      invitee_user_code: userCode || null,
      invite_role: role,
    });

    if (error || !invite) return { error: error?.message || "Không thể tạo invite." };
    return { inviteLink: `/join/${invite.token}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể tạo invite." };
  }
}

export async function acceptInvite(
  _previousState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const token = getString(formData, "token");
    const { supabase } = await requireUser();
    const { data: projectId, error } = await supabase.rpc("accept_project_invite", {
      invite_token: token,
    });

    if (error || !projectId) return { error: error?.message || "Không thể join project." };
    redirect(`/project/${projectId}`);
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? String(error.digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;

    return { error: error instanceof Error ? error.message : "Không thể join project." };
  }
}

export async function generateProjectRecommendations(
  _previousState: WorkspaceActionState & { message?: string },
  formData: FormData,
): Promise<WorkspaceActionState & { message?: string }> {
  try {
    const projectId = getString(formData, "projectId");
    if (!projectId) return { error: "Thiếu project id." };

    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("generate_project_recommendations", {
      target_project_id: projectId,
    });

    if (error) return { error: error.message };
    const count = Array.isArray(data) ? data.length : 0;
    return { message: `Đã tạo ${count} đề xuất chia việc từ tài liệu và hồ sơ thành viên.` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể chạy AI analysis.",
    };
  }
}
