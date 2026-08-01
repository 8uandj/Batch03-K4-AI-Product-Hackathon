import { createAdminClient } from "@/lib/supabase/admin";
import { buildDailyActivityAggregate } from "@/features/eq-radar/daily-aggregation";

export const runtime = "nodejs";

type MembershipRow = { project_id: string; user_id: string };
type TaskRow = { project_id: string; assignee_id: string; status: string; due_at: string | null; updated_at: string | null };
type PreferenceRow = { project_id: string; user_id: string; behavioral_insights_enabled: boolean; late_night_signal_enabled: boolean; timezone: string };
type ReminderRow = { project_id: string; recipient_user_id: string };

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return Response.json({ error: "Thiếu CRON_SECRET trên môi trường deploy." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Service role is scoped to this scheduled aggregate write. No raw
    // timestamps are returned to users and disabled members are skipped.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    const now = new Date();
    const [memberships, tasks, preferences, reminders] = await Promise.all([
      db.from("project_members").select("project_id,user_id"),
      db.from("tasks").select("project_id,assignee_id,status,due_at,updated_at").not("project_id", "is", null),
      db.from("member_ai_preferences").select("project_id,user_id,behavioral_insights_enabled,late_night_signal_enabled,timezone"),
      db.from("deadline_notifications").select("project_id,recipient_user_id").gte("created_at", new Date(now.getTime() - 7 * 86400000).toISOString()),
    ]);
    if (memberships.error || tasks.error || preferences.error || reminders.error) throw new Error(memberships.error?.message || tasks.error?.message || preferences.error?.message || reminders.error?.message);
    const tasksByMember = new Map<string, TaskRow[]>();
    for (const task of (tasks.data ?? []) as TaskRow[]) {
      const key = `${task.project_id}:${task.assignee_id}`;
      tasksByMember.set(key, [...(tasksByMember.get(key) ?? []), task]);
    }
    const preferencesByMember = new Map(((preferences.data ?? []) as PreferenceRow[]).map((preference) => [`${preference.project_id}:${preference.user_id}`, preference]));
    const remindersByMember = new Map<string, number>();
    for (const reminder of (reminders.data ?? []) as ReminderRow[]) {
      const key = `${reminder.project_id}:${reminder.recipient_user_id}`;
      remindersByMember.set(key, (remindersByMember.get(key) ?? 0) + 1);
    }
    const rows = [];
    for (const membership of (memberships.data ?? []) as MembershipRow[]) {
      const key = `${membership.project_id}:${membership.user_id}`;
      const preference = preferencesByMember.get(key);
      if (preference?.behavioral_insights_enabled === false) continue;
      const daily = buildDailyActivityAggregate({
        tasks: tasksByMember.get(key) ?? [],
        now,
        timeZone: preference?.timezone,
        lateNightEnabled: preference?.late_night_signal_enabled !== false,
        reminderCount: remindersByMember.get(key) ?? 0,
      });
      rows.push({ project_id: membership.project_id, user_id: membership.user_id, ...daily });
    }
    if (rows.length) {
      const result = await db.from("member_activity_daily").upsert(rows, { onConflict: "project_id,user_id,activity_date" });
      if (result.error) throw new Error(result.error.message);
    }
    return Response.json({ success: true, membersScanned: (memberships.data ?? []).length, aggregatesWritten: rows.length, aggregationDay: new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(now) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không thể chạy EQ Radar aggregation." }, { status: 500 });
  }
}
