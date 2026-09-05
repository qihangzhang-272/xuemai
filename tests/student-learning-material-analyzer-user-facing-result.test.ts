import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createStudentLearningMaterialUserFacingResult,
  validateStudentLearningMaterialUserFacingResult
} from "../src/skills/student-learning-material-analyzer/user-facing-result";
import type { StudentLearningMaterialAnalysis } from "../src/skills/student-learning-material-analyzer/types";

describe("student learning material user-facing result", () => {
  it("assembles a professional teacher report, parent feedback, and monthly result from analysis JSON", () => {
    const analysis = readSyntheticAnalysis();

    const result = createStudentLearningMaterialUserFacingResult(analysis);

    expect(result.schema_version).toBe("student_learning_material_user_facing_result.v0.1");
    expect(result.material_classification).toEqual(
      expect.objectContaining({
        material_type: analysis.material_classification.material_type,
        subject: analysis.material_classification.subject,
        education_stage: analysis.material_classification.education_stage,
        grade_candidate: analysis.material_classification.grade_candidate,
        region_or_curriculum_candidate: analysis.material_classification.region_or_curriculum_candidate
      })
    );
    expect(result.material_classification.source_ids.length).toBeGreaterThan(0);
    expect(JSON.stringify(result.material_classification)).not.toContain("evidenceRefs");
    expect(result.teacher_report.assessment_style).toBe("professional_evaluation");
    expect(result.teacher_report.title).toContain("专业测评型学情报告");
    expect(result.teacher_report.material_summary).toContain("初二数学试卷");
    expect(result.teacher_report.conclusion_sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        "结论总览",
        "证据充分性判定",
        "学情传导图",
        "知识薄弱点分析",
        "能力维度反馈",
        "错误模式反馈",
        "难度层表现反馈",
        "学习策略表现反馈",
        "学科能力反馈",
        "重点错题成因反馈",
        "优先关注点",
        "表现空间反馈",
        "复发风险反馈",
        "来源与注意事项"
      ])
    );
    expect(result.teacher_report.conclusion_sections.find((section) => section.title === "学情传导图")?.body).toContain("知识点线索");
    expect(result.teacher_report.conclusion_sections.find((section) => section.title === "证据充分性判定")?.body).toContain("证据充分可硬判");
    expect(result.teacher_report.conclusion_sections.find((section) => section.title === "证据充分性判定")?.body).toContain("证据不足题只进入复核");
    expect(result.teacher_report.conclusion_sections.find((section) => section.title === "难度层表现反馈")?.body).toContain("不硬判低/中/高难度层表现");
    expect(result.teacher_report.conclusion_sections.find((section) => section.title === "复发风险反馈")?.body).toContain("条件范围遗漏");
    expect(result.teacher_report.conclusion_sections.find((section) => section.title === "能力维度反馈")?.body).toContain("公开课程参考维度");
    expect(result.teacher_report.conclusion_sections.find((section) => section.title === "能力维度反馈")?.body).toContain("逻辑推理");
    expect(result.teacher_report.question_rows).toHaveLength(2);
    expect(result.teacher_report.question_rows[0]).toEqual(
      expect.objectContaining({
        judgement: "部分正确",
        knowledge_points: ["一次函数应用"],
        needs_teacher_review: false
      })
    );
    expect(result.teacher_report.question_rows[1]).toEqual(
      expect.objectContaining({
        judgement: "需老师确认",
        needs_teacher_review: true
      })
    );
    expect(result.parent_feedback.status).toBe("needs_teacher_review");
    expect(result.parent_feedback.copyable).toBe(false);
    expect(result.parent_feedback.warnings).toContain("teacher_review_required");
    expect(result.parent_feedback.text).toBe(analysis.wechat_parent_feedback_draft.text);
    expect(result.monthly_result.teacher_confirmed).toBe(false);
    expect(result.monthly_result.comparison_to_previous_month).toContain("和上月相比");
    expect(result.monthly_result.previous_month_evidence_status).toBe("available");
    expect(result.monthly_result.previous_month_source_ids.length).toBeGreaterThan(0);
  });

  it("keeps user-facing markdown free from raw internal evidence fields while preserving a source map", () => {
    const result = createStudentLearningMaterialUserFacingResult(readSyntheticAnalysis());

    expect(result.teacher_report.source_map.length).toBeGreaterThan(0);
    expect(result.teacher_report.source_map[0]).toEqual(
      expect.objectContaining({
        source_id: "S1",
        internal_evidence_ref: expect.stringContaining("synthetic.")
      })
    );
    expect(result.teacher_report.markdown).toContain("来源：S");
    expect(result.teacher_report.markdown).not.toContain("evidenceRefs");
    expect(result.teacher_report.markdown).not.toContain("synthetic.material_001");
  });

  it("validates the user-facing result quality gate", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);

    const validation = validateStudentLearningMaterialUserFacingResult(result, {
      analysis
    });

    expect(validation.ok, validation.errors.join("；")).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("rejects copyable parent feedback while any question still needs teacher review", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    result.parent_feedback.status = "draft";
    result.parent_feedback.copyable = true;
    result.parent_feedback.warnings = [];

    const validation = validateStudentLearningMaterialUserFacingResult(result, {
      analysis
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("parent_feedback.status must be needs_teacher_review or blocked when analysis still has review blockers");
    expect(validation.errors.join(" ")).toContain("parent_feedback.copyable must be false when analysis still has review blockers");
    expect(validation.errors.join(" ")).toContain("parent_feedback.warnings must include teacher_review_required when analysis still has review blockers");
  });

  it("rejects incomplete user-facing results before they reach product UI", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    result.teacher_report.conclusion_sections = result.teacher_report.conclusion_sections.filter((section) => section.title !== "知识薄弱点分析");
    result.material_classification.source_ids = [];
    result.teacher_report.markdown = "# 缺少正式报告结构";
    result.teacher_report.question_rows = [];
    result.parent_feedback.text = "孩子基础很差，家长必须盯紧。";
    result.parent_feedback.source_ids = [];
    result.monthly_result.comparison_to_previous_month = "本月表现记录。";
    result.monthly_result.source_ids = [];

    const validation = validateStudentLearningMaterialUserFacingResult(result, {
      analysis
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_report.conclusion_sections missing 知识薄弱点分析");
    expect(validation.errors.join(" ")).toContain("material_classification.source_ids must not be empty");
    expect(validation.errors.join(" ")).toContain("teacher_report.question_rows must not be empty");
    expect(validation.errors.join(" ")).toContain("parent_feedback.source_ids must not be empty");
    expect(validation.errors.join(" ")).toContain("Forbidden feedback expressions found");
    expect(validation.errors.join(" ")).toContain("monthly_result.comparison_to_previous_month must state prior-month comparison");
    expect(validation.errors.join(" ")).toContain("monthly_result.source_ids must not be empty");
  });

  it("rejects user-facing results missing professional evaluation sections", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    result.teacher_report.conclusion_sections = result.teacher_report.conclusion_sections.filter((section) => section.title !== "复发风险反馈");
    result.teacher_report.markdown = result.teacher_report.markdown.replace("## 复发风险反馈", "## 风险");

    const validation = validateStudentLearningMaterialUserFacingResult(result, {
      analysis
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_report.conclusion_sections missing 复发风险反馈");
    expect(validation.errors.join(" ")).toContain("teacher_report.markdown missing ## 复发风险反馈");
  });

  it("rejects user-facing results missing evidence sufficiency boundary", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    result.teacher_report.conclusion_sections = result.teacher_report.conclusion_sections.filter((section) => section.title !== "证据充分性判定");
    result.teacher_report.markdown = result.teacher_report.markdown.replace("## 证据充分性判定", "## 证据说明");

    const validation = validateStudentLearningMaterialUserFacingResult(result, {
      analysis
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_report.conclusion_sections missing 证据充分性判定");
    expect(validation.errors.join(" ")).toContain("teacher_report.markdown missing ## 证据充分性判定");
  });

  it("rejects user-facing question rows that do not cover the same analysis question ids", () => {
    const analysis = readSyntheticAnalysis();
    const result = createStudentLearningMaterialUserFacingResult(analysis);
    result.teacher_report.question_rows[1] = {
      ...result.teacher_report.question_rows[1],
      question_id: result.teacher_report.question_rows[0].question_id
    };

    const validation = validateStudentLearningMaterialUserFacingResult(result, {
      analysis
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(" ")).toContain("teacher_report.question_rows duplicate question_id(s)");
    expect(validation.errors.join(" ")).toContain("teacher_report.question_rows missing question_id(s) from analysis questions");
    expect(validation.errors.join(" ")).toContain("teacher_report.question_rows must preserve question order from analysis questions");
  });

  it("marks blocked parent feedback as not copyable", () => {
    const analysis = readSyntheticAnalysis();
    analysis.wechat_parent_feedback_draft.status = "blocked";
    analysis.wechat_parent_feedback_draft.forbidden_terms_found = ["基础很差"];
    analysis.wechat_parent_feedback_draft.warnings = ["包含禁用表达"];

    const result = createStudentLearningMaterialUserFacingResult(analysis);

    expect(result.parent_feedback.status).toBe("blocked");
    expect(result.parent_feedback.copyable).toBe(false);
    expect(result.parent_feedback.warnings).toEqual(expect.arrayContaining(["包含禁用表达", "teacher_review_required"]));
  });

  it("does not invent month-over-month progress when previous month evidence is absent", () => {
    const analysis = readSyntheticAnalysis();
    delete analysis.monthly_comparison_seed.previous_month_snapshot;

    const result = createStudentLearningMaterialUserFacingResult(analysis);

    expect(result.monthly_result.comparison_to_previous_month).toContain("缺少上月已确认素材");
    expect(result.monthly_result.comparison_to_previous_month).toContain("不能写成明确进步或退步");
    expect(result.monthly_result.previous_month_evidence_status).toBe("missing");
    expect(result.monthly_result.previous_month_source_ids).toEqual([]);
    expect(result.teacher_report.monthly_note.body).toContain("缺少上月已确认素材");
    expect(result.teacher_report.monthly_note.body).toContain("不能写成明确进步或退步");
  });

  it("does not treat an unevidenced previous month snapshot as a trend baseline", () => {
    const analysis = readSyntheticAnalysis();
    const previousSnapshot = analysis.monthly_comparison_seed.previous_month_snapshot as { evidenceRefs?: string[] };
    delete previousSnapshot.evidenceRefs;

    const result = createStudentLearningMaterialUserFacingResult(analysis);

    expect(result.monthly_result.comparison_to_previous_month).toContain("缺少上月已确认素材");
    expect(result.monthly_result.comparison_to_previous_month).toContain("上月来源证据");
    expect(result.monthly_result.comparison_to_previous_month).toContain("不能写成明确进步或退步");
    expect(result.monthly_result.comparison_to_previous_month).not.toContain("和上月相比");
    expect(result.monthly_result.previous_month_evidence_status).toBe("missing");
    expect(result.monthly_result.previous_month_source_ids).toEqual([]);
    expect(result.teacher_report.monthly_note.body).toContain("缺少上月已确认素材");
    expect(result.teacher_report.monthly_note.body).not.toContain("和上月相比");

    const validation = validateStudentLearningMaterialUserFacingResult(result, { analysis });
    expect(validation.ok, validation.errors.join("；")).toBe(true);

    result.monthly_result.comparison_to_previous_month = analysis.monthly_comparison_seed.parent_readable_comparison;
    result.teacher_report.monthly_note.body = analysis.monthly_comparison_seed.parent_readable_comparison;
    result.monthly_result.previous_month_evidence_status = "available";
    result.monthly_result.previous_month_source_ids = ["S999"];

    const tamperedValidation = validateStudentLearningMaterialUserFacingResult(result, { analysis });
    expect(tamperedValidation.ok).toBe(false);
    expect(tamperedValidation.errors.join(" ")).toContain("monthly_result.previous_month_evidence_status must be missing when previous-month evidence is absent");
    expect(tamperedValidation.errors.join(" ")).toContain("monthly_result.previous_month_source_ids must be empty when previous-month evidence is absent");
    expect(tamperedValidation.errors.join(" ")).toContain("monthly_result.comparison_to_previous_month must warn missing previous-month evidence");
    expect(tamperedValidation.errors.join(" ")).toContain("monthly_result.comparison_to_previous_month must not reuse model trend text");
    expect(tamperedValidation.errors.join(" ")).toContain("teacher_report.monthly_note must warn missing previous-month evidence");
  });

  it("adds a review warning when public stage-subject reference looks mismatched", () => {
    const analysis = readSyntheticAnalysis();
    analysis.material_classification.education_stage = "primary";
    analysis.material_classification.subject = "物理";

    const result = createStudentLearningMaterialUserFacingResult(analysis);

    expect(result.teacher_report.conclusion_sections.find((section) => section.title === "能力维度反馈")?.body).toContain("需核对材料学段");
  });
});

function readSyntheticAnalysis(): StudentLearningMaterialAnalysis {
  const dataset = JSON.parse(readFileSync("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json", "utf8"));
  return JSON.parse(JSON.stringify(dataset.cases[0].analysis)) as StudentLearningMaterialAnalysis;
}
