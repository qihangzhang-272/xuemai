import {
  evaluateStudentLearningMaterialDatasetBundle,
  type StudentLearningMaterialEvaluationDatasetBundle,
  type StudentLearningMaterialEvaluationClaimPolicy,
  type StudentLearningMaterialEvaluationDatasetResult,
  type StudentLearningMaterialEvaluationMetrics,
  type StudentLearningMaterialEvaluationThresholds
} from "./evaluation";
import { loadStudentLearningMaterialEvaluationDatasetBundleFromFile } from "./evaluation-files";
import {
  createStudentLearningMaterialDeliveryBundle,
  validateStudentLearningMaterialDeliveryBundle
} from "./delivery-bundle";
import {
  createStudentLearningMaterialUserFacingResult,
  validateStudentLearningMaterialUserFacingResult
} from "./user-facing-result";
import {
  createStudentLearningMaterialTeacherReviewPacket,
  validateStudentLearningMaterialTeacherReviewPacket
} from "./teacher-review-packet";
import {
  createStudentMonthlyReportFromConfirmedSnapshots,
  type StudentMonthlyReport
} from "../monthly-report";
import {
  validateStudentMonthlyReportFileInput,
  type StudentMonthlyReportFileInput
} from "../monthly-report-files";
import { createConfirmedMonthlyReportSnapshotCopy } from "./monthly-snapshot-archive";
import type { StudentLearningMaterialAnalysis } from "./types";

export type StudentLearningMaterialModelRegressionComparisonInput = {
  baselineDatasetPath: string;
  candidateDatasetPath: string;
  thresholds?: StudentLearningMaterialEvaluationThresholds;
  claimPolicy?: StudentLearningMaterialEvaluationClaimPolicy;
  requireClaimable99?: boolean;
};

export type StudentLearningMaterialMetricDelta = {
  metric: keyof StudentLearningMaterialEvaluationMetrics;
  baseline: number;
  candidate: number;
  delta: number;
  direction: "higher_is_better" | "lower_is_better";
  regressed: boolean;
};

export type StudentLearningMaterialModelRegressionComparisonResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  regressions: string[];
  baseline?: StudentLearningMaterialEvaluationDatasetResult;
  candidate?: StudentLearningMaterialEvaluationDatasetResult;
  metricDeltas: StudentLearningMaterialMetricDelta[];
  newFailedCaseIds: string[];
  resolvedFailedCaseIds: string[];
  baselineFinalArtifactErrors: string[];
  candidateFinalArtifactErrors: string[];
  report: string;
};

const lowerIsBetterMetrics: Array<keyof StudentLearningMaterialEvaluationMetrics> = ["unsupportedDefinitiveJudgementRate", "unsafeFeedbackRate"];
const metricKeys: Array<keyof StudentLearningMaterialEvaluationMetrics> = [
  "materialClassificationAccuracy",
  "questionCoverageRecall",
  "highConfidenceCorrectnessAccuracy",
  "unsupportedDefinitiveJudgementRate",
  "teacherReviewRoutingRecall",
  "evidenceCoverageRate",
  "unsafeFeedbackRate",
  "monthlySnapshotCoverage",
  "modelContractCoverage",
  "teacherProfessionalReportCoverage"
];

