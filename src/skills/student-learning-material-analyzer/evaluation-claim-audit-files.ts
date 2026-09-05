import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  evaluateStudentLearningMaterialDatasetBundle,
  formatStudentLearningMaterialClaimPolicyRequirements,
  strictStudentLearningMaterialClaimPolicy,
  type StudentLearningMaterialEvaluationClaimPolicy,
  type StudentLearningMaterialEvaluationCoverage,
  type StudentLearningMaterialEvaluationDatasetResult
} from "./evaluation";
import { loadStudentLearningMaterialEvaluationDatasetBundleFromFile } from "./evaluation-files";
import type { MainlandK12CurriculumVersionFamily, MainlandK12RegionCoverageGroup } from "./mainland-k12-reference";
import type { K12EducationStage, K12MaterialType, K12Subject } from "./types";

export type StudentLearningMaterialEvaluationClaimAuditGap = {
  gap_id: string;
  severity: "blocker";
  current: number | string | boolean;
  required: number | string | boolean;
  message: string;
  next_sample_target?: StudentLearningMaterialEvaluationClaimAuditSampleTarget;
};

export type StudentLearningMaterialEvaluationClaimAuditSampleTarget = {
  target_id: string;
  reason: string;
  suggested_case_attributes: {
    material_type?: K12MaterialType;
    subject?: K12Subject;
    education_stage?: K12EducationStage;
    region_or_curriculum_candidate?: string;
    question_mix?: "definitive_allowed" | "teacher_review_expected" | "mixed";
    artifact_focus?:
      | "external_provider_input"
      | "ocr_vision_provider_trial"
      | "provider_candidate_trace"
      | "provider_role_coverage"
      | "question_segmentation_review"
      | "human_gold_package"
      | "annotation_task"
      | "annotation_import"
      | "gold_label_review_report"
      | "analysis_artifact"
      | "user_result_artifact"
      | "monthly_report_input"
      | "monthly_report"
      | "monthly_comparison_evidence"
      | "delivery_bundle"
      | "teacher_review_packet"
      | "replace_mock_vision_source"
      | "replace_public_benchmark_source"
      | "asset_preflight"
      | "case_artifact_provenance";
  };
};

export type StudentLearningMaterialEvaluationClaimAudit = {
  schema_version: "student_learning_material_evaluation_claim_audit.v0.1";
  dataset_path: string;
  dataset_id?: string;
  dataset_kind?: string;
  evaluation_ok: boolean;
  claimable99Correctness: boolean;
  coverage?: StudentLearningMaterialEvaluationCoverage;
  claim_policy: StudentLearningMaterialEvaluationClaimPolicy;
  asset_preflight?: {
    claimable99AssetReady: boolean;
    blockers: string[];
  };
  gaps: StudentLearningMaterialEvaluationClaimAuditGap[];
  next_sample_targets: StudentLearningMaterialEvaluationClaimAuditSampleTarget[];
  dataset_warnings: string[];
  load_errors: string[];
  report: string;
};

export type AuditStudentLearningMaterialEvaluationClaimInput = {
  datasetPath: string;
  outputPath?: string;
  claimPolicy?: StudentLearningMaterialEvaluationClaimPolicy;
};

const preferredMaterialTypes: K12MaterialType[] = [
  "exam",
  "homework",
  "wrong_question",
  "wrong_question_book",
  "unit_quiz",
  "weekly_test",
  "monthly_test",
  "student_notes",
  "practice_record"
];

const preferredSubjects: K12Subject[] = ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "道德与法治", "科学"];
const preferredRegionsOrCurricula = [
  "全国卷",
  "新高考",
  "北京",
  "上海",
  "广东",
  "江苏",
  "浙江",
  "山东",
  "四川",
  "河南",
  "湖北",
  "湖南",
  "河北",
  "辽宁",
  "陕西",
  "新疆",
  "统编版",
  "人教版",
  "北师大版",
  "外研版",
  "苏教版",
  "沪教版",
  "浙教版",
  "鲁教版",
  "粤教版"
];
const preferredRegionGroupTargets: Array<{ group: MainlandK12RegionCoverageGroup; candidate: string }> = [
  { group: "华北", candidate: "北京" },
  { group: "华东", candidate: "江苏" },
  { group: "华南", candidate: "广东" },
  { group: "华中", candidate: "湖北" },
  { group: "西南", candidate: "四川" },
  { group: "西北", candidate: "陕西" },
  { group: "东北", candidate: "辽宁" }
];
const preferredCurriculumFamilyTargets: Array<{ family: MainlandK12CurriculumVersionFamily; candidate: string }> = [
  { family: "国家统编/部编", candidate: "统编版" },
  { family: "人教系", candidate: "人教版" },
  { family: "师大系", candidate: "北师大版" },
  { family: "地方教材系", candidate: "苏教版" },
  { family: "外语教材系", candidate: "外研版" },
  { family: "教科/综合系", candidate: "教科版" }
];

