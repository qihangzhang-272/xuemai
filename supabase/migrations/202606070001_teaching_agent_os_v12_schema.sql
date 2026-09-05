-- Phase 2: Teaching Agent OS v1.2 data model
-- Non-destructive migration:
-- - Creates missing tables for new databases.
-- - Adds missing columns to existing tables with ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- - Does not drop, rename, truncate, or rewrite existing data.
-- - Keeps AI drafts separate from teacher-confirmed learning records.

create extension if not exists pgcrypto;

-- TODO(auth): teacher_id must later be derived from Supabase Auth session user.
-- Until Auth is wired into the app, do not hardcode teacher_id inside Agent Core.

-- 1. Classes
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  name text not null,
  grade text,
  subject text,
  class_type text,
  schedule_note text,
  default_feedback_rule text,
  default_report_rule text,
  status text default 'active',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table classes add column if not exists teacher_id uuid;
alter table classes add column if not exists name text;
alter table classes add column if not exists grade text;
alter table classes add column if not exists subject text;
alter table classes add column if not exists class_type text;
alter table classes add column if not exists schedule_note text;
alter table classes add column if not exists default_feedback_rule text;
alter table classes add column if not exists default_report_rule text;
alter table classes add column if not exists status text;
alter table classes add column if not exists created_at timestamp with time zone default now();
alter table classes add column if not exists updated_at timestamp with time zone default now();
alter table classes alter column status set default 'active';

comment on table classes is 'Teacher-owned class groups. Supports one-on-one, small group, large class, online, offline, and hybrid teaching contexts.';

-- 2. Students
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  primary_class_id uuid references classes(id) on delete set null,
  name text not null,
  grade text,
  default_subject text,
  status text default 'stable',
  profile_summary text,
  strengths text[],
  weaknesses text[],
  learning_habits text[],
  risk_signals text[],
  next_focus text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table students add column if not exists teacher_id uuid;
alter table students add column if not exists primary_class_id uuid;
alter table students add column if not exists name text;
alter table students add column if not exists grade text;
alter table students add column if not exists default_subject text;
alter table students add column if not exists status text;
alter table students add column if not exists profile_summary text;
alter table students add column if not exists strengths text[];
alter table students add column if not exists weaknesses text[];
alter table students add column if not exists learning_habits text[];
alter table students add column if not exists risk_signals text[];
alter table students add column if not exists next_focus text;
alter table students add column if not exists created_at timestamp with time zone default now();
alter table students add column if not exists updated_at timestamp with time zone default now();
alter table students alter column status set default 'stable';

comment on table students is 'Teacher-owned student profiles. AI may suggest profile updates, but confirmed profile changes must remain teacher-controlled.';
comment on column students.primary_class_id is 'Default class only. Multi-class membership lives in class_students.';

-- 3. Class membership relation
create table if not exists class_students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  status text default 'active',
  joined_at timestamp with time zone default now(),
  left_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table class_students add column if not exists teacher_id uuid;
alter table class_students add column if not exists class_id uuid;
alter table class_students add column if not exists student_id uuid;
alter table class_students add column if not exists status text;
alter table class_students add column if not exists joined_at timestamp with time zone default now();
alter table class_students add column if not exists left_at timestamp with time zone;
alter table class_students add column if not exists created_at timestamp with time zone default now();
alter table class_students alter column status set default 'active';

comment on table class_students is 'Many-to-many relationship between students and classes. Required for batch feedback and class-level reporting.';

-- 4. Agent runs: process trace, not confirmed facts
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  agent_version text,
  teacher_id uuid not null,
  student_id uuid,
  class_id uuid,
  task_id uuid,
  input jsonb,
  context_summary jsonb,
  context_record_ids jsonb,
  raw_model_output jsonb,
  final_output jsonb,
  status text not null,
  error_code text,
  error_message text,
  quality_score numeric,
  warnings text[],
  latency_ms integer,
  token_usage jsonb,
  debug_context jsonb,
  created_at timestamp with time zone default now()
);

