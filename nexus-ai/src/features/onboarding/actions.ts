"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types";

type OnboardingState = {
  error?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeNextPath(value: string) {
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  return value;
}

function buildEqSummary(eqAnswers: Record<string, string>) {
  return {
    bug_handling: eqAnswers.q1_bugHandling || "",
    task_preference: eqAnswers.q2_taskPreference || "",
    communication: eqAnswers.q3_communication || "",
    conflict_resolution: eqAnswers.q4_conflictResolution || "",
    feedback_handling: eqAnswers.q5_feedbackHandling || "",
    summary: "Rule-based MVP EQ profile generated from DEV-01 onboarding answers.",
    generated_by: "dev_01_rule_based_mvp",
  };
}

export async function completeOnboarding(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  try {
    const name = getString(formData, "name");
    const next = safeNextPath(getString(formData, "next") || "/dashboard");
    const rawCV = getString(formData, "rawCV");
    const skills = JSON.parse(getString(formData, "skills") || "[]") as string[];
    const eqAnswers = JSON.parse(getString(formData, "eqAnswers") || "{}") as Record<string, string>;

    if (!name) return { error: "Vui lòng nhập tên hiển thị." };
    if (!rawCV) return { error: "Vui lòng upload hoặc dán CV." };
    if (!skills.length) return { error: "Vui lòng chọn hoặc trích xuất ít nhất một kỹ năng." };
    if (Object.keys(eqAnswers).length < 5) return { error: "Vui lòng hoàn tất bài EQ." };

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return { error: "Bạn cần đăng nhập để hoàn tất onboarding." };

    await supabase.rpc("ensure_user_profile");

    const eqSummary = buildEqSummary(eqAnswers);
    const { error } = await supabase.from("users").upsert({
      id: user.id,
      email: user.email ?? null,
      name,
      skills,
      cv_text: rawCV,
      eq_answers: eqAnswers as Json,
      eq_summary: eqSummary as Json,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    if (error) return { error: error.message };
    redirect(next);
  } catch (error) {
    const digest =
      typeof error === "object" && error && "digest" in error
        ? String(error.digest)
        : "";
    if (digest.startsWith("NEXT_REDIRECT")) throw error;

    return { error: error instanceof Error ? error.message : "Không thể lưu onboarding." };
  }
}