export async function auditStudentLearningMaterialEvaluationClaimFromFile(
  input: AuditStudentLearningMaterialEvaluationClaimInput
): Promise<StudentLearningMaterialEvaluationClaimAudit> {
  const datasetPath = path.resolve(input.datasetPath);
  const claimPolicy = input.claimPolicy || strictStudentLearningMaterialClaimPolicy;
  const loaded = loadStudentLearningMaterialEvaluationDatasetBundleFromFile(datasetPath);
  if (!loaded.ok) {
    const audit = buildLoadErrorAudit(datasetPath, claimPolicy, loaded.errors);
    if (input.outputPath) await writeJsonFile(path.resolve(input.outputPath), audit);
    return audit;
  }

  const result = evaluateStudentLearningMaterialDatasetBundle(loaded.bundle, undefined, claimPolicy);
  const gaps = buildClaimAuditGaps(result, claimPolicy);
  const nextSampleTargets = dedupeTargets([
    ...buildNextSampleTargets(result.coverage, claimPolicy),
    ...gaps.map((gap) => gap.next_sample_target).filter((target): target is StudentLearningMaterialEvaluationClaimAuditSampleTarget => Boolean(target))
  ]);
  const auditWithoutReport: Omit<StudentLearningMaterialEvaluationClaimAudit, "report"> = {
    schema_version: "student_learning_material_evaluation_claim_audit.v0.1",
    dataset_path: datasetPath,
    dataset_id: result.dataset_id,
    dataset_kind: result.dataset_kind,
    evaluation_ok: result.ok,
    claimable99Correctness: result.claimable99Correctness,
    coverage: result.coverage,
    claim_policy: claimPolicy,
    asset_preflight: loaded.bundle.asset_preflight
      ? {
          claimable99AssetReady: loaded.bundle.asset_preflight.claimable99AssetReady,
          blockers: loaded.bundle.asset_preflight.blockers || []
        }
      : undefined,
    gaps,
    next_sample_targets: nextSampleTargets,
    dataset_warnings: result.datasetWarnings,
    load_errors: []
  };
  const audit = {
    ...auditWithoutReport,
    report: formatStudentLearningMaterialEvaluationClaimAuditReport(auditWithoutReport)
  };
  if (input.outputPath) await writeJsonFile(path.resolve(input.outputPath), audit);
  return audit;
}

export function formatStudentLearningMaterialEvaluationClaimAuditReport(
  audit: Omit<StudentLearningMaterialEvaluationClaimAudit, "report">
) {
  return [
    "StudentLearningMaterialEvaluation 99% claim audit",
    `dataset.id=${audit.dataset_id || "unknown"}`,
    `dataset.kind=${audit.dataset_kind || "unknown"}`,
    `evaluation.ok=${audit.evaluation_ok ? "yes" : "no"}`,
    `claimable99Correctness=${audit.claimable99Correctness ? "yes" : "no"}`,
    `claimPolicy.requirements=${formatStudentLearningMaterialClaimPolicyRequirements(audit.claim_policy)}`,
    `coverage.cases=${audit.coverage?.caseCount ?? 0}/${audit.claim_policy.minimum_case_count}`,
    `coverage.questions=${audit.coverage?.questionCount ?? 0}/${audit.claim_policy.minimum_question_count}`,
    `coverage.definitiveAllowed=${audit.coverage?.definitiveAllowedQuestionCount ?? 0}/${audit.claim_policy.minimum_definitive_allowed_question_count ?? "not-required"}`,
    `coverage.teacherReviewExpected=${audit.coverage?.teacherReviewExpectedQuestionCount ?? 0}/${audit.claim_policy.minimum_teacher_review_expected_question_count ?? "not-required"}`,
    `coverage.materialTypes=${audit.coverage?.materialTypes.join(", ") || "none"}`,
    `coverage.subjects=${audit.coverage?.subjects.join(", ") || "none"}`,
    `coverage.educationStages=${audit.coverage?.educationStages.join(", ") || "none"}`,
    `coverage.regionsOrCurricula=${audit.coverage?.regionsOrCurricula.join(", ") || "none"}`,
    `coverage.regionOrCurriculumGroups=${audit.coverage?.regionOrCurriculumGroups.join(", ") || "none"}`,
    `coverage.curriculumVersionFamilies=${audit.coverage?.curriculumVersionFamilies.join(", ") || "none"}`,
    `coverage.examScopeSignals=${audit.coverage?.examScopeSignals.join(", ") || "none"}`,
    `assetPreflight.ready=${audit.asset_preflight?.claimable99AssetReady ? "yes" : "no"}`,
    `gaps=${audit.gaps.map((gap) => gap.gap_id).join(", ") || "none"}`,
    `nextSampleTargets=${audit.next_sample_targets.map((target) => target.target_id).join(", ") || "none"}`,
    `artifactFocusTargets=${formatArtifactFocusTargets(audit.next_sample_targets)}`,
    `datasetWarnings=${audit.dataset_warnings.join("；") || "none"}`,
    `loadErrors=${audit.load_errors.join("；") || "none"}`
  ].join("\n");
}