alter table agent_runs add column if not exists agent_name text;
alter table agent_runs add column if not exists agent_version text;
alter table agent_runs add column if not exists teacher_id uuid;
alter table agent_runs add column if not exists student_id uuid;
alter table agent_runs add column if not exists class_id uuid;
alter table agent_runs add column if not exists task_id uuid;
alter table agent_runs add column if not exists input jsonb;
alter table agent_runs add column if not exists context_summary jsonb;
alter table agent_runs add column if not exists context_record_ids jsonb;
alter table agent_runs add column if not exists raw_model_output jsonb;
alter table agent_runs add column if not exists final_output jsonb;
alter table agent_runs add column if not exists status text;
alter table agent_runs add column if not exists error_code text;
alter table agent_runs add column if not exists error_message text;
alter table agent_runs add column if not exists quality_score numeric;
alter table agent_runs add column if not exists warnings text[];
alter table agent_runs add column if not exists latency_ms integer;
alter table agent_runs add column if not exists token_usage jsonb;
alter table agent_runs add column if not exists debug_context jsonb;
alter table agent_runs add column if not exists created_at timestamp with time zone default now();

comment on table agent_runs is 'Agent execution trace. Not a source of confirmed student facts.';
comment on column agent_runs.context_summary is 'Default privacy-safe context summary. Do not store complete private student context here.';
comment on column agent_runs.context_record_ids is 'Record IDs used to assemble context, for traceability without copying full private content.';
comment on column agent_runs.debug_context is 'Development/debug-only full context. Do not populate by default in production.';

