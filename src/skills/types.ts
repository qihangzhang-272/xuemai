export type SkillScope = "student" | "class" | "teacher";

export type SkillSubjectType = SkillScope | "teacher_workspace";

export type SkillId =
  | "update_learning_record"
  | "analyze_learning_evidence"
  | "generate_feedback"
  | "next_lesson_plan"
  | "monthly_report"
  | "parent_communication"
  | "class_lesson_record"
  | "batch_feedback"
  | "common_weakness"
  | "tiered_practice"
  | "split_to_student_profiles"
  | "today_todos"
  | "batch_monthly_report"
  | "lesson_prep"
  | "materials_organize"
  | "renewal_followup"
  | "service_review";

export type SkillRunStatus = "created" | "needs_input" | "generating" | "draft_ready" | "copied" | "sent" | "archived" | "failed";

export type SkillConfidenceLevel = "low" | "medium" | "high";

export type SkillActionId =
  | "copy_feedback"
  | "make_warmer"
  | "make_shorter"
  | "mark_parent_sent"
  | "archive"
  | "regenerate"
  | "update_learning_record"
  | "update_weakness"
  | "generate_practice"
  | "generate_feedback"
  | "generate_next_lesson"
  | "add_report_material"
  | "add_monthly_material"
  | "save_note";

export type ContextSource = {
  id: string;
  label: string;
  type: "student_profile" | "learning_record" | "wrong_question" | "teacher_input" | "teacher_preference" | "class_context" | "mock";
};

export type SkillDefinition = {
  id: SkillId;
  label: string;
  description: string;
  subjectTypes: SkillSubjectType[];
  triggerLabels: string[];
  requiredInput: string[];
  contextSources: ContextSource[];
  steps: string[];
  outputType: "learning_record" | "parent_feedback" | "learning_evidence_analysis" | "lesson_plan" | "monthly_report" | "class_record" | "batch_feedback" | "note";
  archiveTarget: string;
  actions: SkillActionId[];
  nextSuggestions: SkillId[];
  confidenceLevel: SkillConfidenceLevel;
};

export type SkillRunError = {
  error_code: string;
  error_message: string;
  recoverable: boolean;
};

export type SkillRunEventType = "state_transition" | "follow_up_request" | "material_action" | "note_action" | "invalid_action";

export type SkillRunEvent = {
  id: string;
  skill_run_id: string;
  action: SkillActionId;
  event_type: SkillRunEventType;
  status_before: SkillRunStatus;
  status_after: SkillRunStatus;
  message: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export type SkillOutputVersion = {
  display_content: string;
  structured_result: Record<string, unknown>;
};

export type SkillEditEvent = {
  id: string;
  skill_run_id: string;
  field_path: string;
  before: unknown;
  after: unknown;
  edited_at: string;
  edited_by: "teacher";
  source: "manual_edit";
};

export type EditableSkillCardState = {
  skill_run_id: string;
  original_output: SkillOutputVersion;
  current_output: SkillOutputVersion;
  archived_output?: SkillOutputVersion;
  edit_events: SkillEditEvent[];
};

export type SkillRunInput = {
  skillId: SkillId;
  scope: SkillScope;
  subjectId: string;
  subjectName: string;
  inputSummary?: string;
  context?: SkillRunContext;
};

export type SkillRunContext = {
  inputSummary?: string;
  contextSources: ContextSource[];
  recordIds?: string[];
  metadata?: Record<string, unknown>;
};

export type SkillRunResult = {
  runId: string;
  skillId: SkillId;
  skillType: SkillId;
  title: string;
  scope: SkillScope;
  subjectId: string;
  subjectName: string;
  status: SkillRunStatus;
  inputSummary: string;
  context: SkillRunContext;
  contextSources: ContextSource[];
  confidenceLevel: SkillConfidenceLevel;
  structuredResult: Record<string, unknown>;
  displayContent: string;
  archiveTarget: string;
  actions: SkillActionId[];
  nextSuggestions: SkillId[];
  steps: string[];
  events: SkillRunEvent[];
  error?: SkillRunError;
};

export type SkillCardViewModel = {
  run_id: string;
  skill_run_id: string;
  skill_type: SkillId;
  title: string;
  status: SkillRunStatus;
  input_summary: string;
  context_sources: ContextSource[];
  confidence_level: SkillConfidenceLevel;
  structured_result: Record<string, unknown>;
  display_content: string;
  original_output: SkillOutputVersion;
  current_output: SkillOutputVersion;
  archived_output?: SkillOutputVersion;
  edit_events: SkillEditEvent[];
  run_events: SkillRunEvent[];
  actions: SkillActionId[];
  archive_target: string;
  next_suggestions: SkillId[];
  error_code?: string;
  error_message?: string;
};

export type MockSkillRunInput = {
  skillId: SkillId;
  subjectType: SkillSubjectType;
  subjectId: string;
  subjectName: string;
  subjectGrade?: string;
  subject?: string;
  inputSummary?: string;
};

export type MockSkillRunResult = {
  skillId: SkillId;
  title: string;
  status: SkillRunStatus;
  inputSummary: string;
  contextSources: ContextSource[];
  confidenceLevel: SkillConfidenceLevel;
  structuredResult: Record<string, unknown>;
  displayContent: string;
  archiveTarget: string;
  actions: SkillActionId[];
  nextSuggestions: SkillId[];
  steps: string[];
};
