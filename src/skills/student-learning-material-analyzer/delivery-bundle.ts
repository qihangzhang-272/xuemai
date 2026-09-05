import type { StudentMonthlyReport } from "../monthly-report";
import type { ValidationResult, StudentLearningMaterialAnalysis, VisionEvidencePacket } from "./types";
import type { StudentLearningMaterialUserFacingResult } from "./user-facing-result";
import { checkWechatFeedbackSafety } from "./validators";

export type StudentLearningMaterialDeliveryFeedbackStatus = "pending_feedback" | "feedback_sent" | "blocked" | "needs_teacher_review";
export type StudentLearningMaterialDeliveryArchiveStatus = "pending_archive" | "archived";
export type StudentLearningMaterialDeliveryDisplayStatus = "待反馈" | "已反馈" | "待入档" | "已入档" | "证据不足" | "需补充材料";

export type StudentLearningMaterialDeliveryBundle = {
  schema_version: "student_learning_material_delivery_bundle.v0.1";
  analysis_id: string;
  source_material_id: string;
  student_id: string;
  generated_at: string;
  status: {
    feedback_status: StudentLearningMaterialDeliveryFeedbackStatus;
    archive_status: StudentLearningMaterialDeliveryArchiveStatus;
    display_status: StudentLearningMaterialDeliveryDisplayStatus;
    secondary_status?: "待入档" | "已入档";
  };
  teacher_delivery: {
    title: string;
    assessment_style: "professional_evaluation";
    material_classification: StudentLearningMaterialUserFacingResult["material_classification"];
    material_summary: string;
    data_credibility: StudentLearningMaterialUserFacingResult["teacher_report"]["data_credibility"];
    teacher_report_markdown: string;
    question_rows: StudentLearningMaterialUserFacingResult["teacher_report"]["question_rows"];
    parent_feedback_text: string;
    parent_feedback_copyable: boolean;
    parent_feedback_warnings: string[];
    monthly_summary: string;
    month_over_month_comparison: string;
    monthly_comparison_evidence: {
      source: "analysis_monthly_result" | "attached_monthly_report";
      previous_month_evidence_status: "available" | "missing";
      previous_month_source_ids: string[];
    };
    first_priority_action: string;
    monthly_report_parent_message?: string;
    safeguards: string[];
  };
  source_map: StudentLearningMaterialUserFacingResult["teacher_report"]["source_map"];
};

export type CreateStudentLearningMaterialDeliveryBundleInput = {
  result: StudentLearningMaterialUserFacingResult;
  monthlyReport?: StudentMonthlyReport;
  feedbackSent?: boolean;
  archived?: boolean;
  generatedAt?: string;
};

export function createStudentLearningMaterialDeliveryBundle(
  input: CreateStudentLearningMaterialDeliveryBundleInput
): StudentLearningMaterialDeliveryBundle {
  const feedbackStatus = computeFeedbackStatus(input.result, input.feedbackSent);
  const archiveStatus: StudentLearningMaterialDeliveryArchiveStatus = input.archived ? "archived" : "pending_archive";
  const status = computeDisplayStatus(feedbackStatus, archiveStatus);
  return {
    schema_version: "student_learning_material_delivery_bundle.v0.1",
    analysis_id: input.result.analysis_id,
    source_material_id: input.result.source_material_id,
    student_id: input.result.student_id,
    generated_at: input.generatedAt || new Date().toISOString(),
    status: {
      feedback_status: feedbackStatus,
      archive_status: archiveStatus,
      display_status: status.displayStatus,
      secondary_status: status.secondaryStatus
    },
    teacher_delivery: {
      title: input.result.teacher_report.title,
      assessment_style: input.result.teacher_report.assessment_style,
      material_classification: cloneMaterialClassification(input.result.material_classification),
      material_summary: input.result.teacher_report.material_summary,
      data_credibility: cloneDataCredibility(input.result.teacher_report.data_credibility),
      teacher_report_markdown: input.result.teacher_report.markdown,
      question_rows: cloneQuestionRows(input.result.teacher_report.question_rows),
      parent_feedback_text: input.result.parent_feedback.text,
      parent_feedback_copyable: input.result.parent_feedback.copyable && feedbackStatus === "pending_feedback",
      parent_feedback_warnings: [...input.result.parent_feedback.warnings],
      monthly_summary: input.monthlyReport?.teacher_summary.current_status || input.result.monthly_result.current_month_summary,
      month_over_month_comparison: input.monthlyReport?.month_over_month_comparison.parent_readable_comparison || input.result.monthly_result.comparison_to_previous_month,
      monthly_comparison_evidence: buildMonthlyComparisonEvidence(input),
      first_priority_action: input.monthlyReport?.teacher_summary.next_month_focus || input.result.monthly_result.first_priority_action,
      monthly_report_parent_message: input.monthlyReport?.parent_message,
      safeguards: buildSafeguards(input.result, input.monthlyReport)
    },
    source_map: input.result.teacher_report.source_map.map((source) => ({ ...source }))
  };
}

