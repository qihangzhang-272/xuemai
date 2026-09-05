import type { ParentFeedbackConfirmInput, ParentFeedbackInput } from "./types";
import { createAgentError } from "../shared/recovery/error-map";

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function asRecord(body: unknown) {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export function parseParentFeedbackGenerateBody(body: unknown, teacherId: string): ParentFeedbackInput {
  const data = asRecord(body);

  return {
    teacherId,
    studentId: isString(data.studentId) ? data.studentId.trim() : "",
    classId: isString(data.classId) ? data.classId.trim() : undefined,
    classNote: isString(data.classNote) ? data.classNote.trim() : undefined,
    wrongQuestionSummary: isString(data.wrongQuestionSummary) ? data.wrongQuestionSummary.trim() : undefined,
    knowledgePoints: readStringArray(data.knowledgePoints),
    teacherInstruction: isString(data.teacherInstruction) ? data.teacherInstruction.trim() : undefined
  };
}

export function parseParentFeedbackConfirmBody(body: unknown, teacherId: string): ParentFeedbackConfirmInput {
  const data = asRecord(body);

  return {
    teacherId,
    studentId: isString(data.studentId) ? data.studentId.trim() : "",
    classId: isString(data.classId) ? data.classId.trim() : undefined,
    agentRunId: isString(data.agentRunId) ? data.agentRunId.trim() : undefined,
    agentOutputId: isString(data.agentOutputId) ? data.agentOutputId.trim() : "",
    finalFeedbackText: isString(data.finalFeedbackText) ? data.finalFeedbackText.trim() : "",
    originalFeedbackText: isString(data.originalFeedbackText) ? data.originalFeedbackText.trim() : undefined,
    coreIssue: isString(data.coreIssue) ? data.coreIssue.trim() : undefined,
    nextAction: isString(data.nextAction) ? data.nextAction.trim() : undefined,
    qualityScore: parseNumber(data.qualityScore)
  };
}

export async function readJsonRequestBody(request: Request) {
  try {
    return await request.json();
  } catch (error) {
    throw createAgentError({
      code: "INVALID_INPUT",
      message: "请求体必须是合法 JSON。",
      recoverable: true,
      cause: error
    });
  }
}
