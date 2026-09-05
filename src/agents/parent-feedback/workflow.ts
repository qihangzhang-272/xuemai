import { createJsonChatCompletion } from "../shared/model/call-model";
import { createSupabaseRunLogger } from "../shared/logging/supabase-run-logger";
import { mapUnknownError } from "../shared/recovery/error-map";
import { buildParentFeedbackContext } from "./context";
import { PARENT_FEEDBACK_AGENT_NAME, PARENT_FEEDBACK_AGENT_VERSION, PARENT_FEEDBACK_OUTPUT_TYPE, PARENT_FEEDBACK_REVISION_THRESHOLD } from "./constants";
import { evaluateParentFeedbackOutput } from "./evaluator";
import { runParentFeedbackGuardrails } from "./guardrails";
import { buildParentFeedbackMessages, buildParentFeedbackRevisionMessages } from "./prompt";
import { createGuardrailBlockedError, createInvalidModelResponseError, createInvalidParentFeedbackInputError } from "./recovery";
import type { ParentFeedbackInput, ParentFeedbackModelOutput, ParentFeedbackOutput } from "./types";

type WorkflowResult = {
  success: true;
  data: ParentFeedbackOutput;
};

type TokenUsageSummary = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function runParentFeedbackWorkflow(input: ParentFeedbackInput): Promise<WorkflowResult> {
  const validatedInput = validateParentFeedbackInput(input);
  const logger = createSupabaseRunLogger();
  const startedAt = Date.now();
  let agentRunId: string | undefined;

  try {
    const run = await logger.startRun({
      agent_name: PARENT_FEEDBACK_AGENT_NAME,
      agent_version: PARENT_FEEDBACK_AGENT_VERSION,
      teacher_id: validatedInput.teacherId,
      student_id: validatedInput.studentId,
      class_id: validatedInput.classId,
      task_id: validatedInput.taskId,
      input: sanitizeRunInput(validatedInput),
      context_summary: {
        stage: "created_before_context_load"
      },
      context_record_ids: [],
      status: "running",
      warnings: []
    });
    agentRunId = run.id;

    const context = await buildParentFeedbackContext(validatedInput);
    const firstCompletion = await createJsonChatCompletion({
      messages: buildParentFeedbackMessages(validatedInput, context),
      temperature: 0.35
    });
    const firstContent = readCompletionContent(firstCompletion);
    let draft = parseParentFeedbackModelOutput(firstContent);
    let evaluation = evaluateParentFeedbackOutput(draft);
    let guardrails = runParentFeedbackGuardrails(draft);
    let revised = false;
    const rawOutputs = [firstContent];
    const warnings = [...context.assembledContext.warnings, ...evaluation.warnings, ...guardrails.warnings];
    const tokenUsage = collectTokenUsage([firstCompletion.usage]);

    if (evaluation.overallScore < PARENT_FEEDBACK_REVISION_THRESHOLD || !guardrails.passed) {
      const revisionCompletion = await createJsonChatCompletion({
        messages: buildParentFeedbackRevisionMessages(validatedInput, context, draft, [...evaluation.warnings, ...guardrails.warnings]),
        temperature: 0.25
      });
      const revisionContent = readCompletionContent(revisionCompletion);
      draft = parseParentFeedbackModelOutput(revisionContent);
      evaluation = evaluateParentFeedbackOutput(draft);
      guardrails = runParentFeedbackGuardrails(draft);
      revised = true;
      rawOutputs.push(revisionContent);
      tokenUsage.push(...collectTokenUsage([revisionCompletion.usage]));
      warnings.push(...evaluation.warnings, ...guardrails.warnings);
    }

    if (!guardrails.passed) {
      throw createGuardrailBlockedError();
    }

    const finalWarnings = dedupeWarnings(warnings);
    const status = evaluation.overallScore >= PARENT_FEEDBACK_REVISION_THRESHOLD ? "success" : "fallback";
    const output = toParentFeedbackOutput(draft, {
      qualityScore: evaluation.overallScore,
      warnings: finalWarnings,
      revised,
      agentRunId
    });

    const agentOutput = await logger.recordOutput({
      agent_run_id: agentRunId,
      agent_name: PARENT_FEEDBACK_AGENT_NAME,
      teacher_id: validatedInput.teacherId,
      student_id: validatedInput.studentId,
      class_id: validatedInput.classId,
      output_type: PARENT_FEEDBACK_OUTPUT_TYPE,
      output_text: output.feedbackText,
      output_json: output,
      quality_score: output.qualityScore,
      status: "draft",
      is_final: false
    });

    output.agentOutputId = agentOutput.id;

    await logger.completeRun({
      id: agentRunId,
      status,
      raw_model_output: {
        outputs: rawOutputs
      },
      final_output: output,
      context_summary: context.assembledContext.contextSummary,
      context_record_ids: context.assembledContext.contextRecordIds,
      quality_score: output.qualityScore,
      warnings: output.warnings,
      latency_ms: Date.now() - startedAt,
      token_usage: summarizeTokenUsage(tokenUsage)
    });

    return {
      success: true,
      data: output
    };
  } catch (error) {
    const agentError = mapUnknownError(error);

    if (agentRunId) {
      try {
        await logger.failRun({
          id: agentRunId,
          status: "failed",
          error_code: agentError.code,
          error_message: agentError.message,
          warnings: [],
          latency_ms: Date.now() - startedAt
        });
      } catch {
        // Preserve the original Agent error for the API response.
      }
    }

    throw agentError;
  }
}

