import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateStudentLearningMaterialDeliveryBundleFile,
  readStudentLearningMaterialDeliveryBundleFile
} from "../src/skills/student-learning-material-analyzer/delivery-bundle-files";
import {
  createStudentLearningMaterialDeliveryBundle,
  validateStudentLearningMaterialDeliveryBundle
} from "../src/skills/student-learning-material-analyzer/delivery-bundle";
import type { StudentMonthlyReport } from "../src/skills/monthly-report";
import { createStudentLearningMaterialUserFacingResult } from "../src/skills/student-learning-material-analyzer/user-facing-result";
import type { StudentLearningMaterialAnalysis } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material delivery bundle", () => {
  it("bundles the teacher report, parent feedback, and monthly comparison with feedback-first status", () => {
    const result = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());

    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });

    expect(bundle.schema_version).toBe("student_learning_material_delivery_bundle.v0.1");
    expect(bundle.status).toEqual(
      expect.objectContaining({
        feedback_status: "needs_teacher_review",
        archive_status: "pending_archive",
        display_status: "需补充材料",
        secondary_status: "待入档"
      })
    );
    expect(bundle.teacher_delivery.assessment_style).toBe("professional_evaluation");
    expect(bundle.teacher_delivery.material_classification).toEqual(result.material_classification);
    expect(JSON.stringify(bundle.teacher_delivery.material_classification)).not.toContain("evidenceRefs");
    expect(bundle.teacher_delivery.teacher_report_markdown).toContain("## 逐题分析");
    expect(bundle.teacher_delivery.teacher_report_markdown).toContain("## 证据充分性判定");
    expect(bundle.teacher_delivery.teacher_report_markdown).toContain("## 学情传导图");
    expect(bundle.teacher_delivery.teacher_report_markdown).toContain("## 难度层表现反馈");
    expect(bundle.teacher_delivery.teacher_report_markdown).toContain("## 复发风险反馈");
    expect(bundle.teacher_delivery.parent_feedback_text).toBe(result.parent_feedback.text);
    expect(bundle.teacher_delivery.month_over_month_comparison).toContain("和上月相比");
    expect(bundle.teacher_delivery.monthly_comparison_evidence).toEqual({
      source: "analysis_monthly_result",
      previous_month_evidence_status: "available",
      previous_month_source_ids: result.monthly_result.previous_month_source_ids
    });
    expect(bundle.source_map.length).toBeGreaterThan(0);
    expect(bundle.teacher_delivery.teacher_report_markdown).not.toContain("evidenceRefs");
    expect(bundle.teacher_delivery.teacher_report_markdown).not.toContain("synthetic.material_001");
  });

  it("validates delivery bundle quality gates for the teacher-facing final result", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result
    });

    expect(validation.ok, validation.errors.join("；")).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("rejects delivery bundles missing required report, feedback, and monthly-comparison evidence", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });
    bundle.teacher_delivery.teacher_report_markdown = "# 缺少专业测评结构";
    bundle.teacher_delivery.material_classification.source_ids = [];
    bundle.teacher_delivery.question_rows = [];
    bundle.teacher_delivery.parent_feedback_text = "孩子基础很差，家长必须盯紧。";
    bundle.teacher_delivery.month_over_month_comparison = "本月表现记录。";
    bundle.teacher_delivery.safeguards = [];
    bundle.source_map = [];

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_delivery.teacher_report_markdown missing ## 材料概览");
    expect(validation.errors.join(" ")).toContain("teacher_delivery.material_classification.source_ids must not be empty");
    expect(validation.errors.join(" ")).toContain("teacher_delivery.question_rows must not be empty");
    expect(validation.errors.join(" ")).toContain("Forbidden feedback expressions found");
    expect(validation.errors.join(" ")).toContain("teacher_delivery.month_over_month_comparison must state prior-month comparison");
    expect(validation.errors.join(" ")).toContain("teacher_delivery.safeguards must not be empty");
    expect(validation.errors.join(" ")).toContain("source_map must not be empty");
  });

  it("rejects delivery bundles missing professional teacher-report sections", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });
    bundle.teacher_delivery.teacher_report_markdown = bundle.teacher_delivery.teacher_report_markdown.replace("## 难度层表现反馈", "## 难度观察");

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_delivery.teacher_report_markdown missing ## 难度层表现反馈");
  });

  it("rejects delivery bundles missing evidence sufficiency boundary", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });
    bundle.teacher_delivery.teacher_report_markdown = bundle.teacher_delivery.teacher_report_markdown.replace("## 证据充分性判定", "## 证据说明");

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_delivery.teacher_report_markdown missing ## 证据充分性判定");
  });

  it("rejects delivery bundles whose monthly comparison drifts from the validated result", () => {
    const analysis = readSyntheticAnalysis();
    delete analysis.monthly_comparison_seed.previous_month_snapshot;
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });
    bundle.teacher_delivery.month_over_month_comparison = "和上月相比，孩子本月明显进步，后续保持即可。";

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain(
      "teacher_delivery.month_over_month_comparison must match result monthly_result.comparison_to_previous_month"
    );
  });

  it("rejects delivery bundles whose structured monthly evidence drifts from the validated result", () => {
    const analysis = readSyntheticAnalysis();
    delete analysis.monthly_comparison_seed.previous_month_snapshot;
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });
    bundle.teacher_delivery.monthly_comparison_evidence = {
      source: "analysis_monthly_result",
      previous_month_evidence_status: "available",
      previous_month_source_ids: ["S999"]
    };

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_delivery.monthly_comparison_evidence.previous_month_evidence_status must match result monthly_result");
    expect(validation.errors.join(" ")).toContain("teacher_delivery.monthly_comparison_evidence.previous_month_source_ids must match result monthly_result");
  });

  it("rejects delivery bundles whose attached monthly report fields drift from the monthly artifact", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const monthlyReport = createAttachedMonthlyReport();
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      monthlyReport,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });
    bundle.teacher_delivery.monthly_summary = result.monthly_result.current_month_summary;
    bundle.teacher_delivery.month_over_month_comparison = result.monthly_result.comparison_to_previous_month;
    bundle.teacher_delivery.first_priority_action = result.monthly_result.first_priority_action;

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result,
      monthlyReport
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_delivery.monthly_summary must match monthlyReport.teacher_summary.current_status");
    expect(validation.errors.join(" ")).toContain(
      "teacher_delivery.month_over_month_comparison must match monthlyReport month_over_month_comparison.parent_readable_comparison"
    );
    expect(validation.errors.join(" ")).toContain("teacher_delivery.first_priority_action must match monthlyReport.teacher_summary.next_month_focus");
  });

  it("rejects delivery bundles whose structured monthly evidence drifts from the attached monthly artifact", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const monthlyReport = createAttachedMonthlyReport();
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      monthlyReport,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });
    bundle.teacher_delivery.monthly_comparison_evidence = {
      source: "analysis_monthly_result",
      previous_month_evidence_status: "missing",
      previous_month_source_ids: []
    };

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result,
      monthlyReport
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_delivery.monthly_comparison_evidence.source must match attached monthly report");
    expect(validation.errors.join(" ")).toContain(
      "teacher_delivery.monthly_comparison_evidence.previous_month_evidence_status must match monthlyReport comparison_evidence"
    );
    expect(validation.errors.join(" ")).toContain("teacher_delivery.monthly_comparison_evidence.previous_month_source_ids must match monthlyReport comparison_evidence");
  });

  it("rejects delivery bundles whose question rows duplicate one question and omit another", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });
    bundle.teacher_delivery.question_rows[1] = {
      ...bundle.teacher_delivery.question_rows[1],
      question_id: bundle.teacher_delivery.question_rows[0].question_id
    };

    const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
      analysis,
      result
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_delivery.question_rows duplicate question_id(s)");
    expect(validation.errors.join(" ")).toContain("teacher_delivery.question_rows missing question_id(s) from result teacher_report.question_rows");
    expect(validation.errors.join(" ")).toContain("teacher_delivery.question_rows missing question_id(s) from analysis questions");
  });

  it("does not share mutable teacher delivery arrays with the source user-facing result", () => {
    const result = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());
    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });

    bundle.teacher_delivery.question_rows[0].question_id = "tampered-question";
    bundle.teacher_delivery.question_rows[0].source_ids.push("S999");
    bundle.teacher_delivery.material_classification.subject = "语文";
    bundle.teacher_delivery.material_classification.source_ids.push("S996");
    bundle.teacher_delivery.data_credibility.source_ids.push("S998");
    bundle.source_map[0].source_id = "S997";

    expect(result.teacher_report.question_rows[0].question_id).not.toBe("tampered-question");
    expect(result.teacher_report.question_rows[0].source_ids).not.toContain("S999");
    expect(result.material_classification.subject).not.toBe("语文");
    expect(result.material_classification.source_ids).not.toContain("S996");
    expect(result.teacher_report.data_credibility.source_ids).not.toContain("S998");
    expect(result.teacher_report.source_map[0].source_id).not.toBe("S997");
  });

  it("shows feedback status above archive status when both are completed", () => {
    const analysis = readSyntheticAnalysis();
    analysis.question_analyses[1].correctnessJudgement.status = "correct";
    analysis.teacher_review_required = false;
    analysis.risk_flags = [];
    const result = createStudentLearningMaterialUserFacingResult(analysis);

    const bundle = createStudentLearningMaterialDeliveryBundle({
      result,
      feedbackSent: true,
      archived: true,
      generatedAt: "2026-06-19T23:30:00.000Z"
    });

    expect(bundle.status.display_status).toBe("已反馈");
    expect(bundle.status.secondary_status).toBe("已入档");
    expect(bundle.teacher_delivery.parent_feedback_copyable).toBe(false);
  });

  it("writes a delivery bundle file from a user-facing result artifact", async () => {
    const envResultInputPath = process.env.XUEMAI_RESULT_INPUT;
    const envAnalysisInputPath = process.env.XUEMAI_ANALYSIS_INPUT;
    const envVisionPacketPath = process.env.XUEMAI_VISION_PACKET;
    const envDeliveryOutputPath = process.env.XUEMAI_DELIVERY_BUNDLE_OUTPUT;

    if (envResultInputPath || envAnalysisInputPath || envVisionPacketPath || envDeliveryOutputPath) {
      if (!envDeliveryOutputPath || (!envResultInputPath && !envAnalysisInputPath && !envVisionPacketPath)) {
        throw new Error(
          "Set XUEMAI_DELIVERY_BUNDLE_OUTPUT=/absolute/path/to/delivery-bundle.json and one of XUEMAI_RESULT_INPUT, XUEMAI_ANALYSIS_INPUT, or XUEMAI_VISION_PACKET"
        );
      }
      const result = await generateStudentLearningMaterialDeliveryBundleFile({
        resultInputPath: envResultInputPath,
        analysisInputPath: envAnalysisInputPath,
        visionPacketPath: envVisionPacketPath,
        resultOutputPath: process.env.XUEMAI_RESULT_OUTPUT,
        analysisOutputPath: process.env.XUEMAI_ANALYSIS_OUTPUT,
        deliveryBundleOutputPath: envDeliveryOutputPath,
        monthlyReportInputPath: process.env.XUEMAI_MONTHLY_REPORT_INPUT,
        answerKeysPath: process.env.XUEMAI_ANSWER_KEYS,
        rubricsPath: process.env.XUEMAI_RUBRICS,
        knowledgePointsPath: process.env.XUEMAI_KNOWLEDGE_POINTS,
        studentProfileHistoryPath: process.env.XUEMAI_STUDENT_PROFILE_HISTORY,
        allowDegraded: process.env.XUEMAI_RESULT_ALLOW_DEGRADED === "1",
        allowInvalidAnalysis: process.env.XUEMAI_RESULT_ALLOW_INVALID === "1",
        feedbackSent: process.env.XUEMAI_DELIVERY_FEEDBACK_SENT === "1",
        archived: process.env.XUEMAI_DELIVERY_ARCHIVED === "1"
      });
      console.log(formatFileResult(result));
      expect(result.deliveryBundleOutputPath).toBe(envDeliveryOutputPath);
      return;
    }

    if (process.env.XUEMAI_DELIVERY_BUNDLE_REQUIRED === "1") {
      throw new Error("Set XUEMAI_DELIVERY_BUNDLE_OUTPUT=/absolute/path/to/delivery-bundle.json and one of XUEMAI_RESULT_INPUT, XUEMAI_ANALYSIS_INPUT, or XUEMAI_VISION_PACKET");
    }

    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-delivery-bundle-"));
    const resultInputPath = path.join(tempDir, "result.json");
    const outputPath = path.join(tempDir, "delivery-bundle.json");
    const userResult = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());

    try {
      await writeFile(resultInputPath, `${JSON.stringify(userResult, null, 2)}\n`, "utf8");
      const writeResult = await generateStudentLearningMaterialDeliveryBundleFile({
        resultInputPath,
        deliveryBundleOutputPath: outputPath,
        generatedAt: "2026-06-19T23:30:00.000Z"
      });
      const bundle = await readStudentLearningMaterialDeliveryBundleFile(outputPath);

      expect(writeResult.analysisId).toBe(userResult.analysis_id);
      expect(writeResult.questionCount).toBe(2);
      expect(bundle.teacher_delivery.monthly_summary).toContain("本月");
      expect(bundle.teacher_delivery.safeguards.join(" ")).toContain("不会自动发送微信");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes a delivery bundle directly from an analysis artifact and keeps the generated result artifact", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-delivery-from-analysis-"));
    const analysisPath = path.join(tempDir, "analysis.json");
    const resultOutputPath = path.join(tempDir, "result.json");
    const bundleOutputPath = path.join(tempDir, "delivery-bundle.json");

    try {
      await writeFile(analysisPath, `${JSON.stringify(readSyntheticAnalysis(), null, 2)}\n`, "utf8");
      const writeResult = await generateStudentLearningMaterialDeliveryBundleFile({
        analysisInputPath: analysisPath,
        resultOutputPath,
        deliveryBundleOutputPath: bundleOutputPath,
        generatedAt: "2026-06-19T23:40:00.000Z"
      });
      const bundle = await readStudentLearningMaterialDeliveryBundleFile(bundleOutputPath);

      expect(writeResult.sourceKind).toBe("analysis");
      expect(writeResult.resultOutputPath).toBe(resultOutputPath);
      expect(bundle.analysis_id).toBe("analysis_synthetic_math_exam_001");
      expect(bundle.teacher_delivery.parent_feedback_text).toContain("条件范围");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

function readSyntheticAnalysis(): StudentLearningMaterialAnalysis {
  const dataset = JSON.parse(readFileSync("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json", "utf8"));
  return JSON.parse(JSON.stringify(dataset.cases[0].analysis)) as StudentLearningMaterialAnalysis;
}

function createAttachedMonthlyReport(): StudentMonthlyReport {
  return {
    schema_version: "student_monthly_report_v1",
    report_type: "student",
    audience: "parent",
    month_label: "2026 年 6 月",
    student_name: "脱敏学生",
    subject_area: "数学",
    readiness: {
      label: "可生成，依据较充分",
      confidence_level: "high",
      source_count: 2,
      missing_sources: []
    },
    teacher_summary: {
      current_status: "本月已读取 2 条老师确认素材，主要涉及一次函数。",
      main_progress: "关系式识别更稳定",
      main_issue: "条件范围表达仍需关注",
      next_month_focus: "下月继续稳定条件标注和表达完整性。"
    },
    service_overview: {
      lesson_count: 4,
      feedback_count: 2,
      archived_record_count: 2,
      material_count: 2
    },
    growth_signals: [],
    month_over_month_comparison: {
      previous_month_label: "2026 年 5 月",
      current_month_label: "2026 年 6 月",
      summary: "和上月相比，本月关系式识别更稳定。",
      improved_signals: ["关系式识别更稳定"],
      stable_signals: [],
      repeated_issues: ["条件范围表达"],
      new_issues: [],
      insufficient_evidence: [],
      parent_readable_comparison: "和上个月相比，孩子本月在关系式识别方面更稳定，条件范围表达还会继续关注。",
      teacher_interpretation: "月报纵向比较只读取老师确认后的快照。"
    },
    comparison_evidence: {
      current_month_source_count: 2,
      previous_month_source_count: 1,
      previous_month_source_ids: ["prev-confirmed-source"],
      previous_month_report_used: false,
      previous_month_evidence_status: "available"
    },
    evidence_timeline: [
      {
        id: "current-confirmed-source",
        label: "本月确认材料",
        type: "learning_evidence",
        summary: "本月材料证据。",
        usable_for_parent: true
      }
    ],
    next_month_plan: ["继续稳定条件标注"],
    parent_message: "本月关系式识别更稳定，接下来继续关注条件范围表达。",
    teacher_only_notes: ["测试用脱敏月报 artifact。"],
    safeguards: ["只使用已确认记录和老师可核对材料。", "家长版不写分数承诺，不使用负面标签。"]
  };
}

function formatFileResult(result: Awaited<ReturnType<typeof generateStudentLearningMaterialDeliveryBundleFile>>) {
  return [
    "StudentLearningMaterialDeliveryBundle generated",
    `analysisId=${result.analysisId}`,
    `deliveryBundleOutputPath=${result.deliveryBundleOutputPath}`,
    `displayStatus=${result.displayStatus}`,
    `feedbackStatus=${result.feedbackStatus}`,
    `archiveStatus=${result.archiveStatus}`,
    `questionCount=${result.questionCount}`,
    `sourceKind=${result.sourceKind}`,
    `resultOutputPath=${result.resultOutputPath || "none"}`,
    `analysisOutputPath=${result.analysisOutputPath || "none"}`
  ].join("\n");
}
