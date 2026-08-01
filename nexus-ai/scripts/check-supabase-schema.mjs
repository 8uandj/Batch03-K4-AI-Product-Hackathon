import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationDir = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");
const requiredMigrationIds = Array.from({ length: 29 }, (_, index) => String(index + 14).padStart(3, "0"));
// A migration prefix is sufficient here; filenames are intentionally allowed
// to evolve while their ordered numeric IDs remain stable.
const { readdirSync } = await import("node:fs");
const availableMigrationNames = readdirSync(migrationDir);
const actuallyMissingMigrations = requiredMigrationIds.filter((id) => !availableMigrationNames.some((name) => name.startsWith(`${id}_`)));
if (actuallyMissingMigrations.length) {
  console.error(`Missing ordered Supabase migrations: ${actuallyMissingMigrations.join(", ")}`);
  process.exit(1);
}
console.log(`[ok] local migration manifest 014–042 (${requiredMigrationIds.length} files)`);

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!baseUrl || !apiKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and Supabase key for live smoke-check.");
  process.exit(1);
}

const checks = [
  "deadline_notifications?select=kind,tone,action_link,notification_day",
  "task_activity_events?select=event_type,actor_id,metadata",
  "assignment_decisions?select=project_phase,weights,evidence,risk_level",
  "agent_runs?select=agent,model,latency_ms,fallback",
  "member_activity_daily?select=activity_date,late_night_updates,overdue_tasks",
  "member_ai_preferences?select=behavioral_insights_enabled,late_night_signal_enabled,chat_analysis_enabled",
  "assignment_followups?select=due_at,status",
  "projects?select=allow_member_task_creation,deadline_at",
  "tasks?select=origin,source_type,source_task_id,created_by,effort_size,is_urgent,acceptance_criteria,blocked_by_task_id",
];

let failed = false;
for (const table of checks) {
  let response;
  try {
    const resource = table.includes("?") ? `${table}&limit=0` : `${table}?select=*&limit=0`;
    response = await fetch(`${baseUrl}/rest/v1/${resource}`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    });
  } catch (error) {
    console.error(`[unreachable] ${table}: ${error instanceof Error ? error.message : "network error"}`);
    failed = true;
    continue;
  }
  if (!response.ok) {
    failed = true;
    console.error(`[missing] ${table}: HTTP ${response.status} ${await response.text()}`);
  } else {
    console.log(`[ok] ${table}`);
  }
}

if (failed) {
    console.error("Apply migrations 014 through 042 in order, then reload the PostgREST schema cache.");
  process.exit(1);
}
