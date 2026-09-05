-- Parent Feedback confirmation hardening:
-- - Adds idempotency at the database layer.
-- - Wraps feedback_history, student_learning_records, agent_outputs, and teacher_edit_events writes in one transaction-scoped RPC.
-- - Does not delete or rewrite existing rows.

create unique index if not exists idx_feedback_history_agent_output_id_unique
  on feedback_history(agent_output_id)
  where agent_output_id is not null;

create unique index if not exists idx_learning_records_parent_feedback_agent_output_id_unique
  on student_learning_records(agent_output_id)
  where agent_output_id is not null and record_type = 'parent_feedback';

create or replace function public.confirm_parent_feedback_archive(
  p_teacher_id uuid,
  p_student_id uuid,
  p_class_id uuid,
  p_agent_run_id uuid,
  p_agent_output_id uuid,
  p_final_feedback_text text,
  p_original_feedback_text text,
  p_core_issue text,
  p_next_action text,
  p_quality_score numeric,
  p_teacher_edited boolean
)
returns table (
  feedback_history_id uuid,
  learning_record_id uuid,
  agent_output_id uuid,
  agent_run_id uuid,
  status text,
  teacher_edited boolean,
  edit_event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_output agent_outputs%rowtype;
  v_feedback_history_id uuid;
  v_learning_record_id uuid;
  v_edit_event_id uuid;
  v_status text;
  v_teacher_edited boolean;
  v_output_json jsonb;
begin
  if p_teacher_id is null or p_student_id is null or p_agent_output_id is null then
    raise exception 'Missing required identity fields';
  end if;

  if nullif(btrim(coalesce(p_final_feedback_text, '')), '') is null then
    raise exception 'final feedback text is required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_agent_output_id::text, 0));

  select *
    into v_output
    from agent_outputs
    where id = p_agent_output_id
    for update;

  if not found then
    raise exception 'agent output not found';
  end if;

  if v_output.output_type <> 'parent_feedback' then
    raise exception 'agent output type must be parent_feedback';
  end if;

  if v_output.teacher_id is distinct from p_teacher_id or v_output.student_id is distinct from p_student_id then
    raise exception 'agent output does not belong to current teacher or student';
  end if;

  if p_agent_run_id is not null and v_output.agent_run_id is distinct from p_agent_run_id then
    raise exception 'agent_run_id does not match agent_output_id';
  end if;

  if p_class_id is not null and v_output.class_id is not null and v_output.class_id is distinct from p_class_id then
    raise exception 'class_id does not match agent_output_id';
  end if;

  if coalesce(v_output.is_final, false) = true then
    select id
      into v_feedback_history_id
      from feedback_history fh
      where fh.agent_output_id = p_agent_output_id
      limit 1;

    select id
      into v_learning_record_id
      from student_learning_records slr
      where slr.agent_output_id = p_agent_output_id
        and slr.record_type = 'parent_feedback'
      limit 1;

    if v_feedback_history_id is not null and v_learning_record_id is not null then
      select id
        into v_edit_event_id
        from teacher_edit_events tee
        where tee.agent_output_id = p_agent_output_id
          and tee.edit_summary = '老师确认保存前编辑了家长反馈文本'
        order by created_at asc
        limit 1;

      feedback_history_id := v_feedback_history_id;
      learning_record_id := v_learning_record_id;
      agent_output_id := p_agent_output_id;
      agent_run_id := coalesce(p_agent_run_id, v_output.agent_run_id);
      status := case when v_output.status = 'edited' then 'edited' else 'confirmed' end;
      select coalesce(fh.teacher_edited, false)
        into teacher_edited
        from feedback_history fh
        where fh.id = v_feedback_history_id;
      edit_event_id := v_edit_event_id;
      return next;
      return;
    end if;
  end if;

  if v_output.status not in ('draft', 'edited', 'confirmed', 'archived') then
    raise exception 'agent output is not confirmable';
  end if;

  v_status := case when coalesce(p_teacher_edited, false) then 'edited' else 'confirmed' end;
  v_teacher_edited := coalesce(p_teacher_edited, false);
  v_output_json :=
    case
      when v_output.output_json is not null and jsonb_typeof(v_output.output_json) = 'object' then v_output.output_json
      else '{}'::jsonb
    end
    || jsonb_build_object(
      'feedbackText', p_final_feedback_text,
      'coreIssue', p_core_issue,
      'nextAction', p_next_action,
      'qualityScore', p_quality_score,
      'confirmed', jsonb_build_object(
        'finalFeedbackText', p_final_feedback_text,
        'coreIssue', p_core_issue,
        'nextAction', p_next_action,
        'qualityScore', p_quality_score,
        'confirmedAt', now()
      )
    );

  insert into feedback_history (
    teacher_id,
    student_id,
    class_id,
    agent_run_id,
    agent_output_id,
    feedback_text,
    feedback_type,
    core_issue,
    next_action,
    quality_score,
    teacher_edited
  )
  values (
    p_teacher_id,
    p_student_id,
    p_class_id,
    coalesce(p_agent_run_id, v_output.agent_run_id),
    p_agent_output_id,
    p_final_feedback_text,
    'wechat_parent_feedback',
    p_core_issue,
    p_next_action,
    p_quality_score,
    v_teacher_edited
  )
  on conflict (agent_output_id) where agent_output_id is not null
  do update set agent_output_id = excluded.agent_output_id
  returning id into v_feedback_history_id;

  insert into student_learning_records (
    teacher_id,
    student_id,
    class_id,
    record_type,
    title,
    content,
    source,
    teacher_note,
    agent_output_id,
    confirmed_by_teacher
  )
  values (
    p_teacher_id,
    p_student_id,
    p_class_id,
    'parent_feedback',
    '家长反馈',
    p_final_feedback_text,
    'parent_feedback_agent_confirmed',
    '老师确认后的家长反馈',
    p_agent_output_id,
    true
  )
  on conflict (agent_output_id) where agent_output_id is not null and record_type = 'parent_feedback'
  do update set agent_output_id = excluded.agent_output_id
  returning id into v_learning_record_id;

  if v_teacher_edited then
    select id
      into v_edit_event_id
      from teacher_edit_events tee
      where tee.agent_output_id = p_agent_output_id
        and tee.edit_summary = '老师确认保存前编辑了家长反馈文本'
      order by created_at asc
      limit 1;

    if v_edit_event_id is null then
      insert into teacher_edit_events (
        teacher_id,
        student_id,
        agent_output_id,
        before_text,
        after_text,
        edit_summary
      )
      values (
        p_teacher_id,
        p_student_id,
        p_agent_output_id,
        p_original_feedback_text,
        p_final_feedback_text,
        '老师确认保存前编辑了家长反馈文本'
      )
      returning id into v_edit_event_id;
    end if;
  end if;

  update agent_outputs
    set
      status = v_status,
      is_final = true,
      output_text = p_final_feedback_text,
      output_json = v_output_json,
      quality_score = coalesce(p_quality_score, v_output.quality_score),
      updated_at = now()
    where id = p_agent_output_id;

  feedback_history_id := v_feedback_history_id;
  learning_record_id := v_learning_record_id;
  agent_output_id := p_agent_output_id;
  agent_run_id := coalesce(p_agent_run_id, v_output.agent_run_id);
  status := v_status;
  teacher_edited := v_teacher_edited;
  edit_event_id := v_edit_event_id;
  return next;
end;
$$;

revoke all on function public.confirm_parent_feedback_archive(uuid, uuid, uuid, uuid, uuid, text, text, text, text, numeric, boolean) from public;
revoke all on function public.confirm_parent_feedback_archive(uuid, uuid, uuid, uuid, uuid, text, text, text, text, numeric, boolean) from anon;
revoke all on function public.confirm_parent_feedback_archive(uuid, uuid, uuid, uuid, uuid, text, text, text, text, numeric, boolean) from authenticated;
grant execute on function public.confirm_parent_feedback_archive(uuid, uuid, uuid, uuid, uuid, text, text, text, text, numeric, boolean) to service_role;