function formatArtifactFocusTargets(targets: StudentLearningMaterialEvaluationClaimAuditSampleTarget[]) {
  const entries = targets
    .filter((target) => target.suggested_case_attributes.artifact_focus)
    .map((target) => `${target.target_id}:${target.suggested_case_attributes.artifact_focus}`);
  return entries.join(", ") || "none";
}

function buildLoadErrorAudit(
  datasetPath: string,
  claimPolicy: StudentLearningMaterialEvaluationClaimPolicy,
  loadErrors: string[]
): StudentLearningMaterialEvaluationClaimAudit {
  const auditWithoutReport: Omit<StudentLearningMaterialEvaluationClaimAudit, "report"> = {
    schema_version: "student_learning_material_evaluation_claim_audit.v0.1",
    dataset_path: datasetPath,
    evaluation_ok: false,
    claimable99Correctness: false,
    claim_policy: claimPolicy,
    gaps: [
      {
        gap_id: "dataset_load_failed",
        severity: "blocker",
        current: "load_failed",
        required: "load_ok",
        message: `Dataset cannot be loaded: ${loadErrors.join("；")}`
      }
    ],
    next_sample_targets: [],
    dataset_warnings: [],
    load_errors: loadErrors
  };
  return {
    ...auditWithoutReport,
    report: formatStudentLearningMaterialEvaluationClaimAuditReport(auditWithoutReport)
  };
}