-- 5. Agent outputs: AI drafts and candidate artifacts
create table if not exists agent_outputs (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid references agent_runs(id) on delete set null,
  agent_name text not null,
  teacher_id uuid not null,
  student_id uuid,
  class_id uuid,
  output_type text not null,
  output_text text,
  output_json jsonb,
  quality_score numeric,
  status text default 'draft',
  is_final boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table agent_outputs add column if not exists agent_run_id uuid;
alter table agent_outputs add column if not exists agent_name text;
alter table agent_outputs add column if not exists teacher_id uuid;
alter table agent_outputs add column if not exists student_id uuid;
alter table agent_outputs add column if not exists class_id uuid;
alter table agent_outputs add column if not exists output_type text;
alter table agent_outputs add column if not exists output_text text;
alter table agent_outputs add column if not exists output_json jsonb;
alter table agent_outputs add column if not exists quality_score numeric;
alter table agent_outputs add column if not exists status text;
alter table agent_outputs add column if not exists is_final boolean default false;
alter table agent_outputs add column if not exists created_at timestamp with time zone default now();
alter table agent_outputs add column if not exists updated_at timestamp with time zone default now();
alter table agent_outputs alter column status set default 'draft';
alter table agent_outputs alter column is_final set default false;

comment on table agent_outputs is 'AI-generated drafts or candidate artifacts. These are not confirmed learning facts.';
comment on column agent_outputs.status is 'Recommended values: draft, edited, confirmed, discarded, archived.';

-- 6. Student learning records: confirmed long-term learning events
create table if not exists student_learning_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid not null,
  class_id uuid references classes(id) on delete set null,
  record_type text not null,
  title text,
  content text,
  source text,
  subject text,
  knowledge_points text[],
  mistake_reason text,
  teacher_note text,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  confirmed_by_teacher boolean default false,
  occurred_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

alter table student_learning_records add column if not exists student_id uuid;
alter table student_learning_records add column if not exists teacher_id uuid;
alter table student_learning_records add column if not exists class_id uuid;
alter table student_learning_records add column if not exists record_type text;
alter table student_learning_records add column if not exists title text;
alter table student_learning_records add column if not exists content text;
alter table student_learning_records add column if not exists source text;
alter table student_learning_records add column if not exists subject text;
alter table student_learning_records add column if not exists knowledge_points text[];
alter table student_learning_records add column if not exists mistake_reason text;
alter table student_learning_records add column if not exists teacher_note text;
alter table student_learning_records add column if not exists agent_output_id uuid;
alter table student_learning_records add column if not exists confirmed_by_teacher boolean default false;
alter table student_learning_records add column if not exists occurred_at timestamp with time zone default now();
alter table student_learning_records add column if not exists created_at timestamp with time zone default now();
alter table student_learning_records alter column confirmed_by_teacher set default false;

comment on table student_learning_records is 'Teacher-confirmed long-term learning records used by profile, monthly report, and follow-up agents.';
comment on column student_learning_records.confirmed_by_teacher is 'AI drafts should not be treated as long-term facts unless teacher-confirmed.';

-- 7. Wrong questions
create table if not exists wrong_questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid not null,
  class_id uuid references classes(id) on delete set null,
  subject text,
  grade text,
  question_text text,
  student_answer text,
  correct_answer text,
  image_url text,
  knowledge_points text[],
  mistake_type text,
  mistake_reason text,
  analysis_text text,
  similar_question_suggestion text,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  status text default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table wrong_questions add column if not exists student_id uuid;
alter table wrong_questions add column if not exists teacher_id uuid;
alter table wrong_questions add column if not exists class_id uuid;
alter table wrong_questions add column if not exists subject text;
alter table wrong_questions add column if not exists grade text;
alter table wrong_questions add column if not exists question_text text;
alter table wrong_questions add column if not exists student_answer text;
alter table wrong_questions add column if not exists correct_answer text;
alter table wrong_questions add column if not exists image_url text;
alter table wrong_questions add column if not exists knowledge_points text[];
alter table wrong_questions add column if not exists mistake_type text;
alter table wrong_questions add column if not exists mistake_reason text;
alter table wrong_questions add column if not exists analysis_text text;
alter table wrong_questions add column if not exists similar_question_suggestion text;
alter table wrong_questions add column if not exists agent_output_id uuid;
alter table wrong_questions add column if not exists status text;
alter table wrong_questions add column if not exists created_at timestamp with time zone default now();
alter table wrong_questions add column if not exists updated_at timestamp with time zone default now();
alter table wrong_questions alter column status set default 'pending';

comment on table wrong_questions is 'Wrong-question records and analysis state. New records default to pending, not analyzed.';

-- 8. Teacher preferences
create table if not exists teacher_preferences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null unique,
  feedback_tone text default 'warm_professional',
  feedback_length text default 'medium',
  banned_phrases text[],
  preferred_structure text,
  custom_style_note text,
  report_style text,
  correction_style text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table teacher_preferences add column if not exists teacher_id uuid;
alter table teacher_preferences add column if not exists feedback_tone text;
alter table teacher_preferences add column if not exists feedback_length text;
alter table teacher_preferences add column if not exists banned_phrases text[];
alter table teacher_preferences add column if not exists preferred_structure text;
alter table teacher_preferences add column if not exists custom_style_note text;
alter table teacher_preferences add column if not exists report_style text;
alter table teacher_preferences add column if not exists correction_style text;
alter table teacher_preferences add column if not exists created_at timestamp with time zone default now();
alter table teacher_preferences add column if not exists updated_at timestamp with time zone default now();
alter table teacher_preferences alter column feedback_tone set default 'warm_professional';
alter table teacher_preferences alter column feedback_length set default 'medium';

comment on table teacher_preferences is 'Teacher memory for feedback tone, report style, correction style, and banned phrases.';

-- 9. Feedback history: teacher-confirmed parent feedback
create table if not exists feedback_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid not null,
  class_id uuid references classes(id) on delete set null,
  agent_run_id uuid references agent_runs(id) on delete set null,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  feedback_text text not null,
  feedback_type text default 'wechat_parent_feedback',
  core_issue text,
  next_action text,
  quality_score numeric,
  teacher_edited boolean default false,
  copied_at timestamp with time zone,
  saved_at timestamp with time zone default now()
);