export function compareStudentLearningMaterialModelRegressionDatasetsFromFiles(
  input: StudentLearningMaterialModelRegressionComparisonInput
): StudentLearningMaterialModelRegressionComparisonResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const baselineBundle = loadStudentLearningMaterialEvaluationDatasetBundleFromFile(input.baselineDatasetPath);
  const candidateBundle = loadStudentLearningMaterialEvaluationDatasetBundleFromFile(input.candidateDatasetPath);

  if (!baselineBundle.ok) errors.push(...baselineBundle.errors.map((error) => `baseline: ${error}`));
  if (!candidateBundle.ok) errors.push(...candidateBundle.errors.map((error) => `candidate: ${error}`));
  if (!baselineBundle.ok || !candidateBundle.ok) {
    return buildComparisonResult({
      errors,
      warnings,
      regressions: [],
      metricDeltas: [],
      newFailedCaseIds: [],
      resolvedFailedCaseIds: [],
      baselineFinalArtifactErrors: [],
      candidateFinalArtifactErrors: []
    });
  }

  const baselineCaseIds = baselineBundle.bundle.cases.map((item) => item.gold.case_id);
  const candidateCaseIds = candidateBundle.bundle.cases.map((item) => item.gold.case_id);
  const caseSetErrors = compareCaseSets(baselineCaseIds, candidateCaseIds);
  errors.push(...caseSetErrors);
  errors.push(...compareGoldCases(baselineBundle.bundle, candidateBundle.bundle));
  if (baselineBundle.bundle.dataset_kind !== candidateBundle.bundle.dataset_kind) {
    warnings.push(`dataset_kind differs: baseline=${baselineBundle.bundle.dataset_kind}, candidate=${candidateBundle.bundle.dataset_kind}`);
  }
  const baselineFinalArtifactErrors = collectFinalArtifactErrors(baselineBundle.bundle);
  const candidateFinalArtifactErrors = collectFinalArtifactErrors(candidateBundle.bundle);
  errors.push(...baselineFinalArtifactErrors.map((error) => `baseline final artifact invalid: ${error}`));

  const baseline = evaluateStudentLearningMaterialDatasetBundle(baselineBundle.bundle, input.thresholds, input.claimPolicy);
  const candidate = evaluateStudentLearningMaterialDatasetBundle(candidateBundle.bundle, input.thresholds, input.claimPolicy);
  const metricDeltas = buildMetricDeltas(baseline.metrics, candidate.metrics);
  const newFailedCaseIds = candidate.failedCaseIds.filter((caseId) => !baseline.failedCaseIds.includes(caseId));
  const resolvedFailedCaseIds = baseline.failedCaseIds.filter((caseId) => !candidate.failedCaseIds.includes(caseId));
  const regressions = buildRegressionReasons({
    baseline,
    candidate,
    metricDeltas,
    newFailedCaseIds,
    candidateFinalArtifactErrors,
    requireClaimable99: input.requireClaimable99 !== false
  });

  return buildComparisonResult({
    errors,
    warnings,
    regressions,
    baseline,
    candidate,
    metricDeltas,
    newFailedCaseIds,
    resolvedFailedCaseIds,
    baselineFinalArtifactErrors,
    candidateFinalArtifactErrors
  });
}

export function formatStudentLearningMaterialModelRegressionReport(
  result: Omit<StudentLearningMaterialModelRegressionComparisonResult, "report">
) {
  return [
    `StudentLearningMaterial model regression: ${result.ok ? "PASS" : "FAIL"}`,
    `baseline.dataset=${result.baseline?.dataset_id ?? "unknown"}`,
    `baseline.model=${formatModel(result.baseline)}`,
    `baseline.claimable99Correctness=${result.baseline?.claimable99Correctness ? "yes" : "no"}`,
    `candidate.dataset=${result.candidate?.dataset_id ?? "unknown"}`,
    `candidate.model=${formatModel(result.candidate)}`,
    `candidate.claimable99Correctness=${result.candidate?.claimable99Correctness ? "yes" : "no"}`,
    `newFailedCases=${result.newFailedCaseIds.join(", ") || "none"}`,
    `resolvedFailedCases=${result.resolvedFailedCaseIds.join(", ") || "none"}`,
    `baselineFinalArtifactErrors=${result.baselineFinalArtifactErrors.join("；") || "none"}`,
    `candidateFinalArtifactErrors=${result.candidateFinalArtifactErrors.join("；") || "none"}`,
    ...result.metricDeltas.map(
      (item) => `delta.${item.metric}=${formatMetric(item.candidate)} - ${formatMetric(item.baseline)} = ${formatSignedMetric(item.delta)}${item.regressed ? " REGRESSION" : ""}`
    ),
    `regressions=${result.regressions.join("；") || "none"}`,
    `warnings=${result.warnings.join("；") || "none"}`,
    `errors=${result.errors.join("；") || "none"}`
  ].join("\n");
}

