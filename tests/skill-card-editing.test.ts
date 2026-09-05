import { describe, expect, it } from "vitest";
import { archiveEditedSkillCard, createEditableSkillCardState, editSkillCardField, resetSkillCardToOriginal } from "../src/skills/actions";
import { applySkillAction, createMockWorkflowState, editWorkflowSkillCardField, resetWorkflowSkillCardToOriginal, startFollowUpSkill, submitTeacherMessage } from "../src/skills/mock-workflow";

describe("skill card editing", () => {
  it("records edit_event and updates current_output without mutating original_output", () => {
    const state = createEditableSkillCardState({
      skillRunId: "mock-run-1",
      displayContent: "AI 原始学习记录",
      structuredResult: {
        performance: "原始表现",
        parent_summary: "原始摘要"
      }
    });
    const edited = editSkillCardField(state, "structured_result.performance", "老师编辑后的表现", {
      editedAt: "2026-06-12T00:00:00.000Z",
      eventId: "edit-1"
    });

    expect(edited.current_output.structured_result.performance).toBe("老师编辑后的表现");
    expect(edited.original_output.structured_result.performance).toBe("原始表现");
    expect(edited.edit_events).toEqual([
      expect.objectContaining({
        id: "edit-1",
        skill_run_id: "mock-run-1",
        field_path: "structured_result.performance",
        before: "原始表现",
        after: "老师编辑后的表现",
        edited_by: "teacher",
        source: "manual_edit"
      })
    ]);
  });

  it("resets current_output back to original_output", () => {
    const state = createEditableSkillCardState({
      skillRunId: "mock-run-1",
      displayContent: "AI 原始反馈",
      structuredResult: { parent_message: "原始反馈正文" }
    });
    const edited = editSkillCardField(state, "display_content", "老师编辑后的反馈");
    const reset = resetSkillCardToOriginal(edited);

    expect(reset.current_output).toEqual(reset.original_output);
    expect(reset.original_output.display_content).toBe("AI 原始反馈");
    expect(reset.edit_events).toHaveLength(2);
  });

  it("archives only when teacher confirms and stores the current edited output", () => {
    const state = createEditableSkillCardState({
      skillRunId: "mock-run-1",
      displayContent: "AI 原稿",
      structuredResult: { parent_message: "原稿" }
    });
    const edited = editSkillCardField(state, "display_content", "老师确认版");
    const rejected = archiveEditedSkillCard(edited, { teacherConfirmed: false });
    const archived = archiveEditedSkillCard(edited, { teacherConfirmed: true });

    expect(rejected.archived_output).toBeUndefined();
    expect(archived.archived_output).toEqual(edited.current_output);
    expect(archived.archived_output?.display_content).toBe("老师确认版");
  });

  it("edits update_learning_record structured fields in mock workflow", () => {
    const state = submitTeacherMessage(createMockWorkflowState(), "student-wang", "今天课堂记录：能跟上讲解，独立完成时漏条件。");
    const runId = state.skillCards[0].run_id;
    const editedState = editWorkflowSkillCardField(state, runId, "structured_result.performance", "老师修订：能跟上讲解，但独立完成时仍会漏关键条件。");

    expect(editedState.skillCards[0].current_output.structured_result.performance).toBe("老师修订：能跟上讲解，但独立完成时仍会漏关键条件。");
    expect(editedState.skillCards[0].original_output.structured_result.performance).not.toBe(editedState.skillCards[0].current_output.structured_result.performance);
    expect(editedState.skillCards[0].edit_events).toHaveLength(1);
  });

  it("edits analyze_learning_evidence parent_summary in mock workflow", () => {
    const state = submitTeacherMessage(createMockWorkflowState(), "student-wang", "这是一份历史材料题作业，分析薄弱点");
    const runId = state.skillCards[0].run_id;
    const editedState = editWorkflowSkillCardField(state, runId, "structured_result.parent_summary", "孩子能理解材料主旨，但需要练习用证据支撑观点。");

    expect(editedState.skillCards[0].skill_type).toBe("analyze_learning_evidence");
    expect(editedState.skillCards[0].current_output.structured_result.parent_summary).toBe("孩子能理解材料主旨，但需要练习用证据支撑观点。");
    expect(editedState.skillCards[0].edit_events[0].field_path).toBe("structured_result.parent_summary");
  });

  it("edits generate_feedback message and still flows copied to sent to archived", () => {
    const learningState = submitTeacherMessage(createMockWorkflowState(), "student-wang", "今天课堂记录：能跟上讲解，独立完成时漏条件。");
    const feedbackState = startFollowUpSkill(learningState, learningState.skillCards[0].run_id, "generate_feedback");
    const feedbackRunId = feedbackState.skillCards.at(-1)?.run_id ?? "";
    const editedFeedbackState = editWorkflowSkillCardField(feedbackState, feedbackRunId, "structured_result.parent_message", "家长您好，孩子今天能跟上讲解，后续我会继续带他练习审题和表达。");

    const copied = applySkillAction(editedFeedbackState, feedbackRunId, "copy_feedback");
    const sent = applySkillAction(copied, feedbackRunId, "mark_parent_sent");
    const archived = applySkillAction(sent, feedbackRunId, "archive");
    const archivedFeedback = archived.skillCards.at(-1);

    expect(archivedFeedback?.status).toBe("archived");
    expect(archivedFeedback?.archived_output?.structured_result.parent_message).toBe("家长您好，孩子今天能跟上讲解，后续我会继续带他练习审题和表达。");
    expect(archived.timelineRecords.at(-1)?.summary).toBe(archivedFeedback?.archived_output?.display_content);
  });

  it("can reset a workflow SkillCard to original output", () => {
    const state = submitTeacherMessage(createMockWorkflowState(), "student-wang", "今天课堂记录：能跟上讲解，独立完成时漏条件。");
    const runId = state.skillCards[0].run_id;
    const editedState = editWorkflowSkillCardField(state, runId, "display_content", "老师编辑版");
    const resetState = resetWorkflowSkillCardToOriginal(editedState, runId);

    expect(resetState.skillCards[0].current_output).toEqual(resetState.skillCards[0].original_output);
    expect(resetState.skillCards[0].display_content).toBe(resetState.skillCards[0].original_output.display_content);
  });
});
