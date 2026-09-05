import type {
  CorrectnessStatus,
  K12EducationStage,
  K12MaterialType,
  K12Subject,
  StudentLearningMaterialAnalysis
} from "./types";
import {
  buildMainlandK12RegionCurriculumCoverage,
  type MainlandK12CurriculumVersionFamily,
  type MainlandK12RegionCoverageGroup
} from "./mainland-k12-reference";

export type EvaluationQuestionGold = {
  question_id: string;
  expected_correctness?: CorrectnessStatus;
  definitive_judgement_allowed: boolean;
  expected_knowledge_points?: string[];
  expected_mistake_types?: string[];
};

export type StudentLearningMaterialGoldCase = {
  case_id: string;
  material_classification: {
    material_type: K12MaterialType;
    subject: K12Subject;
    education_stage: K12EducationStage;
    grade_candidate: string;
    region_or_curriculum_candidate: string;
  };
  questions: EvaluationQuestionGold[];
  require_safe_parent_feedback: boolean;
  require_teacher_professional_report: boolean;
  require_monthly_snapshot: boolean;
  require_model_contract: boolean;
};

export type StudentLearningMaterialEvaluationThresholds = {
  materialClassificationAccuracy: number;
  questionCoverageRecall: number;
  highConfidenceCorrectnessAccuracy: number;
  unsupportedDefinitiveJudgementRate: number;
  teacherReviewRoutingRecall: number;
  evidenceCoverageRate: number;
  unsafeFeedbackRate: number;
  monthlySnapshotCoverage: number;
  modelContractCoverage: number;
};

export type StudentLearningMaterialEvaluationMetrics = StudentLearningMaterialEvaluationThresholds & {
  teacherProfessionalReportCoverage: number;
};

export type StudentLearningMaterialEvaluationResult = {
  ok: boolean;
  metrics: StudentLearningMaterialEvaluationMetrics;
  failedThresholds: string[];
  notes: string[];
};

export type StudentLearningMaterialEvaluationBatchInput = {
  gold: StudentLearningMaterialGoldCase;
  analysis: StudentLearningMaterialAnalysis;
  artifact_provenance?: StudentLearningMaterialEvaluationCaseArtifactProvenance;
};

export type StudentLearningMaterialEvaluationCaseArtifactProvenance = {
  asset_manifest_case_id?: string;
  gold_label_package_path?: string;
  analysis_path?: string;
};

export type StudentLearningMaterialEvaluationCaseResult = StudentLearningMaterialEvaluationResult & {
  case_id: string;
};

export type StudentLearningMaterialEvaluationCoverage = {
  caseCount: number;
  questionCount: number;
  definitiveAllowedQuestionCount: number;
  teacherReviewExpectedQuestionCount: number;
  materialTypes: K12MaterialType[];
  subjects: K12Subject[];
  educationStages: K12EducationStage[];
  gradeCandidates: string[];
  regionsOrCurricula: string[];
  regionOrCurriculumGroups: MainlandK12RegionCoverageGroup[];
  curriculumVersionFamilies: MainlandK12CurriculumVersionFamily[];
  examScopeSignals: string[];
};

export type StudentLearningMaterialEvaluationBatchResult = {
  ok: boolean;
  metrics: StudentLearningMaterialEvaluationMetrics;
  cases: StudentLearningMaterialEvaluationCaseResult[];
  failedCaseIds: string[];
  coverage: StudentLearningMaterialEvaluationCoverage;
  notes: string[];
};

export type StudentLearningMaterialEvaluationDatasetKind = "synthetic" | "human_labeled" | "mixed";

export type StudentLearningMaterialEvaluationReviewProtocol = {
  double_labeled: boolean;
  adjudicated: boolean;
  anonymized: boolean;
  reviewer_roles: string[];
};

export type StudentLearningMaterialEvaluationAssetPreflight = {
  claimable99AssetReady: boolean;
  manifest_id?: string;
  source_manifest_id?: string;
  checked_at?: string;
  blockers?: string[];
};

export type StudentLearningMaterialEvaluationDatasetBundle = {
  fixture_schema: "student_learning_material_evaluation_dataset.v0.1";
  dataset_id: string;
  dataset_kind: StudentLearningMaterialEvaluationDatasetKind;
  description?: string;
  model_under_test?: {
    provider_name: string;
    model_name: string;
    prompt_version?: string;
  };
  review_protocol: StudentLearningMaterialEvaluationReviewProtocol;
  asset_preflight?: StudentLearningMaterialEvaluationAssetPreflight;
  cases: StudentLearningMaterialEvaluationBatchInput[];
};