export type ValidateStudentLearningMaterialDeliveryBundleContext = {
  packet?: VisionEvidencePacket;
  analysis?: StudentLearningMaterialAnalysis;
  result?: StudentLearningMaterialUserFacingResult;
  monthlyReport?: StudentMonthlyReport;
};

export function validateStudentLearningMaterialDeliveryBundle(
  bundle: unknown,
  context: ValidateStudentLearningMaterialDeliveryBundleContext = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(bundle)) {
    return { ok: false, errors: ["delivery bundle must be an object"], warnings };
  }
  const candidate = bundle as StudentLearningMaterialDeliveryBundle;
  if (candidate.schema_version !== "student_learning_material_delivery_bundle.v0.1") {
    errors.push("schema_version must be student_learning_material_delivery_bundle.v0.1");
  }
  if (!readString(candidate.analysis_id)) errors.push("analysis_id is required");
  if (!readString(candidate.source_material_id)) errors.push("source_material_id is required");
  if (!readString(candidate.student_id)) errors.push("student_id is required");
  if (!readString(candidate.generated_at)) errors.push("generated_at is required");

  validateContextAlignment(candidate, context, errors);
  validateStatus(candidate, errors);
  validateTeacherDelivery(candidate, context, errors);
  validateSourceMap(candidate, errors);

  return { ok: errors.length === 0, errors, warnings };
}

function computeFeedbackStatus(
  result: StudentLearningMaterialUserFacingResult,
  feedbackSent?: boolean
): StudentLearningMaterialDeliveryFeedbackStatus {
  if (result.parent_feedback.status === "blocked") return "blocked";
  if (result.parent_feedback.status === "needs_teacher_review" || result.teacher_report.status === "needs_teacher_review") return "needs_teacher_review";
  return feedbackSent ? "feedback_sent" : "pending_feedback";
}

function computeDisplayStatus(
  feedbackStatus: StudentLearningMaterialDeliveryFeedbackStatus,
  archiveStatus: StudentLearningMaterialDeliveryArchiveStatus
): { displayStatus: StudentLearningMaterialDeliveryDisplayStatus; secondaryStatus?: "待入档" | "已入档" } {
  if (feedbackStatus === "blocked") return { displayStatus: "证据不足", secondaryStatus: archiveStatus === "archived" ? "已入档" : "待入档" };
  if (feedbackStatus === "needs_teacher_review") return { displayStatus: "需补充材料", secondaryStatus: archiveStatus === "archived" ? "已入档" : "待入档" };
  if (feedbackStatus === "feedback_sent") return { displayStatus: "已反馈", secondaryStatus: archiveStatus === "archived" ? "已入档" : "待入档" };
  return { displayStatus: "待反馈", secondaryStatus: archiveStatus === "archived" ? "已入档" : "待入档" };
}

