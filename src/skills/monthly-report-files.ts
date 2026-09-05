import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createStudentMonthlyReportFromConfirmedSnapshots,
  type MonthlyReportConfirmedSourceCandidate,
  type MonthlyReportSnapshotCandidate,
  type StudentMonthlyReport
} from "./monthly-report";

export type StudentMonthlyReportFileInput = {
  fixture_schema: "student_monthly_report_input.v0.1";
  student_id: string;
  student_name: string;
  current_month: string;
  current_month_label?: string;
  previous_month?: string;
  previous_month_label?: string;
  subject_area?: string;
  snapshots?: MonthlyReportSnapshotCandidate[];
  previous_month_snapshots?: MonthlyReportSnapshotCandidate[];
  confirmed_sources?: MonthlyReportConfirmedSourceCandidate[];
  previous_month_confirmed_sources?: MonthlyReportConfirmedSourceCandidate[];
  previous_report?: StudentMonthlyReport;
  lesson_count?: number;
  feedback_count?: number;
  archived_record_count?: number;
};

export type GenerateStudentMonthlyReportFileInput = {
  monthlyReportInputPath: string;
  monthlyReportOutputPath: string;
};

export type GenerateStudentMonthlyReportFileResult = {
  monthlyReportOutputPath: string;
  studentId: string;
  monthLabel: string;
  sourceCount: number;
  confidenceLevel: StudentMonthlyReport["readiness"]["confidence_level"];
  comparisonEvidenceWarnings: string[];
};

export type StudentMonthlyReportFileInputValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export async function generateStudentMonthlyReportFile(
  input: GenerateStudentMonthlyReportFileInput
): Promise<GenerateStudentMonthlyReportFileResult> {
  const fileInput = await readJsonFile<unknown>(input.monthlyReportInputPath);
  const validation = validateStudentMonthlyReportFileInput(fileInput);
  if (!validation.ok) {
    throw new Error(`StudentMonthlyReport input is invalid: ${validation.errors.join("；")}`);
  }
  const monthlyReportInput = fileInput as StudentMonthlyReportFileInput;

  const report = createStudentMonthlyReportFromConfirmedSnapshots({
    studentId: monthlyReportInput.student_id,
    studentName: monthlyReportInput.student_name,
    currentMonth: monthlyReportInput.current_month,
    currentMonthLabel: monthlyReportInput.current_month_label,
    previousMonth: monthlyReportInput.previous_month,
    previousMonthLabel: monthlyReportInput.previous_month_label,
    subjectArea: monthlyReportInput.subject_area,
    snapshots: monthlyReportInput.snapshots || [],
    previousMonthSnapshots: monthlyReportInput.previous_month_snapshots,
    confirmedSources: monthlyReportInput.confirmed_sources,
    previousMonthConfirmedSources: monthlyReportInput.previous_month_confirmed_sources,
    previousReport: monthlyReportInput.previous_report,
    lessonCount: monthlyReportInput.lesson_count,
    feedbackCount: monthlyReportInput.feedback_count,
    archivedRecordCount: monthlyReportInput.archived_record_count
  });

  await writeJsonFile(input.monthlyReportOutputPath, report);
  return {
    monthlyReportOutputPath: input.monthlyReportOutputPath,
    studentId: monthlyReportInput.student_id,
    monthLabel: report.month_label,
    sourceCount: report.readiness.source_count,
    confidenceLevel: report.readiness.confidence_level,
    comparisonEvidenceWarnings: report.month_over_month_comparison.insufficient_evidence
  };
}

export async function readStudentMonthlyReportFile(filePath: string): Promise<StudentMonthlyReport> {
  return readJsonFile<StudentMonthlyReport>(filePath);
}

