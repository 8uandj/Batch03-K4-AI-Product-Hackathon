import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";

const migrationPath = join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/018_project_isolation_guards.sql");
const migration = readFileSync(migrationPath, "utf8");
const notificationMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/019_deadline_notification_repair.sql"), "utf8");
const approvalMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/020_auto_tasking_approval_transaction.sql"), "utf8");
const memberTaskMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/021_member_task_creation_policy.sql"), "utf8");
const followupMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/022_assignment_followups.sql"), "utf8");
const dependencyMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/023_task_dependencies.sql"), "utf8");
const privacyDeletionMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/024_privacy_data_deletion.sql"), "utf8");
const manualTaskMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/025_manual_task_transaction.sql"), "utf8");
const taskMutationMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/026_task_mutation_transactions.sql"), "utf8");
const followupResponseMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/027_assignment_followup_response.sql"), "utf8");
const plannerApprovalMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/028_planner_approval_transaction.sql"), "utf8");
const riskGuardMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/029_assignment_risk_guard.sql"), "utf8");
const agentRunWriterMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/030_agent_run_writer.sql"), "utf8");
const reworkGuardMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/031_rework_source_guard.sql"), "utf8");
const ragSecurityMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/032_secure_rag_match_documents.sql"), "utf8");
const riskEventWriterMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/033_risk_event_writer.sql"), "utf8");
const autoTaskingAcceptanceMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/034_auto_tasking_acceptance_criteria.sql"), "utf8");
const privacyReadPolicyMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/035_privacy_read_policies.sql"), "utf8");
const forceAssignRecheckMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/036_force_assign_server_recheck.sql"), "utf8");
const privacyFlagsMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/037_project_privacy_flags_rpc.sql"), "utf8");
const followupProcessorMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/038_assignment_followup_processor.sql"), "utf8");
const riskEventPrivacyMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/039_risk_event_privacy_guard.sql"), "utf8");
const privacyCleanupMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/040_privacy_data_cleanup_rpc.sql"), "utf8");
const riskEventReadPrivacyMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/041_risk_event_read_privacy.sql"), "utf8");
const extendedIsolationMigration = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/migrations/042_project_isolation_guards_extended.sql"), "utf8");

test("project isolation migration guards task and member references", () => {
  assert.match(migration, /task_activity_project_guard/);
  assert.match(migration, /assignment_decision_project_guard/);
  assert.match(migration, /member_activity_project_guard/);
  assert.match(migration, /tasks_source_project_guard/);
  assert.match(migration, /Task does not belong to the event project/);
  assert.match(migration, /User does not belong to the activity project/);
});

test("deadline notification repair keeps inbox schema and own-user RLS", () => {
  assert.match(notificationMigration, /create table if not exists public\.deadline_notifications/);
  assert.match(notificationMigration, /recipient_user_id = auth\.uid\(\)/);
  assert.match(notificationMigration, /tone text/);
  assert.match(notificationMigration, /action_link text/);
});

test("Auto-Tasking approval is an atomic PM-only RPC", () => {
  assert.match(approvalMigration, /approve_auto_tasking_draft/);
  assert.match(approvalMigration, /security definer/);
  assert.match(approvalMigration, /is_project_pm\(target_project_id\)/);
  assert.match(approvalMigration, /task_activity_events/);
  assert.match(approvalMigration, /for update/);
  assert.match(approvalMigration, /acceptance_criteria/);
});

test("Auto-Tasking acceptance criteria is validated at API and database boundaries", () => {
  const route = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/tasks/auto/approve/route.ts"), "utf8");
  assert.match(autoTaskingAcceptanceMigration, /create or replace function public\.approve_auto_tasking_draft/);
  assert.match(autoTaskingAcceptanceMigration, /acceptance_criteria_value/);
  assert.match(autoTaskingAcceptanceMigration, /length\(acceptance_criteria_value\)/);
  assert.match(route, /acceptance_criteria/);
});

test("privacy read policies keep behavioral and agent telemetry PM-scoped", () => {
  assert.match(privacyReadPolicyMigration, /PMs can read team activity aggregates/);
  assert.match(privacyReadPolicyMigration, /user_id = auth\.uid\(\)/);
  assert.match(privacyReadPolicyMigration, /PMs can read assignment decisions/);
  assert.match(privacyReadPolicyMigration, /PMs can read project agent runs/);
  assert.doesNotMatch(privacyReadPolicyMigration, /create policy "Project members can read assignment decisions"/);
  assert.doesNotMatch(privacyReadPolicyMigration, /project_id is null or public\.is_project_member/);
});