function buildSafeguards(result: StudentLearningMaterialUserFacingResult, monthlyReport?: StudentMonthlyReport) {
  return [
    "AI 输出仍为老师待确认草稿；确认入档前不写入长期学生档案。",
    result.parent_feedback.copyable ? "家长反馈可复制，但不会自动发送微信。" : "家长反馈需老师复核后再复制，系统不会自动发送微信。",
    result.monthly_result.teacher_confirmed === false ? "学习材料月报素材未确认，不能直接进入正式月报来源池。" : "",
    monthlyReport ? "已附带月报 artifact；仍以老师确认后的月报来源为准。" : "未附带正式月报 artifact，仅提供本次材料的月报素材和纵向比较草稿。"
  ].filter((item) => item.length > 0);
}

function buildMonthlyComparisonEvidence(input: CreateStudentLearningMaterialDeliveryBundleInput) {
  if (input.monthlyReport) {
    return {
      source: "attached_monthly_report" as const,
      previous_month_evidence_status: input.monthlyReport.comparison_evidence.previous_month_evidence_status,
      previous_month_source_ids: [...input.monthlyReport.comparison_evidence.previous_month_source_ids]
    };
  }
  return {
    source: "analysis_monthly_result" as const,
    previous_month_evidence_status: input.result.monthly_result.previous_month_evidence_status,
    previous_month_source_ids: [...input.result.monthly_result.previous_month_source_ids]
  };
}

function cloneDataCredibility(dataCredibility: StudentLearningMaterialUserFacingResult["teacher_report"]["data_credibility"]) {
  return {
    ...dataCredibility,
    source_ids: [...dataCredibility.source_ids]
  };
}

function cloneMaterialClassification(classification: StudentLearningMaterialUserFacingResult["material_classification"]) {
  return {
    ...classification,
    source_ids: [...classification.source_ids]
  };
}

function cloneQuestionRows(questionRows: StudentLearningMaterialUserFacingResult["teacher_report"]["question_rows"]) {
  return questionRows.map((row) => ({
    ...row,
    knowledge_points: [...row.knowledge_points],
    mistake_diagnosis: [...row.mistake_diagnosis],
    source_ids: [...row.source_ids]
  }));
}

function validateContextAlignment(
  bundle: StudentLearningMaterialDeliveryBundle,
  context: ValidateStudentLearningMaterialDeliveryBundleContext,
  errors: string[]
) {
  const expectedSourceMaterialId = context.result?.source_material_id ?? context.analysis?.source_material_id ?? context.packet?.source_material_id;
  if (expectedSourceMaterialId && bundle.source_material_id !== expectedSourceMaterialId) {
    errors.push("source_material_id must match result, analysis, or VisionEvidencePacket");
  }
  const expectedStudentId = context.result?.student_id ?? context.analysis?.student_id ?? context.packet?.student_id;
  if (expectedStudentId && bundle.student_id !== expectedStudentId) {
    errors.push("student_id must match result, analysis, or VisionEvidencePacket");
  }
  if (context.analysis && bundle.analysis_id !== context.analysis.analysis_id) {
    errors.push("analysis_id must match analysis.analysis_id");
  }
  if (context.result && bundle.analysis_id !== context.result.analysis_id) {
    errors.push("analysis_id must match result.analysis_id");
  }
}

function validateStatus(bundle: StudentLearningMaterialDeliveryBundle, errors: string[]) {
  const feedbackStatuses = new Set(["pending_feedback", "feedback_sent", "blocked", "needs_teacher_review"]);
  const archiveStatuses = new Set(["pending_archive", "archived"]);
  const displayStatuses = new Set(["待反馈", "已反馈", "待入档", "已入档", "证据不足", "需补充材料"]);
  if (!feedbackStatuses.has(bundle.status?.feedback_status)) errors.push("status.feedback_status must be supported");
  if (!archiveStatuses.has(bundle.status?.archive_status)) errors.push("status.archive_status must be supported");
  if (!displayStatuses.has(bundle.status?.display_status)) errors.push("status.display_status must be supported");
  if (bundle.status?.secondary_status && bundle.status.secondary_status !== "待入档" && bundle.status.secondary_status !== "已入档") {
    errors.push("status.secondary_status must be 待入档 or 已入档 when present");
  }
}

