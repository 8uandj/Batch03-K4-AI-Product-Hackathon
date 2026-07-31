"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireProjectAccess } from "./access";

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

export async function updateProjectDeadline(
  _previousState: WorkspaceActionState & { success?: boolean },
  formData: FormData,
): Promise<WorkspaceActionState & { success?: boolean }> {
  try {
    const projectId = getString(formData, "projectId");
    const deadlineAtStr = getString(formData, "deadlineAt");

    if (!projectId) return { error: "Thiếu project id." };
    const deadlineAt = deadlineAtStr ? new Date(deadlineAtStr).toISOString() : null;

    const { supabase, role } = await requireProjectAccess(projectId);
    if (role !== "pm") {
      return { error: "Chỉ PM mới có quyền cập nhật deadline dự án." };
    }

    if (projectId === "demo") {
      return { success: true };
    }

    if (!supabase) {
      return { error: "Không thể kết nối dữ liệu project." };
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({ deadline_at: deadlineAt, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (updateError) {
      return { error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Không thể cập nhật deadline.",
    };
  }
}

export async function joinProjectWithInput(
  _previousState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const input = getString(formData, "input");
    if (!input) return { error: "Vui lòng nhập Project ID hoặc Link Invite." };

    const { supabase, user } = await requireUser();

    // Check if it is a UUID (Project ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(input)) {
      if (input === "demo") {
        redirect(`/project/demo`);
      }

      // Check if project exists
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", input)
        .maybeSingle();

      if (projectError || !project) {
        return { error: "Không tìm thấy project với ID này." };
      }

      // Check if already a member
      const { data: member } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", input)
        .eq("user_id", user.id)
        .maybeSingle();

      if (member) {
        redirect(`/project/${input}`);
      }

      // Insert member
      const { error: insertError } = await supabase
        .from("project_members")
        .insert({
          project_id: input,
          user_id: user.id,
          role: "member",
        });

      if (insertError) {
        return { error: insertError.message };
      }

      redirect(`/project/${input}`);
    }

    // Otherwise, treat as invite link or token
    let token = input;
    if (input.includes("/join/")) {
      const parts = input.split("/join/");
      token = parts[parts.length - 1].split("?")[0].split("#")[0].trim();
    }

    if (token === "demo") {
      redirect(`/project/demo`);
    }

    // Call accept_project_invite RPC
    const { data: projectId, error: inviteError } = await supabase.rpc("accept_project_invite", {
      invite_token: token,
    });

    if (inviteError || !projectId) {
      return { error: inviteError?.message || "Mã invite không hợp lệ hoặc đã hết hạn." };
    }

    redirect(`/project/${projectId}`);
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? String(error.digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;

    return {
      error: error instanceof Error ? error.message : "Có lỗi xảy ra khi tham gia project.",
    };
  }
}
