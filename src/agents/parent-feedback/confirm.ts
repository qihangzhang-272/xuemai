import { createAgentError, mapUnknownError } from "../shared/recovery/error-map";
import { getSupabaseServerClient } from "../shared/tools/supabase-server-client";
import { PARENT_FEEDBACK_OUTPUT_TYPE } from "./constants";
import type { ParentFeedbackConfirmInput, ParentFeedbackConfirmOutput } from "./types";

export type AgentOutputDraftRecord = {
  id: string;
  agent_run_id: string | null;
  agent_name: string;
  teacher_id: string;
  student_id: string | null;
  class_id: string | null;
  output_type: string;
  output_text: string | null;
  output_json: unknown;
  quality_score: number | null;
  status: string | null;
  is_final: boolean | null;
};

type ConfirmArchiveInput = {
  teacherId: string;
  studentId: string;
  classId?: string;
  agentRunId?: string;
  agentOutputId: string;
  finalFeedbackText: string;
  originalFeedbackText: string;
  coreIssue?: string;
  nextAction?: string;
  qualityScore?: number;
  teacherEdited: boolean;
};

type ConfirmArchiveRpcRow = {
  feedback_history_id: string;
  learning_record_id: string;
  agent_output_id: string;
  agent_run_id: string | null;
  status: "confirmed" | "edited";
  teacher_edited: boolean;
  edit_event_id: string | null;
};