export function validateStudentMonthlyReportFileInput(input: unknown): StudentMonthlyReportFileInputValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["monthly report input must be an object"], warnings };
  }
  if (input.fixture_schema !== "student_monthly_report_input.v0.1") {
    errors.push("fixture_schema must be student_monthly_report_input.v0.1");
  }
  const studentId = readString(input.student_id);
  const studentName = readString(input.student_name);
  const currentMonth = readString(input.current_month);
  const previousMonth = readString(input.previous_month) || getPreviousMonth(currentMonth);
  const previousMonthLabel = readString(input.previous_month_label) || formatMonthLabel(previousMonth);
  if (!studentId) errors.push("student_id is required");
  if (!studentName) errors.push("student_name is required");
  if (!/^\d{4}-\d{2}$/.test(currentMonth)) errors.push("current_month must use YYYY-MM");
  if (readString(input.previous_month) && !/^\d{4}-\d{2}$/.test(readString(input.previous_month))) errors.push("previous_month must use YYYY-MM");
  if (input.snapshots && !Array.isArray(input.snapshots)) errors.push("snapshots must be an array");
  if (input.previous_month_snapshots && !Array.isArray(input.previous_month_snapshots)) {
    errors.push("previous_month_snapshots must be an array");
  }
  if (input.confirmed_sources && !Array.isArray(input.confirmed_sources)) errors.push("confirmed_sources must be an array");
  if (input.previous_month_confirmed_sources && !Array.isArray(input.previous_month_confirmed_sources)) {
    errors.push("previous_month_confirmed_sources must be an array");
  }
  if (input.previous_report && !isRecord(input.previous_report)) errors.push("previous_report must be an object when present");

  if (Array.isArray(input.snapshots)) {
    validateMonthlySnapshots(input.snapshots, "snapshots", {
      studentId,
      month: currentMonth,
      errors
    });
  }
  if (Array.isArray(input.previous_month_snapshots)) {
    validateMonthlySnapshots(input.previous_month_snapshots, "previous_month_snapshots", {
      studentId,
      month: previousMonth,
      errors
    });
  }
  if (Array.isArray(input.confirmed_sources)) {
    validateConfirmedSources(input.confirmed_sources, "confirmed_sources", {
      studentId,
      month: currentMonth,
      errors
    });
  }
  if (Array.isArray(input.previous_month_confirmed_sources)) {
    validateConfirmedSources(input.previous_month_confirmed_sources, "previous_month_confirmed_sources", {
      studentId,
      month: previousMonth,
      errors
    });
  }
  if (isRecord(input.previous_report)) {
    validatePreviousReport(input.previous_report, {
      studentName,
      previousMonthLabel,
      errors
    });
  }

  const currentSourceCount = countArray(input.snapshots) + countArray(input.confirmed_sources);
  const previousSourceCount = countArray(input.previous_month_snapshots) + countArray(input.previous_month_confirmed_sources);
  if (currentSourceCount === 0) {
    warnings.push("monthly_report_input_path has no current-month confirmed evidence; output must remain insufficient");
  }
  if (previousSourceCount === 0 && !isRecord(input.previous_report)) {
    warnings.push("monthly_report_input_path has no previous-month evidence; output must state missing baseline and avoid trend claims");
  }

  return { ok: errors.length === 0, errors, warnings };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function validateMonthlySnapshots(
  snapshots: unknown[],
  field: "snapshots" | "previous_month_snapshots",
  context: { studentId: string; month: string; errors: string[] }
) {
  const sourceIds: string[] = [];
  snapshots.forEach((snapshot, index) => {
    const prefix = `${field}[${index}]`;
    if (!isRecord(snapshot)) {
      context.errors.push(`${prefix} must be an object`);
      return;
    }
    if (snapshot.teacher_confirmed !== true) context.errors.push(`${prefix}.teacher_confirmed must be true`);
    if (!readString(snapshot.confirmed_at)) context.errors.push(`${prefix}.confirmed_at is required`);
    if (!readString(snapshot.teacher_id)) context.errors.push(`${prefix}.teacher_id is required`);
    if (!readString(snapshot.source_analysis_id)) context.errors.push(`${prefix}.source_analysis_id is required`);
    if (!readString(snapshot.source_skill_run_id)) context.errors.push(`${prefix}.source_skill_run_id is required`);
    if (!readString(snapshot.archive_record_id)) context.errors.push(`${prefix}.archive_record_id is required`);
    if (!readString(snapshot.source_material_id)) context.errors.push(`${prefix}.source_material_id is required`);
    if (readString(snapshot.student_id) !== context.studentId) {
      context.errors.push(`${prefix}.student_id must match input.student_id`);
    }
    if (readString(snapshot.month) !== context.month) {
      context.errors.push(`${prefix}.month must match ${field === "snapshots" ? "current_month" : "previous_month"}`);
    }
    if (!Number.isInteger(snapshot.question_count) || Number(snapshot.question_count) < 0) {
      context.errors.push(`${prefix}.question_count must be a non-negative integer`);
    }
    if (!Number.isInteger(snapshot.analyzable_question_count) || Number(snapshot.analyzable_question_count) < 0) {
      context.errors.push(`${prefix}.analyzable_question_count must be a non-negative integer`);
    }
    if (
      Number.isInteger(snapshot.question_count) &&
      Number.isInteger(snapshot.analyzable_question_count) &&
      Number(snapshot.question_count) < Number(snapshot.analyzable_question_count)
    ) {
      context.errors.push(`${prefix}.question_count cannot be lower than analyzable_question_count`);
    }
    if (typeof snapshot.confidence !== "number" || snapshot.confidence < 0 || snapshot.confidence > 1) {
      context.errors.push(`${prefix}.confidence must be a number between 0 and 1`);
    }
    validateNonEmptyStringArray(snapshot.evidenceRefs, `${prefix}.evidenceRefs`, context.errors);
    validateStringArray(snapshot.knowledge_points, `${prefix}.knowledge_points`, context.errors);
    validateStringArray(snapshot.ability_dimensions, `${prefix}.ability_dimensions`, context.errors);
    validateStringArray(snapshot.error_patterns, `${prefix}.error_patterns`, context.errors);
    validateStringArray(snapshot.teacher_only_notes, `${prefix}.teacher_only_notes`, context.errors);
    validateForbiddenParentTerms(readString(snapshot.parent_visible_summary), `${prefix}.parent_visible_summary`, context.errors);
    const sourceId = readString(snapshot.source_skill_run_id) || readString(snapshot.source_analysis_id);
    if (sourceId) sourceIds.push(sourceId);
  });
  const duplicates = findDuplicates(sourceIds);
  if (duplicates.length) context.errors.push(`${field} duplicate replay source ids: ${duplicates.join(", ")}`);
}