function buildClaimAuditGaps(
  result: StudentLearningMaterialEvaluationDatasetResult,
  claimPolicy: StudentLearningMaterialEvaluationClaimPolicy
): StudentLearningMaterialEvaluationClaimAuditGap[] {
  const gaps: StudentLearningMaterialEvaluationClaimAuditGap[] = [];
  if (!result.ok) {
    gaps.push({
      gap_id: "evaluation_metrics_failed",
      severity: "blocker",
      current: "failed",
      required: "pass",
      message: "Dataset metrics or at least one case failed strict evaluation thresholds."
    });
  }
  if (claimPolicy.require_human_labeled_dataset && result.dataset_kind !== "human_labeled") {
    gaps.push({
      gap_id: "dataset_kind_not_human_labeled",
      severity: "blocker",
      current: result.dataset_kind,
      required: "human_labeled",
      message: "Only human-labeled datasets can support a 99% correctness claim."
    });
  }
  pushMinimumGap(gaps, {
    gapId: "case_count_insufficient",
    current: result.coverage.caseCount,
    required: claimPolicy.minimum_case_count,
    message: "More anonymized real student-material cases are required.",
    target: buildMixedTarget("more_cases", "Collect more anonymized real K12 student-material cases.")
  });
  pushMinimumGap(gaps, {
    gapId: "question_count_insufficient",
    current: result.coverage.questionCount,
    required: claimPolicy.minimum_question_count,
    message: "More labeled questions are required.",
    target: buildMixedTarget("more_questions", "Collect materials with more labeled questions.")
  });
  pushMinimumGap(gaps, {
    gapId: "definitive_allowed_question_count_insufficient",
    current: result.coverage.definitiveAllowedQuestionCount,
    required: claimPolicy.minimum_definitive_allowed_question_count,
    message: "More questions with sufficient evidence for definitive judgement are required.",
    target: buildMixedTarget("more_definitive_allowed_questions", "Collect clear questions with same-question answer keys, rubrics, or teacher corrections.", "definitive_allowed")
  });
  pushMinimumGap(gaps, {
    gapId: "teacher_review_expected_question_count_insufficient",
    current: result.coverage.teacherReviewExpectedQuestionCount,
    required: claimPolicy.minimum_teacher_review_expected_question_count,
    message: "More insufficient-evidence or ambiguous cases are required to verify teacher-review routing.",
    target: buildMixedTarget("more_teacher_review_questions", "Collect unclear, missing-answer, low-confidence, or segmentation-risk questions.", "teacher_review_expected")
  });
  pushMinimumGap(gaps, {
    gapId: "material_type_coverage_insufficient",
    current: result.coverage.materialTypes.length,
    required: claimPolicy.minimum_material_type_count,
    message: "Material type coverage is insufficient.",
    target: nextMissingMaterialTypeTarget(result.coverage)
  });
  pushMinimumGap(gaps, {
    gapId: "subject_coverage_insufficient",
    current: result.coverage.subjects.length,
    required: claimPolicy.minimum_subject_count,
    message: "Subject coverage is insufficient.",
    target: nextMissingSubjectTarget(result.coverage)
  });
  const missingStages = (claimPolicy.required_education_stages || []).filter((stage) => !result.coverage.educationStages.includes(stage));
  missingStages.forEach((stage) => {
    gaps.push({
      gap_id: `education_stage_missing_${stage}`,
      severity: "blocker",
      current: result.coverage.educationStages.join(", ") || "none",
      required: stage,
      message: `Missing required education stage: ${stage}.`,
      next_sample_target: {
        target_id: `collect_${stage}_case`,
        reason: `Add at least one anonymized ${stage} case to cover primary/middle/high claim scope.`,
        suggested_case_attributes: {
          education_stage: stage,
          question_mix: "mixed"
        }
      }
    });
  });
  pushMinimumGap(gaps, {
    gapId: "region_or_curriculum_coverage_insufficient",
    current: result.coverage.regionsOrCurricula.length,
    required: claimPolicy.minimum_region_or_curriculum_count,
    message: "Region/curriculum coverage is insufficient.",
    target: nextMissingRegionTarget(result.coverage)
  });
  pushMinimumGap(gaps, {
    gapId: "region_or_curriculum_group_coverage_insufficient",
    current: result.coverage.regionOrCurriculumGroups.length,
    required: claimPolicy.minimum_region_or_curriculum_group_count,
    message: "Mainland regional group coverage is insufficient.",
    target: nextMissingRegionGroupTarget(result.coverage)
  });
  pushMinimumGap(gaps, {
    gapId: "curriculum_version_family_coverage_insufficient",
    current: result.coverage.curriculumVersionFamilies.length,
    required: claimPolicy.minimum_curriculum_version_family_count,
    message: "Curriculum version family coverage is insufficient.",
    target: nextMissingCurriculumFamilyTarget(result.coverage)
  });
  if (claimPolicy.require_exam_scope_signal && result.coverage.examScopeSignals.length === 0) {
    gaps.push({
      gap_id: "exam_scope_signal_missing",
      severity: "blocker",
      current: "none",
      required: "全国卷/新高考",
      message: "At least one national or new-gaokao exam-scope signal is required for mainland K12 claim coverage.",
      next_sample_target: {
        target_id: "collect_exam_scope_全国卷",
        reason: "Add an anonymized case with 全国卷、新课标卷 or 新高考 signal.",
        suggested_case_attributes: {
          region_or_curriculum_candidate: "全国卷",
          question_mix: "mixed"
        }
      }
    });
  }
  if (!result.datasetWarnings.length && result.claimable99Correctness) return gaps;
  if (result.datasetWarnings.some((warning) => warning.includes("双人标注"))) {
    gaps.push({
      gap_id: "review_protocol_not_double_labeled",
      severity: "blocker",
      current: false,
      required: true,
      message: "Gold labels must be produced by two independent labels before 99% claim."
    });
  }
  if (result.datasetWarnings.some((warning) => warning.includes("仲裁"))) {
    gaps.push({
      gap_id: "review_protocol_not_adjudicated",
      severity: "blocker",
      current: false,
      required: true,
      message: "Gold label disagreements must be adjudicated before 99% claim."
    });
  }
  if (result.datasetWarnings.some((warning) => warning.includes("脱敏"))) {
    gaps.push({
      gap_id: "review_protocol_not_anonymized",
      severity: "blocker",
      current: false,
      required: true,
      message: "Student privacy anonymization is required before 99% claim."
    });
  }
  if (
    result.datasetWarnings.some(
      (warning) => warning.includes("asset_preflight") || warning.includes("资产预检") || warning.includes("asset manifest case provenance")
    )
  ) {
    gaps.push({
      gap_id: "asset_preflight_not_claim_ready",
      severity: "blocker",
      current: false,
      required: true,
      message: "Dataset must carry claimable99AssetReady=true from validate:k12-eval-assets before 99% claim."
    });
    gaps.push(...buildAssetPreflightSpecificGaps(result.datasetWarnings));
  }
  return dedupeGaps(gaps);
}

