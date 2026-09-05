-- Student Learning Material Analyzer v0.4 persistence contract
-- Non-destructive migration:
-- - Adds material, VisionEvidencePacket, analysis draft, and teacher review tables.
-- - Keeps raw material, vision evidence, DeepSeek reasoning output, and teacher review separated.
-- - Does not drop, delete, truncate, rename, or enable blocking RLS policies.

create extension if not exists pgcrypto;

-- TODO(auth): teacher_id must be derived from Supabase Auth session in API routes.
-- TODO(rls): add tenant/teacher-scoped RLS after Auth is fully wired.
-- TODO(vision): real OCR/Layout/Vision providers must write only through server-side adapters.

create table if not exists learning_materials (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  material_type text,
  material_state text default 'uploaded',
  source_kind text,
  original_file_ref text,
  original_filename text,
  mime_type text,
  uploaded_by_teacher_id uuid,
  status text default 'uploaded',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table learning_materials add column if not exists teacher_id uuid;
alter table learning_materials add column if not exists tenant_id uuid;
alter table learning_materials add column if not exists student_id uuid;
alter table learning_materials add column if not exists class_id uuid;
alter table learning_materials add column if not exists material_type text;
alter table learning_materials add column if not exists material_state text default 'uploaded';
alter table learning_materials add column if not exists source_kind text;
alter table learning_materials add column if not exists original_file_ref text;
alter table learning_materials add column if not exists original_filename text;
alter table learning_materials add column if not exists mime_type text;
alter table learning_materials add column if not exists uploaded_by_teacher_id uuid;
alter table learning_materials add column if not exists status text default 'uploaded';
alter table learning_materials add column if not exists metadata jsonb default '{}'::jsonb;
alter table learning_materials add column if not exists created_at timestamp with time zone default now();
alter table learning_materials add column if not exists updated_at timestamp with time zone default now();

comment on table learning_materials is 'Uploaded or mock student learning materials. Not a student profile fact by itself.';

create table if not exists vision_evidence_packets (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  material_id uuid references learning_materials(id) on delete cascade,
  plugin_run_id text not null,
  schema_version text not null,
  plugin_provider text not null,
  plugin_model_version text,
  packet_json jsonb not null,
  gates jsonb default '[]'::jsonb,
  status text default 'extracted',
  created_at timestamp with time zone default now()
);

alter table vision_evidence_packets add column if not exists teacher_id uuid;
alter table vision_evidence_packets add column if not exists tenant_id uuid;
alter table vision_evidence_packets add column if not exists student_id uuid;
alter table vision_evidence_packets add column if not exists material_id uuid;
alter table vision_evidence_packets add column if not exists plugin_run_id text;
alter table vision_evidence_packets add column if not exists schema_version text;
alter table vision_evidence_packets add column if not exists plugin_provider text;
alter table vision_evidence_packets add column if not exists plugin_model_version text;
alter table vision_evidence_packets add column if not exists packet_json jsonb;
alter table vision_evidence_packets add column if not exists gates jsonb default '[]'::jsonb;
alter table vision_evidence_packets add column if not exists status text default 'extracted';
alter table vision_evidence_packets add column if not exists created_at timestamp with time zone default now();

comment on table vision_evidence_packets is 'Structured OCR/Layout/Vision plugin output. DeepSeek consumes this text evidence; it must not directly inspect images or PDFs.';

create table if not exists material_pages (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  material_id uuid references learning_materials(id) on delete cascade,
  vision_packet_id uuid references vision_evidence_packets(id) on delete cascade,
  page_id text not null,
  page_index integer,
  page_image_ref text,
  width integer,
  height integer,
  image_quality_confidence numeric,
  quality_flags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

alter table material_pages add column if not exists teacher_id uuid;
alter table material_pages add column if not exists tenant_id uuid;
alter table material_pages add column if not exists student_id uuid;
alter table material_pages add column if not exists material_id uuid;
alter table material_pages add column if not exists vision_packet_id uuid;
alter table material_pages add column if not exists page_id text;
alter table material_pages add column if not exists page_index integer;
alter table material_pages add column if not exists page_image_ref text;
alter table material_pages add column if not exists width integer;
alter table material_pages add column if not exists height integer;
alter table material_pages add column if not exists image_quality_confidence numeric;
alter table material_pages add column if not exists quality_flags text[] default '{}';
alter table material_pages add column if not exists metadata jsonb default '{}'::jsonb;
alter table material_pages add column if not exists created_at timestamp with time zone default now();

create table if not exists material_questions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  material_id uuid references learning_materials(id) on delete cascade,
  vision_packet_id uuid references vision_evidence_packets(id) on delete cascade,
  page_id text,
  question_id text not null,
  question_number text,
  question_type_candidate text,
  regions jsonb default '[]'::jsonb,
  confidence numeric,
  risk_flags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

alter table material_questions add column if not exists teacher_id uuid;
alter table material_questions add column if not exists tenant_id uuid;
alter table material_questions add column if not exists student_id uuid;
alter table material_questions add column if not exists material_id uuid;
alter table material_questions add column if not exists vision_packet_id uuid;
alter table material_questions add column if not exists page_id text;
alter table material_questions add column if not exists question_id text;
alter table material_questions add column if not exists question_number text;
alter table material_questions add column if not exists question_type_candidate text;
alter table material_questions add column if not exists regions jsonb default '[]'::jsonb;
alter table material_questions add column if not exists confidence numeric;
alter table material_questions add column if not exists risk_flags text[] default '{}';
alter table material_questions add column if not exists metadata jsonb default '{}'::jsonb;
alter table material_questions add column if not exists created_at timestamp with time zone default now();

create table if not exists material_evidences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  material_id uuid references learning_materials(id) on delete cascade,
  vision_packet_id uuid references vision_evidence_packets(id) on delete cascade,
  page_id text not null,
  question_id text not null,
  region_id text,
  evidence_id text not null,
  evidence_ref text not null,
  evidence_type text not null,
  text text,
  raw_ocr_text text,
  normalized_text text,
  bbox jsonb,
  crop_ref text,
  confidence numeric,
  teacher_verified boolean default false,
  risk_flags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

alter table material_evidences add column if not exists teacher_id uuid;
alter table material_evidences add column if not exists tenant_id uuid;
alter table material_evidences add column if not exists student_id uuid;
alter table material_evidences add column if not exists material_id uuid;
alter table material_evidences add column if not exists vision_packet_id uuid;
alter table material_evidences add column if not exists page_id text;
alter table material_evidences add column if not exists question_id text;
alter table material_evidences add column if not exists region_id text;
alter table material_evidences add column if not exists evidence_id text;
alter table material_evidences add column if not exists evidence_ref text;
alter table material_evidences add column if not exists evidence_type text;
alter table material_evidences add column if not exists text text;
alter table material_evidences add column if not exists raw_ocr_text text;
alter table material_evidences add column if not exists normalized_text text;
alter table material_evidences add column if not exists bbox jsonb;
alter table material_evidences add column if not exists crop_ref text;
alter table material_evidences add column if not exists confidence numeric;
alter table material_evidences add column if not exists teacher_verified boolean default false;
alter table material_evidences add column if not exists risk_flags text[] default '{}';
alter table material_evidences add column if not exists metadata jsonb default '{}'::jsonb;
alter table material_evidences add column if not exists created_at timestamp with time zone default now();

comment on table material_evidences is 'Atomic evidence records. evidence_ref must let every analysis conclusion trace back to material/page/question/evidence.';

create table if not exists analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  material_id uuid references learning_materials(id) on delete cascade,
  skill_run_id uuid references skill_runs(id) on delete set null,
  status text default 'queued',
  input_json jsonb default '{}'::jsonb,
  context_record_ids jsonb default '[]'::jsonb,
  error_code text,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table analysis_jobs add column if not exists teacher_id uuid;
alter table analysis_jobs add column if not exists tenant_id uuid;
alter table analysis_jobs add column if not exists student_id uuid;
alter table analysis_jobs add column if not exists material_id uuid;
alter table analysis_jobs add column if not exists skill_run_id uuid;
alter table analysis_jobs add column if not exists status text default 'queued';
alter table analysis_jobs add column if not exists input_json jsonb default '{}'::jsonb;
alter table analysis_jobs add column if not exists context_record_ids jsonb default '[]'::jsonb;
alter table analysis_jobs add column if not exists error_code text;
alter table analysis_jobs add column if not exists error_message text;
alter table analysis_jobs add column if not exists metadata jsonb default '{}'::jsonb;
alter table analysis_jobs add column if not exists created_at timestamp with time zone default now();
alter table analysis_jobs add column if not exists updated_at timestamp with time zone default now();

comment on table analysis_jobs is 'Runner status for analyze_learning_evidence. Teacher/session ownership must be checked before reads or writes.';

create table if not exists student_learning_material_analyses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  material_id uuid references learning_materials(id) on delete cascade,
  analysis_job_id uuid references analysis_jobs(id) on delete set null,
  vision_packet_id uuid references vision_evidence_packets(id) on delete set null,
  analysis_id_external text,
  status text default 'draft',
  analysis_json jsonb not null,
  validation_errors text[] default '{}',
  safety_warnings text[] default '{}',
  teacher_review_required boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table student_learning_material_analyses add column if not exists teacher_id uuid;
alter table student_learning_material_analyses add column if not exists tenant_id uuid;
alter table student_learning_material_analyses add column if not exists student_id uuid;
alter table student_learning_material_analyses add column if not exists material_id uuid;
alter table student_learning_material_analyses add column if not exists analysis_job_id uuid;
alter table student_learning_material_analyses add column if not exists vision_packet_id uuid;
alter table student_learning_material_analyses add column if not exists analysis_id_external text;
alter table student_learning_material_analyses add column if not exists status text default 'draft';
alter table student_learning_material_analyses add column if not exists analysis_json jsonb;
alter table student_learning_material_analyses add column if not exists validation_errors text[] default '{}';
alter table student_learning_material_analyses add column if not exists safety_warnings text[] default '{}';
alter table student_learning_material_analyses add column if not exists teacher_review_required boolean default true;
alter table student_learning_material_analyses add column if not exists created_at timestamp with time zone default now();
alter table student_learning_material_analyses add column if not exists updated_at timestamp with time zone default now();

comment on table student_learning_material_analyses is 'DeepSeek analysis draft or degraded result. Not a confirmed student record until teacher review.';

create table if not exists teacher_review_items (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  material_id uuid references learning_materials(id) on delete cascade,
  analysis_job_id uuid references analysis_jobs(id) on delete set null,
  analysis_id_external text,
  item_type text not null,
  title text not null,
  content_json jsonb default '{}'::jsonb,
  evidence_refs text[] default '{}',
  status text default 'pending',
  risk_flags text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table teacher_review_items add column if not exists teacher_id uuid;
alter table teacher_review_items add column if not exists tenant_id uuid;
alter table teacher_review_items add column if not exists student_id uuid;
alter table teacher_review_items add column if not exists material_id uuid;
alter table teacher_review_items add column if not exists analysis_job_id uuid;
alter table teacher_review_items add column if not exists analysis_id_external text;
alter table teacher_review_items add column if not exists item_type text;
alter table teacher_review_items add column if not exists title text;
alter table teacher_review_items add column if not exists content_json jsonb default '{}'::jsonb;
alter table teacher_review_items add column if not exists evidence_refs text[] default '{}';
alter table teacher_review_items add column if not exists status text default 'pending';
alter table teacher_review_items add column if not exists risk_flags text[] default '{}';
alter table teacher_review_items add column if not exists created_at timestamp with time zone default now();
alter table teacher_review_items add column if not exists updated_at timestamp with time zone default now();

create table if not exists teacher_review_actions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  tenant_id uuid,
  student_id uuid references students(id) on delete cascade,
  material_id uuid references learning_materials(id) on delete cascade,
  review_item_id uuid references teacher_review_items(id) on delete cascade,
  analysis_id_external text,
  action text not null,
  before_value jsonb,
  after_value jsonb,
  comment text,
  created_at timestamp with time zone default now()
);

alter table teacher_review_actions add column if not exists teacher_id uuid;
alter table teacher_review_actions add column if not exists tenant_id uuid;
alter table teacher_review_actions add column if not exists student_id uuid;
alter table teacher_review_actions add column if not exists material_id uuid;
alter table teacher_review_actions add column if not exists review_item_id uuid;
alter table teacher_review_actions add column if not exists analysis_id_external text;
alter table teacher_review_actions add column if not exists action text;
alter table teacher_review_actions add column if not exists before_value jsonb;
alter table teacher_review_actions add column if not exists after_value jsonb;
alter table teacher_review_actions add column if not exists comment text;
alter table teacher_review_actions add column if not exists created_at timestamp with time zone default now();

create index if not exists idx_learning_materials_teacher on learning_materials(teacher_id);
create index if not exists idx_learning_materials_student on learning_materials(student_id);
create index if not exists idx_learning_materials_status on learning_materials(status);

create index if not exists idx_vision_packets_teacher_material on vision_evidence_packets(teacher_id, material_id);
create unique index if not exists idx_vision_packets_teacher_plugin_run_unique on vision_evidence_packets(teacher_id, plugin_run_id);

create unique index if not exists idx_material_pages_teacher_material_page_unique on material_pages(teacher_id, material_id, page_id);
create unique index if not exists idx_material_questions_teacher_material_question_unique on material_questions(teacher_id, material_id, question_id);
create unique index if not exists idx_material_evidences_teacher_ref_unique on material_evidences(teacher_id, evidence_ref);
create index if not exists idx_material_evidences_question on material_evidences(teacher_id, material_id, question_id);
create index if not exists idx_material_evidences_type on material_evidences(evidence_type);

create index if not exists idx_analysis_jobs_teacher_status on analysis_jobs(teacher_id, status);
create index if not exists idx_analysis_jobs_material on analysis_jobs(material_id);

create unique index if not exists idx_learning_material_analyses_teacher_external_unique
  on student_learning_material_analyses(teacher_id, analysis_id_external)
  where analysis_id_external is not null;
create index if not exists idx_learning_material_analyses_job on student_learning_material_analyses(analysis_job_id);
create index if not exists idx_learning_material_analyses_material on student_learning_material_analyses(material_id);

create index if not exists idx_teacher_review_items_teacher_status on teacher_review_items(teacher_id, status);
create index if not exists idx_teacher_review_items_analysis on teacher_review_items(analysis_id_external);
create index if not exists idx_teacher_review_actions_item on teacher_review_actions(review_item_id);