function validateConfirmedSources(
  sources: unknown[],
  field: "confirmed_sources" | "previous_month_confirmed_sources",
  context: { studentId: string; month: string; errors: string[] }
) {
  const sourceIds: string[] = [];
  sources.forEach((source, index) => {
    const prefix = `${field}[${index}]`;
    if (!isRecord(source)) {
      context.errors.push(`${prefix} must be an object`);
      return;
    }
    if (!readString(source.id)) context.errors.push(`${prefix}.id is required`);
    if (readString(source.id)) sourceIds.push(readString(source.id));
    if (readString(source.student_id) !== context.studentId) context.errors.push(`${prefix}.student_id must match input.student_id`);
    if (readString(source.month) !== context.month) {
      context.errors.push(`${prefix}.month must match ${field === "confirmed_sources" ? "current_month" : "previous_month"}`);
    }
    if (!["learning_record", "feedback", "teacher_note"].includes(readString(source.source_type))) {
      context.errors.push(`${prefix}.source_type is invalid`);
    }
    if (!readString(source.label)) context.errors.push(`${prefix}.label is required`);
    if (!readString(source.summary)) context.errors.push(`${prefix}.summary is required`);
    if (source.teacher_confirmed !== true) context.errors.push(`${prefix}.teacher_confirmed must be true`);
    if (!readString(source.confirmed_at)) context.errors.push(`${prefix}.confirmed_at is required`);
    if (typeof source.usable_for_parent !== "boolean") context.errors.push(`${prefix}.usable_for_parent must be boolean`);
    validateNonEmptyStringArray(source.evidenceRefs, `${prefix}.evidenceRefs`, context.errors);
    validateOptionalStringArray(source.progress_signals, `${prefix}.progress_signals`, context.errors);
    validateOptionalStringArray(source.issue_signals, `${prefix}.issue_signals`, context.errors);
    validateOptionalStringArray(source.next_actions, `${prefix}.next_actions`, context.errors);
    validateOptionalStringArray(source.knowledge_points, `${prefix}.knowledge_points`, context.errors);
    validateOptionalStringArray(source.ability_dimensions, `${prefix}.ability_dimensions`, context.errors);
    validateForbiddenParentTerms(readString(source.summary), `${prefix}.summary`, context.errors);
  });
  const duplicates = findDuplicates(sourceIds);
  if (duplicates.length) context.errors.push(`${field} duplicate source ids: ${duplicates.join(", ")}`);
}