function pushMinimumGap(
  gaps: StudentLearningMaterialEvaluationClaimAuditGap[],
  input: {
    gapId: string;
    current: number;
    required?: number;
    message: string;
    target?: StudentLearningMaterialEvaluationClaimAuditSampleTarget;
  }
) {
  if (typeof input.required !== "number" || input.current >= input.required) return;
  gaps.push({
    gap_id: input.gapId,
    severity: "blocker",
    current: input.current,
    required: input.required,
    message: input.message,
    ...(input.target ? { next_sample_target: input.target } : {})
  });
}

function buildNextSampleTargets(
  coverage: StudentLearningMaterialEvaluationCoverage,
  claimPolicy: StudentLearningMaterialEvaluationClaimPolicy
): StudentLearningMaterialEvaluationClaimAuditSampleTarget[] {
  return dedupeTargets(
    [
      coverage.caseCount < claimPolicy.minimum_case_count ? buildMixedTarget("more_cases", "Collect more anonymized real K12 student-material cases.") : undefined,
      coverage.questionCount < claimPolicy.minimum_question_count ? buildMixedTarget("more_questions", "Collect materials with more labeled questions.") : undefined,
      typeof claimPolicy.minimum_definitive_allowed_question_count === "number" &&
      coverage.definitiveAllowedQuestionCount < claimPolicy.minimum_definitive_allowed_question_count
        ? buildMixedTarget("more_definitive_allowed_questions", "Collect clear questions with same-question answer keys, rubrics, or teacher corrections.", "definitive_allowed")
        : undefined,
      typeof claimPolicy.minimum_teacher_review_expected_question_count === "number" &&
      coverage.teacherReviewExpectedQuestionCount < claimPolicy.minimum_teacher_review_expected_question_count
        ? buildMixedTarget("more_teacher_review_questions", "Collect unclear, missing-answer, low-confidence, or segmentation-risk questions.", "teacher_review_expected")
        : undefined,
      typeof claimPolicy.minimum_material_type_count === "number" && coverage.materialTypes.length < claimPolicy.minimum_material_type_count
        ? nextMissingMaterialTypeTarget(coverage)
        : undefined,
      typeof claimPolicy.minimum_subject_count === "number" && coverage.subjects.length < claimPolicy.minimum_subject_count ? nextMissingSubjectTarget(coverage) : undefined,
      ...(claimPolicy.required_education_stages || [])
        .filter((stage) => !coverage.educationStages.includes(stage))
        .map((stage) => ({
          target_id: `collect_${stage}_case`,
          reason: `Add anonymized ${stage} material coverage.`,
          suggested_case_attributes: {
            education_stage: stage,
            question_mix: "mixed" as const
          }
        })),
      typeof claimPolicy.minimum_region_or_curriculum_count === "number" &&
      coverage.regionsOrCurricula.length < claimPolicy.minimum_region_or_curriculum_count
        ? nextMissingRegionTarget(coverage)
        : undefined,
      typeof claimPolicy.minimum_region_or_curriculum_group_count === "number" &&
      coverage.regionOrCurriculumGroups.length < claimPolicy.minimum_region_or_curriculum_group_count
        ? nextMissingRegionGroupTarget(coverage)
        : undefined,
      typeof claimPolicy.minimum_curriculum_version_family_count === "number" &&
      coverage.curriculumVersionFamilies.length < claimPolicy.minimum_curriculum_version_family_count
        ? nextMissingCurriculumFamilyTarget(coverage)
        : undefined,
      claimPolicy.require_exam_scope_signal && coverage.examScopeSignals.length === 0
        ? {
            target_id: "collect_exam_scope_全国卷",
            reason: "Add anonymized national/new-gaokao exam-scope coverage.",
            suggested_case_attributes: {
              region_or_curriculum_candidate: "全国卷",
              question_mix: "mixed" as const
            }
          }
        : undefined
    ].filter((item): item is StudentLearningMaterialEvaluationClaimAuditSampleTarget => Boolean(item))
  );
}

