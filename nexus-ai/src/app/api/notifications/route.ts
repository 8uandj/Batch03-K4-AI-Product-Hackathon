import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("deadline_notifications")
    .select("id,project_id,task_id,kind,content,overdue_hours,notification_day,read_at,created_at,tone,trigger_reason,action_link")
    .eq("recipient_user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const notifications = data ?? [];
  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read_at).length,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { id?: string; all?: boolean };
  let query = supabase
    .from("deadline_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", auth.user.id)
    .is("read_at", null);
  if (!body.all && body.id) query = query.eq("id", body.id);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