function validateTeacherDelivery(
  bundle: StudentLearningMaterialDeliveryBundle,
  context: ValidateStudentLearningMaterialDeliveryBundleContext,
  errors: string[]
) {
  const delivery = bundle.teacher_delivery;
  if (!delivery || typeof delivery !== "object") {
    errors.push("teacher_delivery is required");
    return;
  }
  if (delivery.assessment_style !== "professional_evaluation") {
    errors.push("teacher_delivery.assessment_style must be professional_evaluation");
  }
  validateMaterialClassification(delivery.material_classification, context, errors);
  for (const field of ["title", "material_summary", "teacher_report_markdown", "parent_feedback_text", "monthly_summary", "month_over_month_comparison", "first_priority_action"]) {
    if (!readString((delivery as unknown as Record<string, unknown>)[field])) errors.push(`teacher_delivery.${field} is required`);
  }
  const requiredMarkdownSections = [
    "## 材料概览",
    "## 数据可信度",
    "## 证据充分性判定",
    "## 学情传导图",
    "## 难度层表现反馈",
    "## 复发风险反馈",
    "## 逐题分析",
    "## 家长反馈草稿"
  ];
  requiredMarkdownSections.forEach((section) => {
    if (!delivery.teacher_report_markdown.includes(section)) errors.push(`teacher_delivery.teacher_report_markdown missing ${section}`);
  });
  if (!delivery.teacher_report_markdown.includes("来源：S")) {
    errors.push("teacher_delivery.teacher_report_markdown must include user-visible source labels");
  }
  if (delivery.teacher_report_markdown.includes("evidenceRefs")) {
    errors.push("teacher_delivery.teacher_report_markdown must not expose raw evidenceRefs");
  }
  if (delivery.teacher_report_markdown.includes("synthetic.material_001")) {
    errors.push("teacher_delivery.teacher_report_markdown must not expose raw internal evidence refs");
  }
  if (!Array.isArray(delivery.question_rows) || delivery.question_rows.length === 0) {
    errors.push("teacher_delivery.question_rows must not be empty");
  }
  if (context.result && delivery.question_rows.length !== context.result.teacher_report.question_rows.length) {
    errors.push("teacher_delivery.question_rows must match result teacher_report.question_rows");
  }
  if (context.result && Array.isArray(delivery.question_rows)) {
    validateQuestionRowsAgainstExpectedIds(
      delivery.question_rows,
      context.result.teacher_report.question_rows.map((row) => row.question_id),
      "teacher_delivery.question_rows",
      "result teacher_report.question_rows",
      errors,
      true
    );
  }
  if (context.analysis && delivery.question_rows.length !== context.analysis.question_analyses.length) {
    errors.push("teacher_delivery.question_rows must cover all analysis questions");
  }
  if (context.analysis && Array.isArray(delivery.question_rows)) {
    validateQuestionRowsAgainstExpectedIds(
      delivery.question_rows,
      context.analysis.question_analyses.map((question) => question.question_id),
      "teacher_delivery.question_rows",
      "analysis questions",
      errors,
      !context.result
    );
  }
  if (context.result && delivery.parent_feedback_text !== context.result.parent_feedback.text) {
    errors.push("teacher_delivery.parent_feedback_text must match result parent_feedback.text");
  }
  const feedbackSafety = checkWechatFeedbackSafety({
    status: bundle.status.feedback_status === "blocked" ? "blocked" : bundle.status.feedback_status === "needs_teacher_review" ? "needs_teacher_review" : "draft",
    text: delivery.parent_feedback_text,
    sentences: [{ text: delivery.parent_feedback_text, evidenceRefs: bundle.source_map.map((source) => source.source_id) }],
    warnings: delivery.parent_feedback_warnings,
    forbidden_terms_found: []
  });
  errors.push(...feedbackSafety.errors.map((error) => `teacher_delivery.parent_feedback_text invalid: ${error}`));
  if (context.monthlyReport && delivery.monthly_report_parent_message !== context.monthlyReport.parent_message) {
    errors.push("teacher_delivery.monthly_report_parent_message must match monthlyReport.parent_message");
  }
  if (context.monthlyReport) {
    if (delivery.monthly_summary !== context.monthlyReport.teacher_summary.current_status) {
      errors.push("teacher_delivery.monthly_summary must match monthlyReport.teacher_summary.current_status");
    }
    if (delivery.month_over_month_comparison !== context.monthlyReport.month_over_month_comparison.parent_readable_comparison) {
      errors.push("teacher_delivery.month_over_month_comparison must match monthlyReport month_over_month_comparison.parent_readable_comparison");
    }
    if (delivery.first_priority_action !== context.monthlyReport.teacher_summary.next_month_focus) {
      errors.push("teacher_delivery.first_priority_action must match monthlyReport.teacher_summary.next_month_focus");
    }
    validateMonthlyComparisonEvidenceAgainstMonthlyReport(delivery, context.monthlyReport, errors);
  } else if (context.result) {
    if (delivery.monthly_summary !== context.result.monthly_result.current_month_summary) {
      errors.push("teacher_delivery.monthly_summary must match result monthly_result.current_month_summary");
    }
    if (delivery.month_over_month_comparison !== context.result.monthly_result.comparison_to_previous_month) {
      errors.push("teacher_delivery.month_over_month_comparison must match result monthly_result.comparison_to_previous_month");
    }
    if (delivery.first_priority_action !== context.result.monthly_result.first_priority_action) {
      errors.push("teacher_delivery.first_priority_action must match result monthly_result.first_priority_action");
    }
    validateMonthlyComparisonEvidenceAgainstResult(delivery, context.result, errors);
  }
  if (!/上月|纵向|相比|缺少上月/.test(delivery.month_over_month_comparison)) {
    errors.push("teacher_delivery.month_over_month_comparison must state prior-month comparison or missing previous-month evidence");
  }
  validateMonthlyComparisonEvidenceShape(delivery, errors);
  if (!Array.isArray(delivery.safeguards) || delivery.safeguards.length === 0) {
    errors.push("teacher_delivery.safeguards must not be empty");
  }
  if (!delivery.safeguards.some((item) => item.includes("不会自动发送微信"))) {
    errors.push("teacher_delivery.safeguards must state WeChat is not auto-sent");
  }
  if (!delivery.safeguards.some((item) => item.includes("确认"))) {
    errors.push("teacher_delivery.safeguards must preserve teacher confirmation boundary");
  }
}