function buildAssetPreflightSpecificGaps(datasetWarnings: string[]): StudentLearningMaterialEvaluationClaimAuditGap[] {
  const text = datasetWarnings.join("\n");
  const specs: Array<{
    gap_id: string;
    patterns: string[];
    message: string;
    target: StudentLearningMaterialEvaluationClaimAuditSampleTarget;
  }> = [
    {
      gap_id: "asset_preflight_external_provider_input_missing",
      patterns: ["外部 Provider 输入 artifact 覆盖不足", "externalVisionInput"],
      message: "External OCR/Vision provider input artifacts must be present and aligned to the VisionEvidencePacket.",
      target: buildArtifactTarget(
        "complete_external_provider_inputs",
        "Save redacted external OCR/Vision provider adapter inputs for every real case.",
        "external_provider_input"
      )
    },
    {
      gap_id: "asset_preflight_human_gold_package_missing",
      patterns: ["人工 gold package 覆盖不足", "humanGoldPackages"],
      message: "Every claimable case needs a final anonymized, double-labeled, adjudicated gold package.",
      target: buildArtifactTarget("complete_human_gold_package", "Complete final gold packages for every case.", "human_gold_package")
    },
    {
      gap_id: "asset_preflight_provider_trial_missing_or_blocked",
      patterns: ["Provider 试跑报告覆盖不足", "Provider 试跑报告仍有 blocked case", "providerTrial"],
      message: "Provider trial reports must exist and be ready before human labeling or claim evaluation.",
      target: buildArtifactTarget(
        "complete_provider_trial_reports",
        "Generate and fix Provider trial reports until no case remains blocked.",
        "ocr_vision_provider_trial"
      )
    },
    {
      gap_id: "asset_preflight_provider_candidate_trace_missing",
      patterns: ["Provider 候选评估覆盖不足", "Provider benchmark/open-source 候选覆盖不足", "providerCandidateTrace", "benchmarkCandidates"],
      message: "Provider candidate traces must record the selected provider plus fallback/benchmark candidates.",
      target: buildArtifactTarget(
        "complete_provider_candidate_trace",
        "Record selected and benchmark OCR/Layout/Vision provider candidates for every VisionEvidencePacket.",
        "provider_candidate_trace"
      )
    },
    {
      gap_id: "asset_preflight_provider_source_or_license_missing",
      patterns: ["Provider 候选来源 URL 覆盖不足", "Provider 许可/部署复核备注覆盖不足", "sourceUrls", "licenseNotes"],
      message: "Provider traces must include replayable source URLs and license/deployment review notes.",
      target: buildArtifactTarget(
        "complete_provider_source_license_review",
        "Add source URLs and license/deployment notes for selected and benchmark providers.",
        "provider_candidate_trace"
      )
    },
    {
      gap_id: "asset_preflight_provider_role_coverage_missing",
      patterns: [
        "Provider OCR/文档解析候选覆盖不足",
        "Provider layout 候选覆盖不足",
        "Provider 公式识别候选覆盖不足",
        "providerRoleCoverage",
        "documentOrOcr",
        "formula"
      ],
      message: "Provider traces must cover OCR/document parsing, layout, and formula candidates before 99% readiness.",
      target: buildArtifactTarget(
        "complete_provider_role_coverage",
        "Add OCR/document-parser, layout, and formula Provider candidates to every VisionEvidencePacket trace.",
        "provider_role_coverage"
      )
    },
    {
      gap_id: "asset_preflight_question_segmentation_review_missing",
      patterns: ["题目切分 QA artifact 覆盖不足", "segmentationReview"],
      message: "Question segmentation review artifacts are required before definitive gold judgement.",
      target: buildArtifactTarget(
        "complete_question_segmentation_review",
        "Generate question segmentation QA artifacts and fix unstable boundaries or missing crop refs.",
        "question_segmentation_review"
      )
    },
    {
      gap_id: "asset_preflight_annotation_task_missing",
      patterns: ["脱敏标注任务包覆盖不足", "annotationTask"],
      message: "Redacted annotation task packages are required before accepting human gold labels.",
      target: buildArtifactTarget("complete_annotation_tasks", "Generate redacted Label Studio/CVAT/manual annotation tasks.", "annotation_task")
    },
    {
      gap_id: "asset_preflight_annotation_import_missing_or_mismatched",
      patterns: ["人工标注导入 artifact 覆盖不足", "annotationImport"],
      message: "Normalized annotation imports must exist and reproduce the final gold package.",
      target: buildArtifactTarget(
        "complete_annotation_imports",
        "Normalize human labeling exports into annotation-import.json and regenerate matching gold packages.",
        "annotation_import"
      )
    },
    {
      gap_id: "asset_preflight_gold_label_review_missing_or_not_ready",
      patterns: ["人工双标一致性报告覆盖不足", "人工双标一致性报告未全部 ready", "goldLabelReview", "goldLabelReviewReady"],
      message: "Gold label review reports must prove double-label agreement and adjudication readiness.",
      target: buildArtifactTarget(
        "complete_gold_label_review_reports",
        "Generate gold label review reports and resolve any non-ready human review blockers.",
        "gold_label_review_report"
      )
    },
    {
      gap_id: "asset_preflight_analysis_artifact_missing",
      patterns: ["analysis_path artifact 覆盖不足", "analysis "],
      message: "Each claimable case needs a replayable StudentLearningMaterialAnalysis artifact.",
      target: buildArtifactTarget("complete_analysis_artifacts", "Generate analysis artifacts for every validated VisionEvidencePacket.", "analysis_artifact")
    },
    {
      gap_id: "asset_preflight_user_result_missing",
      patterns: ["用户可见 result artifact 覆盖不足", "userResult"],
      message: "Each claimable case needs a validated teacher report, parent feedback, and monthly result artifact.",
      target: buildArtifactTarget("complete_user_result_artifacts", "Generate validated user-facing result artifacts for every case.", "user_result_artifact")
    },
    {
      gap_id: "asset_preflight_monthly_report_input_missing",
      patterns: ["月报输入 artifact 覆盖不足", "monthlyReportInput"],
      message: "Monthly report input artifacts must preserve teacher-confirmed current and previous-month sources.",
      target: buildArtifactTarget(
        "complete_monthly_report_inputs",
        "Prepare teacher-confirmed monthly report input artifacts with replayable current and previous-month evidence.",
        "monthly_report_input"
      )
    },
    {
      gap_id: "asset_preflight_monthly_report_missing",
      patterns: ["月报 artifact 覆盖不足"],
      message: "Monthly report artifacts must be generated from teacher-confirmed monthly inputs.",
      target: buildArtifactTarget("complete_monthly_report_artifacts", "Prepare monthly inputs and generate monthly report artifacts.", "monthly_report")
    },
    {
      gap_id: "asset_preflight_monthly_comparison_evidence_missing",
      patterns: ["月报上月对比证据覆盖不足", "monthlyComparisonEvidence"],
      message: "Month-over-month claims require replayable previous-month source evidence or explicit no-baseline evidence.",
      target: buildArtifactTarget(
        "complete_monthly_comparison_evidence",
        "Add previous-month source IDs or explicit no-baseline evidence for every monthly report artifact.",
        "monthly_comparison_evidence"
      )
    },
    {
      gap_id: "asset_preflight_delivery_bundle_missing",
      patterns: ["交付包 artifact 覆盖不足", "deliveryBundle"],
      message: "Teacher-facing delivery bundles must be generated and validated for every case.",
      target: buildArtifactTarget("complete_delivery_bundles", "Generate validated teacher delivery bundles for every case.", "delivery_bundle")
    },
    {
      gap_id: "asset_preflight_teacher_review_packet_missing",
      patterns: ["老师复核包 artifact 覆盖不足", "teacherReviewPacket"],
      message: "Teacher review packets must be present so UI actions remain reviewable and non-automatic.",
      target: buildArtifactTarget(
        "complete_teacher_review_packets",
        "Generate teacher review packets after delivery bundles for every case.",
        "teacher_review_packet"
      )
    },
    {
      gap_id: "asset_preflight_mock_or_synthetic_vision_source",
      patterns: ["mock/synthetic Vision source"],
      message: "Human-labeled claim assets cannot use mock or synthetic Vision sources.",
      target: buildArtifactTarget(
        "replace_mock_vision_sources",
        "Replace mock/synthetic VisionEvidencePacket sources with real anonymized OCR/Layout/Vision provider outputs.",
        "replace_mock_vision_source"
      )
    },
    {
      gap_id: "asset_preflight_public_benchmark_source",
      patterns: ["public benchmark/source dataset", "公开 benchmark 只能作覆盖参考"],
      message: "Public K12 benchmarks or source datasets cannot replace real anonymized student-material gold cases.",
      target: buildArtifactTarget(
        "replace_public_benchmark_sources",
        "Replace public benchmark/source-dataset cases with real anonymized student work, corrections, teacher marks, and human gold labels.",
        "replace_public_benchmark_source"
      )
    },
    {
      gap_id: "asset_preflight_case_artifact_provenance_missing",
      patterns: ["asset manifest case provenance", "可回放 gold/analysis 路径"],
      message: "Claimable datasets must preserve per-case asset manifest id plus replayable final gold-package and analysis artifact paths.",
      target: buildArtifactTarget(
        "regenerate_dataset_from_asset_manifest",
        "Regenerate the dataset with generate:k12-eval-dataset from the preflighted asset manifest.",
        "case_artifact_provenance"
      )
    }
  ];

  return specs
    .filter((spec) => spec.patterns.some((pattern) => text.includes(pattern)))
    .map((spec) => ({
      gap_id: spec.gap_id,
      severity: "blocker" as const,
      current: false,
      required: true,
      message: spec.message,
      next_sample_target: spec.target
    }));
}

