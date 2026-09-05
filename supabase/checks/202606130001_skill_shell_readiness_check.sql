-- Skill Shell readiness check before enabling SKILL_PERSISTENCE_WRITE_ENABLED.
-- Run manually in Supabase SQL Editor after:
-- 1. supabase/migrations/202606120002_skillcard_persistence_contract.sql
-- 2. supabase/migrations/202606120003_skill_shell_rls_policies.sql
--
-- This file is read-only. It should only report schema, index, RLS, and policy state.

with expected_tables(table_name) as (
  values
    ('skill_runs'),
    ('skill_cards'),
    ('skill_card_events'),
    ('skill_card_edits'),
    ('skill_archive_logs')
)
select
  'skill_tables' as check_name,
  expected_tables.table_name,
  case when information_schema.tables.table_name is null then 'missing' else 'ok' end as status
from expected_tables
left join information_schema.tables
  on information_schema.tables.table_schema = 'public'
  and information_schema.tables.table_name = expected_tables.table_name
order by expected_tables.table_name;

with expected_columns(table_name, column_name) as (
  values
    ('skill_runs', 'teacher_id'),
    ('skill_runs', 'external_run_id'),
    ('skill_runs', 'runner_status'),
    ('skill_cards', 'teacher_id'),
    ('skill_cards', 'external_card_id'),
    ('skill_cards', 'original_output'),
    ('skill_cards', 'current_output'),
    ('skill_cards', 'archived_output'),
    ('skill_card_events', 'external_event_id'),
    ('skill_card_edits', 'external_edit_id'),
    ('skill_archive_logs', 'external_archive_id')
)
select
  'skill_columns' as check_name,
  expected_columns.table_name,
  expected_columns.column_name,
  case when information_schema.columns.column_name is null then 'missing' else 'ok' end as status
from expected_columns
left join information_schema.columns
  on information_schema.columns.table_schema = 'public'
  and information_schema.columns.table_name = expected_columns.table_name
  and information_schema.columns.column_name = expected_columns.column_name
order by expected_columns.table_name, expected_columns.column_name;

with expected_indexes(index_name) as (
  values
    ('idx_skill_runs_teacher_external_run_unique'),
    ('idx_skill_cards_teacher_external_card_unique'),
    ('idx_skill_card_events_external_unique'),
    ('idx_skill_card_edits_external_unique'),
    ('idx_skill_archive_logs_external_unique')
)
select
  'skill_unique_indexes' as check_name,
  expected_indexes.index_name,
  case when pg_indexes.indexname is null then 'missing' else 'ok' end as status,
  pg_indexes.indexdef
from expected_indexes
left join pg_indexes
  on pg_indexes.schemaname = 'public'
  and pg_indexes.indexname = expected_indexes.index_name
order by expected_indexes.index_name;

select
  'skill_rls_enabled' as check_name,
  pg_class.relname as table_name,
  case when pg_class.relrowsecurity then 'ok' else 'missing' end as status
from pg_class
join pg_namespace
  on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and pg_class.relname in ('skill_runs', 'skill_cards', 'skill_card_events', 'skill_card_edits', 'skill_archive_logs')
order by pg_class.relname;

select
  'skill_policies' as check_name,
  pg_policies.tablename,
  pg_policies.policyname,
  pg_policies.cmd,
  pg_policies.roles,
  pg_policies.qual,
  pg_policies.with_check
from pg_policies
where pg_policies.schemaname = 'public'
  and pg_policies.tablename in ('skill_runs', 'skill_cards', 'skill_card_events', 'skill_card_edits', 'skill_archive_logs')
order by pg_policies.tablename, pg_policies.policyname;

select
  'current_auth_uid' as check_name,
  auth.uid() as current_auth_uid;
