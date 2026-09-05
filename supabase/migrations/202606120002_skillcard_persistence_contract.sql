-- E5: PRD v3 SkillCard persistence contract
-- Non-destructive migration draft:
-- - Adds frontstage Skill Shell tables without replacing agent_runs / agent_outputs.
-- - Keeps UUID primary keys for production data.
-- - Preserves mock/local replay IDs through external_* columns.
-- - Does not drop, delete, truncate, rename, or enable blocking RLS policies.

create extension if not exists pgcrypto;

-- TODO(auth): after Supabase Auth/RLS is fully wired, teacher_id must come from auth.uid().
-- TODO(sync): production API should upsert these tables only after session-derived ownership checks.

create table if not exists skill_runs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid references students(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  agent_run_id uuid references agent_runs(id) on delete set null,
  external_run_id text,
  conversation_id text,
  skill_id text not null,
  skill_label text,
  subject_type text,
  subject_external_id text,
  target_name text,
  input_summary text,
  context_sources jsonb default '[]'::jsonb,
  context_summary jsonb,
  context_record_ids jsonb default '[]'::jsonb,
  runner_status text not null,
  card_status text,
  confidence_level text,
  archive_target text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table skill_runs add column if not exists teacher_id uuid;
alter table skill_runs add column if not exists student_id uuid;
alter table skill_runs add column if not exists class_id uuid;
alter table skill_runs add column if not exists agent_run_id uuid;
alter table skill_runs add column if not exists external_run_id text;
alter table skill_runs add column if not exists conversation_id text;
alter table skill_runs add column if not exists skill_id text;
alter table skill_runs add column if not exists skill_label text;
alter table skill_runs add column if not exists subject_type text;
alter table skill_runs add column if not exists subject_external_id text;
alter table skill_runs add column if not exists target_name text;
alter table skill_runs add column if not exists input_summary text;
alter table skill_runs add column if not exists context_sources jsonb default '[]'::jsonb;
alter table skill_runs add column if not exists context_summary jsonb;
alter table skill_runs add column if not exists context_record_ids jsonb default '[]'::jsonb;
alter table skill_runs add column if not exists runner_status text;
alter table skill_runs add column if not exists card_status text;
alter table skill_runs add column if not exists confidence_level text;
alter table skill_runs add column if not exists archive_target text;
alter table skill_runs add column if not exists metadata jsonb default '{}'::jsonb;
alter table skill_runs add column if not exists created_at timestamp with time zone default now();
alter table skill_runs add column if not exists updated_at timestamp with time zone default now();

comment on table skill_runs is 'Frontstage Skill workflow run records. Complements backend agent_runs; not a confirmed student fact by itself.';
comment on column skill_runs.external_run_id is 'Mock/local replay run ID. Used for migration/sync compatibility, not as production primary key.';
comment on column skill_runs.context_summary is 'Privacy-safe context summary. Do not store full private student context by default.';

create table if not exists skill_cards (
  id uuid primary key default gen_random_uuid(),
  skill_run_id uuid references skill_runs(id) on delete cascade,
  teacher_id uuid not null,
  student_id uuid references students(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  external_card_id text,
  external_run_id text,
  conversation_id text,
  skill_id text,
  task_type text,
  title text not null,
  status text not null default 'draft',
  output_type text,
  original_output jsonb,
  current_output jsonb,
  archived_output jsonb,
  structured_result jsonb,
  display_content text,
  summary text,
  feedback_text text,
  archive_target text,
  is_archived boolean default false,
  archived_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table skill_cards add column if not exists skill_run_id uuid;
alter table skill_cards add column if not exists teacher_id uuid;
alter table skill_cards add column if not exists student_id uuid;
alter table skill_cards add column if not exists class_id uuid;
alter table skill_cards add column if not exists agent_output_id uuid;
alter table skill_cards add column if not exists external_card_id text;
alter table skill_cards add column if not exists external_run_id text;
alter table skill_cards add column if not exists conversation_id text;
alter table skill_cards add column if not exists skill_id text;
alter table skill_cards add column if not exists task_type text;
alter table skill_cards add column if not exists title text;
alter table skill_cards add column if not exists status text;
alter table skill_cards add column if not exists output_type text;
alter table skill_cards add column if not exists original_output jsonb;
alter table skill_cards add column if not exists current_output jsonb;
alter table skill_cards add column if not exists archived_output jsonb;
alter table skill_cards add column if not exists structured_result jsonb;
alter table skill_cards add column if not exists display_content text;
alter table skill_cards add column if not exists summary text;
alter table skill_cards add column if not exists feedback_text text;
alter table skill_cards add column if not exists archive_target text;
alter table skill_cards add column if not exists is_archived boolean default false;
alter table skill_cards add column if not exists archived_at timestamp with time zone;
alter table skill_cards add column if not exists created_at timestamp with time zone default now();
alter table skill_cards add column if not exists updated_at timestamp with time zone default now();
alter table skill_cards alter column status set default 'draft';
alter table skill_cards alter column is_archived set default false;

comment on table skill_cards is 'Formal SkillCard outputs shown to teachers. AI drafts and teacher edits stay separate until explicit archive.';
comment on column skill_cards.original_output is 'AI original draft. Must not be overwritten by teacher edits.';
comment on column skill_cards.current_output is 'Teacher current review/edit version.';
comment on column skill_cards.archived_output is 'Teacher-confirmed final archived version.';

create table if not exists skill_card_events (
  id uuid primary key default gen_random_uuid(),
  skill_card_id uuid references skill_cards(id) on delete cascade,
  skill_run_id uuid references skill_runs(id) on delete cascade,
  teacher_id uuid not null,
  student_id uuid references students(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  external_event_id text,
  external_card_id text,
  external_run_id text,
  action text not null,
  event_type text not null,
  status_before text,
  status_after text,
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

alter table skill_card_events add column if not exists skill_card_id uuid;
alter table skill_card_events add column if not exists skill_run_id uuid;
alter table skill_card_events add column if not exists teacher_id uuid;
alter table skill_card_events add column if not exists student_id uuid;
alter table skill_card_events add column if not exists class_id uuid;
alter table skill_card_events add column if not exists external_event_id text;
alter table skill_card_events add column if not exists external_card_id text;
alter table skill_card_events add column if not exists external_run_id text;
alter table skill_card_events add column if not exists action text;
alter table skill_card_events add column if not exists event_type text;
alter table skill_card_events add column if not exists status_before text;
alter table skill_card_events add column if not exists status_after text;
alter table skill_card_events add column if not exists message text;
alter table skill_card_events add column if not exists metadata jsonb default '{}'::jsonb;
alter table skill_card_events add column if not exists created_at timestamp with time zone default now();

comment on table skill_card_events is 'Traceable button/action events for SkillCards: copy, sent, archive, add monthly material, generate practice, save note, etc.';

create table if not exists skill_card_edits (
  id uuid primary key default gen_random_uuid(),
  skill_card_id uuid references skill_cards(id) on delete cascade,
  skill_run_id uuid references skill_runs(id) on delete cascade,
  teacher_id uuid not null,
  student_id uuid references students(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  external_edit_id text,
  external_card_id text,
  external_run_id text,
  field_path text not null,
  before_value jsonb,
  after_value jsonb,
  edited_by text default 'teacher',
  source text default 'manual_edit',
  created_at timestamp with time zone default now()
);

alter table skill_card_edits add column if not exists skill_card_id uuid;
alter table skill_card_edits add column if not exists skill_run_id uuid;
alter table skill_card_edits add column if not exists teacher_id uuid;
alter table skill_card_edits add column if not exists student_id uuid;
alter table skill_card_edits add column if not exists class_id uuid;
alter table skill_card_edits add column if not exists external_edit_id text;
alter table skill_card_edits add column if not exists external_card_id text;
alter table skill_card_edits add column if not exists external_run_id text;
alter table skill_card_edits add column if not exists field_path text;
alter table skill_card_edits add column if not exists before_value jsonb;
alter table skill_card_edits add column if not exists after_value jsonb;
alter table skill_card_edits add column if not exists edited_by text default 'teacher';
alter table skill_card_edits add column if not exists source text default 'manual_edit';
alter table skill_card_edits add column if not exists created_at timestamp with time zone default now();
alter table skill_card_edits alter column edited_by set default 'teacher';
alter table skill_card_edits alter column source set default 'manual_edit';

comment on table skill_card_edits is 'Teacher edits to SkillCard outputs. Useful for replay and future preference learning, not direct student facts.';

create table if not exists skill_archive_logs (
  id uuid primary key default gen_random_uuid(),
  skill_card_id uuid references skill_cards(id) on delete set null,
  skill_run_id uuid references skill_runs(id) on delete set null,
  teacher_id uuid not null,
  student_id uuid references students(id) on delete set null,
  class_id uuid references classes(id) on delete set null,
  external_archive_id text,
  external_card_id text,
  external_run_id text,
  archive_target text not null,
  title text,
  summary text,
  archived_output jsonb,
  created_at timestamp with time zone default now()
);

alter table skill_archive_logs add column if not exists skill_card_id uuid;
alter table skill_archive_logs add column if not exists skill_run_id uuid;
alter table skill_archive_logs add column if not exists teacher_id uuid;
alter table skill_archive_logs add column if not exists student_id uuid;
alter table skill_archive_logs add column if not exists class_id uuid;
alter table skill_archive_logs add column if not exists external_archive_id text;
alter table skill_archive_logs add column if not exists external_card_id text;
alter table skill_archive_logs add column if not exists external_run_id text;
alter table skill_archive_logs add column if not exists archive_target text;
alter table skill_archive_logs add column if not exists title text;
alter table skill_archive_logs add column if not exists summary text;
alter table skill_archive_logs add column if not exists archived_output jsonb;
alter table skill_archive_logs add column if not exists created_at timestamp with time zone default now();

comment on table skill_archive_logs is 'ArchiveLog records shown in the chat timeline after teacher confirmation. Not a replacement for domain records such as student_learning_records.';

create index if not exists idx_skill_runs_teacher_id on skill_runs(teacher_id);
create index if not exists idx_skill_runs_student_id on skill_runs(student_id);
create index if not exists idx_skill_runs_class_id on skill_runs(class_id);
create index if not exists idx_skill_runs_skill_id on skill_runs(skill_id);
create index if not exists idx_skill_runs_runner_status on skill_runs(runner_status);
create index if not exists idx_skill_runs_created_at on skill_runs(created_at);
create unique index if not exists idx_skill_runs_teacher_external_run_unique
  on skill_runs(teacher_id, external_run_id)
  where external_run_id is not null;

create index if not exists idx_skill_cards_skill_run_id on skill_cards(skill_run_id);
create index if not exists idx_skill_cards_teacher_id on skill_cards(teacher_id);
create index if not exists idx_skill_cards_student_id on skill_cards(student_id);
create index if not exists idx_skill_cards_class_id on skill_cards(class_id);
create index if not exists idx_skill_cards_skill_id on skill_cards(skill_id);
create index if not exists idx_skill_cards_status on skill_cards(status);
create index if not exists idx_skill_cards_archived on skill_cards(is_archived);
create unique index if not exists idx_skill_cards_teacher_external_card_unique
  on skill_cards(teacher_id, external_card_id)
  where external_card_id is not null;

create index if not exists idx_skill_card_events_card_id on skill_card_events(skill_card_id);
create index if not exists idx_skill_card_events_run_id on skill_card_events(skill_run_id);
create index if not exists idx_skill_card_events_teacher_id on skill_card_events(teacher_id);
create index if not exists idx_skill_card_events_action on skill_card_events(action);
create index if not exists idx_skill_card_events_created_at on skill_card_events(created_at);
create unique index if not exists idx_skill_card_events_external_unique
  on skill_card_events(teacher_id, external_card_id, external_event_id)
  where external_card_id is not null and external_event_id is not null;

create index if not exists idx_skill_card_edits_card_id on skill_card_edits(skill_card_id);
create index if not exists idx_skill_card_edits_run_id on skill_card_edits(skill_run_id);
create index if not exists idx_skill_card_edits_teacher_id on skill_card_edits(teacher_id);
create index if not exists idx_skill_card_edits_created_at on skill_card_edits(created_at);
create unique index if not exists idx_skill_card_edits_external_unique
  on skill_card_edits(teacher_id, external_card_id, external_edit_id)
  where external_card_id is not null and external_edit_id is not null;

create index if not exists idx_skill_archive_logs_card_id on skill_archive_logs(skill_card_id);
create index if not exists idx_skill_archive_logs_teacher_id on skill_archive_logs(teacher_id);
create index if not exists idx_skill_archive_logs_student_id on skill_archive_logs(student_id);
create index if not exists idx_skill_archive_logs_class_id on skill_archive_logs(class_id);
create index if not exists idx_skill_archive_logs_created_at on skill_archive_logs(created_at);
create unique index if not exists idx_skill_archive_logs_external_unique
  on skill_archive_logs(teacher_id, external_archive_id)
  where external_archive_id is not null;

-- RLS boundary:
-- Do not enable RLS in this draft migration because the current frontstage Skill Shell is still mock/local.
-- Before production writes, add policies that restrict all rows to teacher_id = auth.uid(),
-- and ensure service-role API routes perform session-derived ownership checks before upserting.
