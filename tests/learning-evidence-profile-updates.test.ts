import { describe, expect, it } from "vitest";
import {
  buildLearningEvidenceArchiveSummary,
  getDefaultProfileUpdateSelection,
  getProfileUpdateSuggestionId,
  getSelectedLearningEvidenceProfileUpdates,
  groupProfileUpdatesByTarget
} from "../components/xuemai-workbench/learning-evidence-profile-updates";
import { createMockLearningEvidenceReport } from "../src/skills/learning-evidence-report";

describe("learning evidence profile update suggestions", () => {
  it("selects only teacher-confirmed suggestions for mock profile updates", () => {
    const report = createMockLearningEvidenceReport({
      subjectName: "王一路",
      inputSummary: "上传一份历史材料题作业"
    });
    const defaultSelection = getDefaultProfileUpdateSelection(report);
    const monthlySuggestion = report.student_profile_update_suggestions.find((item) => item.target === "monthly_report_source");
    expect(monthlySuggestion).toBeDefined();

    const selectedIds = [defaultSelection[0], getProfileUpdateSuggestionId(monthlySuggestion!)];
    const updates = getSelectedLearningEvidenceProfileUpdates({
      report,
      selectedIds,
      sourceTaskId: "task-evidence",
      confirmedAt: "2026-06-13T00:00:00.000Z"
    });

    expect(updates).toHaveLength(2);
    expect(updates.map((item) => item.id)).toEqual([
      expect.stringContaining("ability_profile"),
      expect.stringContaining("monthly_report_source")
    ]);
    expect(groupProfileUpdatesByTarget(updates).monthly_report_source).toHaveLength(1);
  });

  it("builds archive summary from confirmed profile update targets", () => {
    const report = createMockLearningEvidenceReport({
      subjectName: "王一路",
      inputSummary: "课堂记录：表达完整性不稳定"
    });
    const updates = getSelectedLearningEvidenceProfileUpdates({
      report,
      selectedIds: getDefaultProfileUpdateSelection(report),
      sourceTaskId: "task-evidence",
      confirmedAt: "2026-06-13T00:00:00.000Z"
    });

    expect(buildLearningEvidenceArchiveSummary(report, updates)).toContain("已写入能力画像 1 项、薄弱点 1 项、复发风险 1 项、跟进计划 1 项");
    expect(buildLearningEvidenceArchiveSummary(report, [])).toContain("暂未写入学生档案更新项");
  });
});
