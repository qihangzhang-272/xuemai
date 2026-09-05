import { describe, expect, it } from "vitest";
import { archiveTaskCardCurrentOutput, editTaskCardEditableValue } from "../components/xuemai-workbench/skill-card-version";
import { applyTaskSkillRunnerAction } from "../components/xuemai-workbench/skill-runner-adapter";
import { createWorkbenchStoragePayload, parseWorkbenchStoragePayload, stringifyWorkbenchStoragePayload, workbenchStorageSchemaVersion, type WorkbenchStoragePayload } from "../components/xuemai-workbench/persistence";
import { createSupabaseSkillPersistencePlan } from "../components/xuemai-workbench/supabase-persistence-adapter";
import type { ChatState, TaskCard } from "../components/xuemai-workbench/types";

describe("workbench persistence contract", () => {
  it("stores SkillCard lifecycle as schema-versioned records", () => {
    const edited = editTaskCardEditableValue(createTaskCard(), "老师编辑后的学习记录");
    const noted = applyTaskSkillRunnerAction(edited, "save_note").task;
    const archived = archiveTaskCardCurrentOutput(noted);
    const state = createChatState({ taskCards: [archived] });
    const payload = createWorkbenchStoragePayload(state, "2026-06-12T00:00:00.000Z");

    expect(payload.schema_version).toBe(workbenchStorageSchemaVersion);
    expect(payload.skill_runs).toEqual([
      expect.objectContaining({
        id: "run-task-learning-record",
        runner_status: "draft_ready",
        card_status: "completed"
      })
    ]);
    expect(payload.skill_cards).toEqual([
      expect.objectContaining({
        id: "task-learning-record",
        skill_run_id: "run-task-learning-record",
        current_output: expect.objectContaining({ display_content: "老师编辑后的学习记录" }),
        archived_output: expect.objectContaining({ display_content: "老师编辑后的学习记录" })
      })
    ]);
    expect(payload.skill_card_events).toEqual([expect.objectContaining({ skill_card_id: "task-learning-record", action: "save_note" })]);
    expect(payload.skill_card_edits).toEqual([expect.objectContaining({ skill_card_id: "task-learning-record", field_path: "structured_result.performance" })]);
  });

  it("keeps old raw ChatState localStorage data readable", () => {
    const legacyState = createChatState({ taskCards: [createTaskCard()] });
    const loaded = parseWorkbenchStoragePayload(JSON.stringify(legacyState));

    expect(loaded.taskCards).toHaveLength(1);
    expect(loaded.taskCards[0].id).toBe("task-learning-record");
    expect(loaded.currentConversationId).toBe("student-wang");
  });

  it("does not persist raw student image data in localStorage payloads", () => {
    const payload = createWorkbenchStoragePayload(
      createChatState({
        messages: [
          {
            id: "message-image",
            conversationId: "student-wang",
            sender: "teacher",
            type: "image",
            content: "课堂作业",
            imageUrl: "data:image/png;base64,private-image",
            attachments: [{ id: "attachment-1", fileName: "homework.png", imageUrl: "data:image/png;base64,private-attachment" }],
            createdAt: "2026-06-12T00:00:00.000Z"
          }
        ]
      }),
      "2026-06-12T00:00:00.000Z"
    );

    expect(payload.chat_state.messages[0]).toMatchObject({
      id: "message-image",
      imageUrl: undefined,
      attachments: [{ id: "attachment-1", fileName: "homework.png", imageUrl: undefined }]
    });
    expect(JSON.stringify(payload)).not.toContain("private-image");
    expect(JSON.stringify(payload)).not.toContain("private-attachment");
  });

  it("rehydrates events and edits from normalized persistence records", () => {
    const edited = editTaskCardEditableValue(createTaskCard(), "老师编辑后的学习记录");
    const noted = applyTaskSkillRunnerAction(edited, "save_note").task;
    const payload = createWorkbenchStoragePayload(createChatState({ taskCards: [noted] }), "2026-06-12T00:00:00.000Z");
    const strippedPayload: WorkbenchStoragePayload = {
      ...payload,
      chat_state: {
        ...payload.chat_state,
        taskCards: payload.chat_state.taskCards.map((task) => ({
          ...task,
          originalOutput: undefined,
          currentOutput: undefined,
          editEvents: undefined,
          actionEvents: undefined
        }))
      }
    };
    const loaded = parseWorkbenchStoragePayload(JSON.stringify(strippedPayload));

    expect(loaded.taskCards[0].actionEvents?.map((event) => event.action)).toEqual(["save_note"]);
    expect(loaded.taskCards[0].editEvents?.map((event) => event.field_path)).toEqual(["structured_result.performance"]);
    expect(loaded.taskCards[0].currentOutput?.display_content).toBe("老师编辑后的学习记录");
  });

  it("round-trips archived timeline records for local replay", () => {
    const task = archiveTaskCardCurrentOutput(editTaskCardEditableValue(createTaskCard(), "最终入档学习记录"));
    const state = createChatState({
      taskCards: [task],
      timelineRecords: [
        {
          id: "timeline-1",
          conversationId: "student-wang",
          sourceTaskId: task.id,
          skillId: task.skillId,
          title: "学习记录草稿",
          summary: "最终入档学习记录",
          archiveTarget: "学生档案 > 学习记录",
          profileUpdates: [
            {
              id: "task-learning-record:weakness_event:条件提取",
              target: "weakness_event",
              label: "新增薄弱点事件：条件提取",
              value: "复杂任务中容易漏条件。",
              evidence: "课堂记录",
              sourceTaskId: task.id,
              confirmedAt: "2026-06-12T00:00:00.000Z"
            }
          ],
          createdAt: "2026-06-12T00:00:00.000Z"
        }
      ]
    });
    const loaded = parseWorkbenchStoragePayload(stringifyWorkbenchStoragePayload(state, "2026-06-12T00:00:00.000Z"));

    expect(loaded.taskCards[0].archivedOutput?.display_content).toBe("最终入档学习记录");
    expect(loaded.timelineRecords).toEqual([
      expect.objectContaining({
        sourceTaskId: "task-learning-record",
        summary: "最终入档学习记录",
        profileUpdates: [expect.objectContaining({ target: "weakness_event", value: "复杂任务中容易漏条件。" })]
      })
    ]);
  });

  it("maps local SkillCard persistence payload to Supabase-compatible upsert rows", () => {
    const task = archiveTaskCardCurrentOutput(applyTaskSkillRunnerAction(editTaskCardEditableValue(createTaskCard(), "最终入档学习记录"), "save_note").task);
    const payload = createWorkbenchStoragePayload(
      createChatState({
        taskCards: [task],
        timelineRecords: [
          {
            id: "timeline-1",
            conversationId: "student-wang",
            sourceTaskId: task.id,
            skillId: task.skillId,
            title: "学习记录草稿",
            summary: "最终入档学习记录",
            archiveTarget: "学生档案 > 学习记录",
            createdAt: "2026-06-12T00:00:00.000Z"
          }
        ]
      }),
      "2026-06-12T00:00:00.000Z"
    );
    const plan = createSupabaseSkillPersistencePlan(payload, {
      sessionTeacherId: "00000000-0000-4000-8000-000000000001",
      subjectsByConversationId: {
        "student-wang": {
          subjectType: "student",
          studentId: "00000000-0000-4000-8000-000000000101",
          classId: "00000000-0000-4000-8000-000000000201",
          subjectExternalId: "student-wang"
        }
      }
    });

    expect(plan.skill_runs).toEqual([
      expect.objectContaining({
        teacher_id: "00000000-0000-4000-8000-000000000001",
        student_id: "00000000-0000-4000-8000-000000000101",
        class_id: "00000000-0000-4000-8000-000000000201",
        external_run_id: "run-task-learning-record",
        skill_id: "update_learning_record"
      })
    ]);
    expect(plan.skill_cards).toEqual([
      expect.objectContaining({
        external_card_id: "task-learning-record",
        external_run_id: "run-task-learning-record",
        is_archived: true,
        archived_output: expect.objectContaining({ display_content: "最终入档学习记录" })
      })
    ]);
    expect(plan.skill_card_events).toEqual([expect.objectContaining({ external_card_id: "task-learning-record", action: "save_note" })]);
    expect(plan.skill_card_edits).toEqual([expect.objectContaining({ external_card_id: "task-learning-record", field_path: "structured_result.performance" })]);
    expect(plan.skill_archive_logs).toEqual([expect.objectContaining({ external_archive_id: "timeline-1", external_card_id: "task-learning-record" })]);
  });

  it("requires session-derived teacher identity before planning Supabase rows", () => {
    const payload = createWorkbenchStoragePayload(createChatState({ taskCards: [createTaskCard()] }), "2026-06-12T00:00:00.000Z");

    expect(() => createSupabaseSkillPersistencePlan(payload, { sessionTeacherId: "" })).toThrow("sessionTeacherId is required");
  });
});

