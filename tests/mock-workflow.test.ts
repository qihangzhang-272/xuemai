import { describe, expect, it } from "vitest";
import { applySkillAction, createMockWorkflowState, startFollowUpSkill, submitTeacherMessage } from "../src/skills/mock-workflow";

describe("mock skill workflow", () => {
  it("creates a learning record SkillCard from a student conversation message", () => {
    const state = submitTeacherMessage(
      createMockWorkflowState(),
      "student-wang",
      "今天讲一次函数应用题，王一路能跟上，但读题容易漏条件，作业布置了 8 道专项题。"
    );

    expect(state.messages.some((message) => message.sender === "teacher")).toBe(true);
    expect(state.skillCards).toHaveLength(1);
    expect(state.skillCards[0]).toEqual(
      expect.objectContaining({
        skill_type: "update_learning_record",
        status: "draft_ready",
        archive_target: "学生档案 > 学习记录"
      })
    );
  });

  it("creates ArchiveLog and timeline record only after explicit archive action", () => {
    const state = submitTeacherMessage(
      createMockWorkflowState(),
      "student-wang",
      "今天讲一次函数应用题，王一路能跟上，但读题容易漏条件，作业布置了 8 道专项题。"
    );

    expect(state.archiveLogs).toHaveLength(0);
    expect(state.timelineRecords).toHaveLength(0);

    const archivedState = applySkillAction(state, state.skillCards[0].run_id, "archive");

    expect(archivedState.skillCards[0].status).toBe("archived");
    expect(archivedState.archiveLogs).toHaveLength(1);
    expect(archivedState.messages.at(-1)?.type).toBe("archive_log");
    expect(archivedState.timelineRecords).toEqual([
      expect.objectContaining({
        sourceSkillType: "update_learning_record",
        archiveTarget: "学生档案 > 学习记录"
      })
    ]);
  });

  it("can trigger generate_feedback from an archived learning record", () => {
    const state = submitTeacherMessage(
      createMockWorkflowState(),
      "student-wang",
      "今天讲一次函数应用题，王一路能跟上，但读题容易漏条件，作业布置了 8 道专项题。"
    );
    const archivedState = applySkillAction(state, state.skillCards[0].run_id, "archive");
    const feedbackState = startFollowUpSkill(archivedState, archivedState.skillCards[0].run_id, "generate_feedback");
    const feedbackCard = feedbackState.skillCards.at(-1);

    expect(feedbackCard).toEqual(
      expect.objectContaining({
        skill_type: "generate_feedback",
        status: "draft_ready",
        archive_target: "学生档案 > 课后反馈"
      })
    );
    expect(feedbackCard?.display_content).toContain("王一路");
  });

  it("keeps generate_feedback archive controlled through copied and sent states", () => {
    const state = startFollowUpSkill(
      submitTeacherMessage(createMockWorkflowState(), "student-wang", "今天课堂记录：能跟上讲解，独立完成时漏条件。"),
      "mock_run_update_learning_record_student_student-wang",
      "generate_feedback"
    );
    const feedbackCard = state.skillCards.at(-1);
    expect(feedbackCard?.skill_type).toBe("generate_feedback");

    const rejectedArchive = applySkillAction(state, feedbackCard?.run_id ?? "", "archive");
    expect(rejectedArchive.skillCards.at(-1)?.status).toBe("failed");
    expect(rejectedArchive.archiveLogs).toHaveLength(0);

    const copied = applySkillAction(state, feedbackCard?.run_id ?? "", "copy_feedback");
    const sent = applySkillAction(copied, feedbackCard?.run_id ?? "", "mark_parent_sent");
    const archived = applySkillAction(sent, feedbackCard?.run_id ?? "", "archive");

    expect(archived.skillCards.at(-1)?.status).toBe("archived");
    expect(archived.archiveLogs.at(-1)?.archiveTarget).toBe("学生档案 > 课后反馈");
  });

  it("creates a subject-agnostic learning evidence analysis SkillCard", () => {
    const state = submitTeacherMessage(createMockWorkflowState(), "student-wang", "这是一份历史材料题作业，分析薄弱点");
    const card = state.skillCards[0];

    expect(card.skill_type).toBe("analyze_learning_evidence");
    expect(card.structured_result).toEqual(
      expect.objectContaining({
        material_type: expect.any(String),
        strengths: expect.any(Array),
        weaknesses: expect.any(Array),
        next_steps: expect.any(Array),
        parent_summary: expect.any(String),
        report: expect.objectContaining({
          schema_version: "learning_evidence_report_v1",
          overview_judgement: expect.any(Object),
          student_profile_update_suggestions: expect.any(Array)
        })
      })
    );
  });
});
