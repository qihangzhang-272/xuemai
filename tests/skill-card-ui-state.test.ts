import { describe, expect, it } from "vitest";
import { archiveTaskCardCurrentOutput, defaultSkillCardDisclosureState, editArchivedTaskCardEditableValue, editTaskCardEditableValue, getSkillCardActionPriority, getSkillCardVersionMeta, getTaskCardStatusCopy, isPrimarySkillCardAction, resetTaskCardEditableOutput, shouldMinimizeArchivedSkillCard } from "../components/xuemai-workbench/skill-card-version";
import { buildSkillRunEventTimeline } from "../components/xuemai-workbench/skill-run-event-view";
import { applyTaskSkillRunnerAction } from "../components/xuemai-workbench/skill-runner-adapter";
import type { TaskCard } from "../components/xuemai-workbench/types";
import { getSkillById } from "../src/skills/registry";
import type { SkillActionId } from "../src/skills/types";

describe("skill card UI version state", () => {
  it("keeps version details collapsed by default", () => {
    expect(defaultSkillCardDisclosureState).toEqual({
      showEditor: false,
      showOriginal: false
    });
  });

  it("shows edited state after editing generate_feedback parent_message", () => {
    const task = createTaskCard("generate_feedback");
    const edited = editTaskCardEditableValue(task, "家长您好，孩子今天课堂状态稳定，后续我会继续带他练习审题表达。", {
      editedAt: "2026-06-12T00:00:00.000Z",
      eventId: "edit-ui-1"
    });
    const meta = getSkillCardVersionMeta(edited);

    expect(meta.field.path).toBe("structured_result.parent_message");
    expect(meta.isEdited).toBe(true);
    expect(meta.editLabel).toBe("已编辑 · 1 次");
    expect(edited.currentOutput?.structured_result.parent_message).toBe("家长您好，孩子今天课堂状态稳定，后续我会继续带他练习审题表达。");
    expect(edited.originalOutput?.structured_result.parent_message).toBe("AI 原始家长反馈");
  });

  it("resets current_output to AI original without archiving", () => {
    const task = editTaskCardEditableValue(createTaskCard("generate_feedback"), "老师编辑版");
    const reset = resetTaskCardEditableOutput(task);
    const meta = getSkillCardVersionMeta(reset);

    expect(reset.currentOutput).toEqual(reset.originalOutput);
    expect(reset.archivedOutput).toBeUndefined();
    expect(meta.isEdited).toBe(false);
    expect(meta.editLabel).toBe("已重置为原稿 · 2 次");
    expect(meta.currentText).toBe("AI 原始家长反馈");
  });

  it("archives the teacher confirmed current_output instead of original_output", () => {
    const edited = editTaskCardEditableValue(createTaskCard("generate_feedback"), "老师确认后的最终微信反馈");
    const archived = archiveTaskCardCurrentOutput(edited);

    expect(archived.archivedOutput?.display_content).toBe("老师确认后的最终微信反馈");
    expect(archived.archivedOutput?.display_content).not.toBe(archived.originalOutput?.display_content);
  });

  it("edits archived_output without changing original_output", () => {
    const archived = archiveTaskCardCurrentOutput(editTaskCardEditableValue(createTaskCard("generate_feedback"), "老师确认后的最终微信反馈"));
    const editedArchive = editArchivedTaskCardEditableValue(archived, "入档后修订版微信反馈", {
      editedAt: "2026-06-12T00:00:00.000Z",
      eventId: "archive-edit-1"
    });

    expect(editedArchive.archivedOutput?.display_content).toBe("入档后修订版微信反馈");
    expect(editedArchive.currentOutput?.display_content).toBe("入档后修订版微信反馈");
    expect(editedArchive.originalOutput?.structured_result.parent_message).toBe("AI 原始家长反馈");
  });

  it("selects editable structured fields for learning record and evidence analysis cards", () => {
    const learningRecord = editTaskCardEditableValue(createTaskCard("update_learning_record"), "老师修订后的课堂表现");
    const evidenceAnalysis = editTaskCardEditableValue(createTaskCard("analyze_learning_evidence"), "老师修订后的家长可读摘要");

    expect(getSkillCardVersionMeta(learningRecord).field.path).toBe("structured_result.performance");
    expect(learningRecord.currentOutput?.structured_result.performance).toBe("老师修订后的课堂表现");
    expect(learningRecord.originalOutput?.structured_result.performance).toBe("AI 原始课堂表现");

    expect(getSkillCardVersionMeta(evidenceAnalysis).field.path).toBe("structured_result.parent_summary");
    expect(evidenceAnalysis.currentOutput?.structured_result.parent_summary).toBe("老师修订后的家长可读摘要");
    expect(evidenceAnalysis.originalOutput?.structured_result.parent_summary).toBe("AI 原始家长摘要");
  });

  it("maps compact UI statuses to clear workflow copy", () => {
    expect(getTaskCardStatusCopy("completed").description).toBe("AI 草稿，待反馈或入档");
    expect(getTaskCardStatusCopy("copied").description).toBe("已复制，待标记已发");
    expect(getTaskCardStatusCopy("feedback_done").description).toBe("已反馈，待入档");
    expect(getTaskCardStatusCopy("archived").description).toBe("已入档，将作为后续备课、反馈和月报依据");
    expect(getTaskCardStatusCopy("failed").description).toBe("生成失败，请查看结构化错误");
  });

  it("uses a minimized read-only layout after archive", () => {
    expect(shouldMinimizeArchivedSkillCard("archived")).toBe(true);
    expect(shouldMinimizeArchivedSkillCard("completed")).toBe(false);
    expect(shouldMinimizeArchivedSkillCard("feedback_done")).toBe(false);
  });

  it("orders primary actions by Skill workflow priority", () => {
    expect(getPrimaryActionOrder(createTaskCard("generate_feedback"))).toEqual(["copy_feedback", "mark_parent_sent", "archive"]);
    expect(getPrimaryActionOrder(createTaskCard("update_learning_record"))).toEqual(["archive", "generate_feedback", "generate_next_lesson"]);
    expect(getPrimaryActionOrder(createTaskCard("analyze_learning_evidence"))).toEqual(["generate_feedback", "archive"]);
  });

  it("runs UI actions through Skill Runner transition rules", () => {
    const feedback = createTaskCard("generate_feedback");

    const rejectedArchive = applyTaskSkillRunnerAction(feedback, "archive");
    expect(rejectedArchive.ok).toBe(false);
    expect(rejectedArchive.task.status).toBe("completed");

    const copied = applyTaskSkillRunnerAction(feedback, "copy_feedback");
    expect(copied.ok).toBe(true);
    expect(copied.task.status).toBe("copied");

    const sent = applyTaskSkillRunnerAction(copied.task, "mark_parent_sent");
    expect(sent.ok).toBe(true);
    expect(sent.task.status).toBe("feedback_done");

    const archived = applyTaskSkillRunnerAction(sent.task, "archive");
    expect(archived.ok).toBe(true);
    expect(archived.task.status).toBe("archived");
  });

  it("allows non-feedback cards to archive through the same Runner adapter", () => {
    const learningRecord = createTaskCard("update_learning_record");
    const archived = applyTaskSkillRunnerAction(learningRecord, "archive");

    expect(archived.ok).toBe(true);
    expect(archived.task.status).toBe("archived");
  });

  it("stores non-state SkillCard actions as traceable UI events", () => {
    const evidence = createTaskCard("analyze_learning_evidence");
    const monthly = applyTaskSkillRunnerAction(evidence, "add_monthly_material");
    const practice = applyTaskSkillRunnerAction(monthly.task, "generate_practice");
    const savedNote = applyTaskSkillRunnerAction(practice.task, "save_note");

    expect(monthly.ok).toBe(true);
    expect(practice.ok).toBe(true);
    expect(savedNote.ok).toBe(true);
    expect(savedNote.task.status).toBe("completed");
    expect(savedNote.task.actionEvents?.map((event) => event.action)).toEqual(["add_monthly_material", "generate_practice", "save_note"]);
    expect(savedNote.task.actionEvents?.map((event) => event.event_type)).toEqual(["material_action", "material_action", "note_action"]);
  });

  it("converts SkillRun events into teacher-readable review timeline rows", () => {
    const feedback = createTaskCard("generate_feedback");
    const copied = applyTaskSkillRunnerAction(feedback, "copy_feedback");
    const sent = applyTaskSkillRunnerAction(copied.task, "mark_parent_sent");
    const archived = applyTaskSkillRunnerAction(sent.task, "archive");
    const timeline = buildSkillRunEventTimeline(archived.task.actionEvents);

    expect(timeline.map((item) => item.title)).toEqual(["已复制微信反馈", "已标记已发给家长", "已确认入档"]);
    expect(timeline.every((item) => item.meta.includes("状态更新"))).toBe(true);
  });

  it("keeps follow-up and material actions visible without changing the main UI status", () => {
    const evidence = createTaskCard("analyze_learning_evidence");
    const monthly = applyTaskSkillRunnerAction(evidence, "add_monthly_material");
    const practice = applyTaskSkillRunnerAction(monthly.task, "generate_practice");
    const savedNote = applyTaskSkillRunnerAction(practice.task, "save_note");
    const timeline = buildSkillRunEventTimeline(savedNote.task.actionEvents);

    expect(savedNote.task.status).toBe("completed");
    expect(timeline.map((item) => item.title)).toEqual(["已加入月报素材", "已生成针对练习", "已保存为备注"]);
    expect(timeline.map((item) => item.meta.split(" · ")[0])).toEqual(["材料动作", "材料动作", "备注"]);
  });
});