alter table feedback_history add column if not exists student_id uuid;
alter table feedback_history add column if not exists teacher_id uuid;
alter table feedback_history add column if not exists class_id uuid;
alter table feedback_history add column if not exists agent_run_id uuid;
alter table feedback_history add column if not exists agent_output_id uuid;
alter table feedback_history add column if not exists feedback_text text;
alter table feedback_history add column if not exists feedback_type text;
alter table feedback_history add column if not exists core_issue text;
alter table feedback_history add column if not exists next_action text;
alter table feedback_history add column if not exists quality_score numeric;
alter table feedback_history add column if not exists teacher_edited boolean default false;
alter table feedback_history add column if not exists copied_at timestamp with time zone;
alter table feedback_history add column if not exists saved_at timestamp with time zone default now();
alter table feedback_history alter column feedback_type set default 'wechat_parent_feedback';
alter table feedback_history alter column teacher_edited set default false;

comment on table feedback_history is 'Teacher-confirmed WeChat parent feedback. AI drafts remain in agent_outputs until confirmed.';

-- 10. Teacher edit events
create table if not exists teacher_edit_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid references students(id) on delete cascade,
  agent_output_id uuid references agent_outputs(id) on delete set null,
  before_text text,
  after_text text,
  edit_summary text,
  created_at timestamp with time zone default now()
);

alter table teacher_edit_events add column if not exists teacher_id uuid;
alter table teacher_edit_events add column if not exists student_id uuid;
alter table teacher_edit_events add column if not exists agent_output_id uuid;
alter table teacher_edit_events add column if not exists before_text text;
alter table teacher_edit_events add column if not exists after_text text;
alter table teacher_edit_events add column if not exists edit_summary text;
alter table teacher_edit_events add column if not exists created_at timestamp with time zone default now();

comment on table teacher_edit_events is 'Teacher edits to AI outputs. Used later for preference learning, not as direct student facts.';

