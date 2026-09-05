import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkbenchStoragePayload } from "../components/xuemai-workbench/persistence";
import type { ChatState, TaskCard } from "../components/xuemai-workbench/types";

const mocks = vi.hoisted(() => ({
  requireTeacherSession: vi.fn(),
  assertTeacherOwnsStudent: vi.fn(),
  assertTeacherOwnsClass: vi.fn(),
  getSupabaseServerClient: vi.fn()
}));

vi.mock("@/src/agents/shared/auth/teacher-session", () => ({
  requireTeacherSession: mocks.requireTeacherSession
}));

vi.mock("@/src/agents/shared/auth/ownership", () => ({
  assertTeacherOwnsStudent: mocks.assertTeacherOwnsStudent,
  assertTeacherOwnsClass: mocks.assertTeacherOwnsClass
}));

vi.mock("@/src/agents/shared/tools/supabase-server-client", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient
}));

import { POST } from "../app/api/skills/persistence/route";

describe("Skill persistence route boundary", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.requireTeacherSession.mockReset();
    mocks.assertTeacherOwnsStudent.mockReset();
    mocks.assertTeacherOwnsClass.mockReset();
    mocks.getSupabaseServerClient.mockReset();
  });

  it("returns 401 when there is no teacher session", async () => {
    mocks.requireTeacherSession.mockRejectedValue({
      code: "AUTH_REQUIRED",
      message: "请先登录。",
      recoverable: false
    });

    const response = await POST(createRequest({ payload: createPayload() }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "AUTH_REQUIRED" })
      })
    );
  });

  it("keeps dry-run mode session-scoped and checks declared subject ownership", async () => {
    mocks.requireTeacherSession.mockResolvedValue({ teacherId: "00000000-0000-4000-8000-000000000001" });
    mocks.assertTeacherOwnsStudent.mockResolvedValue(undefined);
    mocks.assertTeacherOwnsClass.mockResolvedValue(undefined);

    const response = await POST(
      createRequest({
        payload: createPayload(),
        subjectsByConversationId: {
          "student-wang": {
            subjectType: "student",
            studentId: "00000000-0000-4000-8000-000000000101",
            classId: "00000000-0000-4000-8000-000000000201"
          }
        }
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(expect.objectContaining({ success: true, mode: "dry_run" }));
    expect(mocks.assertTeacherOwnsStudent).toHaveBeenCalledWith({
      teacherId: "00000000-0000-4000-8000-000000000001",
      studentId: "00000000-0000-4000-8000-000000000101"
    });
    expect(mocks.assertTeacherOwnsClass).toHaveBeenCalledWith({
      teacherId: "00000000-0000-4000-8000-000000000001",
      classId: "00000000-0000-4000-8000-000000000201"
    });
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("rejects real writes by default before reaching the service-role client", async () => {
    vi.stubEnv("SKILL_PERSISTENCE_WRITE_ENABLED", "false");
    mocks.requireTeacherSession.mockResolvedValue({ teacherId: "00000000-0000-4000-8000-000000000001" });

    const response = await POST(createRequest({ payload: createPayload(), dryRun: false }));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json).toEqual(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "SKILL_PERSISTENCE_SYNC_DISABLED" })
      })
    );
    expect(mocks.assertTeacherOwnsStudent).not.toHaveBeenCalled();
    expect(mocks.assertTeacherOwnsClass).not.toHaveBeenCalled();
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("writes through the service client only when the server-side flag is enabled", async () => {
    vi.stubEnv("SKILL_PERSISTENCE_WRITE_ENABLED", "true");
    mocks.requireTeacherSession.mockResolvedValue({ teacherId: "00000000-0000-4000-8000-000000000001" });
    mocks.assertTeacherOwnsStudent.mockResolvedValue(undefined);
    const tableWrites: string[] = [];
    mocks.getSupabaseServerClient.mockReturnValue(createFakeSupabaseClient(tableWrites));

    const response = await POST(
      createRequest({
        payload: createPayload(createChatStateWithArchivedTask()),
        dryRun: false,
        subjectsByConversationId: {
          "student-wang": {
            subjectType: "student",
            studentId: "00000000-0000-4000-8000-000000000101"
          }
        }
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(
      expect.objectContaining({
        success: true,
        mode: "write",
        data: expect.objectContaining({
          counts: {
            skill_runs: 1,
            skill_cards: 1,
            skill_card_events: 1,
            skill_card_edits: 1,
            skill_archive_logs: 1
          }
        })
      })
    );
    expect(mocks.assertTeacherOwnsStudent).toHaveBeenCalledWith({
      teacherId: "00000000-0000-4000-8000-000000000001",
      studentId: "00000000-0000-4000-8000-000000000101"
    });
    expect(tableWrites).toEqual(["skill_runs", "skill_cards", "skill_card_events", "skill_card_edits", "skill_archive_logs"]);
  });
});

function createRequest(body: unknown) {
  return new Request("http://localhost/api/skills/persistence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function createPayload(state = createChatState()) {
  return createWorkbenchStoragePayload(state, "2026-06-12T00:00:00.000Z");
}

function createChatState(overrides: Partial<ChatState> = {}): ChatState {
  return {
    conversations: [],
    messages: [],
    taskCards: [],
    timelineRecords: [],
    preferences: {
      autoAnalyzeUploadedPaper: false,
      autoArchiveLearningEvidence: false,
      feedbackTone: "温和",
      defaultTaskSet: []
    },
    teacher: null,
    currentConversationId: "student-wang",
    ...overrides
  };
}

function createChatStateWithArchivedTask(): ChatState {
  const task = createArchivedTaskCard();

  return createChatState({
    taskCards: [task],
    timelineRecords: [
      {
        id: "timeline-task-learning-record",
        conversationId: "student-wang",
        sourceTaskId: task.id,
        skillId: task.skillId,
        title: "学习记录草稿",
        summary: "最终入档学习记录",
        archiveTarget: "学生档案 > 学习记录",
        createdAt: "2026-06-12T00:00:00.000Z"
      }
    ]
  });
}

function createArchivedTaskCard(): TaskCard {
  return {
    id: "task-learning-record",
    conversationId: "student-wang",
    targetName: "王一路",
    skillRunId: "run-task-learning-record",
    skillId: "update_learning_record",
    taskType: "learning_record",
    title: "学习记录草稿",
    status: "archived",
    currentStepIndex: 0,
    steps: [],
    inputSummary: "课堂能跟上讲解，独立完成时容易遗漏关键信息。",
    contextSources: [{ id: "teacher-input", label: "老师输入内容", type: "teacher_input" }],
    confidenceLevel: "medium",
    structuredResult: { performance: "最终入档学习记录" },
    originalOutput: {
      display_content: "AI 原始学习记录",
      structured_result: { performance: "AI 原始学习记录" }
    },
    currentOutput: {
      display_content: "最终入档学习记录",
      structured_result: { performance: "最终入档学习记录" }
    },
    archivedOutput: {
      display_content: "最终入档学习记录",
      structured_result: { performance: "最终入档学习记录" }
    },
    actionEvents: [
      {
        id: "event-save-note",
        skill_run_id: "run-task-learning-record",
        action: "save_note",
        event_type: "note_action",
        status_before: "draft_ready",
        status_after: "draft_ready",
        message: "已仅保存备注",
        created_at: "2026-06-12T00:00:00.000Z"
      }
    ],
    editEvents: [
      {
        id: "edit-performance",
        skill_run_id: "run-task-learning-record",
        field_path: "current_output.display_content",
        before: "AI 原始学习记录",
        after: "最终入档学习记录",
        edited_at: "2026-06-12T00:00:00.000Z",
        edited_by: "teacher",
        source: "manual_edit"
      }
    ],
    summary: "最终入档学习记录",
    archiveTarget: "学生档案 > 学习记录",
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z"
  };
}

function createFakeSupabaseClient(tableWrites: string[]) {
  return {
    from: vi.fn((table: string) => ({
      upsert: vi.fn(() => {
        tableWrites.push(table);

        if (table === "skill_runs") {
          return {
            select: vi.fn(async () => ({
              data: [{ id: "00000000-0000-4000-8000-000000000301", external_run_id: "run-task-learning-record" }],
              error: null
            }))
          };
        }

        if (table === "skill_cards") {
          return {
            select: vi.fn(async () => ({
              data: [
                {
                  id: "00000000-0000-4000-8000-000000000401",
                  external_card_id: "task-learning-record",
                  external_run_id: "run-task-learning-record"
                }
              ],
              error: null
            }))
          };
        }

        return { error: null };
      })
    }))
  };
}