export type StudentLearningMaterialEvaluationClaimPolicy = {
  minimum_case_count: number;
  minimum_question_count: number;
  minimum_definitive_allowed_question_count?: number;
  minimum_teacher_review_expected_question_count?: number;
  minimum_material_type_count?: number;
  minimum_subject_count?: number;
  required_education_stages?: K12EducationStage[];
  minimum_region_or_curriculum_count?: number;
  minimum_region_or_curriculum_group_count?: number;
  minimum_curriculum_version_family_count?: number;
  require_exam_scope_signal?: boolean;
  require_human_labeled_dataset: boolean;
  require_double_labeled: boolean;
  require_adjudicated: boolean;
  require_anonymized: boolean;
  require_asset_preflight_ready?: boolean;
  require_case_artifact_provenance?: boolean;
};

export type StudentLearningMaterialEvaluationDatasetResult = StudentLearningMaterialEvaluationBatchResult & {
  dataset_id: string;
  dataset_kind: StudentLearningMaterialEvaluationDatasetKind;
  model_under_test?: StudentLearningMaterialEvaluationDatasetBundle["model_under_test"];
  claim_policy: StudentLearningMaterialEvaluationClaimPolicy;
  claimable99Correctness: boolean;
  datasetWarnings: string[];
};

export type StudentLearningMaterialClaimPolicyRequirement = {
  key: string;
  required: string | number | boolean;
};

const forbiddenFeedbackTerms = ["严重", "很差", "完全不会", "保证提分", "不认真", "基础很差", "一定能提高", "一定提升", "孩子不行", "家长必须"];

export const strictStudentLearningMaterialThresholds: StudentLearningMaterialEvaluationThresholds = {
  materialClassificationAccuracy: 0.99,
  questionCoverageRecall: 0.99,
  highConfidenceCorrectnessAccuracy: 0.99,
  unsupportedDefinitiveJudgementRate: 0,
  teacherReviewRoutingRecall: 0.99,
  evidenceCoverageRate: 1,
  unsafeFeedbackRate: 0,
  monthlySnapshotCoverage: 1,
  modelContractCoverage: 1
};

export const strictStudentLearningMaterialClaimPolicy: StudentLearningMaterialEvaluationClaimPolicy = {
  minimum_case_count: 100,
  minimum_question_count: 500,
  minimum_definitive_allowed_question_count: 300,
  minimum_teacher_review_expected_question_count: 50,
  minimum_material_type_count: 4,
  minimum_subject_count: 5,
  required_education_stages: ["primary", "middle", "high"],
  minimum_region_or_curriculum_count: 3,
  minimum_region_or_curriculum_group_count: 4,
  minimum_curriculum_version_family_count: 2,
  require_exam_scope_signal: true,
  require_human_labeled_dataset: true,
  require_double_labeled: true,
  require_adjudicated: true,
  require_anonymized: true,
  require_asset_preflight_ready: true,
  require_case_artifact_provenance: true
};

export function evaluateStudentLearningMaterialAnalysis(
  analysis: StudentLearningMaterialAnalysis,
  gold: StudentLearningMaterialGoldCase,
  thresholds: StudentLearningMaterialEvaluationThresholds = strictStudentLearningMaterialThresholds
): StudentLearningMaterialEvaluationResult {
  const metrics = computeEvaluationMetrics(analysis, gold);
  const failedThresholds = collectFailedThresholds(metrics, thresholds);

  return {
    ok: failedThresholds.length === 0,
    metrics,
    failedThresholds,
    notes: buildEvaluationNotes(metrics)
  };
}

export function evaluateStudentLearningMaterialBatch(
  inputs: StudentLearningMaterialEvaluationBatchInput[],
  thresholds: StudentLearningMaterialEvaluationThresholds = strictStudentLearningMaterialThresholds
): StudentLearningMaterialEvaluationBatchResult {
  if (!inputs.length) {
    return {
      ok: false,
      metrics: aggregateCaseMetrics([]),
      cases: [],
      failedCaseIds: [],
      coverage: buildCoverage([]),
      notes: ["评测集为空，不能验收 99% 正确率。"]
    };
  }

  const cases = inputs.map((input) => ({
    case_id: input.gold.case_id,
    ...evaluateStudentLearningMaterialAnalysis(input.analysis, input.gold, thresholds)
  }));
  const failedCaseIds = cases.filter((item) => !item.ok).map((item) => item.case_id);

  return {
    ok: failedCaseIds.length === 0,
    metrics: aggregateCaseMetrics(cases.map((item) => item.metrics)),
    cases,
    failedCaseIds,
    coverage: buildCoverage(inputs.map((item) => item.gold)),
    notes: Array.from(new Set(cases.flatMap((item) => item.notes)))
  };
}

