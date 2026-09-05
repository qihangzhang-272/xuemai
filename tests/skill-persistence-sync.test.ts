import { describe, expect, it, vi } from "vitest";
import { createWorkbenchStoragePayload } from "../components/xuemai-workbench/persistence";
import { createSupabaseSkillPersistencePlan } from "../components/xuemai-workbench/supabase-persistence-adapter";
import { archiveTaskCardCurrentOutput, editTaskCardEditableValue } from "../components/xuemai-workbench/skill-card-version";
import { applyTaskSkillRunnerAction } from "../components/xuemai-workbench/skill-runner-adapter";
import { isSkillPersistenceWriteEnabled, persistSupabaseSkillPersistencePlan, type SkillPersistenceRepository } from "../src/skills/persistence/supabase-sync";
import type { ChatState, TaskCard } from "../components/xuemai-workbench/types";

describe("Skill persistence Supabase sync service", () => {
  it("stays disabled unless the explicit write flag is true", () => {
    expect(isSkillPersistenceWriteEnabled({ SKILL_PERSISTENCE_WRITE_ENABLED: undefined })).toBe(false);
    expect(isSkillPersistenceWriteEnabled({ SKILL_PERSISTENCE_WRITE_ENABLED: "false" })).toBe(false);
    expect(isSkillPersistenceWriteEnabled({ SKILL_PERSISTENCE_WRITE_ENABLED: "true" })).toBe(true);
  });

  it("resolves production UUID foreign keys before writing card events, edits, and archives", async () => {
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
      sessionTeacherId: "00000000-0000-4000-8000-000000000001"
    });
    const repository: SkillPersistenceRepository = {
      upsertSkillRuns: vi.fn(async () => [{ id: "run-uuid-1", external_run_id: "run-task-learning-record" }]),
      upsertSkillCards: vi.fn(async () => [{ id: "card-uuid-1", external_card_id: "task-learning-record", external_run_id: "run-task-learning-record" }]),
      upsertSkillCardEvents: vi.fn(async () => undefined),
      upsertSkillCardEdits: vi.fn(async () => undefined),
      upsertSkillArchiveLogs: vi.fn(async () => undefined)
    };

    const result = await persistSupabaseSkillPersistencePlan(plan, repository);

    expect(result.counts).toEqual({
      skill_runs: 1,
      skill_cards: 1,
      skill_card_events: 1,
      skill_card_edits: 1,
      skill_archive_logs: 1
    });
    expect(repository.upsertSkillCards).toHaveBeenCalledWith([expect.objectContaining({ skill_run_id: "run-uuid-1" })]);
    expect(repository.upsertSkillCardEvents).toHaveBeenCalledWith([expect.objectContaining({ skill_card_id: "card-uuid-1", skill_run_id: "run-uuid-1" })]);
    expect(repository.upsertSkillCardEdits).toHaveBeenCalledWith([expect.objectContaining({ skill_card_id: "card-uuid-1", skill_run_id: "run-uuid-1" })]);
    expect(repository.upsertSkillArchiveLogs).toHaveBeenCalledWith([expect.objectContaining({ skill_card_id: "card-uuid-1", skill_run_id: "run-uuid-1" })]);
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
