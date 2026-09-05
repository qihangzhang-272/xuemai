import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTeacherSession: vi.fn(),
  assertTeacherOwnsStudent: vi.fn(),
  assertTeacherOwnsClass: vi.fn(),
  assertTeacherOwnsAgentOutput: vi.fn(),
  runParentFeedbackAgent: vi.fn(),
  confirmParentFeedbackDraft: vi.fn()
}));

vi.mock("@/src/agents/shared/auth/teacher-session", () => ({
  requireTeacherSession: mocks.requireTeacherSession
}));

vi.mock("@/src/agents/shared/auth/ownership", () => ({
  assertTeacherOwnsStudent: mocks.assertTeacherOwnsStudent,
  assertTeacherOwnsClass: mocks.assertTeacherOwnsClass,
  assertTeacherOwnsAgentOutput: mocks.assertTeacherOwnsAgentOutput
}));

vi.mock("@/src/agents/parent-feedback/agent", () => ({
  runParentFeedbackAgent: mocks.runParentFeedbackAgent
}));

vi.mock("@/src/agents/parent-feedback/confirm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/agents/parent-feedback/confirm")>();

  return {
    ...actual,
    confirmParentFeedbackDraft: mocks.confirmParentFeedbackDraft
  };
});

import { POST as generateParentFeedback } from "../app/api/agents/parent-feedback/route";
import { POST as confirmParentFeedback } from "../app/api/agents/parent-feedback/confirm/route";
import { createAgentError } from "../src/agents/shared/recovery/error-map";

const teacherId = "11111111-1111-4111-8111-111111111111";
const forgedTeacherId = "22222222-2222-4222-8222-222222222222";
const studentId = "33333333-3333-4333-8333-333333333333";
const classId = "44444444-4444-4444-8444-444444444444";
const agentOutputId = "55555555-5555-4555-8555-555555555555";