function validateMonthlyComparisonEvidenceShape(
  delivery: StudentLearningMaterialDeliveryBundle["teacher_delivery"],
  errors: string[]
) {
  const evidence = delivery.monthly_comparison_evidence;
  if (!evidence || typeof evidence !== "object") {
    errors.push("teacher_delivery.monthly_comparison_evidence is required");
    return;
  }
  if (evidence.source !== "analysis_monthly_result" && evidence.source !== "attached_monthly_report") {
    errors.push("teacher_delivery.monthly_comparison_evidence.source must be supported");
  }
  if (evidence.previous_month_evidence_status !== "available" && evidence.previous_month_evidence_status !== "missing") {
    errors.push("teacher_delivery.monthly_comparison_evidence.previous_month_evidence_status must be available or missing");
  }
  if (!Array.isArray(evidence.previous_month_source_ids)) {
    errors.push("teacher_delivery.monthly_comparison_evidence.previous_month_source_ids must be an array");
    return;
  }
  if (evidence.previous_month_source_ids.some((sourceId) => !readString(sourceId))) {
    errors.push("teacher_delivery.monthly_comparison_evidence.previous_month_source_ids must contain non-empty source ids");
  }
  const duplicateIds = findDuplicates(evidence.previous_month_source_ids);
  if (duplicateIds.length) {
    errors.push(`teacher_delivery.monthly_comparison_evidence.previous_month_source_ids duplicate source ids: ${duplicateIds.join(", ")}`);
  }
  if (evidence.previous_month_evidence_status === "available" && evidence.previous_month_source_ids.length === 0) {
    errors.push("teacher_delivery.monthly_comparison_evidence available status requires previous-month source ids");
  }
  if (evidence.previous_month_evidence_status === "missing" && evidence.previous_month_source_ids.length > 0) {
    errors.push("teacher_delivery.monthly_comparison_evidence missing status must not include previous-month source ids");
  }
}

