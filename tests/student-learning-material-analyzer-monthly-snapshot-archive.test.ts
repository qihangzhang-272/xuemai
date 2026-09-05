import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createStudentMonthlyReportFromConfirmedSnapshots } from "../src/skills/monthly-report";
import { createConfirmedMonthlyReportSnapshotCopy } from "../src/skills/student-learning-material-analyzer/monthly-snapshot-archive";
import type { MonthlyReportSnapshot, StudentLearningMaterialAnalysis } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material monthly snapshot archive", () => {
  it("creates a teacher-confirmed monthly source copy without mutating the AI draft snapshot", () => {
    const analysis = readSyntheticAnalysis();

    const result = createConfirmedMonthlyReportSnapshotCopy({
      analysis,
      teacherId: "teacher-001",
      sourceSkillRunId: "skill-run-001",
      archiveRecordId: "archive-001",
      confirmedAt: "2026-06-19T20:00:00+08:00",
      feedbackSent: true
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(analysis.monthly_report_snapshot.teacher_confirmed).toBe(false);
    expect(result.snapshot).toEqual(
      expect.objectContaining({
        teacher_confirmed: true,
        teacher_id: "teacher-001",
        confirmed_at: "2026-06-19T20:00:00+08:00",
        source_skill_run_id: "skill-run-001",
        archive_record_id: "archive-001",
        source_material_id: analysis.source_material_id,
        feedback_sent: true
      })
    );
    expect(result.snapshot.archive_audit).toEqual(
      expect.objectContaining({
        source: "student_learning_material_analysis",
        source_analysis_id: analysis.analysis_id,
        confirmed_by_teacher_id: "teacher-001"
      })
    );
  });

  it("uses the teacher-reviewed current snapshot when adding material to the monthly report pool", () => {
    const analysis = readSyntheticAnalysis();
    const reviewedSnapshot: MonthlyReportSnapshot = {
      ...analysis.monthly_report_snapshot,
      parent_visible_summary: "本月订正时能补充关键步骤，接下来继续关注条件范围表达。",
      first_priority_action: "下月每次作业固定抽 1 题口头说明条件来源"
    };
    const confirmed = createConfirmedMonthlyReportSnapshotCopy({
      analysis,
      reviewedSnapshot,
      teacherId: "teacher-001",
      sourceSkillRunId: "skill-run-reviewed",
      archiveRecordId: "archive-reviewed",
      confirmedAt: "2026-06-19T20:10:00+08:00"
    });

    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    const report = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: analysis.student_id,
      studentName: "脱敏学生",
      currentMonth: analysis.monthly_report_snapshot.month,
      snapshots: [analysis.monthly_report_snapshot, confirmed.snapshot]
    });

    expect(report.readiness.source_count).toBe(1);
    expect(report.evidence_timeline.map((source) => source.id)).toEqual(["skill-run-reviewed"]);
    expect(report.evidence_timeline[0].summary).toContain("本月订正时能补充关键步骤");
    expect(report.next_month_plan).toContain("下月每次作业固定抽 1 题口头说明条件来源");
  });

  it("refuses to create a monthly source copy without teacher action and valid evidence boundaries", () => {
    const analysis = readSyntheticAnalysis();
    const wrongAnalysisId: MonthlyReportSnapshot = {
      ...analysis.monthly_report_snapshot,
      source_analysis_id: "other-analysis"
    };
    const invalidStateAnalysis: StudentLearningMaterialAnalysis = {
      ...analysis,
      material_state: "blank_template"
    };
    const alreadyConfirmed: MonthlyReportSnapshot = {
      ...analysis.monthly_report_snapshot,
      teacher_confirmed: true
    } as unknown as MonthlyReportSnapshot;

    expect(
      createConfirmedMonthlyReportSnapshotCopy({
        analysis,
        teacherId: "",
        sourceSkillRunId: "skill-run-001",
        archiveRecordId: "archive-001",
        confirmedAt: "2026-06-19T20:00:00+08:00"
      })
    ).toEqual(expect.objectContaining({ ok: false, errors: expect.arrayContaining(["teacherId is required for monthly snapshot archive"]) }));

    const wrongAnalysisResult = createConfirmedMonthlyReportSnapshotCopy({
      analysis,
      reviewedSnapshot: wrongAnalysisId,
      teacherId: "teacher-001",
      sourceSkillRunId: "skill-run-001",
      archiveRecordId: "archive-001",
      confirmedAt: "2026-06-19T20:00:00+08:00"
    });
    expect(wrongAnalysisResult.ok).toBe(false);
    if (!wrongAnalysisResult.ok) expect(wrongAnalysisResult.errors.join(" ")).toContain("source_analysis_id must match");

    const invalidStateResult = createConfirmedMonthlyReportSnapshotCopy({
      analysis: invalidStateAnalysis,
      teacherId: "teacher-001",
      sourceSkillRunId: "skill-run-001",
      archiveRecordId: "archive-001",
      confirmedAt: "2026-06-19T20:00:00+08:00"
    });
    expect(invalidStateResult.ok).toBe(false);
    if (!invalidStateResult.ok) expect(invalidStateResult.errors.join(" ")).toContain("material_state=blank_template");

    const alreadyConfirmedResult = createConfirmedMonthlyReportSnapshotCopy({
      analysis,
      reviewedSnapshot: alreadyConfirmed,
      teacherId: "teacher-001",
      sourceSkillRunId: "skill-run-001",
      archiveRecordId: "archive-001",
      confirmedAt: "2026-06-19T20:00:00+08:00"
    });
    expect(alreadyConfirmedResult.ok).toBe(false);
    if (!alreadyConfirmedResult.ok) expect(alreadyConfirmedResult.errors.join(" ")).toContain("teacher_confirmed must remain false");
  });
});

function readSyntheticAnalysis(): StudentLearningMaterialAnalysis {
  const dataset = JSON.parse(readFileSync("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json", "utf8"));
  return JSON.parse(JSON.stringify(dataset.cases[0].analysis)) as StudentLearningMaterialAnalysis;
}