function buildComparisonResult(
  input: Omit<StudentLearningMaterialModelRegressionComparisonResult, "ok" | "report">
): StudentLearningMaterialModelRegressionComparisonResult {
  const result = {
    ...input,
    ok: input.errors.length === 0 && input.regressions.length === 0
  };
  return {
    ...result,
    report: formatStudentLearningMaterialModelRegressionReport(result)
  };
}

function buildMetricDeltas(
  baseline: StudentLearningMaterialEvaluationMetrics,
  candidate: StudentLearningMaterialEvaluationMetrics
): StudentLearningMaterialMetricDelta[] {
  return metricKeys.map((metric) => {
    const direction = lowerIsBetterMetrics.includes(metric) ? "lower_is_better" : "higher_is_better";
    const delta = candidate[metric] - baseline[metric];
    return {
      metric,
      baseline: baseline[metric],
      candidate: candidate[metric],
      delta,
      direction,
      regressed: direction === "lower_is_better" ? delta > 0 : delta < 0
    };
  });
}

function buildRegressionReasons(input: {
  baseline: StudentLearningMaterialEvaluationDatasetResult;
  candidate: StudentLearningMaterialEvaluationDatasetResult;
  metricDeltas: StudentLearningMaterialMetricDelta[];
  newFailedCaseIds: string[];
  candidateFinalArtifactErrors: string[];
  requireClaimable99: boolean;
}) {
  const regressions: string[] = [];
  if (input.baseline.ok && !input.candidate.ok) {
    regressions.push("候选模型未通过 baseline 已通过的 dataset gate。");
  }
  if (input.requireClaimable99) {
    if (!input.baseline.claimable99Correctness) {
      regressions.push("baseline dataset 未达到 claimable99Correctness，不能作为 99% 回归基线。");
    }
    if (!input.candidate.claimable99Correctness) {
      regressions.push("candidate dataset 未达到 claimable99Correctness，不能接受模型/Provider/Prompt 切换。");
    }
  } else if (input.baseline.claimable99Correctness && !input.candidate.claimable99Correctness) {
    regressions.push("候选模型丢失 baseline 已具备的 claimable99Correctness。");
  }
  if (input.newFailedCaseIds.length) {
    regressions.push(`候选模型新增失败 case：${input.newFailedCaseIds.join(", ")}。`);
  }
  if (input.candidateFinalArtifactErrors.length) {
    regressions.push(`候选模型最终交付物无效：${input.candidateFinalArtifactErrors.join("；")}。`);
  }
  input.metricDeltas
    .filter((item) => item.regressed)
    .forEach((item) => {
      regressions.push(`指标退步：${item.metric} baseline=${formatMetric(item.baseline)}, candidate=${formatMetric(item.candidate)}。`);
    });
  return regressions;
}

function collectFinalArtifactErrors(bundle: StudentLearningMaterialEvaluationDatasetBundle) {
  const errors: string[] = [];
  for (const item of bundle.cases) {
    const caseId = item.gold.case_id;
    try {
      const result = createStudentLearningMaterialUserFacingResult(item.analysis);
      const resultValidation = validateStudentLearningMaterialUserFacingResult(result, {
        analysis: item.analysis
      });
      if (!resultValidation.ok) {
        errors.push(`case_id=${caseId} result: ${resultValidation.errors.join("；")}`);
        continue;
      }
      const monthlyArtifacts = createRegressionMonthlyArtifacts(item.analysis, caseId);
      if (monthlyArtifacts.errors.length > 0 || !monthlyArtifacts.monthlyReport) {
        errors.push(`case_id=${caseId} monthly_report_input: ${monthlyArtifacts.errors.join("；")}`);
        continue;
      }
      const deliveryBundle = createStudentLearningMaterialDeliveryBundle({
        result,
        monthlyReport: monthlyArtifacts.monthlyReport,
        generatedAt: item.analysis.audit.created_at
      });
      const deliveryValidation = validateStudentLearningMaterialDeliveryBundle(deliveryBundle, {
        analysis: item.analysis,
        result,
        monthlyReport: monthlyArtifacts.monthlyReport
      });
      if (!deliveryValidation.ok) {
        errors.push(`case_id=${caseId} delivery: ${deliveryValidation.errors.join("；")}`);
        continue;
      }
      const teacherReviewPacket = createStudentLearningMaterialTeacherReviewPacket({
        deliveryBundle,
        skillRunId: item.analysis.analysis_id,
        generatedAt: item.analysis.audit.created_at
      });
      const teacherReviewValidation = validateStudentLearningMaterialTeacherReviewPacket(teacherReviewPacket, deliveryBundle);
      if (!teacherReviewValidation.ok) {
        errors.push(`case_id=${caseId} teacher_review_packet: ${teacherReviewValidation.errors.join("；")}`);
      }
    } catch (error) {
      errors.push(`case_id=${caseId} artifact_generation: ${formatError(error)}`);
    }
  }
  return errors;
}