describe("parent feedback route security boundary", () => {
  beforeEach(() => {
    mocks.requireTeacherSession.mockReset();
    mocks.assertTeacherOwnsStudent.mockReset();
    mocks.assertTeacherOwnsClass.mockReset();
    mocks.assertTeacherOwnsAgentOutput.mockReset();
    mocks.runParentFeedbackAgent.mockReset();
    mocks.confirmParentFeedbackDraft.mockReset();
  });

  it("returns 401 before parsing trusted teacher identity when generation is unauthenticated", async () => {
    mocks.requireTeacherSession.mockRejectedValue(createAuthError());

    const response = await generateParentFeedback(createRequest("/api/agents/parent-feedback", createGenerateBody()));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual(expect.objectContaining({ success: false, error: expect.objectContaining({ code: "AUTH_REQUIRED" }) }));
    expect(mocks.assertTeacherOwnsStudent).not.toHaveBeenCalled();
    expect(mocks.runParentFeedbackAgent).not.toHaveBeenCalled();
  });

  it("ignores forged teacherId and checks student/class ownership before generation", async () => {
    mocks.requireTeacherSession.mockResolvedValue({ teacherId, userId: teacherId });
    mocks.assertTeacherOwnsStudent.mockResolvedValue(undefined);
    mocks.assertTeacherOwnsClass.mockResolvedValue(undefined);
    mocks.runParentFeedbackAgent.mockResolvedValue({
      success: true,
      data: {
        feedbackText: "老师确认前的 AI 草稿",
        studentStatus: "stable",
        coreIssue: "审题条件提取不稳定",
        nextAction: "先做条件圈画训练",
        relatedKnowledgePoints: [],
        shouldUpdateStudentProfile: false,
        qualityScore: 88,
        warnings: [],
        revised: false
      }
    });

    const response = await generateParentFeedback(
      createRequest("/api/agents/parent-feedback", {
        ...createGenerateBody(),
        teacherId: forgedTeacherId
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.assertTeacherOwnsStudent).toHaveBeenCalledWith({ teacherId, studentId });
    expect(mocks.assertTeacherOwnsClass).toHaveBeenCalledWith({ teacherId, classId });
    expect(mocks.runParentFeedbackAgent).toHaveBeenCalledWith(expect.objectContaining({ teacherId, studentId, classId }));
    expect(mocks.runParentFeedbackAgent).not.toHaveBeenCalledWith(expect.objectContaining({ teacherId: forgedTeacherId }));
  });

  it("returns 403 when class ownership fails before generation", async () => {
    mocks.requireTeacherSession.mockResolvedValue({ teacherId, userId: teacherId });
    mocks.assertTeacherOwnsStudent.mockResolvedValue(undefined);
    mocks.assertTeacherOwnsClass.mockRejectedValue(createPermissionError("无权访问该班级。"));

    const response = await generateParentFeedback(createRequest("/api/agents/parent-feedback", createGenerateBody()));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual(expect.objectContaining({ success: false, error: expect.objectContaining({ code: "permission_required" }) }));
    expect(mocks.runParentFeedbackAgent).not.toHaveBeenCalled();
  });

  it("checks student, class, and agent output ownership before confirm archive", async () => {
    mocks.requireTeacherSession.mockResolvedValue({ teacherId, userId: teacherId });
    mocks.assertTeacherOwnsStudent.mockResolvedValue(undefined);
    mocks.assertTeacherOwnsClass.mockResolvedValue(undefined);
    mocks.assertTeacherOwnsAgentOutput.mockResolvedValue(undefined);
    mocks.confirmParentFeedbackDraft.mockResolvedValue({
      feedbackHistoryId: "66666666-6666-4666-8666-666666666666",
      learningRecordId: "77777777-7777-4777-8777-777777777777",
      agentOutputId,
      status: "confirmed",
      teacherEdited: false
    });

    const response = await confirmParentFeedback(
      createRequest("/api/agents/parent-feedback/confirm", {
        teacherId: forgedTeacherId,
        studentId,
        classId,
        agentOutputId,
        finalFeedbackText: "老师确认后的反馈"
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.assertTeacherOwnsStudent).toHaveBeenCalledWith({ teacherId, studentId });
    expect(mocks.assertTeacherOwnsClass).toHaveBeenCalledWith({ teacherId, classId });
    expect(mocks.assertTeacherOwnsAgentOutput).toHaveBeenCalledWith({ teacherId, studentId, agentOutputId });
    expect(mocks.confirmParentFeedbackDraft).toHaveBeenCalledWith(expect.objectContaining({ teacherId, studentId, classId, agentOutputId }));
  });

  it("returns 403 and does not archive when agent output ownership fails", async () => {
    mocks.requireTeacherSession.mockResolvedValue({ teacherId, userId: teacherId });
    mocks.assertTeacherOwnsStudent.mockResolvedValue(undefined);
    mocks.assertTeacherOwnsClass.mockResolvedValue(undefined);
    mocks.assertTeacherOwnsAgentOutput.mockRejectedValue(createPermissionError("无权访问该 AI 草稿。"));

    const response = await confirmParentFeedback(
      createRequest("/api/agents/parent-feedback/confirm", {
        studentId,
        classId,
        agentOutputId,
        finalFeedbackText: "老师确认后的反馈"
      })
    );
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual(expect.objectContaining({ success: false, error: expect.objectContaining({ code: "permission_required" }) }));
    expect(mocks.confirmParentFeedbackDraft).not.toHaveBeenCalled();
  });
});

function createRequest(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function createGenerateBody() {
  return {
    studentId,
    classId,
    classNote: "今天能跟上讲解，但独立完成时容易漏条件。"
  };
}

function createAuthError() {
  return createAgentError({
    code: "AUTH_REQUIRED",
    message: "请先登录。",
    recoverable: false
  });
}

function createPermissionError(message: string) {
  return createAgentError({
    code: "permission_required",
    message,
    recoverable: false
  });
}
