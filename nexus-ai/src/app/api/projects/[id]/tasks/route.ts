import { NextResponse } from "next/server";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";
import { forceAssignOverrideError } from "@/features/ai/assignment";
import { persistAgentRun } from "@/features/ai/model-router";
import { buildDelegationCandidates, type DelegationDaily, type DelegationPrivacy, type DelegationTask } from "@/features/ai/smart-delegation";

type RouteContext = { params: Promise<{ id: string }> };
const sourceTypes = ["feedback_change", "bug_fix", "urgent_request", "admin_logistics", "other"] as const;
const priorities = ["low", "medium", "high"] as const;
const efforts = ["small", "medium", "large"] as const;
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function contextFor(projectId: string, supabase: NonNullable<Awaited<ReturnType<typeof requireProjectAccess>>["supabase"]>, readTeamPrivacy = false) {
  const [project, members, tasks, daily, preferences] = await Promise.all([
    supabase.from("projects").select("deadline_at,allow_member_task_creation").eq("id", projectId).maybeSingle(),
    supabase.from("project_members").select("user_id").eq("project_id", projectId),
    supabase.from("tasks").select("id,title,status,priority,assignee_id,due_at,updated_at,required_skills,blocked_by_task_id").eq("project_id", projectId),
    supabase.from("member_activity_daily").select("user_id,activity_date,open_tasks,doing_tasks,overdue_tasks,stale_doing_tasks,reminder_count,completed_tasks,late_night_updates").eq("project_id", projectId).gte("activity_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
    readTeamPrivacy
      ? supabase.rpc("get_project_privacy_flags", { target_project_id: projectId })
      : supabase.from("member_ai_preferences").select("user_id,behavioral_insights_enabled,late_night_signal_enabled").eq("project_id", projectId),
  ]);
  if (project.error || members.error || tasks.error || daily.error || preferences.error) throw new Error(project.error?.message || members.error?.message || tasks.error?.message || daily.error?.message || preferences.error?.message);
  const ids = (members.data ?? []).map((row) => row.user_id);
  const users = ids.length ? await supabase.from("users").select("id,name,email,skills,eq_answers").in("id", ids) : { data: [], error: null };
  if (users.error) throw new Error(users.error.message);
  return {
    deadlineAt: (project.data as { deadline_at?: string | null } | null)?.deadline_at ?? null,
    allowMemberTaskCreation: (project.data as { allow_member_task_creation?: boolean } | null)?.allow_member_task_creation === true,
    users: (users.data ?? []).map((user) => ({ id: user.id, name: user.name, email: user.email, skills: user.skills, eqAnswers: user.eq_answers as Record<string, unknown> | null })),
    tasks: (tasks.data ?? []) as Array<{ id: string; title: string; status: string; priority: string; assignee_id: string; due_at: string | null; updated_at: string; required_skills: string[] | null; blocked_by_task_id: string | null }>,
    dailyRows: (daily.data ?? []) as DelegationDaily[],
    privacy: (preferences.data ?? []) as DelegationPrivacy[],
  };
}

function previewFor(input: { skills: string[]; urgent: boolean; dueAt: string | null; context: Awaited<ReturnType<typeof contextFor>> }) {
  const result = buildDelegationCandidates({
    members: input.context.users.map((user) => ({ id: user.id, name: user.name || user.email?.split("@")[0] || user.id.slice(0, 8), skills: user.skills ?? [], eqAnswers: user.eqAnswers })),
    tasks: input.context.tasks as DelegationTask[],
    dailyRows: input.context.dailyRows,
    privacy: input.context.privacy,
    requiredSkills: input.skills,
    urgent: input.urgent,
    dueAt: input.dueAt,
    deadlineAt: input.context.deadlineAt,
  });
  const { phase, weights } = result;
  const candidates = result.candidates;
  const skillFitCandidate = [...candidates].sort((a, b) => b.skillFit - a.skillFit)[0] ?? null;
  const capacityFitCandidate = [...candidates].sort((a, b) => b.capacity - a.capacity)[0] ?? null;
  return {
    phase,
    weights,
    candidates,
    recommended: candidates[0] ?? null,
    skillFitCandidate,
    capacityFitCandidate,
    splitTaskSuggestion: candidates.length > 1 && skillFitCandidate?.userId !== capacityFitCandidate?.userId
      ? `Có thể giao phần chuyên môn cho ${skillFitCandidate?.name} và phần thực thi/hỗ trợ cho ${capacityFitCandidate?.name}.`
      : null,
    supportSuggestion: capacityFitCandidate && capacityFitCandidate.capacity < 60
      ? "Nên thêm người hỗ trợ hoặc giảm scope trước khi giao task."
      : "Có thể giao task với workload hiện tại.",
    rationale: candidates[0]
      ? `Đề xuất ${candidates[0].name} theo phase ${phase}, cân bằng skill fit, capacity, lịch sử hoàn thành và work-style phù hợp.`
      : "Chưa có thành viên phù hợp trong project.",
    forecastImpact: candidates[0]
      ? `${candidates[0].name} còn khoảng capacity ${candidates[0].capacity}/100 sau khi tính workload hiện tại.`
      : "Không thể dự báo vì project chưa có thành viên.",
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params; const access = await requireProjectAccess(id);
    if (!access.supabase) return NextResponse.json({ tasks: [] });
    const result = await access.supabase.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false });
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ tasks: result.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải danh sách task." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params; const access = await requireProjectAccess(id);
    if (!access.supabase) return NextResponse.json({ error: "Không thể kết nối dữ liệu project." }, { status: 500 });
    const body = await request.json() as Record<string, unknown>;
    const title = clean(body.title, 160), description = clean(body.description, 4000), selectedId = clean(body.assignee_id, 100);
    const skills = Array.isArray(body.required_skills) ? body.required_skills.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean).slice(0, 10) : [];
    const sourceType = clean(body.source_type, 40), priority = clean(body.priority, 20), effort = clean(body.effort_size, 20), dueAt = body.due_at ? clean(body.due_at, 80) : null, urgent = body.is_urgent === true;
    if (title.length < 3) return NextResponse.json({ error: "Tiêu đề task phải có ít nhất 3 ký tự." }, { status: 400 });
    if (!priorities.includes(priority as typeof priorities[number]) || !sourceTypes.includes(sourceType as typeof sourceTypes[number]) || !efforts.includes(effort as typeof efforts[number])) return NextResponse.json({ error: "Thông tin task không hợp lệ." }, { status: 400 });
    if (dueAt && Number.isNaN(new Date(dueAt).getTime())) return NextResponse.json({ error: "due_at không hợp lệ." }, { status: 400 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = access.supabase as any; const startedAt = Date.now(); const context = await contextFor(id, db, access.role === "pm"), preview = previewFor({ skills, urgent, dueAt, context });
    if (access.role !== "pm" && !context.allowMemberTaskCreation) return NextResponse.json({ error: "Project chưa cho phép member tạo task." }, { status: 403 });
    if (access.role === "pm") await persistAgentRun(db, { project_id: id, agent: "auto_tasking", tier: "rule", model: null, status: "success", fallback: false, latency_ms: Date.now() - startedAt });
    const selected = selectedId || preview.recommended?.userId;
    if (!selected || !context.users.some((user) => user.id === selected)) return NextResponse.json({ error: "Assignee không thuộc project.", preview }, { status: 400 });
    const candidate = preview.candidates.find((item) => item.userId === selected), overrideReason = clean(body.override_reason, 1000), mitigation = clean(body.mitigation, 50);
    const responsePreview = { ...preview, selectedCandidate: candidate ?? null };
    const overrideError = candidate ? forceAssignOverrideError(candidate.capacityRisk, overrideReason, mitigation) : null;
    if (overrideError === "assignment_confirmation_required") return NextResponse.json({ error: "Thành viên đang có risk cao. Cần xác nhận override và phương án giảm tải.", code: overrideError, preview: responsePreview }, { status: 409 });
    if (overrideError === "emergency_override_required") return NextResponse.json({ error: "Critical force-assign chỉ được phép với mitigation emergency.", code: overrideError, preview: responsePreview }, { status: 409 });
    const sourceTaskId = clean(body.source_task_id, 100) || null;
    const blockedByTaskId = clean(body.blocked_by_task_id, 100) || null;
    if ((sourceTaskId && !isUuid(sourceTaskId)) || (blockedByTaskId && !isUuid(blockedByTaskId))) return NextResponse.json({ error: "source_task_id hoặc blocked_by_task_id không hợp lệ." }, { status: 400 });
    if (blockedByTaskId && !context.tasks.some((task) => task.id === blockedByTaskId)) return NextResponse.json({ error: "Dependency task không thuộc project này." }, { status: 400 });
    if (blockedByTaskId === sourceTaskId) return NextResponse.json({ error: "Task không thể tự phụ thuộc vào chính task gốc." }, { status: 400 });
    if (sourceTaskId) {
      const sourceTask = context.tasks.find((task) => task.id === sourceTaskId);
      if (!sourceTask) return NextResponse.json({ error: "Task gốc không thuộc project này." }, { status: 400 });
      if (sourceType !== "feedback_change" && sourceType !== "bug_fix") {
        return NextResponse.json({ error: "Task gốc chỉ được dùng cho feedback hoặc bug fix." }, { status: 400 });
      }
      if (sourceTask.status !== "done") {
        return NextResponse.json({ error: "Task gốc phải hoàn tất trước khi tạo task rework." }, { status: 409 });
      }
    }
    const saved = await db.rpc("create_manual_task", {
      target_project_id: id,
      task_title: title,
      task_description: description,
      task_priority: priority,
      target_assignee_id: selected,
      task_skills: skills,
      task_due_at: dueAt,
      dependency_task_id: blockedByTaskId,
      task_origin: sourceTaskId ? "rework" : "ad_hoc",
      task_source_type: sourceType,
      source_task_id: sourceTaskId,
      task_effort_size: effort,
      task_is_urgent: urgent,
      task_acceptance_criteria: clean(body.acceptance_criteria, 2000),
      decision_input: {
        suggested_user_id: preview.recommended?.userId ?? null,
        project_phase: preview.phase,
        risk_level: candidate?.capacityRisk ?? "low",
        weights: preview.weights,
        evidence: { candidates: preview.candidates, title, requiredSkills: skills },
        override_reason: overrideReason || null,
        mitigation: mitigation || null,
      },
    });
    if (saved.error) throw new Error(saved.error.message);
    const savedTask = Array.isArray(saved.data) ? saved.data[0] : saved.data;
    if (!savedTask) throw new Error("Database không trả về task vừa tạo.");
    return NextResponse.json({ task: savedTask, preview: responsePreview, persisted: true, transaction: "create_manual_task" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo task." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }

}
