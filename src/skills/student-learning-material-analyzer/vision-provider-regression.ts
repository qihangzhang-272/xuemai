import { readFileSync } from "node:fs";
import {
  validateVisionProviderTrialReport,
  type StudentLearningMaterialVisionProviderTrialReport,
  type VisionProviderTrialReadiness
} from "./vision-provider-trial-report";
import type { VisionEvidenceType } from "./types";

export type StudentLearningMaterialVisionProviderRegressionComparisonInput = {
  baselineReportPath: string;
  candidateReportPath: string;
  requireReadyForHumanLabeling?: boolean;
  confidenceDropTolerance?: number;
};

export type VisionProviderRegressionNumericDelta = {
  metric:
    | "page_count"
    | "question_count"
    | "evidence_count"
    | "student_trace_evidence_count"
    | "answer_basis_evidence_count"
    | "segmentation_pass_count"
    | "segmentation_needs_teacher_review_count"
    | "segmentation_blocked_count"
    | "missing_crop_ref_count"
    | "low_confidence_region_count"
    | "orphan_evidence_count"
    | "evidence_without_region_count"
    | "definitive_allowed_count"
    | "teacher_review_required_count"
    | "blocked_question_count";
  baseline: number;
  candidate: number;
  delta: number;
  direction: "higher_is_better" | "lower_is_better";
  regressed: boolean;
};

export type StudentLearningMaterialVisionProviderRegressionComparisonResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  regressions: string[];
  baseline?: StudentLearningMaterialVisionProviderTrialReport;
  candidate?: StudentLearningMaterialVisionProviderTrialReport;
  numericDeltas: VisionProviderRegressionNumericDelta[];
  missingQuestionIds: string[];
  addedQuestionIds: string[];
  reorderedQuestionIds: string[];
  changedQuestionIdentityIds: string[];
  report: string;
};

const readinessRank: Record<VisionProviderTrialReadiness, number> = {
  blocked: 0,
  needs_evidence_completion: 1,
  ready_for_human_labeling: 2
};

const segmentationRank = {
  blocked: 0,
  needs_teacher_review: 1,
  pass: 2
} as const;

const questionReadinessRank = {
  blocked: 0,
  teacher_review_required: 1,
  definitive_allowed: 2
} as const;

const studentTraceEvidenceTypes = new Set<VisionEvidenceType>([
  "student_original_answer",
  "student_revised_answer",
  "student_process",
  "student_note",
  "teacher_mark",
  "teacher_comment",
  "teacher_score"
]);

const answerBasisEvidenceTypes = new Set<VisionEvidenceType>(["answer_key", "rubric"]);

const higherIsBetterMetrics: VisionProviderRegressionNumericDelta["metric"][] = [
  "page_count",
  "question_count",
  "evidence_count",
  "student_trace_evidence_count",
  "answer_basis_evidence_count",
  "segmentation_pass_count",
  "definitive_allowed_count"
];

const lowerIsBetterMetrics: VisionProviderRegressionNumericDelta["metric"][] = [
  "segmentation_needs_teacher_review_count",
  "segmentation_blocked_count",
  "missing_crop_ref_count",
  "low_confidence_region_count",
  "orphan_evidence_count",
  "evidence_without_region_count",
  "teacher_review_required_count",
  "blocked_question_count"
];