function validatePreviousReport(
  report: Record<string, unknown>,
  context: { studentName: string; previousMonthLabel: string; errors: string[] }
) {
  if (report.schema_version !== "student_monthly_report_v1") context.errors.push("previous_report.schema_version must be student_monthly_report_v1");
  if (report.report_type !== "student") context.errors.push("previous_report.report_type must be student");
  if (report.audience !== "parent") context.errors.push("previous_report.audience must be parent");
  if (readString(report.student_name) !== context.studentName) context.errors.push("previous_report.student_name must match input.student_name");
  if (readString(report.month_label) !== context.previousMonthLabel) context.errors.push("previous_report.month_label must match previous_month");
  if (!isRecord(report.readiness)) {
    context.errors.push("previous_report.readiness must be an object");
  } else {
    if (!["high", "medium", "low"].includes(readString(report.readiness.confidence_level))) {
      context.errors.push("previous_report.readiness.confidence_level must be high, medium, or low");
    }
    if (!Number.isInteger(report.readiness.source_count) || Number(report.readiness.source_count) < 0) {
      context.errors.push("previous_report.readiness.source_count must be a non-negative integer");
    }
  }
  validatePreviousReportComparisonEvidence(report, context.errors);
  validateForbiddenParentTerms(readString(report.parent_message), "previous_report.parent_message", context.errors);

  const evidenceTimeline = Array.isArray(report.evidence_timeline) ? report.evidence_timeline : undefined;
  if (!evidenceTimeline || evidenceTimeline.length === 0) {
    context.errors.push("previous_report.evidence_timeline must contain replayable source ids");
    return;
  }
  if (isRecord(report.readiness) && Number.isInteger(report.readiness.source_count) && report.readiness.source_count !== evidenceTimeline.length) {
    context.errors.push("previous_report.readiness.source_count must match evidence_timeline length");
  }
  const sourceIds: string[] = [];
  evidenceTimeline.forEach((source, index) => {
    const prefix = `previous_report.evidence_timeline[${index}]`;
    if (!isRecord(source)) {
      context.errors.push(`${prefix} must be an object`);
      return;
    }
    const sourceId = readString(source.id);
    if (!sourceId) {
      context.errors.push(`${prefix}.id is required`);
      return;
    }
    sourceIds.push(sourceId);
    if (!readString(source.label)) context.errors.push(`${prefix}.label is required`);
    if (!["learning_record", "learning_evidence", "feedback", "class_lesson", "teacher_note"].includes(readString(source.type))) {
      context.errors.push(`${prefix}.type is invalid`);
    }
    if (!readString(source.summary)) context.errors.push(`${prefix}.summary is required`);
    if (typeof source.usable_for_parent !== "boolean") context.errors.push(`${prefix}.usable_for_parent must be boolean`);
    validateForbiddenParentTerms(readString(source.summary), `${prefix}.summary`, context.errors);
  });
  const duplicates = findDuplicates(sourceIds);
  if (duplicates.length) context.errors.push(`previous_report.evidence_timeline duplicate source ids: ${duplicates.join(", ")}`);
}