function createTaskCard(skillId: "generate_feedback" | "update_learning_record" | "analyze_learning_evidence"): TaskCard {
  const structuredResult =
    skillId === "generate_feedback"
      ? { parent_message: "AI 原始家长反馈" }
      : skillId === "update_learning_record"
        ? { performance: "AI 原始课堂表现" }
        : { parent_summary: "AI 原始家长摘要" };
  const displayContent = Object.values(structuredResult)[0];

  return {
    id: `task-${skillId}`,
    conversationId: "student-wang",
    targetName: "王一路",
    skillRunId: `run-${skillId}`,
    skillId,
    taskType: skillId === "generate_feedback" ? "feedback" : skillId === "update_learning_record" ? "learning_record" : "learning_evidence_analysis",
    title: "测试 SkillCard",
    status: "completed",
    currentStepIndex: 0,
    steps: [],
    structuredResult,
    summary: displayContent,
    feedbackText: displayContent,
    detail: JSON.stringify(structuredResult),
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z"
  };
}

function getPrimaryActionOrder(task: TaskCard) {
  const actions = getSkillById(task.skillId ?? "generate_feedback")?.actions ?? [];
  return actions
    .filter((action) => isPrimarySkillCardAction(task, action))
    .sort((left, right) => getSkillCardActionPriority(task, left) - getSkillCardActionPriority(task, right)) satisfies SkillActionId[];
}