function buildArtifactTarget(
  targetId: string,
  reason: string,
  artifactFocus: NonNullable<StudentLearningMaterialEvaluationClaimAuditSampleTarget["suggested_case_attributes"]["artifact_focus"]>
): StudentLearningMaterialEvaluationClaimAuditSampleTarget {
  return {
    target_id: targetId,
    reason,
    suggested_case_attributes: {
      artifact_focus: artifactFocus,
      question_mix: "mixed"
    }
  };
}

function buildMixedTarget(
  targetId: string,
  reason: string,
  questionMix: StudentLearningMaterialEvaluationClaimAuditSampleTarget["suggested_case_attributes"]["question_mix"] = "mixed"
): StudentLearningMaterialEvaluationClaimAuditSampleTarget {
  return {
    target_id: targetId,
    reason,
    suggested_case_attributes: {
      question_mix: questionMix
    }
  };
}

function nextMissingMaterialTypeTarget(coverage: StudentLearningMaterialEvaluationCoverage) {
  const materialType = preferredMaterialTypes.find((item) => !coverage.materialTypes.includes(item)) || "other_student_material";
  return {
    target_id: `collect_material_type_${materialType}`,
    reason: `Add material type coverage for ${materialType}.`,
    suggested_case_attributes: {
      material_type: materialType,
      question_mix: "mixed" as const
    }
  };
}

