import { NextResponse } from "next/server";

import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";

type RouteContext = { params: Promise<{ id: string }> };
type Draft = { title: string; description: string; acceptance_criteria: string; priority: "low" | "medium" | "high"; assignee_id: string; required_skills: string[]; due_in_days: number };

function validateDrafts(value: unknown, memberIds: Set<string>): Draft[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 10) throw new Error("Bản nháp task không hợp lệ.");
  const drafts = value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Bản nháp task không hợp lệ.");
    const draft = item as Record<string, unknown>;
    const title = typeof draft.title === "string" ? draft.title.trim().slice(0, 160) : "";
    const description = typeof draft.description === "string" ? draft.description.trim().slice(0, 1200) : "";
    const acceptanceCriteria = typeof draft.acceptance_criteria === "string" ? draft.acceptance_criteria.trim().slice(0, 2000) : "";
    const assigneeId = typeof draft.assignee_id === "string" ? draft.assignee_id : "";
    const priority: Draft["priority"] = draft.priority === "low" || draft.priority === "high" ? draft.priority : "medium";
    const dueInDays = Number(draft.due_in_days);
    const requiredSkills = Array.isArray(draft.required_skills) ? draft.required_skills.filter((skill): skill is string => typeof skill === "string").map((skill) => skill.trim()).filter(Boolean).slice(0, 5) : [];
    if (!title || !description || !acceptanceCriteria || !memberIds.has(assigneeId) || !Number.isFinite(dueInDays) || dueInDays < 1 || dueInDays > 30) throw new Error("Task draft chứa dữ liệu không hợp lệ hoặc assignee ngoài project.");
    return { title, description, acceptance_criteria: acceptanceCriteria, priority, assignee_id: assigneeId, required_skills: requiredSkills, due_in_days: Math.floor(dueInDays) };
  });
  return drafts;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    if (access.role !== "pm" || !access.supabase) return NextResponse.json({ error: "Chỉ PM mới có quyền duyệt Auto-Tasking." }, { status: 403 });
    const body = await request.json() as { recommendationId?: string; tasks?: unknown };
    if (!body.recommendationId) return NextResponse.json({ error: "Thiếu mã bản nháp Auto-Tasking." }, { status: 400 });

    const members = await access.supabase.from("project_members").select("user_id").eq("project_id", projectId);
    if (members.error) throw new Error(members.error.message);
    const drafts = validateDrafts(body.tasks, new Set((members.data ?? []).map((member) => member.user_id)));

    const inserted = await access.supabase.rpc("approve_auto_tasking_draft", {
      target_project_id: projectId,
      recommendation_id: body.recommendationId,
      approved_tasks: drafts,
    });
    if (inserted.error) throw new Error(inserted.error.message);
    return NextResponse.json({ success: true, recommendationId: body.recommendationId, tasks: inserted.data ?? [], persisted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể duyệt Auto-Tasking." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}
