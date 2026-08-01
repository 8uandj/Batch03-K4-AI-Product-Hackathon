import { NextResponse } from "next/server";
import { buildDelegationCandidates, type DelegationDaily, type DelegationPrivacy, type DelegationTask } from "@/features/ai/smart-delegation";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };
type UserRow = { id: string; name: string | null; email: string | null; skills: string[] | null; eq_answers: Record<string, unknown> | null };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    if (!access.supabase) return NextResponse.json({ phase: "normal", candidates: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = access.supabase as any;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const skills = Array.isArray(body.required_skills) ? body.required_skills.filter((item): item is string => typeof item === "string").slice(0, 20) : [];
    const urgent = body.is_urgent === true;
    const dueAt = typeof body.due_at === "string" ? body.due_at : null;
    if (dueAt && Number.isNaN(new Date(dueAt).getTime())) return NextResponse.json({ error: "due_at không hợp lệ." }, { status: 400 });
    const [project, members, tasks, daily, preferences] = await Promise.all([
      db.from("projects").select("deadline_at").eq("id", projectId).maybeSingle(),
      db.from("project_members").select("user_id").eq("project_id", projectId),
      db.from("tasks").select("status,priority,assignee_id,due_at,updated_at").eq("project_id", projectId),
      db.from("member_activity_daily").select("user_id,activity_date,open_tasks,doing_tasks,overdue_tasks,stale_doing_tasks,reminder_count,completed_tasks,late_night_updates").eq("project_id", projectId).gte("activity_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
      access.role === "pm"
        ? db.rpc("get_project_privacy_flags", { target_project_id: projectId })
        : db.from("member_ai_preferences").select("user_id,behavioral_insights_enabled,late_night_signal_enabled").eq("project_id", projectId),
    ]);
    if (project.error || members.error || tasks.error || daily.error || preferences.error) throw new Error(project.error?.message || members.error?.message || tasks.error?.message || daily.error?.message || preferences.error?.message);
    const ids = (members.data ?? []).map((item: { user_id: string }) => item.user_id);
    const users = ids.length ? await db.from("users").select("id,name,email,skills,eq_answers").in("id", ids) : { data: [], error: null };
    if (users.error) throw new Error(users.error.message);
    const result = buildDelegationCandidates({
      members: (users.data ?? []).map((user: UserRow) => ({ id: user.id, name: user.name || user.email || user.id.slice(0, 8), skills: user.skills ?? [], eqAnswers: user.eq_answers })),
      tasks: (tasks.data ?? []) as DelegationTask[],
      dailyRows: (daily.data ?? []) as DelegationDaily[],
      privacy: (preferences.data ?? []) as DelegationPrivacy[],
      requiredSkills: skills,
      urgent,
      dueAt,
      deadlineAt: project.data?.deadline_at ?? null,
    });
    const { phase, weights, candidates } = result;
    const skillFitCandidate = [...candidates].sort((a, b) => b.skillFit - a.skillFit)[0] ?? null;
    const capacityFitCandidate = [...candidates].sort((a, b) => b.capacity - a.capacity)[0] ?? null;
    return NextResponse.json({
      phase,
      weights,
      recommended: candidates[0] ?? null,
      candidates,
      skillFitCandidate,
      capacityFitCandidate,
      splitTaskSuggestion: candidates.length > 1 && skillFitCandidate?.userId !== capacityFitCandidate?.userId ? `Có thể giao phần chuyên môn cho ${skillFitCandidate?.name} và phần thực thi/hỗ trợ cho ${capacityFitCandidate?.name}.` : null,
      supportSuggestion: capacityFitCandidate && capacityFitCandidate.capacity < 60 ? "Nên thêm người hỗ trợ hoặc giảm scope trước khi giao task." : "Có thể giao task với workload hiện tại.",
      rationale: candidates[0] ? `Đề xuất ${candidates[0].name} theo phase ${phase}, cân bằng skill fit, capacity, lịch sử hoàn thành và work-style phù hợp.` : "Chưa có thành viên phù hợp trong project.",
      forecastImpact: candidates[0] ? `${candidates[0].name} còn khoảng capacity ${candidates[0].capacity}/100; workload risk aggregate ${candidates[0].behavioralRiskScore}/100.` : "Không thể dự báo vì project chưa có thành viên.",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo assignment preview." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}
