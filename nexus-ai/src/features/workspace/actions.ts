"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireProjectAccess } from "./access";

type WorkspaceActionState = {
  error?: string;
  message?: string;
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
  _previousState: WorkspaceActionState & {
    inviteLinks?: Array<{ recipient: string; link: string; emailSent: boolean }>;
    message?: string;
  },
  formData: FormData,
): Promise<WorkspaceActionState & {
  inviteLinks?: Array<{ recipient: string; link: string; emailSent: boolean }>;
  message?: string;
}> {
  try {
    const projectId = getString(formData, "projectId");
    const role = getString(formData, "role") === "pm" ? "pm" : "member";
    const rawInvitees = [
      getString(formData, "invitees"),
      getString(formData, "email"),
      getString(formData, "userCode"),
    ].filter(Boolean).join("\n");
    const invitees = [...new Set(rawInvitees.split(/[\s,;]+/).map((value) => value.trim().toLowerCase()).filter(Boolean))];

    if (!projectId) return { error: "Thiếu project id." };
    if (!invitees.length) return { error: "Nhập ít nhất một email hoặc user code để mời." };

    const { supabase } = await requireUser();
    const inviteLinks: Array<{ recipient: string; link: string; emailSent: boolean }> = [];
    const failures: string[] = [];
    const vercelHost =
      process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    const siteUrl = (
      vercelHost
        ? `https://${vercelHost.replace(/^https?:\/\//, "")}`
        : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ).replace(/\/$/, "");

    for (const recipient of invitees) {
      const isEmail = recipient.includes("@");
      const { data: invite, error } = await supabase.rpc("create_project_invite", {
        target_project_id: projectId,
        invitee_email: isEmail ? recipient : null,
        invitee_user_code: isEmail ? null : recipient.toUpperCase(),
        invite_role: role,
      });

      if (error || !invite) {
        failures.push(`${recipient}: ${error?.message || "không tạo được invite"}`);
        continue;
      }

      const link = `${siteUrl}/join/${invite.token}`;
      const emailSent = isEmail ? await sendInviteEmail(recipient, link, projectId) : false;
      inviteLinks.push({ recipient, link, emailSent });
    }

    if (!inviteLinks.length) return { error: failures.join(" ") || "Không thể tạo invite." };
    const sentCount = inviteLinks.filter((invite) => invite.emailSent).length;
    const message = `${inviteLinks.length} invite đã tạo${sentCount ? `, ${sentCount} email đã gửi` : ""}.${failures.length ? ` Bỏ qua ${failures.length} invite lỗi.` : ""}`;
    return { inviteLinks, message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể tạo invite." };
  }
}

async function sendInviteEmail(email: string, link: string, projectId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Bạn được mời tham gia Nexus AI project",
      html: `<p>Bạn được mời tham gia một project trên Nexus AI.</p><p><a href="${link}">Mở invite link</a></p><p>Project UUID: ${projectId}</p>`,
    }),
    });

    return response.ok;
  } catch {
    return false;
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
    redirect(`/join/${token}?status=pending`);
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? String(error.digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;

    return { error: error instanceof Error ? error.message : "Không thể join project." };
  }
}

export async function approveProjectInvite(
  _previousState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const inviteId = getString(formData, "inviteId");
    const projectId = getString(formData, "projectId");
    const { supabase, role } = await requireProjectAccess(projectId);
    if (role !== "pm") return { error: "Chỉ PM mới được duyệt thành viên." };
    if (!supabase) return { error: "Không thể kết nối dữ liệu project." };
    const { error } = await supabase.rpc("approve_project_invite", { invite_id: inviteId });
    if (error) return { error: error.message };
    revalidatePath(`/project/${projectId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể duyệt thành viên." };
  }
}

export async function rejectProjectInvite(
  _previousState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  try {
    const inviteId = getString(formData, "inviteId");
    const projectId = getString(formData, "projectId");
    const { supabase, role } = await requireProjectAccess(projectId);
    if (role !== "pm") return { error: "Chỉ PM mới được từ chối thành viên." };
    if (!supabase) return { error: "Không thể kết nối dữ liệu project." };
    const { error } = await supabase.rpc("reject_project_invite", { invite_id: inviteId });
    if (error) return { error: error.message };
    revalidatePath(`/project/${projectId}`);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể từ chối thành viên." };
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
    revalidatePath(`/project/${projectId}`);
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

    const { supabase } = await requireUser();

    // Check if it is a UUID (Project ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(input)) {
      if (input === "demo") {
        redirect(`/project/demo`);
      }

      const { data: projectId, error: requestError } = await supabase.rpc(
        "request_project_membership",
        { target_project_id: input },
      );

      if (requestError || !projectId) {
        return { error: requestError?.message || "Không thể gửi yêu cầu tham gia project." };
      }

      return { message: "Đã gửi yêu cầu tham gia. PM sẽ duyệt trước khi bạn truy cập project." };
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

    redirect(`/join/${token}?status=pending`);
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