function createRegressionMonthlyArtifacts(
  analysis: StudentLearningMaterialAnalysis,
  caseId: string
): { monthlyReport?: StudentMonthlyReport; errors: string[] } {
  const errors: string[] = [];
  const confirmed = createConfirmedMonthlyReportSnapshotCopy({
    analysis,
    teacherId: "regression-teacher",
    sourceSkillRunId: `${caseId}:regression-skill-run`,
    archiveRecordId: `${caseId}:regression-archive-record`,
    confirmedAt: analysis.audit.created_at,
    feedbackSent: true
  });
  if (!confirmed.ok) {
    return { errors: confirmed.errors };
  }

  const previousMonth = getPreviousMonth(analysis.monthly_report_snapshot.month);
  const previousSnapshot = {
    ...confirmed.snapshot,
    source_analysis_id: `${analysis.analysis_id}:previous-month`,
    month: previousMonth,
    material_date: `${previousMonth}-20`,
    score_summary: "上月同源确认材料显示需要继续观察本次材料涉及的薄弱点。",
    main_progress_signal: "上月有可对比确认素材",
    main_issue_signal: "上月同类问题仍需跟踪",
    first_priority_action: "继续按证据复盘同类题",
    parent_visible_summary: "上月已确认素材用于本月纵向对比。",
    teacher_only_notes: ["模型回归用脱敏上月快照，仅用于校验月报链路。"],
    evidenceRefs: [`${caseId}:previous-month-evidence`],
    confirmed_at: `${previousMonth}-20T19:00:00+08:00`,
    source_skill_run_id: `${caseId}:regression-skill-run-previous`,
    archive_record_id: `${caseId}:regression-archive-record-previous`
  };

  const monthlyReportInput: StudentMonthlyReportFileInput = {
    fixture_schema: "student_monthly_report_input.v0.1",
    student_id: analysis.student_id,
    student_name: "脱敏学生",
    current_month: analysis.monthly_report_snapshot.month,
    previous_month: previousMonth,
    subject_area: analysis.material_classification.subject,
    snapshots: [confirmed.snapshot],
    previous_month_snapshots: [previousSnapshot],
    lesson_count: 1,
    feedback_count: 1,
    archived_record_count: 1
  };
  const inputValidation = validateStudentMonthlyReportFileInput(monthlyReportInput);
  errors.push(...inputValidation.errors);
  if (errors.length > 0) return { errors };

  const monthlyReport = createStudentMonthlyReportFromConfirmedSnapshots({
    studentId: monthlyReportInput.student_id,
    studentName: monthlyReportInput.student_name,
    currentMonth: monthlyReportInput.current_month,
    previousMonth: monthlyReportInput.previous_month,
    subjectArea: monthlyReportInput.subject_area,
    snapshots: monthlyReportInput.snapshots || [],
    previousMonthSnapshots: monthlyReportInput.previous_month_snapshots,
    lessonCount: monthlyReportInput.lesson_count,
    feedbackCount: monthlyReportInput.feedback_count,
    archivedRecordCount: monthlyReportInput.archived_record_count
  });
  errors.push(...validateRegressionMonthlyReport(monthlyReport, monthlyReportInput));
  return { monthlyReport, errors };
}

