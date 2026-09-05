import { describe, expect, it } from "vitest";
import { getLearningEvidenceReport, getLearningEvidenceReportActions } from "../components/xuemai-workbench/learning-evidence-report-view";
import type { TaskCard } from "../components/xuemai-workbench/types";
import { createMockLearningEvidenceReport } from "../src/skills/learning-evidence-report";

describe("learning evidence report review panel helpers", () => {
  it("extracts the full report from a learning evidence SkillCard", () => {
    const report = createMockLearningEvidenceReport({
      subjectName: "王一路",
      inputSummary: "上传英语口语练习记录"
    });
    const task = createTask({
      structuredResult: {
        parent_summary: report.parent_readable_summary,
        report
      },
      currentOutput: {
        display_content: report.parent_readable_summary,
        structured_result: {
          parent_summary: report.parent_readable_summary,
          report
        }
      }
    });

    expect(getLearningEvidenceReport(task)).toEqual(report);
  });

  it("does not treat a short legacy analysis card as a full report", () => {
    const task = createTask({
      structuredResult: {
        parent_summary: "孩子能理解材料主旨。"
      }
    });

    expect(getLearningEvidenceReport(task)).toBeNull();
  });

  it("keeps report actions available without auto-archiving", () => {
    expect(getLearningEvidenceReportActions(createTask({ status: "completed" }))).toEqual(["generate_feedback", "generate_next_lesson", "add_monthly_material", "archive"]);
    expect(getLearningEvidenceReportActions(createTask({ status: "archived" }))).toEqual(["generate_feedback", "generate_next_lesson"]);
  });
});

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