export function compareStudentLearningMaterialVisionProviderRegressionReportsFromFiles(
  input: StudentLearningMaterialVisionProviderRegressionComparisonInput
): StudentLearningMaterialVisionProviderRegressionComparisonResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const baseline = readReport(input.baselineReportPath, "baseline", errors);
  const candidate = readReport(input.candidateReportPath, "candidate", errors);

  if (!baseline || !candidate) {
    return buildResult({
      errors,
      warnings,
      regressions: [],
      numericDeltas: [],
      missingQuestionIds: [],
      addedQuestionIds: [],
      reorderedQuestionIds: [],
      changedQuestionIdentityIds: []
    });
  }

  validateReport("baseline", baseline, errors, warnings);
  validateReport("candidate", candidate, errors, warnings);
  validateSameSource(baseline, candidate, errors);
  if (errors.length) {
    return buildResult({
      errors,
      warnings,
      regressions: [],
      baseline,
      candidate,
      numericDeltas: [],
      missingQuestionIds: [],
      addedQuestionIds: [],
      reorderedQuestionIds: [],
      changedQuestionIdentityIds: []
    });
  }

  const missingQuestionIds = baseline.questions
    .map((question) => question.question_id)
    .filter((questionId) => !candidate.questions.some((question) => question.question_id === questionId));
  const addedQuestionIds = candidate.questions
    .map((question) => question.question_id)
    .filter((questionId) => !baseline.questions.some((question) => question.question_id === questionId));
  if (addedQuestionIds.length) {
    warnings.push(`candidate Provider detected additional question_id: ${addedQuestionIds.join(", ")}`);
  }
  const reorderedQuestionIds = buildReorderedQuestionIds(baseline, candidate);
  const changedQuestionIdentityIds = buildChangedQuestionIdentityIds(baseline, candidate);

  const numericDeltas = buildNumericDeltas(baseline, candidate);
  const regressions = buildRegressionReasons({
    baseline,
    candidate,
    numericDeltas,
    missingQuestionIds,
    reorderedQuestionIds,
    changedQuestionIdentityIds,
    questionRegressions: buildQuestionRegressions(baseline, candidate, input.confidenceDropTolerance ?? 0.05),
    requireReadyForHumanLabeling: input.requireReadyForHumanLabeling !== false
  });

  return buildResult({
    errors,
    warnings,
    regressions,
    baseline,
    candidate,
    numericDeltas,
    missingQuestionIds,
    addedQuestionIds,
    reorderedQuestionIds,
    changedQuestionIdentityIds
  });
}

export function formatStudentLearningMaterialVisionProviderRegressionReport(
  result: Omit<StudentLearningMaterialVisionProviderRegressionComparisonResult, "report">
) {
  return [
    `StudentLearningMaterial vision provider regression: ${result.ok ? "PASS" : "FAIL"}`,
    `baseline.provider=${formatProvider(result.baseline)}`,
    `baseline.readiness=${result.baseline?.readiness ?? "unknown"}`,
    `candidate.provider=${formatProvider(result.candidate)}`,
    `candidate.readiness=${result.candidate?.readiness ?? "unknown"}`,
    `sourceMaterial=${result.baseline?.source_material_id ?? result.candidate?.source_material_id ?? "unknown"}`,
    `material=${result.baseline?.material_id ?? result.candidate?.material_id ?? "unknown"}`,
    `missingQuestions=${result.missingQuestionIds.join(", ") || "none"}`,
    `addedQuestions=${result.addedQuestionIds.join(", ") || "none"}`,
    `reorderedQuestions=${result.reorderedQuestionIds.join(", ") || "none"}`,
    `changedQuestionIdentity=${result.changedQuestionIdentityIds.join(", ") || "none"}`,
    ...result.numericDeltas.map(
      (item) => `delta.${item.metric}=${item.candidate} - ${item.baseline} = ${formatSignedNumber(item.delta)}${item.regressed ? " REGRESSION" : ""}`
    ),
    `regressions=${result.regressions.join("；") || "none"}`,
    `warnings=${result.warnings.join("；") || "none"}`,
    `errors=${result.errors.join("；") || "none"}`
  ].join("\n");
}

function buildResult(
  input: Omit<StudentLearningMaterialVisionProviderRegressionComparisonResult, "ok" | "report">
): StudentLearningMaterialVisionProviderRegressionComparisonResult {
  const result = {
    ...input,
    ok: input.errors.length === 0 && input.regressions.length === 0
  };
  return {
    ...result,
    report: formatStudentLearningMaterialVisionProviderRegressionReport(result)
  };
}

