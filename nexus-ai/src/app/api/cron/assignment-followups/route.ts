import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return Response.json({ error: "Thiếu CRON_SECRET trên môi trường deploy." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // The service-role client is intentional: this job writes only after the
    // follow-up deadline and the resulting notification is RLS-scoped to its recipient.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any;
    const now = new Date();
    const followups = await db.from("assignment_followups").select("id,project_id,task_id,member_id,mitigation").eq("status", "open").is("notified_at", null).lte("due_at", now.toISOString()).limit(100);
    if (followups.error) throw new Error(followups.error.message);
    let created = 0;
    for (const followup of followups.data ?? []) {
      const processed = await db.rpc("process_assignment_followup", { target_followup_id: followup.id });
      if (processed.error || processed.data !== true) continue;
      created += 1;
    }
    return Response.json({ success: true, scanned: followups.data?.length ?? 0, notificationsCreated: created });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không thể chạy assignment follow-up." }, { status: 500 });
  }
}