function validateRegressionMonthlyReport(report: StudentMonthlyReport, input: StudentMonthlyReportFileInput) {
  const errors: string[] = [];
  if (report.schema_version !== "student_monthly_report_v1") errors.push("monthly_report schema_version must be student_monthly_report_v1");
  if (report.report_type !== "student") errors.push("monthly_report report_type must be student");
  if (report.audience !== "parent") errors.push("monthly_report audience must be parent");
  if (report.month_label !== formatMonthLabel(input.current_month)) {
    errors.push("monthly_report month_label must match monthly_report_input current_month");
  }
  if (report.student_name !== input.student_name) {
    errors.push("monthly_report student_name must match monthly_report_input student_name");
  }
  const currentSourceCount = (input.snapshots?.length || 0) + (input.confirmed_sources?.length || 0);
  if (report.readiness.source_count !== currentSourceCount) {
    errors.push("monthly_report readiness.source_count must match monthly_report_input current confirmed source count");
  }
  if (report.comparison_evidence.current_month_source_count !== report.readiness.source_count) {
    errors.push("monthly_report comparison_evidence.current_month_source_count must match readiness.source_count");
  }
  const previousSourceCount = (input.previous_month_snapshots?.length || 0) + (input.previous_month_confirmed_sources?.length || 0);
  if (previousSourceCount > 0 && report.comparison_evidence.previous_month_evidence_status !== "available") {
    errors.push("monthly_report comparison_evidence must be available when monthly_report_input has previous-month evidence");
  }
  const uniquePreviousSourceIds = new Set(report.comparison_evidence.previous_month_source_ids);
  if (uniquePreviousSourceIds.size !== report.comparison_evidence.previous_month_source_ids.length) {
    errors.push("monthly_report comparison_evidence.previous_month_source_ids must be unique");
  }
  if (report.comparison_evidence.previous_month_source_count !== uniquePreviousSourceIds.size) {
    errors.push("monthly_report comparison_evidence.previous_month_source_count must match unique previous_month_source_ids");
  }
  if (previousSourceCount > 0 && report.comparison_evidence.previous_month_source_count !== previousSourceCount) {
    errors.push("monthly_report comparison_evidence.previous_month_source_count must match monthly_report_input previous confirmed source count");
  }
  if (!/上月|纵向|相比|缺少上月/.test(report.month_over_month_comparison.parent_readable_comparison)) {
    errors.push("monthly_report parent_readable_comparison must state prior-month comparison or missing previous-month evidence");
  }
  return errors;
}

function compareCaseSets(baselineCaseIds: string[], candidateCaseIds: string[]) {
  const errors: string[] = [];
  const baselineOnly = baselineCaseIds.filter((caseId) => !candidateCaseIds.includes(caseId));
  const candidateOnly = candidateCaseIds.filter((caseId) => !baselineCaseIds.includes(caseId));
  if (baselineOnly.length) errors.push(`candidate dataset missing baseline case_id: ${baselineOnly.join(", ")}`);
  if (candidateOnly.length) errors.push(`candidate dataset includes non-baseline case_id: ${candidateOnly.join(", ")}`);
  return errors;
}

function compareGoldCases(
  baselineBundle: StudentLearningMaterialEvaluationDatasetBundle,
  candidateBundle: StudentLearningMaterialEvaluationDatasetBundle
) {
  const errors: string[] = [];
  const candidateGoldByCaseId = new Map(candidateBundle.cases.map((item) => [item.gold.case_id, item.gold]));
  baselineBundle.cases.forEach((baselineCase) => {
    const candidateGold = candidateGoldByCaseId.get(baselineCase.gold.case_id);
    if (!candidateGold) return;
    if (canonicalJson(baselineCase.gold) !== canonicalJson(candidateGold)) {
      errors.push(`case_id=${baselineCase.gold.case_id} gold case differs between baseline and candidate datasets; model regression must use the same human-labeled gold.`);
    }
  });
  return errors;
}

function formatModel(result: StudentLearningMaterialEvaluationDatasetResult | undefined) {
  return result?.model_under_test ? `${result.model_under_test.provider_name}/${result.model_under_test.model_name}` : "unknown";
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

function formatSignedMetric(value: number) {
  const formatted = formatMetric(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
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
  if (!match) return month || "上月";
  return `${match[1]} 年 ${Number(match[2])} 月`;
}