function createTaskCard(): TaskCard {
  return {
    id: "task-learning-record",
    conversationId: "student-wang",
    targetName: "王一路",
    skillRunId: "run-task-learning-record",
    skillId: "update_learning_record",
    taskType: "learning_record",
    title: "学习记录草稿",
    status: "completed",
    currentStepIndex: 0,
    steps: [],
    inputSummary: "课堂能跟上讲解，独立完成时容易遗漏关键信息。",
    structuredResult: {
      performance: "AI 原始学习记录"
    },
    summary: "AI 原始学习记录",
    archiveTarget: "学生档案 > 学习记录",
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z"
  };
}

function createChatState(overrides: Partial<ChatState> = {}): ChatState {
  return {
    conversations: [
      {
        id: "student-wang",
        kind: "student",
        name: "王一路",
        avatar: "王",
        className: "初二数学 A 班",
        subject: "数学",
        grade: "初二",
        summary: "还没有记录",
        time: "",
        statusLabel: "需要关注",
        accent: "green"
      }
    ],
    messages: [],
    taskCards: [],
    timelineRecords: [],
    preferences: {
      autoAnalyzeUploadedPaper: false,
      autoArchiveLearningEvidence: false,
      feedbackTone: "温和",
      defaultTaskSet: ["学习材料分析"]
    },
    teacher: {
      contact: "teacher@example.com",
      nickname: "Eric"
    },
    currentConversationId: "student-wang",
    ...overrides
  };
}
