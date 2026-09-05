import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateStudentMonthlyReportFile,
  readStudentMonthlyReportFile,
  type StudentMonthlyReportFileInput
} from "../src/skills/monthly-report-files";
import { createStudentMonthlyReportFromConfirmedSnapshots } from "../src/skills/monthly-report";
import { createConfirmedMonthlyReportSnapshotCopy } from "../src/skills/student-learning-material-analyzer/monthly-snapshot-archive";
import type { StudentLearningMaterialAnalysis } from "../src/skills/student-learning-material-analyzer/types";

describe("student monthly report file generator", () => {
  it("writes a monthly report artifact from confirmed learning material sources and compares with previous month", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-monthly-report-"));
    const inputPath = path.join(tempDir, "monthly-input.json");
    const outputPath = path.join(tempDir, "monthly-report.json");
    const analysis = await readSyntheticAnalysis();
    const confirmed = createConfirmedSnapshotForAnalysis(analysis);
    const previousConfirmed = {
      ...confirmed,
      source_analysis_id: "analysis-previous-001",
      month: "2026-05",
      material_date: "2026-05-18",
      main_progress_signal: "能跟上基础任务",
      main_issue_signal: "条件范围整理不完整",
      error_patterns: ["条件范围提取不完整"],
      first_priority_action: "继续训练题干条件圈画",
      parent_visible_summary: "上月需要关注条件范围整理。",
      evidenceRefs: ["evidence-previous-month-001"],
      confirmed_at: "2026-05-18T20:00:00+08:00",
      source_skill_run_id: "skill-run-previous-001",
      archive_record_id: "archive-previous-001"
    };
    const input: StudentMonthlyReportFileInput = {
      fixture_schema: "student_monthly_report_input.v0.1",
      student_id: analysis.student_id,
      student_name: "脱敏学生",
      current_month: "2026-06",
      previous_month: "2026-05",
      subject_area: "数学",
      snapshots: [confirmed],
      previous_month_snapshots: [previousConfirmed],
      confirmed_sources: [
        {
          id: "learning-record-current-001",
          student_id: analysis.student_id,
          month: "2026-06",
          source_type: "learning_record",
          label: "课堂学习记录",
          summary: "课堂能抓住主要关系式，独立完成时仍要回看条件范围。",
          occurred_at: "2026-06-12",
          confirmed_at: "2026-06-12T20:00:00+08:00",
          teacher_confirmed: true,
          usable_for_parent: true,
          subject_area: "数学",
          progress_signals: ["课堂能抓住主要关系式"],
          issue_signals: ["条件范围提取不稳定"],
          next_actions: ["继续做题干条件标注"],
          knowledge_points: ["一次函数应用"],
          ability_dimensions: ["审题信息提取"],
          evidenceRefs: ["learning-record-current-001"]
        }
      ]
    };

    try {
      await writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`, "utf8");

      const result = await generateStudentMonthlyReportFile({
        monthlyReportInputPath: inputPath,
        monthlyReportOutputPath: outputPath
      });
      const written = await readStudentMonthlyReportFile(outputPath);

      expect(result).toEqual(
        expect.objectContaining({
          monthlyReportOutputPath: outputPath,
          studentId: analysis.student_id,
          sourceCount: 2,
          confidenceLevel: "medium"
        })
      );
      expect(written.schema_version).toBe("student_monthly_report_v1");
      expect(written.readiness.source_count).toBe(2);
      expect(written.evidence_timeline.map((source) => source.id)).toEqual(
        expect.arrayContaining(["skill-run-current-001", "learning-record-current-001"])
      );
      expect(written.month_over_month_comparison.previous_month_label).toBe("2026 年 5 月");
      expect(written.month_over_month_comparison.repeated_issues).toEqual(
        expect.arrayContaining(["条件范围提取不稳定。", "条件范围遗漏"])
      );
      expect(written.month_over_month_comparison.parent_readable_comparison).toContain("和上个月相比");
      expect(written.parent_message).not.toMatch(/严重|很差|完全不会|保证提分|不认真|基础很差/u);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects unconfirmed learning-material snapshots before generating a monthly report", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-monthly-report-invalid-"));
    const inputPath = path.join(tempDir, "monthly-input.json");
    const outputPath = path.join(tempDir, "monthly-report.json");
    const analysis = await readSyntheticAnalysis();
    const input: StudentMonthlyReportFileInput = {
      fixture_schema: "student_monthly_report_input.v0.1",
      student_id: analysis.student_id,
      student_name: "脱敏学生",
      current_month: "2026-06",
      snapshots: [analysis.monthly_report_snapshot]
    };

    try {
      await writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`, "utf8");

      await expect(
        generateStudentMonthlyReportFile({
          monthlyReportInputPath: inputPath,
          monthlyReportOutputPath: outputPath
        })
      ).rejects.toThrow(/snapshots\[0\]\.teacher_confirmed must be true/u);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects previous-month comparison sources without replayable evidence refs", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-monthly-report-invalid-"));
    const inputPath = path.join(tempDir, "monthly-input.json");
    const outputPath = path.join(tempDir, "monthly-report.json");
    const analysis = await readSyntheticAnalysis();
    const confirmed = createConfirmedSnapshotForAnalysis(analysis);
    const input: StudentMonthlyReportFileInput = {
      fixture_schema: "student_monthly_report_input.v0.1",
      student_id: analysis.student_id,
      student_name: "脱敏学生",
      current_month: "2026-06",
      previous_month: "2026-05",
      subject_area: "数学",
      snapshots: [confirmed],
      previous_month_confirmed_sources: [
        {
          id: "learning-record-previous-without-evidence",
          student_id: analysis.student_id,
          month: "2026-05",
          source_type: "learning_record",
          label: "上月课堂学习记录",
          summary: "上月课堂能跟上基础任务，复杂题条件整理不稳定。",
          occurred_at: "2026-05-18",
          confirmed_at: "2026-05-18T21:00:00+08:00",
          teacher_confirmed: true,
          usable_for_parent: true,
          subject_area: "数学",
          progress_signals: ["能跟上基础任务"],
          issue_signals: ["复杂题条件整理不稳定"],
          next_actions: ["训练题干标注"],
          knowledge_points: ["一次函数应用"],
          ability_dimensions: ["课堂理解", "审题信息提取"],
          evidenceRefs: []
        }
      ]
    };

    try {
      await writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`, "utf8");

      await expect(
        generateStudentMonthlyReportFile({
          monthlyReportInputPath: inputPath,
          monthlyReportOutputPath: outputPath
        })
      ).rejects.toThrow(/previous_month_confirmed_sources\[0\]\.evidenceRefs must contain at least one item/u);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects a previous report that does not match the input student/month or replayable source ids", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-monthly-report-invalid-previous-report-"));
    const inputPath = path.join(tempDir, "monthly-input.json");
    const outputPath = path.join(tempDir, "monthly-report.json");
    const analysis = await readSyntheticAnalysis();
    const confirmed = createConfirmedSnapshotForAnalysis(analysis);
    const previousConfirmed = {
      ...confirmed,
      source_analysis_id: "analysis-previous-001",
      month: "2026-05",
      material_date: "2026-05-18",
      main_issue_signal: "条件范围整理不完整",
      evidenceRefs: ["evidence-previous-month-001"],
      confirmed_at: "2026-05-18T20:00:00+08:00",
      source_skill_run_id: "skill-run-previous-001",
      archive_record_id: "archive-previous-001"
    };
    const previousReport = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: analysis.student_id,
      studentName: "脱敏学生",
      currentMonth: "2026-05",
      snapshots: [previousConfirmed]
    });
    const input: StudentMonthlyReportFileInput = {
      fixture_schema: "student_monthly_report_input.v0.1",
      student_id: analysis.student_id,
      student_name: "脱敏学生",
      current_month: "2026-06",
      previous_month: "2026-05",
      snapshots: [confirmed],
      previous_report: {
        ...previousReport,
        student_name: "其他学生",
        month_label: "2026 年 4 月",
        evidence_timeline: [previousReport.evidence_timeline[0], previousReport.evidence_timeline[0]]
      }
    };

    try {
      await writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`, "utf8");

      let thrown: unknown;
      try {
        await generateStudentMonthlyReportFile({
          monthlyReportInputPath: inputPath,
          monthlyReportOutputPath: outputPath
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      const message = (thrown as Error).message;
      expect(message).toMatch(/previous_report\.student_name must match input\.student_name/u);
      expect(message).toMatch(/previous_report\.month_label must match previous_month/u);
      expect(message).toMatch(/previous_report\.evidence_timeline duplicate source ids: skill-run-previous-001/u);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("rejects a previous report whose readiness and comparison evidence are not self-consistent", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-monthly-report-invalid-previous-report-integrity-"));
    const inputPath = path.join(tempDir, "monthly-input.json");
    const outputPath = path.join(tempDir, "monthly-report.json");
    const analysis = await readSyntheticAnalysis();
    const confirmed = createConfirmedSnapshotForAnalysis(analysis);
    const previousConfirmed = {
      ...confirmed,
      source_analysis_id: "analysis-previous-integrity-001",
      source_skill_run_id: "skill-run-previous-integrity-001",
      archive_record_id: "archive-previous-integrity-001",
      month: "2026-05",
      material_date: "2026-05-18",
      evidenceRefs: ["evidence-previous-month-integrity-001"],
      confirmed_at: "2026-05-18T20:00:00+08:00"
    };
    const previousReport = createStudentMonthlyReportFromConfirmedSnapshots({
      studentId: analysis.student_id,
      studentName: "脱敏学生",
      currentMonth: "2026-05",
      snapshots: [previousConfirmed]
    });
    const input: StudentMonthlyReportFileInput = {
      fixture_schema: "student_monthly_report_input.v0.1",
      student_id: analysis.student_id,
      student_name: "脱敏学生",
      current_month: "2026-06",
      previous_month: "2026-05",
      snapshots: [confirmed],
      previous_report: {
        ...previousReport,
        readiness: {
          ...previousReport.readiness,
          source_count: 99
        },
        comparison_evidence: {
          ...previousReport.comparison_evidence,
          current_month_source_count: 99,
          previous_month_source_count: 1,
          previous_month_source_ids: ["tampered-prev-source"],
          previous_month_report_used: true,
          previous_month_evidence_status: "missing"
        },
        parent_message: "本月保证提分。"
      }
    };

    try {
      await writeFile(inputPath, `${JSON.stringify(input, null, 2)}\n`, "utf8");

      let thrown: unknown;
      try {
        await generateStudentMonthlyReportFile({
          monthlyReportInputPath: inputPath,
          monthlyReportOutputPath: outputPath
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      const message = (thrown as Error).message;
      expect(message).toMatch(/previous_report\.readiness\.source_count must match evidence_timeline length/u);
      expect(message).toMatch(/previous_report\.comparison_evidence\.current_month_source_count must match evidence_timeline length/u);
      expect(message).toMatch(/previous_report\.comparison_evidence missing status must not include previous-month source ids/u);
      expect(message).toMatch(/previous_report\.comparison_evidence missing status must not mark previous_month_report_used/u);
      expect(message).toMatch(/previous_report\.parent_message contains forbidden expressions: 保证提分/u);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates the monthly report file specified by env vars", async () => {
    const monthlyReportInputPath = process.env.XUEMAI_MONTHLY_REPORT_INPUT;
    const monthlyReportOutputPath = process.env.XUEMAI_MONTHLY_REPORT_OUTPUT;

    if (!monthlyReportInputPath || !monthlyReportOutputPath) {
      if (process.env.XUEMAI_MONTHLY_REPORT_REQUIRED === "1") {
        throw new Error("Set XUEMAI_MONTHLY_REPORT_INPUT=/absolute/path/to/input.json and XUEMAI_MONTHLY_REPORT_OUTPUT=/absolute/path/to/report.json");
      }
      expect(monthlyReportInputPath || monthlyReportOutputPath).toBeUndefined();
      return;
    }

    const result = await generateStudentMonthlyReportFile({
      monthlyReportInputPath,
      monthlyReportOutputPath
    });

    console.log(
      [
        "StudentMonthlyReport output generated",
        `studentId=${result.studentId}`,
        `monthLabel=${result.monthLabel}`,
        `monthlyReportOutputPath=${result.monthlyReportOutputPath}`,
        `sourceCount=${result.sourceCount}`,
        `confidenceLevel=${result.confidenceLevel}`,
        `comparisonEvidenceWarnings=${result.comparisonEvidenceWarnings.length}`
      ].join("\n")
    );

    expect(result.monthlyReportOutputPath).toBe(monthlyReportOutputPath);
  });
});

function createConfirmedSnapshotForAnalysis(analysis: StudentLearningMaterialAnalysis) {
  const result = createConfirmedMonthlyReportSnapshotCopy({
    analysis,
    teacherId: "teacher-001",
    sourceSkillRunId: "skill-run-current-001",
    archiveRecordId: "archive-current-001",
    confirmedAt: "2026-06-19T20:00:00+08:00",
    feedbackSent: true
  });
  if (!result.ok) throw new Error(result.errors.join("；"));
  return result.snapshot;
}

async function readSyntheticAnalysis(): Promise<StudentLearningMaterialAnalysis> {
  const dataset = JSON.parse(await readFile("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json", "utf8"));
  return JSON.parse(JSON.stringify(dataset.cases[0].analysis)) as StudentLearningMaterialAnalysis;
}