-- Foreign keys for existing tables. NOT VALID avoids scanning historical rows.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'students_primary_class_id_fkey') then
    alter table students add constraint students_primary_class_id_fkey foreign key (primary_class_id) references classes(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_students_class_id_fkey') then
    alter table class_students add constraint class_students_class_id_fkey foreign key (class_id) references classes(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'class_students_student_id_fkey') then
    alter table class_students add constraint class_students_student_id_fkey foreign key (student_id) references students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'agent_outputs_agent_run_id_fkey') then
    alter table agent_outputs add constraint agent_outputs_agent_run_id_fkey foreign key (agent_run_id) references agent_runs(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_learning_records_student_id_fkey') then
    alter table student_learning_records add constraint student_learning_records_student_id_fkey foreign key (student_id) references students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_learning_records_class_id_fkey') then
    alter table student_learning_records add constraint student_learning_records_class_id_fkey foreign key (class_id) references classes(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_learning_records_agent_output_id_fkey') then
    alter table student_learning_records add constraint student_learning_records_agent_output_id_fkey foreign key (agent_output_id) references agent_outputs(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wrong_questions_student_id_fkey') then
    alter table wrong_questions add constraint wrong_questions_student_id_fkey foreign key (student_id) references students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wrong_questions_class_id_fkey') then
    alter table wrong_questions add constraint wrong_questions_class_id_fkey foreign key (class_id) references classes(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wrong_questions_agent_output_id_fkey') then
    alter table wrong_questions add constraint wrong_questions_agent_output_id_fkey foreign key (agent_output_id) references agent_outputs(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'feedback_history_student_id_fkey') then
    alter table feedback_history add constraint feedback_history_student_id_fkey foreign key (student_id) references students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'feedback_history_class_id_fkey') then
    alter table feedback_history add constraint feedback_history_class_id_fkey foreign key (class_id) references classes(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'feedback_history_agent_run_id_fkey') then
    alter table feedback_history add constraint feedback_history_agent_run_id_fkey foreign key (agent_run_id) references agent_runs(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'feedback_history_agent_output_id_fkey') then
    alter table feedback_history add constraint feedback_history_agent_output_id_fkey foreign key (agent_output_id) references agent_outputs(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teacher_edit_events_student_id_fkey') then
    alter table teacher_edit_events add constraint teacher_edit_events_student_id_fkey foreign key (student_id) references students(id) on delete cascade not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teacher_edit_events_agent_output_id_fkey') then
    alter table teacher_edit_events add constraint teacher_edit_events_agent_output_id_fkey foreign key (agent_output_id) references agent_outputs(id) on delete set null not valid;
  end if;
end $$;

-- Indexes
create index if not exists idx_classes_teacher_id on classes(teacher_id);
create index if not exists idx_classes_status on classes(status);

create index if not exists idx_students_teacher_id on students(teacher_id);
create index if not exists idx_students_primary_class_id on students(primary_class_id);
create index if not exists idx_students_status on students(status);

create index if not exists idx_class_students_teacher_id on class_students(teacher_id);
create index if not exists idx_class_students_class_id on class_students(class_id);
create index if not exists idx_class_students_student_id on class_students(student_id);
create unique index if not exists idx_class_students_class_student_unique on class_students(class_id, student_id);

create index if not exists idx_agent_runs_teacher_id on agent_runs(teacher_id);
create index if not exists idx_agent_runs_student_id on agent_runs(student_id);
create index if not exists idx_agent_runs_class_id on agent_runs(class_id);
create index if not exists idx_agent_runs_agent_name on agent_runs(agent_name);
create index if not exists idx_agent_runs_created_at on agent_runs(created_at);
create index if not exists idx_agent_runs_status on agent_runs(status);

create index if not exists idx_agent_outputs_agent_run_id on agent_outputs(agent_run_id);
create index if not exists idx_agent_outputs_teacher_id on agent_outputs(teacher_id);
create index if not exists idx_agent_outputs_student_id on agent_outputs(student_id);
create index if not exists idx_agent_outputs_class_id on agent_outputs(class_id);
create index if not exists idx_agent_outputs_output_type on agent_outputs(output_type);
create index if not exists idx_agent_outputs_status on agent_outputs(status);

create index if not exists idx_learning_records_student_id on student_learning_records(student_id);
create index if not exists idx_learning_records_teacher_id on student_learning_records(teacher_id);
create index if not exists idx_learning_records_class_id on student_learning_records(class_id);
create index if not exists idx_learning_records_record_type on student_learning_records(record_type);
create index if not exists idx_learning_records_occurred_at on student_learning_records(occurred_at);

create index if not exists idx_wrong_questions_student_id on wrong_questions(student_id);
create index if not exists idx_wrong_questions_teacher_id on wrong_questions(teacher_id);
create index if not exists idx_wrong_questions_class_id on wrong_questions(class_id);
create index if not exists idx_wrong_questions_status on wrong_questions(status);

create unique index if not exists idx_teacher_preferences_teacher_id_unique on teacher_preferences(teacher_id);

create index if not exists idx_feedback_history_student_id on feedback_history(student_id);
create index if not exists idx_feedback_history_teacher_id on feedback_history(teacher_id);
create index if not exists idx_feedback_history_class_id on feedback_history(class_id);
create index if not exists idx_feedback_history_agent_output_id on feedback_history(agent_output_id);
create index if not exists idx_feedback_history_saved_at on feedback_history(saved_at);

create index if not exists idx_teacher_edit_events_teacher_id on teacher_edit_events(teacher_id);
create index if not exists idx_teacher_edit_events_student_id on teacher_edit_events(student_id);
create index if not exists idx_teacher_edit_events_agent_output_id on teacher_edit_events(agent_output_id);
create index if not exists idx_teacher_edit_events_created_at on teacher_edit_events(created_at);

-- RLS / permissions boundary
-- Auth is not wired in this repository yet. Do not enable RLS in this migration,
-- because current mock flows do not derive teacher_id from auth.uid().
-- TODO(auth): after Supabase Auth is implemented, enable RLS and add policies:
--   teacher can read/write only rows where teacher_id = auth.uid()
--   service-role API routes may write agent_runs, agent_outputs, feedback_history, and student_learning_records
--   frontend must not be allowed to spoof teacher_id