function buildRegressionReasons(input: {
  baseline: StudentLearningMaterialVisionProviderTrialReport;
  candidate: StudentLearningMaterialVisionProviderTrialReport;
  numericDeltas: VisionProviderRegressionNumericDelta[];
  missingQuestionIds: string[];
  reorderedQuestionIds: string[];
  changedQuestionIdentityIds: string[];
  questionRegressions: string[];
  requireReadyForHumanLabeling: boolean;
}) {
  const regressions: string[] = [];
  if (input.requireReadyForHumanLabeling) {
    if (input.baseline.readiness !== "ready_for_human_labeling") {
      regressions.push(`baseline Provider trial readiness=${input.baseline.readiness}，不能作为正式 OCR/Vision 回归基线。`);
    }
    if (input.candidate.readiness !== "ready_for_human_labeling") {
      regressions.push(`candidate Provider trial readiness=${input.candidate.readiness}，不能接受 OCR/Vision Provider 切换。`);
    }
  } else if (readinessRank[input.candidate.readiness] < readinessRank[input.baseline.readiness]) {
    regressions.push(`candidate Provider trial readiness 退步：baseline=${input.baseline.readiness}, candidate=${input.candidate.readiness}。`);
  }
  if (input.missingQuestionIds.length) {
    regressions.push(`candidate Provider 丢失 baseline 题目：${input.missingQuestionIds.join(", ")}。`);
  }
  if (input.reorderedQuestionIds.length) {
    regressions.push(`candidate Provider 改变 baseline 题目顺序：${input.reorderedQuestionIds.join(", ")}。`);
  }
  if (input.changedQuestionIdentityIds.length) {
    regressions.push(`candidate Provider 改变 baseline 题目页码或题号身份：${input.changedQuestionIdentityIds.join(", ")}。`);
  }
  input.numericDeltas
    .filter((item) => item.regressed)
    .forEach((item) => {
      regressions.push(`Provider 指标退步：${item.metric} baseline=${item.baseline}, candidate=${item.candidate}。`);
    });
  regressions.push(...input.questionRegressions);
  return regressions;
}

function buildReorderedQuestionIds(
  baseline: StudentLearningMaterialVisionProviderTrialReport,
  candidate: StudentLearningMaterialVisionProviderTrialReport
) {
  const candidateIndexByQuestionId = new Map(candidate.questions.map((question, index) => [question.question_id, index]));
  return baseline.questions
    .map((question, baselineIndex) => ({
      questionId: question.question_id,
      baselineIndex,
      candidateIndex: candidateIndexByQuestionId.get(question.question_id)
    }))
    .filter((item) => typeof item.candidateIndex === "number" && item.candidateIndex !== item.baselineIndex)
    .map((item) => item.questionId);
}

function buildChangedQuestionIdentityIds(
  baseline: StudentLearningMaterialVisionProviderTrialReport,
  candidate: StudentLearningMaterialVisionProviderTrialReport
) {
  const candidateByQuestionId = new Map(candidate.questions.map((question) => [question.question_id, question]));
  return baseline.questions
    .filter((baselineQuestion) => {
      const candidateQuestion = candidateByQuestionId.get(baselineQuestion.question_id);
      if (!candidateQuestion) return false;
      return (
        normalizeOptionalText(candidateQuestion.page_id) !== normalizeOptionalText(baselineQuestion.page_id) ||
        normalizeOptionalText(candidateQuestion.question_number) !== normalizeOptionalText(baselineQuestion.question_number)
      );
    })
    .map((question) => question.question_id);
}

function buildQuestionRegressions(
  baseline: StudentLearningMaterialVisionProviderTrialReport,
  candidate: StudentLearningMaterialVisionProviderTrialReport,
  confidenceDropTolerance: number
) {
  const regressions: string[] = [];
  const candidateByQuestionId = new Map(candidate.questions.map((question) => [question.question_id, question]));
  baseline.questions.forEach((baselineQuestion) => {
    const candidateQuestion = candidateByQuestionId.get(baselineQuestion.question_id);
    if (!candidateQuestion) return;
    if (segmentationRank[candidateQuestion.segmentation_status] < segmentationRank[baselineQuestion.segmentation_status]) {
      regressions.push(
        `question_id=${baselineQuestion.question_id} 题目切分状态退步：baseline=${baselineQuestion.segmentation_status}, candidate=${candidateQuestion.segmentation_status}。`
      );
    }
    if (questionReadinessRank[candidateQuestion.readiness_status] < questionReadinessRank[baselineQuestion.readiness_status]) {
      regressions.push(
        `question_id=${baselineQuestion.question_id} 证据就绪度退步：baseline=${baselineQuestion.readiness_status}, candidate=${candidateQuestion.readiness_status}。`
      );
    }
    if (baselineQuestion.definitive_judgement_allowed && !candidateQuestion.definitive_judgement_allowed) {
      regressions.push(`question_id=${baselineQuestion.question_id} 丢失可硬判条件，必须进入老师复核。`);
    }
    if (!baselineQuestion.review_required && candidateQuestion.review_required) {
      regressions.push(`question_id=${baselineQuestion.question_id} 从无需复核退步为需要老师复核。`);
    }
    const baselineEvidenceCount = sumEvidenceTypeCounts(baselineQuestion.evidence_type_counts);
    const candidateEvidenceCount = sumEvidenceTypeCounts(candidateQuestion.evidence_type_counts);
    if (candidateEvidenceCount < baselineEvidenceCount) {
      regressions.push(
        `question_id=${baselineQuestion.question_id} 逐题证据数量退步：baseline=${baselineEvidenceCount}, candidate=${candidateEvidenceCount}。`
      );
    }
    const baselineStudentTraceCount = sumEvidenceTypeCounts(baselineQuestion.evidence_type_counts, studentTraceEvidenceTypes);
    const candidateStudentTraceCount = sumEvidenceTypeCounts(candidateQuestion.evidence_type_counts, studentTraceEvidenceTypes);
    if (candidateStudentTraceCount < baselineStudentTraceCount) {
      regressions.push(
        `question_id=${baselineQuestion.question_id} 逐题学生痕迹证据数量退步：baseline=${baselineStudentTraceCount}, candidate=${candidateStudentTraceCount}。`
      );
    }
    const baselineAnswerBasisCount = sumEvidenceTypeCounts(baselineQuestion.evidence_type_counts, answerBasisEvidenceTypes);
    const candidateAnswerBasisCount = sumEvidenceTypeCounts(candidateQuestion.evidence_type_counts, answerBasisEvidenceTypes);
    if (candidateAnswerBasisCount < baselineAnswerBasisCount) {
      regressions.push(
        `question_id=${baselineQuestion.question_id} 逐题答案依据证据数量退步：baseline=${baselineAnswerBasisCount}, candidate=${candidateAnswerBasisCount}。`
      );
    }
    if (baselineQuestion.confidence - candidateQuestion.confidence > confidenceDropTolerance) {
      regressions.push(
        `question_id=${baselineQuestion.question_id} 置信度下降超过阈值：baseline=${formatNumber(baselineQuestion.confidence)}, candidate=${formatNumber(
          candidateQuestion.confidence
        )}。`
      );
    }
  });
  return regressions;
}