function nextMissingSubjectTarget(coverage: StudentLearningMaterialEvaluationCoverage) {
  const subject = preferredSubjects.find((item) => !coverage.subjects.includes(item)) || "其他";
  return {
    target_id: `collect_subject_${subject}`,
    reason: `Add subject coverage for ${subject}.`,
    suggested_case_attributes: {
      subject,
      question_mix: "mixed" as const
    }
  };
}

function nextMissingRegionTarget(coverage: StudentLearningMaterialEvaluationCoverage) {
  const region = preferredRegionsOrCurricula.find((item) => !coverage.regionsOrCurricula.includes(item)) || "其他地区/教材线索";
  return {
    target_id: `collect_region_or_curriculum_${safeTargetId(region)}`,
    reason: `Add region/curriculum signal coverage for ${region}.`,
    suggested_case_attributes: {
      region_or_curriculum_candidate: region,
      question_mix: "mixed" as const
    }
  };
}

function nextMissingRegionGroupTarget(coverage: StudentLearningMaterialEvaluationCoverage) {
  const target = preferredRegionGroupTargets.find((item) => !coverage.regionOrCurriculumGroups.includes(item.group));
  if (!target) {
    return {
      target_id: "collect_region_group_其他大陆区域",
      reason: "Add mainland regional group coverage for another mainland region.",
      suggested_case_attributes: {
        region_or_curriculum_candidate: "其他地区",
        question_mix: "mixed" as const
      }
    };
  }
  return {
    target_id: `collect_region_group_${safeTargetId(target.group)}`,
    reason: `Add mainland regional group coverage for ${target.group}.`,
    suggested_case_attributes: {
      region_or_curriculum_candidate: target.candidate,
      question_mix: "mixed" as const
    }
  };
}

function nextMissingCurriculumFamilyTarget(coverage: StudentLearningMaterialEvaluationCoverage) {
  const target = preferredCurriculumFamilyTargets.find((item) => !coverage.curriculumVersionFamilies.includes(item.family));
  if (!target) {
    return {
      target_id: "collect_curriculum_family_其他教材版本族",
      reason: "Add curriculum version family coverage for another textbook version.",
      suggested_case_attributes: {
        region_or_curriculum_candidate: "其他教材版本",
        question_mix: "mixed" as const
      }
    };
  }
  return {
    target_id: `collect_curriculum_family_${safeTargetId(target.family)}`,
    reason: `Add curriculum version family coverage for ${target.family}.`,
    suggested_case_attributes: {
      region_or_curriculum_candidate: target.candidate,
      question_mix: "mixed" as const
    }
  };
}

function dedupeGaps(gaps: StudentLearningMaterialEvaluationClaimAuditGap[]) {
  const seen = new Set<string>();
  return gaps.filter((gap) => {
    if (seen.has(gap.gap_id)) return false;
    seen.add(gap.gap_id);
    return true;
  });
}

function dedupeTargets(targets: StudentLearningMaterialEvaluationClaimAuditSampleTarget[]) {
  const seen = new Set<string>();
  return targets.filter((target) => {
    if (seen.has(target.target_id)) return false;
    seen.add(target.target_id);
    return true;
  });
}

function safeTargetId(value: string) {
  return value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_");
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
