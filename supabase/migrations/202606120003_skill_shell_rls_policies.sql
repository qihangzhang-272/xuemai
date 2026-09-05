-- E7: RLS policies for PRD v3 Skill Shell tables
-- Execute only after:
-- - 202606120002_skillcard_persistence_contract.sql has been applied.
-- - Supabase Auth is the source of teacher_id.
-- - Server-side sync uses session-derived teacher_id and ownership checks.
--
-- This migration intentionally targets only the new skill_* tables.
-- Existing agent_* and confirmed record tables need a separate RLS rollout.

alter table skill_runs enable row level security;
alter table skill_cards enable row level security;
alter table skill_card_events enable row level security;
alter table skill_card_edits enable row level security;
alter table skill_archive_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_runs' and policyname = 'teacher can read own skill runs') then
    create policy "teacher can read own skill runs"
      on skill_runs for select
      to authenticated
      using (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_runs' and policyname = 'teacher can insert own skill runs') then
    create policy "teacher can insert own skill runs"
      on skill_runs for insert
      to authenticated
      with check (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_runs' and policyname = 'teacher can update own skill runs') then
    create policy "teacher can update own skill runs"
      on skill_runs for update
      to authenticated
      using (teacher_id = auth.uid())
      with check (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_cards' and policyname = 'teacher can read own skill cards') then
    create policy "teacher can read own skill cards"
      on skill_cards for select
      to authenticated
      using (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_cards' and policyname = 'teacher can insert own skill cards') then
    create policy "teacher can insert own skill cards"
      on skill_cards for insert
      to authenticated
      with check (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_cards' and policyname = 'teacher can update own skill cards') then
    create policy "teacher can update own skill cards"
      on skill_cards for update
      to authenticated
      using (teacher_id = auth.uid())
      with check (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_card_events' and policyname = 'teacher can read own skill card events') then
    create policy "teacher can read own skill card events"
      on skill_card_events for select
      to authenticated
      using (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_card_events' and policyname = 'teacher can insert own skill card events') then
    create policy "teacher can insert own skill card events"
      on skill_card_events for insert
      to authenticated
      with check (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_card_edits' and policyname = 'teacher can read own skill card edits') then
    create policy "teacher can read own skill card edits"
      on skill_card_edits for select
      to authenticated
      using (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_card_edits' and policyname = 'teacher can insert own skill card edits') then
    create policy "teacher can insert own skill card edits"
      on skill_card_edits for insert
      to authenticated
      with check (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_archive_logs' and policyname = 'teacher can read own skill archive logs') then
    create policy "teacher can read own skill archive logs"
      on skill_archive_logs for select
      to authenticated
      using (teacher_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skill_archive_logs' and policyname = 'teacher can insert own skill archive logs') then
    create policy "teacher can insert own skill archive logs"
      on skill_archive_logs for insert
      to authenticated
      with check (teacher_id = auth.uid());
  end if;
end $$;

-- No delete policies are added in this phase.
-- SkillCard deletion/discard should be modeled as status transitions first, not hard deletes.