function buildNumericDeltas(
  baseline: StudentLearningMaterialVisionProviderTrialReport,
  candidate: StudentLearningMaterialVisionProviderTrialReport
): VisionProviderRegressionNumericDelta[] {
  const metrics = [...higherIsBetterMetrics, ...lowerIsBetterMetrics];
  return metrics.map((metric) => {
    const direction = higherIsBetterMetrics.includes(metric) ? "higher_is_better" : "lower_is_better";
    const baselineValue = baseline.summary[metric];
    const candidateValue = candidate.summary[metric];
    const delta = candidateValue - baselineValue;
    return {
      metric,
      baseline: baselineValue,
      candidate: candidateValue,
      delta,
      direction,
      regressed: direction === "higher_is_better" ? delta < 0 : delta > 0
    };
  });
}

function validateSameSource(
  baseline: StudentLearningMaterialVisionProviderTrialReport,
  candidate: StudentLearningMaterialVisionProviderTrialReport,
  errors: string[]
) {
  if (baseline.source_material_id !== candidate.source_material_id) {
    errors.push(`source_material_id differs: baseline=${baseline.source_material_id}, candidate=${candidate.source_material_id}`);
  }
  if (baseline.material_id !== candidate.material_id) {
    errors.push(`material_id differs: baseline=${baseline.material_id}, candidate=${candidate.material_id}`);
  }
}

function validateReport(label: string, report: StudentLearningMaterialVisionProviderTrialReport, errors: string[], warnings: string[]) {
  const validation = validateVisionProviderTrialReport(report);
  errors.push(...validation.errors.map((error) => `${label}: ${error}`));
  warnings.push(...validation.warnings.map((warning) => `${label}: ${warning}`));
}

function readReport(path: string, label: string, errors: string[]) {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as StudentLearningMaterialVisionProviderTrialReport;
  } catch (error) {
    errors.push(`${label}: cannot read provider trial report: ${formatError(error)}`);
    return undefined;
  }
}

function formatProvider(report: StudentLearningMaterialVisionProviderTrialReport | undefined) {
  return report ? `${report.plugin_provider}/${report.plugin_model_version}` : "unknown";
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function sumEvidenceTypeCounts(value: Partial<Record<VisionEvidenceType, number>>, evidenceTypes?: Set<VisionEvidenceType>) {
  return Object.entries(value)
    .filter(([evidenceType]) => !evidenceTypes || evidenceTypes.has(evidenceType as VisionEvidenceType))
    .reduce((sum, [, count]) => sum + (typeof count === "number" ? count : 0), 0);
}
