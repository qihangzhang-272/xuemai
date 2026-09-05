import { describe, expect, it, vi } from "vitest";
import { parseParentFeedbackConfirmBody, parseParentFeedbackGenerateBody } from "../src/agents/parent-feedback/api-contract";
import { getParentFeedbackApiStatus } from "../src/agents/parent-feedback/api-errors";
import { confirmParentFeedbackDraft, type AgentOutputDraftRecord } from "../src/agents/parent-feedback/confirm";
import { createAgentError } from "../src/agents/shared/recovery/error-map";
import { createAuthRequiredError, createPermissionRequiredError } from "../src/agents/shared/auth/teacher-session";

const teacherId = "11111111-1111-4111-8111-111111111111";
const forgedTeacherId = "22222222-2222-4222-8222-222222222222";
const studentId = "33333333-3333-4333-8333-333333333333";
const agentOutputId = "44444444-4444-4444-8444-444444444444";
const agentRunId = "55555555-5555-4555-8555-555555555555";

function createAgentOutput(overrides: Partial<AgentOutputDraftRecord> = {}): AgentOutputDraftRecord {
  return {
    id: agentOutputId,
    agent_run_id: agentRunId,
    agent_name: "parent-feedback",
    teacher_id: teacherId,
    student_id: studentId,
    class_id: null,
    output_type: "parent_feedback",
    output_text: "AI 原始反馈",
    output_json: {
      feedbackText: "AI 原始反馈"
    },
    quality_score: 88,
    status: "draft",
    is_final: false,
    ...overrides
  };
}

describe("parent feedback API security boundary", () => {
  it("ignores forged request-body teacherId when parsing generate input", () => {
    const input = parseParentFeedbackGenerateBody(
      {
        teacherId: forgedTeacherId,
        studentId,
        classNote: "今天能跟上讲解。"
      },
      teacherId
    );

    expect(input.teacherId).toBe(teacherId);
    expect(input.teacherId).not.toBe(forgedTeacherId);
  });

  it("ignores forged request-body teacherId when parsing confirm input", () => {
    const input = parseParentFeedbackConfirmBody(
      {
        teacherId: forgedTeacherId,
        studentId,
        agentOutputId,
        finalFeedbackText: "老师确认后的反馈"
      },
      teacherId
    );

    expect(input.teacherId).toBe(teacherId);
    expect(input.teacherId).not.toBe(forgedTeacherId);
  });

  it("maps auth and ownership failures to 401 and 403", () => {
    expect(getParentFeedbackApiStatus(createAuthRequiredError())).toBe(401);
    expect(getParentFeedbackApiStatus(createPermissionRequiredError())).toBe(403);
    expect(
      getParentFeedbackApiStatus(
        createAgentError({
          code: "INVALID_INPUT",
          message: "bad input",
          recoverable: true
        })
      )
    ).toBe(400);
  });

  it("does not let service-role archive bypass ownership checks", async () => {
    const archiveDraft = vi.fn();

    await expect(
      confirmParentFeedbackDraft(
        {
          teacherId,
          studentId,
          agentOutputId,
          finalFeedbackText: "老师确认后的反馈"
        },
        {
          loadAgentOutput: async () => createAgentOutput({ teacher_id: forgedTeacherId }),
          archiveDraft
        }
      )
    ).rejects.toMatchObject({
      code: "permission_required"
    });

    expect(archiveDraft).not.toHaveBeenCalled();
  });

  it("accepts already-final output through the idempotent archive path", async () => {
    const archiveDraft = vi.fn(async () => ({
      feedbackHistoryId: "66666666-6666-4666-8666-666666666666",
      learningRecordId: "77777777-7777-4777-8777-777777777777",
      agentOutputId,
      agentRunId,
      status: "confirmed" as const,
      teacherEdited: false
    }));

    const result = await confirmParentFeedbackDraft(
      {
        teacherId,
        studentId,
        agentOutputId,
        finalFeedbackText: "老师确认后的反馈"
      },
      {
        loadAgentOutput: async () => createAgentOutput({ status: "confirmed", is_final: true }),
        archiveDraft
      }
    );

    expect(result.agentOutputId).toBe(agentOutputId);
    expect(archiveDraft).toHaveBeenCalledTimes(1);
    expect(archiveDraft).toHaveBeenCalledWith(expect.objectContaining({ agentOutputId, teacherId, studentId }));
  });

  it("returns structured error for non-confirmable output states", async () => {
    await expect(
      confirmParentFeedbackDraft(
        {
          teacherId,
          studentId,
          agentOutputId,
          finalFeedbackText: "老师确认后的反馈"
        },
        {
          loadAgentOutput: async () => createAgentOutput({ status: "discarded", is_final: false })
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
      recoverable: true
    });
  });
});
