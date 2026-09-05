import type { SkillRunStatus } from "../../src/skills/types";
import type { PersistedSkillCardEditRecord, PersistedSkillCardEventRecord, PersistedSkillCardRecord, PersistedSkillRunRecord, WorkbenchStoragePayload } from "./persistence";

export type SupabaseSubjectRef = {
  subjectType: "student" | "class" | "teacher";
  studentId?: string | null;
  classId?: string | null;
  subjectExternalId?: string;
};

export type CreateSupabaseSkillPersistencePlanOptions = {
  sessionTeacherId: string;
  subjectsByConversationId?: Record<string, SupabaseSubjectRef>;
};

export type SkillRunSupabaseUpsert = {
  teacher_id: string;
  student_id: string | null;
  class_id: string | null;
  external_run_id: string;
  conversation_id: string;
  skill_id: string;
  subject_type: SupabaseSubjectRef["subjectType"];
  subject_external_id: string;
  target_name: string;
  input_summary: string | null;
  context_sources: unknown[];
  runner_status: SkillRunStatus;
  card_status: string;
  confidence_level: string | null;
  archive_target: string | null;
  created_at: string;
  updated_at: string;
};

export type SkillCardSupabaseUpsert = {
  teacher_id: string;
  student_id: string | null;
  class_id: string | null;
  external_card_id: string;
  external_run_id: string;
  conversation_id: string;
  skill_id: string | null;
  task_type: string;
  title: string;
  status: string;
  output_type: string;
  original_output: unknown | null;
  current_output: unknown | null;
  archived_output: unknown | null;
  structured_result: Record<string, unknown> | null;
  display_content: string | null;
  summary: string | null;
  feedback_text: string | null;
  archive_target: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SkillCardEventSupabaseInsert = {
  teacher_id: string;
  student_id: string | null;
  class_id: string | null;
  external_event_id: string;
  external_card_id: string;
  external_run_id: string;
  action: string;
  event_type: string;
  status_before: string;
  status_after: string;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SkillCardEditSupabaseInsert = {
  teacher_id: string;
  student_id: string | null;
  class_id: string | null;
  external_edit_id: string;
  external_card_id: string;
  external_run_id: string;
  field_path: string;
  before_value: unknown;
  after_value: unknown;
  edited_by: "teacher";
  source: "manual_edit";
  created_at: string;
};

export type SkillArchiveLogSupabaseInsert = {
  teacher_id: string;
  student_id: string | null;
  class_id: string | null;
  external_archive_id: string;
  external_card_id: string;
  external_run_id: string;
  archive_target: string;
  title: string;
  summary: string;
  archived_output: unknown | null;
  created_at: string;
};

export type SupabaseSkillPersistencePlan = {
  skill_runs: SkillRunSupabaseUpsert[];
  skill_cards: SkillCardSupabaseUpsert[];
  skill_card_events: SkillCardEventSupabaseInsert[];
  skill_card_edits: SkillCardEditSupabaseInsert[];
  skill_archive_logs: SkillArchiveLogSupabaseInsert[];
};

export function createSupabaseSkillPersistencePlan(payload: WorkbenchStoragePayload, options: CreateSupabaseSkillPersistencePlanOptions): SupabaseSkillPersistencePlan {
  if (!options.sessionTeacherId.trim()) {
    throw new Error("sessionTeacherId is required for Supabase Skill persistence planning.");
  }

  const runById = new Map(payload.skill_runs.map((run) => [run.id, run]));
  const cardById = new Map(payload.skill_cards.map((card) => [card.id, card]));

  return {
    skill_runs: payload.skill_runs.map((run) => mapSkillRun(run, options)),
    skill_cards: payload.skill_cards.map((card) => mapSkillCard(card, options)),
    skill_card_events: payload.skill_card_events.map((event) => mapSkillCardEvent(event, cardById.get(event.skill_card_id), options)),
    skill_card_edits: payload.skill_card_edits.map((edit) => mapSkillCardEdit(edit, cardById.get(edit.skill_card_id), options)),
    skill_archive_logs: payload.timeline_records.map((record) => {
      const card = cardById.get(record.sourceTaskId);
      return mapArchiveLog(record, card, runById.get(card?.skill_run_id ?? ""), options);
    })
  };
}

function mapSkillRun(run: PersistedSkillRunRecord, options: CreateSupabaseSkillPersistencePlanOptions): SkillRunSupabaseUpsert {
  const subject = getSubject(run.conversation_id, options);

  return {
    teacher_id: options.sessionTeacherId,
    student_id: subject.studentId ?? null,
    class_id: subject.classId ?? null,
    external_run_id: run.id,
    conversation_id: run.conversation_id,
    skill_id: run.skill_id ?? "unknown_skill",
    subject_type: subject.subjectType,
    subject_external_id: subject.subjectExternalId,
    target_name: run.target_name,
    input_summary: run.input_summary ?? null,
    context_sources: run.context_sources ?? [],
    runner_status: run.runner_status,
    card_status: run.card_status,
    confidence_level: run.confidence_level ?? null,
    archive_target: run.archive_target ?? null,
    created_at: run.created_at,
    updated_at: run.updated_at
  };
}

function mapSkillCard(card: PersistedSkillCardRecord, options: CreateSupabaseSkillPersistencePlanOptions): SkillCardSupabaseUpsert {
  const subject = getSubject(card.conversation_id, options);

  return {
    teacher_id: options.sessionTeacherId,
    student_id: subject.studentId ?? null,
    class_id: subject.classId ?? null,
    external_card_id: card.id,
    external_run_id: card.skill_run_id,
    conversation_id: card.conversation_id,
    skill_id: card.skill_id ?? null,
    task_type: card.task_type,
    title: card.title,
    status: card.status,
    output_type: card.task_type,
    original_output: card.original_output ?? null,
    current_output: card.current_output ?? null,
    archived_output: card.archived_output ?? null,
    structured_result: card.structured_result ?? null,
    display_content: card.display_content ?? null,
    summary: card.summary ?? null,
    feedback_text: card.feedback_text ?? null,
    archive_target: card.archive_target ?? null,
    is_archived: card.status === "archived" || Boolean(card.archived_output),
    archived_at: card.status === "archived" || card.archived_output ? card.updated_at : null,
    created_at: card.created_at,
    updated_at: card.updated_at
  };
}

function mapSkillCardEvent(event: PersistedSkillCardEventRecord, card: PersistedSkillCardRecord | undefined, options: CreateSupabaseSkillPersistencePlanOptions): SkillCardEventSupabaseInsert {
  const subject = getSubject(card?.conversation_id, options);

  return {
    teacher_id: options.sessionTeacherId,
    student_id: subject.studentId ?? null,
    class_id: subject.classId ?? null,
    external_event_id: event.id,
    external_card_id: event.skill_card_id,
    external_run_id: event.skill_run_id,
    action: event.action,
    event_type: event.event_type,
    status_before: event.status_before,
    status_after: event.status_after,
    message: event.message ?? null,
    metadata: event.metadata ?? {},
    created_at: event.created_at
  };
}

function mapSkillCardEdit(edit: PersistedSkillCardEditRecord, card: PersistedSkillCardRecord | undefined, options: CreateSupabaseSkillPersistencePlanOptions): SkillCardEditSupabaseInsert {
  const subject = getSubject(card?.conversation_id, options);

  return {
    teacher_id: options.sessionTeacherId,
    student_id: subject.studentId ?? null,
    class_id: subject.classId ?? null,
    external_edit_id: edit.id,
    external_card_id: edit.skill_card_id,
    external_run_id: edit.skill_run_id,
    field_path: edit.field_path,
    before_value: edit.before,
    after_value: edit.after,
    edited_by: edit.edited_by,
    source: edit.source,
    created_at: edit.edited_at
  };
}

function mapArchiveLog(
  record: WorkbenchStoragePayload["timeline_records"][number],
  card: PersistedSkillCardRecord | undefined,
  run: PersistedSkillRunRecord | undefined,
  options: CreateSupabaseSkillPersistencePlanOptions
): SkillArchiveLogSupabaseInsert {
  const subject = getSubject(record.conversationId, options);

  return {
    teacher_id: options.sessionTeacherId,
    student_id: subject.studentId ?? null,
    class_id: subject.classId ?? null,
    external_archive_id: record.id,
    external_card_id: record.sourceTaskId,
    external_run_id: card?.skill_run_id ?? run?.id ?? record.sourceTaskId,
    archive_target: record.archiveTarget,
    title: record.title,
    summary: record.summary,
    archived_output: card?.archived_output ?? null,
    created_at: record.createdAt
  };
}

function getSubject(conversationId: string | undefined, options: CreateSupabaseSkillPersistencePlanOptions): Required<SupabaseSubjectRef> {
  const fallbackExternalId = conversationId ?? "unknown";
  const subject = conversationId ? options.subjectsByConversationId?.[conversationId] : undefined;

  return {
    subjectType: subject?.subjectType ?? "student",
    studentId: subject?.studentId ?? null,
    classId: subject?.classId ?? null,
    subjectExternalId: subject?.subjectExternalId ?? fallbackExternalId
  };
}
