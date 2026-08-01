# Supabase migration checklist

Các core Multi-Agent/Deadline/EQ cần apply migration theo thứ tự:

```text
014_deadline_monitor.sql
015_kanban_realtime.sql
016_rework_sync_and_permissions.sql
017_multi_agent_ad_hoc_privacy.sql
018_project_isolation_guards.sql
019_deadline_notification_repair.sql
020_auto_tasking_approval_transaction.sql
021_member_task_creation_policy.sql
022_assignment_followups.sql
023_task_dependencies.sql
024_privacy_data_deletion.sql
025_manual_task_transaction.sql
026_task_mutation_transactions.sql
027_assignment_followup_response.sql
028_planner_approval_transaction.sql
029_assignment_risk_guard.sql
030_agent_run_writer.sql
031_rework_source_guard.sql
032_secure_rag_match_documents.sql
033_risk_event_writer.sql
034_auto_tasking_acceptance_criteria.sql
035_privacy_read_policies.sql
036_force_assign_server_recheck.sql
037_project_privacy_flags_rpc.sql
038_assignment_followup_processor.sql
039_risk_event_privacy_guard.sql
040_privacy_data_cleanup_rpc.sql
041_risk_event_read_privacy.sql
042_project_isolation_guards_extended.sql
```

Sau khi apply, chạy smoke-check read-only:

```bash
set -a; . ./.env.local; set +a
npm run check:supabase
```

Script không insert/update dữ liệu. Nó kiểm tra manifest migration 014–042 trước, sau đó kiểm tra PostgREST đã nhìn thấy đúng bảng/cột core. Nếu báo `PGRST205`, migration chưa được apply hoặc schema cache chưa reload. Migration 019 là idempotent và sửa môi trường đã apply 017/018 nhưng bỏ sót 014; migration 020, 025, 026, 027, 028, 030, 034, 035, 036, 037, 038, 039, 040, 041 và 042 thêm các RPC transaction, acceptance criteria, privacy read policies, server-side force-assign recheck, PM-only privacy flag lookup, atomic follow-up processor, privacy guard cho conflict signal, cleanup dữ liệu member-scoped, PM-only risk event reads và mở rộng project isolation cho risk/notification/follow-up records.
