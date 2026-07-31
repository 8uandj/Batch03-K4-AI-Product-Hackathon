"use server";

import { createClient } from "@/lib/supabase/server";

type ProfileState = { error?: string; message?: string };

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseSkills(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

export async function updateProfile(
  _previousState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  try {
    const supabase = await createClient();
    const { data: profile, error: ensureError } = await supabase.rpc("ensure_user_profile");
    if (ensureError || !profile) return { error: ensureError?.message || "Không thể tải profile." };

    const { error } = await supabase
      .from("users")
      .update({
        name: getString(formData, "name") || null,
        bio: getString(formData, "bio") || null,
        avatar_url: getString(formData, "avatarUrl") || null,
        cv_url: getString(formData, "cvUrl") || null,
        cv_text: getString(formData, "cvText") || null,
        skills: parseSkills(getString(formData, "skills")),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) return { error: error.message };
    return { message: "Đã cập nhật profile." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể cập nhật profile." };
  }
}