function validatePreviousReportComparisonEvidence(report: Record<string, unknown>, errors: string[]) {
  if (!isRecord(report.comparison_evidence)) {
    errors.push("previous_report.comparison_evidence must be an object");
    return;
  }
  const evidence = report.comparison_evidence;
  const currentSourceCount = readInteger(evidence.current_month_source_count);
  const readinessSourceCount = isRecord(report.readiness) ? readInteger(report.readiness.source_count) : undefined;
  const evidenceTimelineCount = Array.isArray(report.evidence_timeline) ? report.evidence_timeline.length : undefined;
  if (currentSourceCount === undefined || currentSourceCount < 0) {
    errors.push("previous_report.comparison_evidence.current_month_source_count must be a non-negative integer");
  }
  if (currentSourceCount !== undefined && readinessSourceCount !== undefined && currentSourceCount !== readinessSourceCount) {
    errors.push("previous_report.comparison_evidence.current_month_source_count must match readiness.source_count");
  }
  if (currentSourceCount !== undefined && evidenceTimelineCount !== undefined && currentSourceCount !== evidenceTimelineCount) {
    errors.push("previous_report.comparison_evidence.current_month_source_count must match evidence_timeline length");
  }
  const status = readString(evidence.previous_month_evidence_status);
  if (status !== "available" && status !== "missing") {
    errors.push("previous_report.comparison_evidence.previous_month_evidence_status must be available or missing");
  }
  const sourceCount = readInteger(evidence.previous_month_source_count);
  if (sourceCount === undefined || sourceCount < 0) {
    errors.push("previous_report.comparison_evidence.previous_month_source_count must be a non-negative integer");
  }
  if (!Array.isArray(evidence.previous_month_source_ids)) {
    errors.push("previous_report.comparison_evidence.previous_month_source_ids must be an array");
    return;
  }
  const sourceIds = evidence.previous_month_source_ids.filter((sourceId): sourceId is string => typeof sourceId === "string").map((sourceId) => sourceId.trim());
  if (sourceIds.length !== evidence.previous_month_source_ids.length || sourceIds.some((sourceId) => !sourceId)) {
    errors.push("previous_report.comparison_evidence.previous_month_source_ids must contain non-empty source ids");
  }
  const duplicateSourceIds = findDuplicates(sourceIds);
  if (duplicateSourceIds.length) {
    errors.push(`previous_report.comparison_evidence.previous_month_source_ids duplicate source ids: ${duplicateSourceIds.join(", ")}`);
  }
  if (sourceCount !== undefined && sourceCount !== sourceIds.length) {
    errors.push("previous_report.comparison_evidence.previous_month_source_count must match previous_month_source_ids length");
  }
  if (status === "available" && sourceIds.length === 0) {
    errors.push("previous_report.comparison_evidence available status requires replayable previous-month source ids");
  }
  if (status === "missing" && sourceIds.length > 0) {
    errors.push("previous_report.comparison_evidence missing status must not include previous-month source ids");
  }
  if (status === "missing" && sourceCount && sourceCount > 0) {
    errors.push("previous_report.comparison_evidence missing status must not include previous-month source count");
  }
  if (status === "missing" && evidence.previous_month_report_used === true) {
    errors.push("previous_report.comparison_evidence missing status must not mark previous_month_report_used");
  }
}

function validateNonEmptyStringArray(value: unknown, field: string, errors: string[]) {
  validateStringArray(value, field, errors);
  if (Array.isArray(value) && value.length === 0) errors.push(`${field} must contain at least one item`);
  if (Array.isArray(value) && value.some((item) => !readString(item))) errors.push(`${field} must contain non-empty strings`);
}

function validateOptionalStringArray(value: unknown, field: string, errors: string[]) {
  if (value === undefined) return;
  validateStringArray(value, field, errors);
}

function validateStringArray(value: unknown, field: string, errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`);
    return;
  }
  if (value.some((item) => typeof item !== "string")) errors.push(`${field} must contain strings`);
}

function validateForbiddenParentTerms(value: string, field: string, errors: string[]) {
  const forbiddenTerms = ["严重", "很差", "完全不会", "保证提分", "不认真", "基础很差", "一定能提高", "一定提升", "孩子不行", "家长必须"];
  const matches = forbiddenTerms.filter((term) => value.includes(term));
  if (matches.length) errors.push(`${field} contains forbidden expressions: ${matches.join(", ")}`);
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return Array.from(duplicates);
}

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function readInteger(value: unknown) {
  return Number.isInteger(value) ? Number(value) : undefined;
}

function getPreviousMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return "";
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  const previousDate = new Date(Date.UTC(year, monthIndex - 2, 1));
  return `${previousDate.getUTCFullYear()}-${String(previousDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return `${match[1]} 年 ${Number(match[2])} 月`;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
