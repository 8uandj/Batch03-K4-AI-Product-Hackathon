import { NextResponse } from "next/server";
import { ProjectAccessError, requireProjectAccess } from "@/features/workspace/access";
import { defaultPrivacyPreferences } from "@/features/eq-radar/privacy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    if (!access.supabase) return NextResponse.json(defaultPrivacyPreferences);
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = access.supabase as any;
    const [result, activity] = await Promise.all([
      db.from("member_ai_preferences").select("*").eq("project_id", projectId).eq("user_id", access.user.id).maybeSingle(),
      db.from("member_activity_daily").select("activity_date,open_tasks,doing_tasks,overdue_tasks,stale_doing_tasks,reminder_count,completed_tasks,late_night_updates").eq("project_id", projectId).eq("user_id", access.user.id).order("activity_date", { ascending: false }).limit(30),
    ]);
    if (result.error) throw new Error(result.error.message);
    if (activity.error) throw new Error(activity.error.message);
    const rows = (activity.data ?? []) as Array<{ activity_date: string; open_tasks: number; doing_tasks: number; overdue_tasks: number; stale_doing_tasks: number; reminder_count: number; completed_tasks: number; late_night_updates: number }>;
    const preferences = result.data ?? { ...defaultPrivacyPreferences, project_id: projectId, user_id: access.user.id };
    return NextResponse.json({
      ...preferences,
      behavioralData: {
        windowDays: 30,
        daysObserved: rows.length,
        overdueTasks: rows.reduce((sum, row) => sum + Math.max(0, row.overdue_tasks || 0), 0),
        staleDoingTasks: rows.reduce((sum, row) => sum + Math.max(0, row.stale_doing_tasks || 0), 0),
        reminderCount: rows.reduce((sum, row) => sum + Math.max(0, row.reminder_count || 0), 0),
        completedTasks: rows.reduce((sum, row) => sum + Math.max(0, row.completed_tasks || 0), 0),
        lateNightUpdates: preferences.late_night_signal_enabled === false ? 0 : rows.reduce((sum, row) => sum + Math.max(0, row.late_night_updates || 0), 0),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tải cài đặt privacy." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    if (!access.supabase) return NextResponse.json(defaultPrivacyPreferences);
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = access.supabase as any;
    const body = await request.json() as Record<string, unknown>;
    const requestedTimezone = typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim().slice(0, 64)
      : defaultPrivacyPreferences.timezone;
    try {
      Intl.DateTimeFormat("en-US", { timeZone: requestedTimezone }).format(new Date());
    } catch {
      return NextResponse.json({ error: "Timezone không hợp lệ." }, { status: 400 });
    }
    const payload = {
      user_id: access.user.id,
      project_id: projectId,
      behavioral_insights_enabled: body.behavioralInsightsEnabled !== false,
      late_night_signal_enabled: body.lateNightSignalEnabled !== false,
      chat_analysis_enabled: body.chatAnalysisEnabled === true,
      timezone: requestedTimezone,
      updated_at: new Date().toISOString(),
    };
    const result = await db.from("member_ai_preferences").upsert(payload).select("*").single();
    if (result.error) throw new Error(result.error.message);
    if (!payload.behavioral_insights_enabled || !payload.late_night_signal_enabled) {
      const cleanup = await db.from("member_activity_daily").delete().eq("project_id", projectId).eq("user_id", access.user.id);
      if (cleanup.error) throw new Error(cleanup.error.message);
    }
    if (!payload.chat_analysis_enabled) {
      const cleanup = await db.rpc("delete_member_behavioral_data", { target_project_id: projectId });
      if (cleanup.error) throw new Error(cleanup.error.message);
    }
    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể cập nhật cài đặt privacy." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    if (!access.supabase) return NextResponse.json({ deleted: 0, persisted: false });
    const result = await access.supabase.rpc("delete_member_behavioral_data", { target_project_id: projectId });
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ ...(result.data ?? {}), persisted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể xóa dữ liệu behavioral." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}