function validateMonthlyComparisonEvidenceAgainstResult(
  delivery: StudentLearningMaterialDeliveryBundle["teacher_delivery"],
  result: StudentLearningMaterialUserFacingResult,
  errors: string[]
) {
  const evidence = delivery.monthly_comparison_evidence;
  if (!evidence) return;
  if (evidence.source !== "analysis_monthly_result") {
    errors.push("teacher_delivery.monthly_comparison_evidence.source must match result monthly evidence source");
  }
  if (evidence.previous_month_evidence_status !== result.monthly_result.previous_month_evidence_status) {
    errors.push("teacher_delivery.monthly_comparison_evidence.previous_month_evidence_status must match result monthly_result");
  }
  const expectedSourceIds = result.monthly_result.previous_month_source_ids.join("|");
  if (evidence.previous_month_source_ids.join("|") !== expectedSourceIds) {
    errors.push("teacher_delivery.monthly_comparison_evidence.previous_month_source_ids must match result monthly_result");
  }
}

function validateMonthlyComparisonEvidenceAgainstMonthlyReport(
  delivery: StudentLearningMaterialDeliveryBundle["teacher_delivery"],
  monthlyReport: StudentMonthlyReport,
  errors: string[]
) {
  const evidence = delivery.monthly_comparison_evidence;
  if (!evidence) return;
  if (evidence.source !== "attached_monthly_report") {
    errors.push("teacher_delivery.monthly_comparison_evidence.source must match attached monthly report");
  }
  if (evidence.previous_month_evidence_status !== monthlyReport.comparison_evidence.previous_month_evidence_status) {
    errors.push("teacher_delivery.monthly_comparison_evidence.previous_month_evidence_status must match monthlyReport comparison_evidence");
  }
  const expectedSourceIds = monthlyReport.comparison_evidence.previous_month_source_ids.join("|");
  if (evidence.previous_month_source_ids.join("|") !== expectedSourceIds) {
    errors.push("teacher_delivery.monthly_comparison_evidence.previous_month_source_ids must match monthlyReport comparison_evidence");
  }
}