export function validateParentFeedbackInput(input: ParentFeedbackInput): ParentFeedbackInput {
  if (!input || typeof input !== "object") {
    throw createInvalidParentFeedbackInputError("请求体格式不正确。");
  }

  // API routes must derive teacherId from Supabase Auth before this workflow is called.
  if (!isUuid(input.teacherId)) {
    throw createInvalidParentFeedbackInputError("teacherId 必须是服务端 Auth session 派生的有效 uuid。");
  }

  if (!isUuid(input.studentId)) {
    throw createInvalidParentFeedbackInputError("studentId 必须是有效 uuid。");
  }

  if (input.classId && !isUuid(input.classId)) {
    throw createInvalidParentFeedbackInputError("classId 必须是有效 uuid。");
  }

  if (!input.classNote && !input.wrongQuestionSummary && (!input.knowledgePoints || input.knowledgePoints.length === 0)) {
    throw createInvalidParentFeedbackInputError("请至少提供课堂表现、错题摘要或知识点。");
  }

  return {
    ...input,
    classNote: cleanOptionalString(input.classNote),
    wrongQuestionSummary: cleanOptionalString(input.wrongQuestionSummary),
    teacherInstruction: cleanOptionalString(input.teacherInstruction),
    knowledgePoints: (input.knowledgePoints ?? []).filter((point) => typeof point === "string" && point.trim().length > 0).map((point) => point.trim())
  };
}

function parseParentFeedbackModelOutput(content: string): ParentFeedbackModelOutput {
  const parsed = safeJsonParse(content);
  if (!parsed || typeof parsed !== "object") {
    throw createInvalidModelResponseError();
  }

  const data = parsed as Record<string, unknown>;
  const feedbackText = readRequiredString(data.feedbackText, "feedbackText");
  const coreIssue = readRequiredString(data.coreIssue, "coreIssue");
  const nextAction = readRequiredString(data.nextAction, "nextAction");

  return {
    feedbackText,
    studentStatus: readStudentStatus(data.studentStatus),
    coreIssue,
    nextAction,
    relatedKnowledgePoints: readStringArray(data.relatedKnowledgePoints),
    shouldUpdateStudentProfile: typeof data.shouldUpdateStudentProfile === "boolean" ? data.shouldUpdateStudentProfile : false,
    suggestedProfileUpdate: readSuggestedProfileUpdate(data.suggestedProfileUpdate)
  };
}

function toParentFeedbackOutput(
  draft: ParentFeedbackModelOutput,
  meta: Pick<ParentFeedbackOutput, "qualityScore" | "warnings" | "revised" | "agentRunId">
): ParentFeedbackOutput {
  return {
    ...draft,
    qualityScore: meta.qualityScore,
    warnings: meta.warnings,
    revised: meta.revised,
    agentRunId: meta.agentRunId
  };
}

function safeJsonParse(content: string) {
  const trimmed = content.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return JSON.parse(withoutFence);
}

function readCompletionContent(completion: Awaited<ReturnType<typeof createJsonChatCompletion>>) {
  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw createInvalidModelResponseError("模型返回为空，请稍后重试。");
  }

  return content;
}

function readRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createInvalidModelResponseError(`模型输出缺少 ${fieldName}。`);
  }

  return value.trim();
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function readStudentStatus(value: unknown): ParentFeedbackModelOutput["studentStatus"] {
  if (value === "excellent" || value === "stable" || value === "needs_attention") return value;
  return "stable";
}

function readSuggestedProfileUpdate(value: unknown): ParentFeedbackModelOutput["suggestedProfileUpdate"] {
  if (!value || typeof value !== "object") {
    return {
      weaknesses: [],
      learningHabits: [],
      nextFocus: "",
      riskSignals: []
    };
  }

  const data = value as Record<string, unknown>;

  return {
    weaknesses: readStringArray(data.weaknesses),
    learningHabits: readStringArray(data.learningHabits),
    nextFocus: typeof data.nextFocus === "string" ? data.nextFocus.trim() : "",
    riskSignals: readStringArray(data.riskSignals)
  };
}

function cleanOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function sanitizeRunInput(input: ParentFeedbackInput) {
  return {
    teacherId: input.teacherId,
    studentId: input.studentId,
    classId: input.classId,
    taskId: input.taskId,
    classNote: input.classNote,
    wrongQuestionSummary: input.wrongQuestionSummary,
    knowledgePoints: input.knowledgePoints,
    teacherInstruction: input.teacherInstruction,
    outputPreference: input.outputPreference
  };
}

function dedupeWarnings(warnings: string[]) {
  return [...new Set(warnings.filter((warning) => warning.trim().length > 0))];
}

function collectTokenUsage(usages: Array<Awaited<ReturnType<typeof createJsonChatCompletion>>["usage"] | undefined>) {
  return usages.filter((usage): usage is NonNullable<typeof usage> => Boolean(usage));
}

function summarizeTokenUsage(usages: ReturnType<typeof collectTokenUsage>): TokenUsageSummary | undefined {
  if (usages.length === 0) return undefined;

  return usages.reduce(
    (summary, usage) => ({
      prompt_tokens: summary.prompt_tokens + (usage.prompt_tokens ?? 0),
      completion_tokens: summary.completion_tokens + (usage.completion_tokens ?? 0),
      total_tokens: summary.total_tokens + (usage.total_tokens ?? 0)
    }),
    {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  );
}