export type ConfirmParentFeedbackDeps = {
  loadAgentOutput?: (agentOutputId: string) => Promise<AgentOutputDraftRecord>;
  archiveDraft?: (input: ConfirmArchiveInput) => Promise<ParentFeedbackConfirmOutput>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function confirmParentFeedbackDraft(input: ParentFeedbackConfirmInput, deps: ConfirmParentFeedbackDeps = {}): Promise<ParentFeedbackConfirmOutput> {
  try {
    const validatedInput = validateConfirmInput(input);
    const agentOutput = await (deps.loadAgentOutput ?? loadConfirmableAgentOutput)(validatedInput.agentOutputId);

    assertConfirmableAgentOutput(agentOutput, validatedInput);

    const originalFeedbackText = cleanOptionalString(validatedInput.originalFeedbackText) ?? agentOutput.output_text ?? "";
    const teacherEdited = originalFeedbackText.trim() !== validatedInput.finalFeedbackText.trim();
    const agentRunId = validatedInput.agentRunId ?? agentOutput.agent_run_id ?? undefined;
    const classId = validatedInput.classId ?? agentOutput.class_id ?? undefined;
    const qualityScore = typeof validatedInput.qualityScore === "number" ? validatedInput.qualityScore : agentOutput.quality_score ?? undefined;

    return await (deps.archiveDraft ?? archiveParentFeedbackDraft)({
      teacherId: validatedInput.teacherId,
      studentId: validatedInput.studentId,
      classId,
      agentRunId,
      agentOutputId: validatedInput.agentOutputId,
      finalFeedbackText: validatedInput.finalFeedbackText,
      originalFeedbackText,
      coreIssue: validatedInput.coreIssue,
      nextAction: validatedInput.nextAction,
      qualityScore,
      teacherEdited
    });
  } catch (error) {
    const agentError = mapUnknownError(error);

    if (agentError.code === "INVALID_INPUT" || agentError.code === "permission_required" || agentError.code === "tool_unavailable") {
      throw agentError;
    }

    throw createAgentError({
      code: "CONFIRM_FAILED",
      message: "保存失败，请稍后重试。",
      recoverable: true,
      cause: error
    });
  }
}

export function validateConfirmInput(input: ParentFeedbackConfirmInput): ParentFeedbackConfirmInput {
  if (!input || typeof input !== "object") {
    throw createConfirmInputError("请求体格式不正确。");
  }

  if (!isUuid(input.teacherId)) {
    throw createConfirmInputError("teacherId 必须是有效 uuid。");
  }

  if (!isUuid(input.studentId)) {
    throw createConfirmInputError("studentId 必须是有效 uuid。");
  }

  if (input.classId && !isUuid(input.classId)) {
    throw createConfirmInputError("classId 必须是有效 uuid。");
  }

  if (input.agentRunId && !isUuid(input.agentRunId)) {
    throw createConfirmInputError("agentRunId 必须是有效 uuid。");
  }

  if (!isUuid(input.agentOutputId)) {
    throw createConfirmInputError("agentOutputId 必须是有效 uuid。");
  }

  if (!cleanOptionalString(input.finalFeedbackText)) {
    throw createConfirmInputError("finalFeedbackText 不能为空。");
  }

  return {
    ...input,
    finalFeedbackText: input.finalFeedbackText.trim(),
    originalFeedbackText: cleanOptionalString(input.originalFeedbackText),
    coreIssue: cleanOptionalString(input.coreIssue),
    nextAction: cleanOptionalString(input.nextAction)
  };
}

async function loadConfirmableAgentOutput(agentOutputId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("agent_outputs")
    .select("id, agent_run_id, agent_name, teacher_id, student_id, class_id, output_type, output_text, output_json, quality_score, status, is_final")
    .eq("id", agentOutputId)
    .maybeSingle();

  if (error) {
    throw createAgentError({
      code: "tool_unavailable",
      message: `读取 AI 草稿失败：${error.message}`,
      recoverable: true,
      cause: error
    });
  }

  if (!data) {
    throw createConfirmInputError("未找到可确认的 AI 草稿。");
  }

  return data as AgentOutputDraftRecord;
}

function assertConfirmableAgentOutput(agentOutput: AgentOutputDraftRecord, input: ParentFeedbackConfirmInput) {
  if (agentOutput.output_type !== PARENT_FEEDBACK_OUTPUT_TYPE) {
    throw createConfirmInputError("agent_outputs.output_type 必须是 parent_feedback。");
  }

  if (!isConfirmableOrAlreadyFinal(agentOutput)) {
    throw createConfirmInputError("只有 draft、edited 或已确认状态的家长反馈草稿可以确认保存。");
  }

  if (agentOutput.teacher_id !== input.teacherId || agentOutput.student_id !== input.studentId) {
    throw createAgentError({
      code: "permission_required",
      message: "AI 草稿不属于当前老师或学生。",
      recoverable: false
    });
  }

  if (input.agentRunId && agentOutput.agent_run_id !== input.agentRunId) {
    throw createConfirmInputError("agentRunId 与 agentOutputId 不匹配。");
  }

  if (input.classId && agentOutput.class_id && agentOutput.class_id !== input.classId) {
    throw createConfirmInputError("classId 与 agentOutputId 不匹配。");
  }
}

async function archiveParentFeedbackDraft(input: ConfirmArchiveInput): Promise<ParentFeedbackConfirmOutput> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("confirm_parent_feedback_archive", {
      p_teacher_id: input.teacherId,
      p_student_id: input.studentId,
      p_class_id: input.classId ?? null,
      p_agent_run_id: input.agentRunId ?? null,
      p_agent_output_id: input.agentOutputId,
      p_final_feedback_text: input.finalFeedbackText,
      p_original_feedback_text: input.originalFeedbackText,
      p_core_issue: input.coreIssue ?? null,
      p_next_action: input.nextAction ?? null,
      p_quality_score: input.qualityScore ?? null,
      p_teacher_edited: input.teacherEdited
    })
    .single();

  if (error) {
    throw createAgentError({
      code: "tool_unavailable",
      message: `确认入档失败：${error.message}`,
      recoverable: true,
      cause: error
    });
  }

  const row = data as ConfirmArchiveRpcRow;

  return {
    feedbackHistoryId: row.feedback_history_id,
    learningRecordId: row.learning_record_id,
    agentOutputId: row.agent_output_id,
    agentRunId: row.agent_run_id ?? undefined,
    status: row.status,
    teacherEdited: row.teacher_edited,
    editEventId: row.edit_event_id ?? undefined
  };
}

function createConfirmInputError(message: string) {
  return createAgentError({
    code: "INVALID_INPUT",
    message,
    recoverable: true
  });
}

function cleanOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isConfirmableOrAlreadyFinal(agentOutput: AgentOutputDraftRecord) {
  if (agentOutput.status === "draft" || agentOutput.status === "edited") return true;
  return agentOutput.is_final === true && (agentOutput.status === "confirmed" || agentOutput.status === "archived");
}
