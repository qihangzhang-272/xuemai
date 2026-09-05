import { describe, expect, it } from "vitest";
import { getMockVisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/mock-fixtures";
import { createMockStudentLearningMaterialUserFacingResult } from "../src/skills/student-learning-material-analyzer/mock-user-facing-result";
import { createMockLearningEvidenceReport } from "../src/skills/learning-evidence-report";
import {
  getStudentLearningMaterialUserFacingResult,
  getStudentLearningMaterialUserResultActions
} from "../components/xuemai-workbench/learning-material-user-result-view";
import type { TaskCard } from "../components/xuemai-workbench/types";

describe("student learning material user-facing result view helpers", () => {
  it("extracts the final user-facing result from a learning evidence SkillCard", () => {
    const result = createUserFacingResult();
    const task = createTask({
      structuredResult: {
        user_facing_result: result
      },
      currentOutput: {
        display_content: result.parent_feedback.text,
        structured_result: {
          user_facing_result: result
        }
      }
    });

    expect(getStudentLearningMaterialUserFacingResult(task)).toEqual(result);
  });

  it("does not treat a legacy short report as a final user-facing result", () => {
    const task = createTask({
      structuredResult: {
        parent_summary: "孩子能理解材料主旨。"
      }
    });

    expect(getStudentLearningMaterialUserFacingResult(task)).toBeNull();
  });

  it("keeps result actions available without auto-archiving", () => {
    expect(getStudentLearningMaterialUserResultActions(createTask({ status: "completed" }))).toEqual(["generate_feedback", "generate_next_lesson", "add_monthly_material", "archive"]);
    expect(getStudentLearningMaterialUserResultActions(createTask({ status: "archived" }))).toEqual(["generate_feedback", "generate_next_lesson"]);
  });

  it("does not expose legacy mock month-over-month claims without previous-month evidence", () => {
    const result = createUserFacingResult();

    expect(result.monthly_result.previous_month_evidence_status).toBe("missing");
    expect(result.monthly_result.previous_month_source_ids).toEqual([]);
    expect(result.monthly_result.comparison_to_previous_month).toContain("缺少上月已确认素材");
    expect(result.monthly_result.comparison_to_previous_month).toContain("不能写成明确进步或退步");
    expect(result.monthly_result.comparison_to_previous_month).not.toContain("和上个月相比");
    expect(result.teacher_report.monthly_note.body).toContain("缺少上月已确认素材");
    expect(result.teacher_report.monthly_note.body).not.toContain("和上个月相比");
  });
});

function createUserFacingResult() {
  const packet = getMockVisionEvidencePacket("clear_exam_with_teacher_correction");
  const report = createMockLearningEvidenceReport({
    subjectName: "王一路",
    inputSummary: "上传数学试卷，生成专业测评报告"
  });

  return createMockStudentLearningMaterialUserFacingResult({
    analysisId: "analysis-ui-test",
    sourceMaterialId: packet.source_material_id,
    studentId: packet.student_id,
    report
  });
}

function createTask(overrides: Partial<TaskCard>): TaskCard {
  return {
    id: "task-evidence",
    conversationId: "student-wang",
    targetName: "王一路",
    skillRunId: "task-evidence",
    skillId: "analyze_learning_evidence",
    taskType: "learning_evidence_analysis",
    title: "学习材料分析",
    status: "completed",
    currentStepIndex: 0,
    steps: [],
    archiveTarget: "学生档案 > 学习材料分析",
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
    ...overrides
  };
}