function validateMaterialClassification(
  classification: StudentLearningMaterialUserFacingResult["material_classification"] | undefined,
  context: ValidateStudentLearningMaterialDeliveryBundleContext,
  errors: string[]
) {
  if (!classification || typeof classification !== "object") {
    errors.push("teacher_delivery.material_classification is required");
    return;
  }
  for (const field of ["material_type", "subject", "education_stage", "grade_candidate", "region_or_curriculum_candidate"] as const) {
    if (!readString(classification[field])) errors.push(`teacher_delivery.material_classification.${field} is required`);
  }
  if (typeof classification.classification_confidence !== "number" || classification.classification_confidence < 0 || classification.classification_confidence > 1) {
    errors.push("teacher_delivery.material_classification.classification_confidence must be a number between 0 and 1");
  }
  if (!Array.isArray(classification.source_ids) || classification.source_ids.length === 0) {
    errors.push("teacher_delivery.material_classification.source_ids must not be empty");
  }
  if ("evidenceRefs" in classification) {
    errors.push("teacher_delivery.material_classification must not expose raw evidenceRefs");
  }
  if (context.result) {
    const expected = context.result.material_classification;
    if (classification.material_type !== expected.material_type) errors.push("teacher_delivery.material_classification.material_type must match result");
    if (classification.subject !== expected.subject) errors.push("teacher_delivery.material_classification.subject must match result");
    if (classification.education_stage !== expected.education_stage) errors.push("teacher_delivery.material_classification.education_stage must match result");
    if (classification.grade_candidate !== expected.grade_candidate) errors.push("teacher_delivery.material_classification.grade_candidate must match result");
    if (classification.region_or_curriculum_candidate !== expected.region_or_curriculum_candidate) {
      errors.push("teacher_delivery.material_classification.region_or_curriculum_candidate must match result");
    }
  }
  if (context.analysis) {
    const expected = context.analysis.material_classification;
    if (classification.material_type !== expected.material_type) errors.push("teacher_delivery.material_classification.material_type must match analysis");
    if (classification.subject !== expected.subject) errors.push("teacher_delivery.material_classification.subject must match analysis");
    if (classification.education_stage !== expected.education_stage) errors.push("teacher_delivery.material_classification.education_stage must match analysis");
    if (classification.grade_candidate !== expected.grade_candidate) errors.push("teacher_delivery.material_classification.grade_candidate must match analysis");
    if (classification.region_or_curriculum_candidate !== expected.region_or_curriculum_candidate) {
      errors.push("teacher_delivery.material_classification.region_or_curriculum_candidate must match analysis");
    }
  }
}

function validateSourceMap(bundle: StudentLearningMaterialDeliveryBundle, errors: string[]) {
  if (!Array.isArray(bundle.source_map) || bundle.source_map.length === 0) {
    errors.push("source_map must not be empty");
    return;
  }
  const sourceIds = new Set<string>();
  bundle.source_map.forEach((source, index) => {
    if (!readString(source.source_id)) errors.push(`source_map[${index}].source_id is required`);
    if (!readString(source.internal_evidence_ref)) errors.push(`source_map[${index}].internal_evidence_ref is required`);
    if (sourceIds.has(source.source_id)) errors.push(`source_map duplicate source_id=${source.source_id}`);
    sourceIds.add(source.source_id);
  });
}

function validateQuestionRowsAgainstExpectedIds(
  rows: StudentLearningMaterialUserFacingResult["teacher_report"]["question_rows"],
  expectedQuestionIds: string[],
  fieldName: string,
  expectedLabel: string,
  errors: string[],
  checkDuplicates: boolean
) {
  const rowQuestionIds = rows.map((row) => readString(row.question_id)).filter((questionId): questionId is string => Boolean(questionId));
  const expectedSet = new Set(expectedQuestionIds);
  const rowSet = new Set(rowQuestionIds);
  const duplicateIds = findDuplicates(rowQuestionIds);
  const missingIds = expectedQuestionIds.filter((questionId) => !rowSet.has(questionId));
  const extraIds = rowQuestionIds.filter((questionId) => !expectedSet.has(questionId));

  if (checkDuplicates && duplicateIds.length > 0) {
    errors.push(`${fieldName} duplicate question_id(s): ${duplicateIds.join(", ")}`);
  }
  if (missingIds.length > 0) {
    errors.push(`${fieldName} missing question_id(s) from ${expectedLabel}: ${missingIds.join(", ")}`);
  }
  if (extraIds.length > 0) {
    errors.push(`${fieldName} contains unknown question_id(s): ${extraIds.join(", ")}`);
  }
  const preservesOrder = rowQuestionIds.length === expectedQuestionIds.length && rowQuestionIds.every((questionId, index) => questionId === expectedQuestionIds[index]);
  if (!preservesOrder) {
    errors.push(`${fieldName} must preserve question order from ${expectedLabel}`);
  }
}

function findDuplicates(items: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return Array.from(duplicates);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
