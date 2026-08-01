import { NextResponse } from "next/server";
import { aggregateBehavioralWindows, calculateBehavioralRisk, type BehavioralDailyRow } from "@/features/eq-radar/behavioral";
import { requireProjectAccess, ProjectAccessError } from "@/features/workspace/access";
import { buildDailyActivityAggregate } from "@/features/eq-radar/daily-aggregation";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id: projectId } = await params;
    const access = await requireProjectAccess(projectId);
    if (access.role !== "pm" || !access.supabase) return NextResponse.json({ error: "Chỉ PM mới có quyền quét EQ Radar." }, { status: 403 });
    const body = await request.json().catch(() => ({})) as { memberId?: string };
    const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
    if (!memberId) return NextResponse.json({ error: "Thiếu memberId." }, { status: 400 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = access.supabase as any;
    const [membership, tasks, preferences, reminders, activity, dailyActivity] = await Promise.all([
      db.from("project_members").select("user_id").eq("project_id", projectId).eq("user_id", memberId).maybeSingle(),
      db.from("tasks").select("status,due_at,updated_at,priority,created_at").eq("project_id", projectId).eq("assignee_id", memberId),
      db.from("member_ai_preferences").select("behavioral_insights_enabled,late_night_signal_enabled,timezone").eq("project_id", projectId).eq("user_id", memberId).maybeSingle(),
      db.from("deadline_notifications").select("id").eq("project_id", projectId).eq("recipient_user_id", memberId).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      db.from("task_activity_events").select("event_type").eq("project_id", projectId).eq("actor_id", memberId).gte("occurred_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      db.from("member_activity_daily").select("activity_date,open_tasks,doing_tasks,overdue_tasks,stale_doing_tasks,reminder_count,completed_tasks,late_night_updates").eq("project_id", projectId).eq("user_id", memberId).gte("activity_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).order("activity_date", { ascending: true }),
    ]);
    if (membership.error) throw new Error(membership.error.message);
    if (!membership.data) return NextResponse.json({ error: "Thành viên không thuộc project." }, { status: 400 });
    if (tasks.error) throw new Error(tasks.error.message);
    if (preferences.error) throw new Error(preferences.error.message);
    if (reminders.error && reminders.error.code !== "42P01") throw new Error(reminders.error.message);
    if (activity.error && activity.error.code !== "42P01") throw new Error(activity.error.message);
    if (dailyActivity.error && dailyActivity.error.code !== "42P01") throw new Error(dailyActivity.error.message);
    const enabled = preferences.data?.behavioral_insights_enabled !== false;
    const activityRows = activity.data ?? [];
    const blockerReports = activityRows.filter((event: { event_type: string }) => event.event_type === "blocker_reported").length;
    const supportRequests = activityRows.filter((event: { event_type: string }) => event.event_type === "support_requested").length;
    const signalTimeZone = preferences.data?.timezone || "Asia/Ho_Chi_Minh";
    const signal = enabled ? calculateBehavioralRisk(tasks.data ?? [], new Date(), { lateNightEnabled: preferences.data?.late_night_signal_enabled !== false, blockerReports, supportRequests, reminderCount: reminders.data?.length ?? 0, timeZone: signalTimeZone }) : { score: 0, level: "low" as const, signals: [], evidence: { windowDays: 7, lateNightEnabled: false, totalTasks: (tasks.data ?? []).length, blockerReports, supportRequests, reminderCount: reminders.data?.length ?? 0 }, disclaimer: "Thành viên đã tắt behavioral insights." };
    // Opting out disables the complete behavioral view, not only the headline
    // score. Never return aggregate windows (including late-night counts) after
    // the member turns behavioral insights off.
    const windows = enabled
      ? aggregateBehavioralWindows((dailyActivity.data ?? []) as BehavioralDailyRow[], new Date(), preferences.data?.late_night_signal_enabled !== false)
      : [];
    if (enabled && (signal.level === "high" || signal.level === "critical")) {
      const riskEvent = await db.rpc("record_risk_event", {
        target_project_id: projectId,
        target_user_id: memberId,
        target_task_id: null,
        event_type: "overload",
        event_severity: signal.level === "critical" ? "high" : "medium",
        event_summary: "Nexus phát hiện tín hiệu workload cần được PM kiểm tra và hỗ trợ.",
        event_metadata: { score: signal.score, signals: signal.signals, evidence: signal.evidence, privacy: "aggregate_task_activity" },
      });
      if (riskEvent.error) throw new Error(riskEvent.error.message);
    }
    if (enabled) {
      const taskRows = tasks.data ?? [];
      const now = new Date();
      const daily = buildDailyActivityAggregate({ tasks: taskRows, now, timeZone: preferences.data?.timezone, lateNightEnabled: preferences.data?.late_night_signal_enabled !== false, reminderCount: reminders.data?.length ?? 0 });
      const aggregate = await db.from("member_activity_daily").upsert({
        project_id: projectId,
        user_id: memberId,
        ...daily,
      }, { onConflict: "project_id,user_id,activity_date" });
      if (aggregate.error) throw new Error(aggregate.error.message);
    }
    return NextResponse.json({ memberId, signal, behavioralWindows: windows, privacy: { behavioralInsightsEnabled: enabled, lateNightSignalEnabled: preferences.data?.late_night_signal_enabled !== false } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể quét EQ Radar." }, { status: error instanceof ProjectAccessError ? error.status : 500 });
  }
}