test("PM privacy lookup exposes only workload eligibility flags", () => {
  const schema = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/schema.sql"), "utf8");
  assert.match(privacyFlagsMigration, /get_project_privacy_flags/);
  assert.match(privacyFlagsMigration, /is_project_pm\(target_project_id\)/);
  assert.match(privacyFlagsMigration, /behavioral_insights_enabled/);
  assert.match(privacyFlagsMigration, /late_night_signal_enabled/);
  assert.doesNotMatch(privacyFlagsMigration, /chat_analysis_enabled/);
  assert.match(schema, /get_project_privacy_flags/);
});

test("assignment follow-up cron claims each row atomically", () => {
  const cronRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/cron/assignment-followups/route.ts"), "utf8");
  assert.match(followupProcessorMigration, /process_assignment_followup/);
  assert.match(followupProcessorMigration, /for update skip locked/);
  assert.match(followupProcessorMigration, /notified_at is null/);
  assert.match(followupProcessorMigration, /on conflict [\s\S]*do nothing/);
  assert.match(followupProcessorMigration, /to service_role/);
  assert.match(cronRoute, /rpc\("process_assignment_followup"/);
  assert.doesNotMatch(cronRoute, /from\("deadline_notifications"\)\.upsert/);
});

test("risk event RPC enforces chat opt-in and derived-only conflict storage", () => {
  const schema = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/schema.sql"), "utf8");
  assert.match(riskEventPrivacyMigration, /chat_analysis_enabled = true/);
  assert.match(riskEventPrivacyMigration, /target_user_id is distinct from auth\.uid\(\)/);
  assert.match(riskEventPrivacyMigration, /Risk event task must belong to project/);
  assert.match(riskEventPrivacyMigration, /derived_signal_only/);
  assert.match(riskEventPrivacyMigration, /stored_metadata := jsonb_build_object/);
  assert.match(riskEventPrivacyMigration, /pg_advisory_xact_lock/);
  assert.match(schema, /record_risk_event/);
});

test("privacy cleanup removes only member-scoped aggregates and derived conflict data", () => {
  const privacyRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/privacy/route.ts"), "utf8");
  const schema = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/schema.sql"), "utf8");
  assert.match(privacyCleanupMigration, /delete_member_behavioral_data/);
  assert.match(privacyCleanupMigration, /user_id = auth\.uid\(\)/);
  assert.match(privacyCleanupMigration, /type = 'conflict'/);
  assert.match(privacyCleanupMigration, /to authenticated/);
  assert.match(privacyRoute, /rpc\("delete_member_behavioral_data"/);
  assert.match(schema, /delete_member_behavioral_data/);
});

test("risk event reads are PM-scoped", () => {
  const schema = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/schema.sql"), "utf8");
  assert.match(riskEventReadPrivacyMigration, /drop policy if exists "Project members can read risk events"/);
  assert.match(riskEventReadPrivacyMigration, /PMs can read risk events/);
  assert.match(riskEventReadPrivacyMigration, /is_project_pm\(project_id\)/);
  assert.doesNotMatch(riskEventReadPrivacyMigration, /Project members can read risk events"[\s\S]*using \(public\.is_project_member/);
  assert.match(schema, /create policy "PMs can read risk events"/);
});

test("extended isolation guards notifications, follow-ups and risk events", () => {
  const schema = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/schema.sql"), "utf8");
  for (const trigger of ["risk_event_project_guard", "deadline_notification_project_guard", "assignment_followup_project_guard"]) {
    assert.match(extendedIsolationMigration, new RegExp(trigger));
    assert.match(schema, new RegExp(trigger));
  }
  assert.match(extendedIsolationMigration, /Notification recipient does not belong to the notification project/);
  assert.match(extendedIsolationMigration, /Follow-up creator does not belong to the follow-up project/);
});

test("privacy settings exposes only the member's aggregate data window", () => {
  const privacyRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/privacy/route.ts"), "utf8");
  assert.match(privacyRoute, /member_activity_daily/);
  assert.match(privacyRoute, /eq\("user_id", access\.user\.id\)/);
  assert.match(privacyRoute, /windowDays: 30/);
  assert.match(privacyRoute, /lateNightUpdates/);
  assert.doesNotMatch(privacyRoute, /select\(".*updated_at/);
});

test("force-assign RPCs recompute risk before task persistence and notify privately", () => {
  assert.match(forceAssignRecheckMigration, /decision_risk := public\.assignment_risk_for_member/);
  assert.match(forceAssignRecheckMigration, /force_assign_warning/);
  assert.match(forceAssignRecheckMigration, /assignment_followups/);
  assert.match(forceAssignRecheckMigration, /Critical force-assign requires emergency mitigation/);
  assert.match(forceAssignRecheckMigration, /reassign_task/);
});

test("notification inbox preserves tone and action link for private warnings", () => {
  const notificationData = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/deadline-monitor/data.ts"), "utf8");
  assert.match(notificationData, /created_at,tone,action_link/);
  assert.match(notificationData, /tone: notification\.tone/);
  assert.match(notificationData, /actionLink: notification\.action_link/);
});

test("CV and Team Chat enforce server-side payload limits", () => {
  const cvRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/onboarding/parse-cv/route.ts"), "utf8");
  const teamChatRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/team-chat/route.ts"), "utf8");
  assert.match(cvRoute, /MAX_CV_BYTES/);
  assert.match(cvRoute, /file\.size > MAX_CV_BYTES/);
  assert.match(cvRoute, /isSupportedDocumentFile/);
  assert.match(teamChatRoute, /rawContent\.length > 4000/);
  assert.match(teamChatRoute, /status: 413/);
});

test("Knowledge Hub reads and renders the latest project-scoped brief", () => {
  const workspace = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/document-rag/components/RagWorkspace.tsx"), "utf8");
  const panel = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/document-rag/components/KnowledgeSourcesPanel.tsx"), "utf8");
  assert.match(workspace, /eq\("project_id", projectId\)/);
  assert.match(workspace, /eq\("type", "project_brief"\)/);
  assert.match(workspace, /parseProjectBriefContent/);
  assert.match(panel, /Acceptance criteria/);
  assert.match(panel, /Unknowns/);
});

test("Knowledge Hub Project Brief executes through the server-only agent orchestrator", () => {
  const brief = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/document-rag/project-brief.ts"), "utf8");
  const orchestrator = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/ai/orchestrator.ts"), "utf8");
  assert.match(brief, /createAgentOrchestrator/);
  assert.match(brief, /new KnowledgeHubAgent/);
  assert.match(brief, /orchestrator\.execute\("knowledge", "tier1"/);
  assert.match(orchestrator, /import "server-only"/);
  assert.match(orchestrator, /persistAgentRun/);
});

test("Auto-Tasking executes through the Tier 1 orchestrator with a PM-reviewable fallback", () => {
  const route = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/tasks/auto/route.ts"), "utf8");
  assert.match(route, /AutoTaskingAgent/);
  assert.match(route, /createAgentOrchestrator/);
  assert.match(route, /orchestrator\.execute(?:<[\s\S]+?>)?\("auto_tasking", "tier1"/);
  assert.match(route, /mock generator/);
});

test("orchestrator forwards structured token usage to agent telemetry", () => {
  const orchestrator = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/ai/orchestrator.ts"), "utf8");
  assert.match(orchestrator, /input_tokens: usage\?\.inputTokens/);
  assert.match(orchestrator, /output_tokens: usage\?\.outputTokens/);
});

test("manual task UI exposes a read-only Smart Delegation preview before persistence", () => {
  const dialog = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/kanban-board/components/ManualTaskDialog.tsx"), "utf8");
  const tasksRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/tasks/route.ts"), "utf8");
  assert.match(dialog, /tasks\/assignment-preview/);
  assert.match(dialog, /Xem gợi ý giao task/);
  assert.match(dialog, /selectedCandidate/);
  assert.match(tasksRoute, /const responsePreview =/);
  assert.match(tasksRoute, /preview: responsePreview/);
});

test("tiered LLM routes persist measured latency", () => {
  const files = [
    "../../app/api/projects/[id]/planner/init/route.ts",
    "../../app/api/projects/[id]/planner/chat/route.ts",
    "../../app/api/projects/[id]/eq-radar/coaching/route.ts",
  ].map((file) => readFileSync(join(dirname(new URL(import.meta.url).pathname), file), "utf8"));
  for (const source of files) {
    assert.match(source, /const startedAt = Date\.now\(\)/);
    assert.match(source, /latency_ms: Date\.now\(\) - startedAt/);
  }
});

test("Team Chat keeps normal reads and writes on the authenticated RLS client", () => {
  const teamChatRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/team-chat/route.ts"), "utf8");
  assert.doesNotMatch(teamChatRoute, /createAdminClient/);
  assert.match(teamChatRoute, /return supabase/);
  assert.match(teamChatRoute, /requireProjectAccess\(projectId\)/);
});

test("member task creation is an explicit project opt-in", () => {
  assert.match(memberTaskMigration, /allow_member_task_creation boolean not null default false/);
});

test("force-assign follow-up is private to the member or project PM", () => {
  assert.match(followupMigration, /assignment_followups/);
  assert.match(followupMigration, /member_id = auth\.uid\(\) or public\.is_project_pm\(project_id\)/);
  assert.match(followupMigration, /force_assign_followup/);
});

test("task dependency is guarded to the same project", () => {
  assert.match(dependencyMigration, /blocked_by_task_id/);
  assert.match(dependencyMigration, /Dependency task must belong to the same project/);
  assert.match(dependencyMigration, /tasks_validate_dependency_project/);
});

test("behavioral aggregate deletion is restricted to the authenticated member", () => {
  assert.match(privacyDeletionMigration, /Members can delete own activity aggregates/);
  assert.match(privacyDeletionMigration, /user_id = auth\.uid\(\)/);
  assert.match(privacyDeletionMigration, /is_project_member\(project_id\)/);
});

test("manual task creation is atomic and re-checks project invariants", () => {
  assert.match(manualTaskMigration, /create_manual_task/);
  assert.match(manualTaskMigration, /security definer/);
  assert.match(manualTaskMigration, /task_activity_events/);
  assert.match(manualTaskMigration, /assignment_decisions/);
  assert.match(manualTaskMigration, /assignment_followups/);
  assert.match(manualTaskMigration, /Assignee must belong to the project/);
  assert.match(manualTaskMigration, /Source task must be a completed task/);
  assert.match(manualTaskMigration, /Critical force-assign requires emergency mitigation/);
});

test("status, action, and reassignment mutations are atomic RPCs", () => {
  assert.match(taskMutationMigration, /reassign_task/);
  assert.match(taskMutationMigration, /update_task_status/);
  assert.match(taskMutationMigration, /record_task_action/);
  assert.match(taskMutationMigration, /security definer/);
  assert.match(taskMutationMigration, /for update/);
  assert.match(taskMutationMigration, /task_activity_events/);
  assert.match(taskMutationMigration, /assignment_decisions/);
  assert.match(taskMutationMigration, /Only project PM can reassign tasks/);
  assert.match(taskMutationMigration, /Only project PM can change rework status/);
});

test("assignment follow-up response is member-scoped and idempotent-friendly", () => {
  assert.match(followupResponseMigration, /respond_assignment_followup/);
  assert.match(followupResponseMigration, /status = 'open'/);
  assert.match(followupResponseMigration, /for update/);
  assert.match(followupResponseMigration, /support_requested/);
  assert.match(followupResponseMigration, /grant execute[\s\S]*authenticated/);
});

test("fresh-workspace schema contains the v2 data contract", () => {
  const schema = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../../supabase/schema.sql"), "utf8");
  assert.match(schema, /allow_member_task_creation boolean/);
  assert.match(schema, /blocked_by_task_id uuid/);
  assert.match(schema, /create table if not exists public\.task_activity_events/);
  assert.match(schema, /create table if not exists public\.member_ai_preferences/);
  assert.match(schema, /create table if not exists public\.assignment_followups/);
  assert.match(schema, /chat_analysis_enabled boolean not null default false/);
});

test("legacy AI Planner approval is also an atomic PM-only RPC", () => {
  assert.match(plannerApprovalMigration, /approve_planner_draft/);
  assert.match(plannerApprovalMigration, /is_project_pm/);
  assert.match(plannerApprovalMigration, /for update/);
  assert.match(plannerApprovalMigration, /task_activity_events/);
  assert.match(plannerApprovalMigration, /grant execute[\s\S]*authenticated/);
});

test("team chat analysis is opt-in and cannot spoof assistant messages", () => {
  const teamChatRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/team-chat/route.ts"), "utf8");
  assert.match(teamChatRoute, /chat_analysis_enabled/);
  assert.match(teamChatRoute, /const chatAnalysisEnabled = .*=== true/);
  assert.match(teamChatRoute, /if \(chatAnalysisEnabled\)/);
  assert.match(teamChatRoute, /sender_type: "user"/);
  assert.match(teamChatRoute, /body\.action === "run_worker"/);
  assert.match(teamChatRoute, /role !== "pm"/);
  assert.match(teamChatRoute, /record_risk_event/);
  assert.match(teamChatRoute, /derived_signal_only/);
});

test("assignment risk is recomputed by a database trigger", () => {
  assert.match(riskGuardMigration, /assignment_risk_for_member/);
  assert.match(riskGuardMigration, /guard_assignment_decision_risk/);
  assert.match(riskGuardMigration, /assignment_decision_risk_guard/);
  assert.match(riskGuardMigration, /new\.risk_level := actual_risk/);
  assert.match(riskGuardMigration, /requires emergency mitigation/);
});

test("agent telemetry uses a membership-checked server-side writer", () => {
  assert.match(agentRunWriterMigration, /record_agent_run/);
  assert.match(agentRunWriterMigration, /is_project_member\(run_project_id\)/);
  assert.match(agentRunWriterMigration, /service_role/);
  assert.match(agentRunWriterMigration, /input_tokens/);
  assert.match(agentRunWriterMigration, /grant execute[\s\S]*authenticated/);
});

test("rework source guard requires a completed source task", () => {
  assert.match(reworkGuardMigration, /tasks_rework_source_guard/);
  assert.match(reworkGuardMigration, /feedback_change.*bug_fix/);
  assert.match(reworkGuardMigration, /Source task must be completed/);
  assert.match(reworkGuardMigration, /constraint trigger/);
});

test("RAG match RPC is membership protected and never executable by anon", () => {
  assert.match(ragSecurityMigration, /security definer/);
  assert.match(ragSecurityMigration, /is_project_member\(filter_project_id\)/);
  assert.match(ragSecurityMigration, /revoke all on function public\.match_documents/);
  assert.match(ragSecurityMigration, /to authenticated/);
  assert.doesNotMatch(ragSecurityMigration, /grant execute[\s\S]*anon/);
});

test("RAG production client requires the service-role key server-side", () => {
  const config = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/document-rag/config.ts"), "utf8");
  const clients = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../features/document-rag/clients.ts"), "utf8");
  assert.match(config, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(clients, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(clients, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});

test("EQ risk events use a project-scoped deduplicating writer and respect opt-out redaction", () => {
  const scanRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/eq-radar/scan/route.ts"), "utf8");
  assert.match(riskEventWriterMigration, /record_risk_event/);
  assert.match(riskEventWriterMigration, /is_project_member\(target_project_id\)/);
  assert.match(riskEventWriterMigration, /event_type <> 'conflict'/);
  assert.match(riskEventWriterMigration, /24 hours/);
  assert.match(scanRoute, /enabled\s*\?\s*aggregateBehavioralWindows/);
  assert.match(scanRoute, /db\.rpc\("record_risk_event"/);
});

test("EQ Radar cron is CRON_SECRET protected and writes aggregate rows only", () => {
  const cronRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/cron/eq-radar/route.ts"), "utf8");
  assert.match(cronRoute, /CRON_SECRET/);
  assert.match(cronRoute, /member_activity_daily/);
  assert.match(cronRoute, /behavioral_insights_enabled === false/);
  assert.match(cronRoute, /onConflict: "project_id,user_id,activity_date"/);
  assert.doesNotMatch(cronRoute, /chat_messages/);
});

test("RAG chat records streamed LLM outcomes in agent_runs", () => {
  const chatRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/projects/[id]/chat/route.ts"), "utf8");
  assert.match(chatRoute, /onFinish/);
  assert.match(chatRoute, /onError/);
  assert.match(chatRoute, /input_tokens/);
  assert.match(chatRoute, /output_tokens/);
  assert.match(chatRoute, /agent: "knowledge"/);
});

test("CV parser records tier-1 fallback and token telemetry without storing CV text in agent_runs", () => {
  const cvRoute = readFileSync(join(dirname(new URL(import.meta.url).pathname), "../../app/api/onboarding/parse-cv/route.ts"), "utf8");
  assert.match(cvRoute, /persistAgentRun/);
  assert.match(cvRoute, /input_tokens/);
  assert.match(cvRoute, /output_tokens/);
  assert.match(cvRoute, /project_id: null/);
  assert.doesNotMatch(cvRoute, /cv_text:/);
});