export function validateStudentLearningMaterialEvaluationDatasetBundle(value: unknown) {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["dataset bundle must be an object"] };
  }

  if (value.fixture_schema !== "student_learning_material_evaluation_dataset.v0.1") {
    errors.push("fixture_schema must be student_learning_material_evaluation_dataset.v0.1");
  }
  if (typeof value.dataset_id !== "string" || !value.dataset_id.trim()) {
    errors.push("dataset_id is required");
  }
  if (!["synthetic", "human_labeled", "mixed"].includes(String(value.dataset_kind))) {
    errors.push("dataset_kind must be synthetic, human_labeled, or mixed");
  }
  if (!isRecord(value.review_protocol)) {
    errors.push("review_protocol is required");
  }
  if (value.asset_preflight !== undefined) {
    if (!isRecord(value.asset_preflight)) {
      errors.push("asset_preflight must be an object when present");
    } else {
      if (typeof value.asset_preflight.claimable99AssetReady !== "boolean") {
        errors.push("asset_preflight.claimable99AssetReady must be boolean");
      }
      if (value.asset_preflight.manifest_id !== undefined && typeof value.asset_preflight.manifest_id !== "string") {
        errors.push("asset_preflight.manifest_id must be a string when present");
      }
      if (value.asset_preflight.source_manifest_id !== undefined && typeof value.asset_preflight.source_manifest_id !== "string") {
        errors.push("asset_preflight.source_manifest_id must be a string when present");
      }
      if (value.asset_preflight.checked_at !== undefined && typeof value.asset_preflight.checked_at !== "string") {
        errors.push("asset_preflight.checked_at must be a string when present");
      }
      if (value.asset_preflight.blockers !== undefined && !Array.isArray(value.asset_preflight.blockers)) {
        errors.push("asset_preflight.blockers must be an array when present");
      } else if (Array.isArray(value.asset_preflight.blockers) && value.asset_preflight.blockers.some((blocker) => typeof blocker !== "string")) {
        errors.push("asset_preflight.blockers must contain strings");
      }
    }
  }
  if (!Array.isArray(value.cases)) {
    errors.push("cases must be an array");
  } else {
    const caseIds = value.cases.map((item) => (isRecord(item) && isRecord(item.gold) ? item.gold.case_id : undefined));
    const duplicateCaseIds = findDuplicates(caseIds.filter((caseId): caseId is string => typeof caseId === "string"));
    if (duplicateCaseIds.length) {
      errors.push(`duplicate gold case_id: ${duplicateCaseIds.join(", ")}`);
    }
    value.cases.forEach((item, index) => {
      if (!isRecord(item) || !isRecord(item.gold) || !isRecord(item.analysis)) {
        errors.push(`cases[${index}] must include gold and analysis objects`);
      } else if (typeof item.gold.case_id !== "string" || !item.gold.case_id.trim()) {
        errors.push(`cases[${index}].gold.case_id is required`);
      }
      if (isRecord(item) && item.artifact_provenance !== undefined) {
        if (!isRecord(item.artifact_provenance)) {
          errors.push(`cases[${index}].artifact_provenance must be an object when present`);
        } else {
          for (const field of ["asset_manifest_case_id", "gold_label_package_path", "analysis_path"]) {
            if (item.artifact_provenance[field] !== undefined && typeof item.artifact_provenance[field] !== "string") {
              errors.push(`cases[${index}].artifact_provenance.${field} must be a string when present`);
            }
          }
        }
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

export function evaluateStudentLearningMaterialDatasetBundle(
  bundle: StudentLearningMaterialEvaluationDatasetBundle,
  thresholds: StudentLearningMaterialEvaluationThresholds = strictStudentLearningMaterialThresholds,
  claimPolicy: StudentLearningMaterialEvaluationClaimPolicy = strictStudentLearningMaterialClaimPolicy
): StudentLearningMaterialEvaluationDatasetResult {
  const batch = evaluateStudentLearningMaterialBatch(bundle.cases, thresholds);
  const datasetWarnings = buildDatasetWarnings(bundle, batch, claimPolicy);

  return {
    ...batch,
    dataset_id: bundle.dataset_id,
    dataset_kind: bundle.dataset_kind,
    model_under_test: bundle.model_under_test,
    claim_policy: claimPolicy,
    claimable99Correctness: batch.ok && datasetWarnings.length === 0,
    datasetWarnings
  };
}

export function formatStudentLearningMaterialEvaluationBatchReport(result: StudentLearningMaterialEvaluationBatchResult) {
  const status = result.ok ? "PASS" : "FAIL";
  return [
    `StudentLearningMaterialAnalysis evaluation: ${status}`,
    `cases=${result.coverage.caseCount}, questions=${result.coverage.questionCount}, definitiveAllowed=${result.coverage.definitiveAllowedQuestionCount}, teacherReviewExpected=${result.coverage.teacherReviewExpectedQuestionCount}`,
    `coverage.materialTypes=${result.coverage.materialTypes.join(", ") || "none"}`,
    `coverage.subjects=${result.coverage.subjects.join(", ") || "none"}`,
    `coverage.educationStages=${result.coverage.educationStages.join(", ") || "none"}`,
    `coverage.gradeCandidates=${result.coverage.gradeCandidates.join(", ") || "none"}`,
    `coverage.regionsOrCurricula=${result.coverage.regionsOrCurricula.join(", ") || "none"}`,
    `coverage.regionOrCurriculumGroups=${result.coverage.regionOrCurriculumGroups.join(", ") || "none"}`,
    `coverage.curriculumVersionFamilies=${result.coverage.curriculumVersionFamilies.join(", ") || "none"}`,
    `coverage.examScopeSignals=${result.coverage.examScopeSignals.join(", ") || "none"}`,
    `metrics.materialClassificationAccuracy=${formatMetric(result.metrics.materialClassificationAccuracy)}`,
    `metrics.highConfidenceCorrectnessAccuracy=${formatMetric(result.metrics.highConfidenceCorrectnessAccuracy)}`,
    `metrics.unsupportedDefinitiveJudgementRate=${formatMetric(result.metrics.unsupportedDefinitiveJudgementRate)}`,
    `metrics.teacherReviewRoutingRecall=${formatMetric(result.metrics.teacherReviewRoutingRecall)}`,
    `metrics.evidenceCoverageRate=${formatMetric(result.metrics.evidenceCoverageRate)}`,
    `metrics.unsafeFeedbackRate=${formatMetric(result.metrics.unsafeFeedbackRate)}`,
    `metrics.monthlySnapshotCoverage=${formatMetric(result.metrics.monthlySnapshotCoverage)}`,
    `metrics.modelContractCoverage=${formatMetric(result.metrics.modelContractCoverage)}`,
    `failedCases=${result.failedCaseIds.join(", ") || "none"}`,
    `notes=${result.notes.join("；") || "none"}`
  ].join("\n");
}

export function formatStudentLearningMaterialEvaluationDatasetReport(result: StudentLearningMaterialEvaluationDatasetResult) {
  return [
    formatStudentLearningMaterialEvaluationBatchReport(result),
    `dataset.id=${result.dataset_id}`,
    `dataset.kind=${result.dataset_kind}`,
    result.model_under_test ? `dataset.model=${result.model_under_test.provider_name}/${result.model_under_test.model_name}` : "dataset.model=unknown",
    `claimPolicy.requirements=${formatStudentLearningMaterialClaimPolicyRequirements(result.claim_policy)}`,
    `claimable99Correctness=${result.claimable99Correctness ? "yes" : "no"}`,
    `datasetWarnings=${result.datasetWarnings.join("；") || "none"}`
  ].join("\n");
}

export function listStudentLearningMaterialClaimPolicyRequirements(
  policy: StudentLearningMaterialEvaluationClaimPolicy = strictStudentLearningMaterialClaimPolicy
): StudentLearningMaterialClaimPolicyRequirement[] {
  return [
    { key: "minimumCases", required: policy.minimum_case_count },
    { key: "minimumQuestions", required: policy.minimum_question_count },
    optionalPolicyRequirement("minimumDefinitiveAllowedQuestions", policy.minimum_definitive_allowed_question_count),
    optionalPolicyRequirement("minimumTeacherReviewExpectedQuestions", policy.minimum_teacher_review_expected_question_count),
    optionalPolicyRequirement("minimumMaterialTypes", policy.minimum_material_type_count),
    optionalPolicyRequirement("minimumSubjects", policy.minimum_subject_count),
    optionalPolicyRequirement("requiredEducationStages", policy.required_education_stages?.join("/")),
    optionalPolicyRequirement("minimumRegionsOrCurricula", policy.minimum_region_or_curriculum_count),
    optionalPolicyRequirement("minimumRegionOrCurriculumGroups", policy.minimum_region_or_curriculum_group_count),
    optionalPolicyRequirement("minimumCurriculumVersionFamilies", policy.minimum_curriculum_version_family_count),
    optionalPolicyRequirement("requireExamScopeSignal", policy.require_exam_scope_signal),
    { key: "requireHumanLabeledDataset", required: policy.require_human_labeled_dataset },
    { key: "requireDoubleLabeled", required: policy.require_double_labeled },
    { key: "requireAdjudicated", required: policy.require_adjudicated },
    { key: "requireAnonymized", required: policy.require_anonymized },
    { key: "requireAssetPreflightReady", required: policy.require_asset_preflight_ready !== false },
    { key: "requireCaseArtifactProvenance", required: policy.require_case_artifact_provenance !== false }
  ].filter((item): item is StudentLearningMaterialClaimPolicyRequirement => Boolean(item));
}

export function formatStudentLearningMaterialClaimPolicyRequirements(
  policy: StudentLearningMaterialEvaluationClaimPolicy = strictStudentLearningMaterialClaimPolicy
) {
  return listStudentLearningMaterialClaimPolicyRequirements(policy)
    .map((item) => `${item.key}:${item.required}`)
    .join(", ");
}

function computeEvaluationMetrics(
  analysis: StudentLearningMaterialAnalysis,
  gold: StudentLearningMaterialGoldCase
): StudentLearningMaterialEvaluationMetrics {
  const questionById = new Map(analysis.question_analyses.map((question) => [question.question_id, question]));
  const coveredGoldQuestions = gold.questions.filter((question) => questionById.has(question.question_id));
  const definitiveAllowedGold = gold.questions.filter((question) => question.definitive_judgement_allowed && question.expected_correctness);
  const unsupportedGold = gold.questions.filter((question) => !question.definitive_judgement_allowed);
  const highConfidenceGold = definitiveAllowedGold.filter((question) => {
    const actual = questionById.get(question.question_id);
    return actual && actual.correctnessJudgement.confidence >= 0.65 && isDefinitiveJudgement(actual.correctnessJudgement.status);
  });
  const correctHighConfidence = highConfidenceGold.filter((question) => {
    const actual = questionById.get(question.question_id);
    return actual?.correctnessJudgement.status === question.expected_correctness;
  });
  const unsupportedHardJudgements = unsupportedGold.filter((question) => {
    const actual = questionById.get(question.question_id);
    return actual ? isDefinitiveJudgement(actual.correctnessJudgement.status) : false;
  });
  const teacherReviewRouted = unsupportedGold.filter((question) => {
    const actual = questionById.get(question.question_id);
    return actual ? actual.correctnessJudgement.status === "needs_teacher_review" || actual.correctnessJudgement.status === "unknown" : false;
  });
  const evidenceChecks = collectEvidenceChecks(analysis);

  return {
    materialClassificationAccuracy: ratio(countClassificationMatches(analysis, gold), 5),
    questionCoverageRecall: ratio(coveredGoldQuestions.length, gold.questions.length),
    highConfidenceCorrectnessAccuracy: highConfidenceGold.length ? ratio(correctHighConfidence.length, highConfidenceGold.length) : 1,
    unsupportedDefinitiveJudgementRate: unsupportedGold.length ? ratio(unsupportedHardJudgements.length, unsupportedGold.length) : 0,
    teacherReviewRoutingRecall: unsupportedGold.length ? ratio(teacherReviewRouted.length, unsupportedGold.length) : 1,
    evidenceCoverageRate: ratio(evidenceChecks.filter(Boolean).length, evidenceChecks.length),
    unsafeFeedbackRate: hasUnsafeFeedback(analysis) ? 1 : 0,
    monthlySnapshotCoverage: gold.require_monthly_snapshot && hasMonthlySnapshotContract(analysis) ? 1 : gold.require_monthly_snapshot ? 0 : 1,
    modelContractCoverage: gold.require_model_contract && hasModelContract(analysis) ? 1 : gold.require_model_contract ? 0 : 1,
    teacherProfessionalReportCoverage: gold.require_teacher_professional_report && hasTeacherProfessionalReport(analysis) ? 1 : gold.require_teacher_professional_report ? 0 : 1
  };
}

function collectFailedThresholds(
  metrics: StudentLearningMaterialEvaluationMetrics,
  thresholds: StudentLearningMaterialEvaluationThresholds
) {
  const failed: string[] = [];
  const minimumMetricKeys: Array<keyof StudentLearningMaterialEvaluationThresholds> = [
    "materialClassificationAccuracy",
    "questionCoverageRecall",
    "highConfidenceCorrectnessAccuracy",
    "teacherReviewRoutingRecall",
    "evidenceCoverageRate",
    "monthlySnapshotCoverage",
    "modelContractCoverage"
  ];

  for (const key of minimumMetricKeys) {
    if (metrics[key] < thresholds[key]) failed.push(`${key} ${metrics[key]} < ${thresholds[key]}`);
  }

  if (metrics.unsupportedDefinitiveJudgementRate > thresholds.unsupportedDefinitiveJudgementRate) {
    failed.push(`unsupportedDefinitiveJudgementRate ${metrics.unsupportedDefinitiveJudgementRate} > ${thresholds.unsupportedDefinitiveJudgementRate}`);
  }
  if (metrics.unsafeFeedbackRate > thresholds.unsafeFeedbackRate) {
    failed.push(`unsafeFeedbackRate ${metrics.unsafeFeedbackRate} > ${thresholds.unsafeFeedbackRate}`);
  }
  if (metrics.teacherProfessionalReportCoverage < 1) {
    failed.push("teacherProfessionalReportCoverage missing");
  }

  return failed;
}

function buildEvaluationNotes(metrics: StudentLearningMaterialEvaluationMetrics) {
  const notes: string[] = [];
  if (metrics.materialClassificationAccuracy < 0.99) notes.push("材料类型、科目、学段、年级或地区/教材分类未达到 99% 目标。");
  if (metrics.highConfidenceCorrectnessAccuracy < 0.99) notes.push("高置信题目正误准确率未达到 99% 目标。");
  if (metrics.unsupportedDefinitiveJudgementRate > 0) notes.push("存在证据不足但仍硬判正误的题目。");
  if (metrics.teacherReviewRoutingRecall < 0.99) notes.push("证据不足题目未充分路由到老师确认。");
  if (metrics.unsafeFeedbackRate > 0) notes.push("家长反馈包含禁用或高风险表达。");
  return notes;
}

function aggregateCaseMetrics(metrics: StudentLearningMaterialEvaluationMetrics[]): StudentLearningMaterialEvaluationMetrics {
  if (!metrics.length) {
    return {
      materialClassificationAccuracy: 0,
      questionCoverageRecall: 0,
      highConfidenceCorrectnessAccuracy: 0,
      unsupportedDefinitiveJudgementRate: 1,
      teacherReviewRoutingRecall: 0,
      evidenceCoverageRate: 0,
      unsafeFeedbackRate: 1,
      monthlySnapshotCoverage: 0,
      modelContractCoverage: 0,
      teacherProfessionalReportCoverage: 0
    };
  }

  return {
    materialClassificationAccuracy: minMetric(metrics, "materialClassificationAccuracy"),
    questionCoverageRecall: minMetric(metrics, "questionCoverageRecall"),
    highConfidenceCorrectnessAccuracy: minMetric(metrics, "highConfidenceCorrectnessAccuracy"),
    unsupportedDefinitiveJudgementRate: maxMetric(metrics, "unsupportedDefinitiveJudgementRate"),
    teacherReviewRoutingRecall: minMetric(metrics, "teacherReviewRoutingRecall"),
    evidenceCoverageRate: minMetric(metrics, "evidenceCoverageRate"),
    unsafeFeedbackRate: maxMetric(metrics, "unsafeFeedbackRate"),
    monthlySnapshotCoverage: minMetric(metrics, "monthlySnapshotCoverage"),
    modelContractCoverage: minMetric(metrics, "modelContractCoverage"),
    teacherProfessionalReportCoverage: minMetric(metrics, "teacherProfessionalReportCoverage")
  };
}

function buildCoverage(goldCases: StudentLearningMaterialGoldCase[]): StudentLearningMaterialEvaluationCoverage {
  const questions = goldCases.flatMap((gold) => gold.questions);
  const regionsOrCurricula = uniqueSorted(goldCases.map((gold) => gold.material_classification.region_or_curriculum_candidate));
  const regionCurriculumCoverage = buildMainlandK12RegionCurriculumCoverage(regionsOrCurricula);
  return {
    caseCount: goldCases.length,
    questionCount: questions.length,
    definitiveAllowedQuestionCount: questions.filter((question) => question.definitive_judgement_allowed).length,
    teacherReviewExpectedQuestionCount: questions.filter((question) => !question.definitive_judgement_allowed).length,
    materialTypes: uniqueSorted(goldCases.map((gold) => gold.material_classification.material_type)),
    subjects: uniqueSorted(goldCases.map((gold) => gold.material_classification.subject)),
    educationStages: uniqueSorted(goldCases.map((gold) => gold.material_classification.education_stage)),
    gradeCandidates: uniqueSorted(goldCases.map((gold) => gold.material_classification.grade_candidate)),
    regionsOrCurricula,
    regionOrCurriculumGroups: regionCurriculumCoverage.region_groups,
    curriculumVersionFamilies: regionCurriculumCoverage.curriculum_version_families,
    examScopeSignals: regionCurriculumCoverage.exam_scope_signals
  };
}

function buildDatasetWarnings(
  bundle: StudentLearningMaterialEvaluationDatasetBundle,
  batch: StudentLearningMaterialEvaluationBatchResult,
  claimPolicy: StudentLearningMaterialEvaluationClaimPolicy
) {
  const warnings: string[] = [];
  if (claimPolicy.require_human_labeled_dataset && bundle.dataset_kind !== "human_labeled") {
    warnings.push("非人工标注评测集只能用于冒烟测试，不能对外宣称 99% 正确率。");
  }
  if (batch.coverage.caseCount < claimPolicy.minimum_case_count) {
    warnings.push(`人工验收样本数不足：cases ${batch.coverage.caseCount} < ${claimPolicy.minimum_case_count}。`);
  }
  if (batch.coverage.questionCount < claimPolicy.minimum_question_count) {
    warnings.push(`人工验收题目数不足：questions ${batch.coverage.questionCount} < ${claimPolicy.minimum_question_count}。`);
  }
  if (
    typeof claimPolicy.minimum_definitive_allowed_question_count === "number" &&
    batch.coverage.definitiveAllowedQuestionCount < claimPolicy.minimum_definitive_allowed_question_count
  ) {
    warnings.push(
      `可硬判题目覆盖不足：definitiveAllowed ${batch.coverage.definitiveAllowedQuestionCount} < ${claimPolicy.minimum_definitive_allowed_question_count}。`
    );
  }
  if (
    typeof claimPolicy.minimum_teacher_review_expected_question_count === "number" &&
    batch.coverage.teacherReviewExpectedQuestionCount < claimPolicy.minimum_teacher_review_expected_question_count
  ) {
    warnings.push(
      `需复核题目覆盖不足：teacherReviewExpected ${batch.coverage.teacherReviewExpectedQuestionCount} < ${claimPolicy.minimum_teacher_review_expected_question_count}。`
    );
  }
  if (typeof claimPolicy.minimum_material_type_count === "number" && batch.coverage.materialTypes.length < claimPolicy.minimum_material_type_count) {
    warnings.push(`材料类型覆盖不足：materialTypes ${batch.coverage.materialTypes.length} < ${claimPolicy.minimum_material_type_count}。`);
  }
  if (typeof claimPolicy.minimum_subject_count === "number" && batch.coverage.subjects.length < claimPolicy.minimum_subject_count) {
    warnings.push(`学科覆盖不足：subjects ${batch.coverage.subjects.length} < ${claimPolicy.minimum_subject_count}。`);
  }
  const requiredEducationStages = claimPolicy.required_education_stages ?? [];
  const missingEducationStages = requiredEducationStages.filter((stage) => !batch.coverage.educationStages.includes(stage));
  if (missingEducationStages.length) {
    warnings.push(`学段覆盖不足：缺少 ${missingEducationStages.join(", ")}。`);
  }
  if (
    typeof claimPolicy.minimum_region_or_curriculum_count === "number" &&
    batch.coverage.regionsOrCurricula.length < claimPolicy.minimum_region_or_curriculum_count
  ) {
    warnings.push(`地区/教材线索覆盖不足：regionsOrCurricula ${batch.coverage.regionsOrCurricula.length} < ${claimPolicy.minimum_region_or_curriculum_count}。`);
  }
  if (
    typeof claimPolicy.minimum_region_or_curriculum_group_count === "number" &&
    batch.coverage.regionOrCurriculumGroups.length < claimPolicy.minimum_region_or_curriculum_group_count
  ) {
    warnings.push(
      `大陆区域覆盖不足：regionOrCurriculumGroups ${batch.coverage.regionOrCurriculumGroups.length} < ${claimPolicy.minimum_region_or_curriculum_group_count}。`
    );
  }
  if (
    typeof claimPolicy.minimum_curriculum_version_family_count === "number" &&
    batch.coverage.curriculumVersionFamilies.length < claimPolicy.minimum_curriculum_version_family_count
  ) {
    warnings.push(
      `教材版本族覆盖不足：curriculumVersionFamilies ${batch.coverage.curriculumVersionFamilies.length} < ${claimPolicy.minimum_curriculum_version_family_count}。`
    );
  }
  if (claimPolicy.require_exam_scope_signal && batch.coverage.examScopeSignals.length === 0) {
    warnings.push("全国卷/新高考等考试范围线索覆盖不足。");
  }
  if (claimPolicy.require_double_labeled && !bundle.review_protocol.double_labeled) {
    warnings.push("人工标注集需要双人标注。");
  }
  if (claimPolicy.require_adjudicated && !bundle.review_protocol.adjudicated) {
    warnings.push("人工标注分歧需要仲裁。");
  }
  if (claimPolicy.require_anonymized && !bundle.review_protocol.anonymized) {
    warnings.push("评测样本需要完成学生隐私脱敏。");
  }
  if (claimPolicy.require_asset_preflight_ready !== false) {
    if (!bundle.asset_preflight) {
      warnings.push("99% 数据集需要先通过 validate:k12-eval-assets，并在 dataset 中记录 asset_preflight。");
    } else if (!bundle.asset_preflight.claimable99AssetReady) {
      const blockerText = bundle.asset_preflight.blockers?.length ? `：${bundle.asset_preflight.blockers.join("；")}` : "。";
      warnings.push(`评测资产预检未达到 claimable99AssetReady${blockerText}`);
    } else {
      if (!bundle.asset_preflight.manifest_id) {
        warnings.push("99% 数据集的 asset_preflight.manifest_id 必须记录对应资产清单 ID。");
      } else if (bundle.asset_preflight.manifest_id !== bundle.dataset_id) {
        warnings.push(`99% 数据集的 asset_preflight.manifest_id 必须匹配 dataset_id：${bundle.asset_preflight.manifest_id} != ${bundle.dataset_id}。`);
      }
      if (!bundle.asset_preflight.checked_at) {
        warnings.push("99% 数据集的 asset_preflight.checked_at 必须记录 validate:k12-eval-assets 检查时间。");
      }
      if ((bundle.asset_preflight.blockers || []).length > 0) {
        warnings.push("asset_preflight.claimable99AssetReady=true 时 blockers 必须为空。");
      }
      if (claimPolicy.require_case_artifact_provenance !== false) {
        const missingArtifactProvenanceCaseIds = bundle.cases
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => !hasClaimableCaseArtifactProvenance(item.artifact_provenance))
          .map(({ item, index }) => item.gold.case_id || `cases[${index}]`);
        if (missingArtifactProvenanceCaseIds.length) {
          warnings.push(
            `99% 数据集 case 必须保留 asset manifest case provenance 和可回放 gold/analysis 路径：${missingArtifactProvenanceCaseIds.join(", ")}。`
          );
        }
      }
    }
  }
  return warnings;
}

function hasClaimableCaseArtifactProvenance(provenance: StudentLearningMaterialEvaluationCaseArtifactProvenance | undefined) {
  return Boolean(provenance?.asset_manifest_case_id?.trim() && provenance.gold_label_package_path?.trim() && provenance.analysis_path?.trim());
}

function minMetric(metrics: StudentLearningMaterialEvaluationMetrics[], key: keyof StudentLearningMaterialEvaluationMetrics) {
  return Math.min(...metrics.map((metric) => metric[key]));
}

function maxMetric(metrics: StudentLearningMaterialEvaluationMetrics[], key: keyof StudentLearningMaterialEvaluationMetrics) {
  return Math.max(...metrics.map((metric) => metric[key]));
}

function uniqueSorted<T extends string>(items: T[]) {
  return Array.from(new Set(items)).sort();
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

function optionalPolicyRequirement(
  key: string,
  required: string | number | boolean | undefined
): StudentLearningMaterialClaimPolicyRequirement | undefined {
  if (required === undefined || required === "") return undefined;
  return { key, required };
}

function countClassificationMatches(analysis: StudentLearningMaterialAnalysis, gold: StudentLearningMaterialGoldCase) {
  let matches = 0;
  if (analysis.material_classification.material_type === gold.material_classification.material_type) matches += 1;
  if (analysis.material_classification.subject === gold.material_classification.subject) matches += 1;
  if (analysis.material_classification.education_stage === gold.material_classification.education_stage) matches += 1;
  if (analysis.material_classification.grade_candidate === gold.material_classification.grade_candidate) matches += 1;
  if (analysis.material_classification.region_or_curriculum_candidate === gold.material_classification.region_or_curriculum_candidate) matches += 1;
  return matches;
}

function collectEvidenceChecks(analysis: StudentLearningMaterialAnalysis) {
  return [
    hasEvidenceRefs(analysis.material_classification),
    ...analysis.gates.map(hasEvidenceRefs),
    ...analysis.question_analyses.flatMap((question) => [
      hasEvidenceRefs(question),
      hasEvidenceRefs(question.correctnessJudgement),
      ...question.knowledgeMapping.map(hasEvidenceRefs),
      ...question.mistakeDiagnosis.map(hasEvidenceRefs),
      ...question.nextActions.map(hasEvidenceRefs)
    ]),
    ...analysis.student_profile_update_suggestions.map(hasEvidenceRefs),
    ...analysis.next_learning_actions.map(hasEvidenceRefs),
    hasEvidenceRefs(analysis.teacher_professional_report),
    ...analysis.wechat_parent_feedback_draft.sentences.map(hasEvidenceRefs),
    hasEvidenceRefs(analysis.monthly_report_snapshot),
    hasEvidenceRefs(analysis.monthly_comparison_seed)
  ];
}

function hasTeacherProfessionalReport(analysis: StudentLearningMaterialAnalysis) {
  return analysis.teacher_professional_report.assessment_style === "professional_evaluation" && hasEvidenceRefs(analysis.teacher_professional_report);
}

function hasMonthlySnapshotContract(analysis: StudentLearningMaterialAnalysis) {
  return Boolean(
    analysis.monthly_report_snapshot.source_analysis_id &&
      analysis.monthly_report_snapshot.teacher_confirmed === false &&
      analysis.monthly_report_snapshot.question_count >= analysis.monthly_report_snapshot.analyzable_question_count &&
      hasEvidenceRefs(analysis.monthly_report_snapshot) &&
      analysis.monthly_comparison_seed.current_month_snapshot &&
      hasEvidenceRefs(analysis.monthly_comparison_seed)
  );
}

function hasModelContract(analysis: StudentLearningMaterialAnalysis) {
  return (
    analysis.model_contract.input_schema === "VisionEvidencePacket" &&
    analysis.model_contract.output_schema === "StudentLearningMaterialAnalysis" &&
    analysis.model_contract.vision_provider_replaceable === true &&
    analysis.model_contract.reasoning_model_replaceable === true
  );
}

function hasUnsafeFeedback(analysis: StudentLearningMaterialAnalysis) {
  const feedbackText = [analysis.wechat_parent_feedback_draft.text, ...analysis.wechat_parent_feedback_draft.sentences.map((sentence) => sentence.text)].join("\n");
  return forbiddenFeedbackTerms.some((term) => feedbackText.includes(term)) || analysis.wechat_parent_feedback_draft.status === "blocked";
}

function hasEvidenceRefs(value: { evidenceRefs?: string[] }) {
  return Array.isArray(value.evidenceRefs) && value.evidenceRefs.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function isDefinitiveJudgement(status: CorrectnessStatus) {
  return status === "correct" || status === "partially_correct" || status === "incorrect";
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) return 1;
  return numerator / denominator;
}
