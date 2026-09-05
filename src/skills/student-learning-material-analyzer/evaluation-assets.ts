import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  formatStudentLearningMaterialClaimPolicyRequirements,
  strictStudentLearningMaterialClaimPolicy,
  type StudentLearningMaterialEvaluationDatasetKind,
  type StudentLearningMaterialGoldCase
} from "./evaluation";
import {
  buildMainlandK12RegionCurriculumCoverage,
  type MainlandK12CurriculumVersionFamily,
  type MainlandK12RegionCoverageGroup
} from "./mainland-k12-reference";
import {
  extractAdjudicatedGoldCaseFromLabelPackage,
  listGoldLabelPackageProvenanceDifferences,
  validateStudentLearningMaterialGoldLabelPackage,
  type HumanGoldLabel,
  type StudentLearningMaterialGoldLabelPackage
} from "./gold-labeling";
import {
  createGoldLabelPackageFromAnnotationImport,
  type StudentLearningMaterialGoldLabelAnnotationImport
} from "./gold-label-annotation-import";
import {
  validateGoldLabelReviewReport,
  type StudentLearningMaterialGoldLabelReviewReport
} from "./gold-label-review-report";
import {
  validateGoldLabelAnnotationTask,
  type StudentLearningMaterialGoldLabelAnnotationTask
} from "./gold-label-annotation-task";
import { detectExplicitNonK12Scope } from "./material-classifier";
import { buildQuestionEvidenceReadiness } from "./question-evidence-readiness";
import type { StudentMonthlyReport } from "../monthly-report";
import {
  validateStudentMonthlyReportFileInput,
  type StudentMonthlyReportFileInput
} from "../monthly-report-files";
import {
  validateStudentLearningMaterialDeliveryBundle,
  type StudentLearningMaterialDeliveryBundle
} from "./delivery-bundle";
import {
  validateQuestionSegmentationReview,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import {
  validateVisionProviderTrialReport,
  type StudentLearningMaterialVisionProviderTrialReport,
  type VisionProviderTrialReadiness
} from "./vision-provider-trial-report";
import {
  validateStudentLearningMaterialUserFacingResult,
  type StudentLearningMaterialUserFacingResult
} from "./user-facing-result";
import {
  validateStudentLearningMaterialTeacherReviewPacket,
  type StudentLearningMaterialTeacherReviewPacket
} from "./teacher-review-packet";
import {
  createVisionEvidencePacketFromExternalProvider,
  validateExternalVisionAdapterInput,
  type ExternalVisionAdapterInput
} from "./vision-adapter";
import type { K12EducationStage, K12MaterialType, K12Subject, MaterialState, StudentLearningMaterialAnalysis, VisionEvidencePacket } from "./types";
import {
  validateStudentLearningMaterialAnalysis,
  validateStudentLearningMaterialAnalysisEvidenceRefsAgainstPacket,
  validateStudentLearningMaterialAnalysisMistakeDiagnosisEvidenceAgainstPacket,
  validateStudentLearningMaterialAnalysisProfileUpdateSuggestionsAgainstPacket,
  validateStudentLearningMaterialAnalysisQuestionCoverageAgainstPacket,
  validateVisionEvidencePacket
} from "./validators";

type VisionSourceKind = Exclude<NonNullable<NonNullable<VisionEvidencePacket["pipeline_trace"]>["preprocessing"]>["source_kind"], undefined>;

export type StudentLearningMaterialEvaluationAssetManifestCase = {
  case_id: string;
  external_vision_input_path?: string;
  vision_packet_path: string;
  gold_label_package_path: string;
  answer_keys_path?: string;
  rubrics_path?: string;
  provider_trial_report_path?: string;
  question_segmentation_review_path?: string;
  annotation_task_path?: string;
  annotation_import_path?: string;
  gold_label_review_report_path?: string;
  analysis_path?: string;
  result_path?: string;
  monthly_report_input_path?: string;
  monthly_report_path?: string;
  delivery_bundle_path?: string;
  teacher_review_packet_path?: string;
};

export type StudentLearningMaterialEvaluationAssetManifest = {
  fixture_schema: "student_learning_material_evaluation_assets.v0.1";
  dataset_id: string;
  dataset_kind: StudentLearningMaterialEvaluationDatasetKind;
  description?: string;
  cases: StudentLearningMaterialEvaluationAssetManifestCase[];
};

export type StudentLearningMaterialEvaluationAssetCaseValidation = {
  case_id: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
  material_id?: string;
  material_state?: MaterialState;
  material_type?: K12MaterialType;
  subject?: K12Subject;
  education_stage?: K12EducationStage;
  grade_candidate?: string;
  region_or_curriculum_candidate?: string;
  plugin_provider?: string;
  vision_source_kind?: VisionSourceKind;
  is_mock_or_synthetic_source: boolean;
  is_public_benchmark_source: boolean;
  has_external_vision_input_artifact: boolean;
  has_external_answer_keys: boolean;
  has_external_rubrics: boolean;
  has_provider_trial_report_artifact: boolean;
  provider_trial_report_readiness?: VisionProviderTrialReadiness;
  has_provider_candidate_trace: boolean;
  has_provider_benchmark_candidate: boolean;
  has_provider_candidate_source_urls: boolean;
  has_provider_license_review_notes: boolean;
  has_provider_document_or_ocr_candidate: boolean;
  has_provider_layout_candidate: boolean;
  has_provider_formula_candidate: boolean;
  has_question_segmentation_review_artifact: boolean;
  has_annotation_task_artifact: boolean;
  has_annotation_import_artifact: boolean;
  has_gold_label_review_report_artifact: boolean;
  gold_label_review_ready_for_99: boolean;
  gold_label_review_disagreement_count?: number;
  question_count: number;
  gold_question_count: number;
  definitive_gold_question_count: number;
  readiness_definitive_allowed_count: number;
  readiness_teacher_review_required_count: number;
  readiness_blocked_count: number;
  has_analysis_artifact: boolean;
  has_user_result_artifact: boolean;
  has_monthly_report_input_artifact: boolean;
  has_monthly_report_artifact: boolean;
  has_monthly_report_previous_month_evidence: boolean;
  has_delivery_bundle_artifact: boolean;
  has_teacher_review_packet_artifact: boolean;
};

export type StudentLearningMaterialEvaluationAssetManifestValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  dataset_id?: string;
  dataset_kind?: StudentLearningMaterialEvaluationDatasetKind;
  cases: StudentLearningMaterialEvaluationAssetCaseValidation[];
  summary: {
    case_count: number;
    question_count: number;
    gold_question_count: number;
    definitive_gold_question_count: number;
    teacher_review_expected_question_count: number;
    readiness_definitive_allowed_count: number;
    readiness_teacher_review_required_count: number;
    readiness_blocked_count: number;
  };
  coverage: {
    material_states: MaterialState[];
    material_types: K12MaterialType[];
    subjects: K12Subject[];
    education_stages: K12EducationStage[];
    grade_candidates: string[];
    regions_or_curricula: string[];
    region_or_curriculum_groups: MainlandK12RegionCoverageGroup[];
    curriculum_version_families: MainlandK12CurriculumVersionFamily[];
    exam_scope_signals: string[];
    plugin_providers: string[];
    vision_source_kinds: VisionSourceKind[];
    mock_or_synthetic_source_case_count: number;
    public_benchmark_source_case_count: number;
    external_vision_input_artifact_case_count: number;
    external_answer_key_case_count: number;
    external_rubric_case_count: number;
    provider_trial_report_artifact_case_count: number;
    provider_trial_report_ready_case_count: number;
    provider_trial_report_needs_evidence_completion_case_count: number;
    provider_trial_report_blocked_case_count: number;
    provider_candidate_trace_case_count: number;
    provider_benchmark_candidate_case_count: number;
    provider_candidate_source_url_case_count: number;
    provider_license_review_note_case_count: number;
    provider_document_or_ocr_candidate_case_count: number;
    provider_layout_candidate_case_count: number;
    provider_formula_candidate_case_count: number;
    question_segmentation_review_artifact_case_count: number;
    annotation_task_artifact_case_count: number;
    annotation_import_artifact_case_count: number;
    gold_label_review_report_artifact_case_count: number;
    gold_label_review_ready_case_count: number;
    gold_label_review_disagreement_case_count: number;
    human_gold_package_count: number;
    analysis_artifact_case_count: number;
    user_result_artifact_case_count: number;
    monthly_report_input_artifact_case_count: number;
    monthly_report_artifact_case_count: number;
    monthly_report_previous_month_evidence_case_count: number;
    delivery_bundle_artifact_case_count: number;
    teacher_review_packet_artifact_case_count: number;
  };
  claimReadiness: {
    claimable99AssetReady: boolean;
    blockers: string[];
  };
  report: string;
};

export function validateStudentLearningMaterialEvaluationAssetManifestFromFile(manifestPath: string) {
  const absolutePath = resolve(manifestPath);
  try {
    return validateStudentLearningMaterialEvaluationAssetManifestFromJsonText(readFileSync(absolutePath, "utf8"), {
      baseDir: dirname(absolutePath)
    });
  } catch (error) {
    return buildValidationResult({
      errors: [`Cannot read evaluation asset manifest: ${formatError(error)}`],
      warnings: [],
      cases: [],
      dataset_id: undefined,
      dataset_kind: undefined
    });
  }
}

export function validateStudentLearningMaterialEvaluationAssetManifestFromJsonText(jsonText: string, options?: { baseDir?: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return buildValidationResult({
      errors: [`Cannot parse evaluation asset manifest JSON: ${formatError(error)}`],
      warnings: [],
      cases: [],
      dataset_id: undefined,
      dataset_kind: undefined
    });
  }

  return validateStudentLearningMaterialEvaluationAssetManifest(parsed, options);
}

export function validateStudentLearningMaterialEvaluationAssetManifest(value: unknown, options?: { baseDir?: string }) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return buildValidationResult({
      errors: ["evaluation asset manifest must be an object"],
      warnings,
      cases: [],
      dataset_id: undefined,
      dataset_kind: undefined
    });
  }

  if (value.fixture_schema !== "student_learning_material_evaluation_assets.v0.1") {
    errors.push("fixture_schema must be student_learning_material_evaluation_assets.v0.1");
  }
  const datasetId = readString(value.dataset_id);
  if (!datasetId) errors.push("dataset_id is required");
  const datasetKind = readDatasetKind(value.dataset_kind);
  if (!datasetKind) errors.push("dataset_kind must be synthetic, human_labeled, or mixed");

  const rawCases = Array.isArray(value.cases) ? value.cases : [];
  if (!Array.isArray(value.cases)) {
    errors.push("cases must be an array");
  } else if (!rawCases.length) {
    errors.push("cases must not be empty");
  }

  const caseIds = rawCases.map((item) => (isRecord(item) ? readString(item.case_id) : undefined)).filter((item): item is string => Boolean(item));
  const duplicateCaseIds = findDuplicates(caseIds);
  if (duplicateCaseIds.length) errors.push(`duplicate case_id: ${duplicateCaseIds.join(", ")}`);

  const cases = rawCases.map((item, index) => validateAssetCase(item, index, options?.baseDir));
  errors.push(...cases.flatMap((item) => item.errors.map((error) => `cases[${item.case_id}]: ${error}`)));
  warnings.push(...cases.flatMap((item) => item.warnings.map((warning) => `cases[${item.case_id}]: ${warning}`)));

  return buildValidationResult({
    errors,
    warnings,
    cases,
    dataset_id: datasetId,
    dataset_kind: datasetKind
  });
}

export function formatStudentLearningMaterialEvaluationAssetManifestReport(result: Omit<StudentLearningMaterialEvaluationAssetManifestValidation, "report">) {
  return [
    `StudentLearningMaterialEvaluation assets: ${result.ok ? "PASS" : "FAIL"}`,
    `dataset.id=${result.dataset_id ?? "unknown"}`,
    `dataset.kind=${result.dataset_kind ?? "unknown"}`,
    `cases=${result.summary.case_count}, questions=${result.summary.question_count}, definitiveGold=${result.summary.definitive_gold_question_count}`,
    `readiness.definitiveAllowed=${result.summary.readiness_definitive_allowed_count}, readiness.teacherReview=${result.summary.readiness_teacher_review_required_count}, readiness.blocked=${result.summary.readiness_blocked_count}`,
    `coverage.materialStates=${result.coverage.material_states.join(", ") || "none"}`,
    `coverage.materialTypes=${result.coverage.material_types.join(", ") || "none"}`,
    `coverage.subjects=${result.coverage.subjects.join(", ") || "none"}`,
    `coverage.educationStages=${result.coverage.education_stages.join(", ") || "none"}`,
    `coverage.gradeCandidates=${result.coverage.grade_candidates.join(", ") || "none"}`,
    `coverage.regionsOrCurricula=${result.coverage.regions_or_curricula.join(", ") || "none"}`,
    `coverage.regionOrCurriculumGroups=${result.coverage.region_or_curriculum_groups.join(", ") || "none"}`,
    `coverage.curriculumVersionFamilies=${result.coverage.curriculum_version_families.join(", ") || "none"}`,
    `coverage.examScopeSignals=${result.coverage.exam_scope_signals.join(", ") || "none"}`,
    `coverage.visionProviders=${result.coverage.plugin_providers.join(", ") || "none"}`,
    `coverage.visionSourceKinds=${result.coverage.vision_source_kinds.join(", ") || "none"}`,
    `coverage.mockOrSyntheticSources=${result.coverage.mock_or_synthetic_source_case_count}`,
    `coverage.publicBenchmarkSources=${result.coverage.public_benchmark_source_case_count}`,
    `coverage.externalVisionInputs=${result.coverage.external_vision_input_artifact_case_count}`,
    `coverage.sideInputs=answerKeys:${result.coverage.external_answer_key_case_count}, rubrics:${result.coverage.external_rubric_case_count}`,
    `coverage.humanGoldPackages=${result.coverage.human_gold_package_count}`,
    `coverage.providerTrialReadiness=ready:${result.coverage.provider_trial_report_ready_case_count}, needsEvidence:${result.coverage.provider_trial_report_needs_evidence_completion_case_count}, blocked:${result.coverage.provider_trial_report_blocked_case_count}`,
    `coverage.providerCandidateTrace=candidateTrace:${result.coverage.provider_candidate_trace_case_count}, benchmarkCandidates:${result.coverage.provider_benchmark_candidate_case_count}, sourceUrls:${result.coverage.provider_candidate_source_url_case_count}, licenseNotes:${result.coverage.provider_license_review_note_case_count}`,
    `coverage.providerRoleCoverage=documentOrOcr:${result.coverage.provider_document_or_ocr_candidate_case_count}, layout:${result.coverage.provider_layout_candidate_case_count}, formula:${result.coverage.provider_formula_candidate_case_count}`,
    `coverage.goldLabelReview=reports:${result.coverage.gold_label_review_report_artifact_case_count}, ready:${result.coverage.gold_label_review_ready_case_count}, withDisagreements:${result.coverage.gold_label_review_disagreement_case_count}`,
    `coverage.artifacts=providerTrial:${result.coverage.provider_trial_report_artifact_case_count}, segmentationReview:${result.coverage.question_segmentation_review_artifact_case_count}, annotationTask:${result.coverage.annotation_task_artifact_case_count}, annotationImport:${result.coverage.annotation_import_artifact_case_count}, analysis:${result.coverage.analysis_artifact_case_count}, userResult:${result.coverage.user_result_artifact_case_count}, monthlyInput:${result.coverage.monthly_report_input_artifact_case_count}, monthlyReport:${result.coverage.monthly_report_artifact_case_count}, deliveryBundle:${result.coverage.delivery_bundle_artifact_case_count}, teacherReviewPacket:${result.coverage.teacher_review_packet_artifact_case_count}, monthlyComparisonEvidence:${result.coverage.monthly_report_previous_month_evidence_case_count}`,
    `claimPolicy.requirements=${formatStudentLearningMaterialClaimPolicyRequirements(strictStudentLearningMaterialClaimPolicy)}`,
    `claimable99AssetReady=${result.claimReadiness.claimable99AssetReady ? "yes" : "no"}`,
    `claimReadinessBlockers=${result.claimReadiness.blockers.join("；") || "none"}`,
    `errors=${result.errors.join("；") || "none"}`,
    `warnings=${result.warnings.join("；") || "none"}`
  ].join("\n");
}

const forbiddenParentTerms = ["严重", "很差", "完全不会", "保证提分", "不认真", "基础很差", "一定能提高", "一定提升", "孩子不行", "家长必须"];

function validateAssetCase(value: unknown, index: number, baseDir?: string): StudentLearningMaterialEvaluationAssetCaseValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return emptyCaseValidation(`index-${index}`, [`case must be an object`], warnings);
  }

  const caseId = readString(value.case_id) || `index-${index}`;
  const visionPacketPath = readString(value.vision_packet_path);
  const goldLabelPackagePath = readString(value.gold_label_package_path);
  if (!visionPacketPath) errors.push("vision_packet_path is required");
  if (!goldLabelPackagePath) errors.push("gold_label_package_path is required");

  const externalVisionInput = readOptionalJsonReference<ExternalVisionAdapterInput>(
    readString(value.external_vision_input_path),
    "external_vision_input_path",
    baseDir
  );
  const packet = visionPacketPath ? readJsonReference<VisionEvidencePacket>(visionPacketPath, "vision_packet_path", baseDir) : { errors: ["vision_packet_path is required"] };
  const packageValue = goldLabelPackagePath
    ? readJsonReference<StudentLearningMaterialGoldLabelPackage>(goldLabelPackagePath, "gold_label_package_path", baseDir)
    : { errors: ["gold_label_package_path is required"] };
  const answerKeys = readOptionalJsonArray(readString(value.answer_keys_path), "answer_keys_path", baseDir);
  const rubrics = readOptionalJsonArray(readString(value.rubrics_path), "rubrics_path", baseDir);
  const providerTrialReport = readOptionalJsonReference<StudentLearningMaterialVisionProviderTrialReport>(
    readString(value.provider_trial_report_path),
    "provider_trial_report_path",
    baseDir
  );
  const segmentationReview = readOptionalJsonReference<StudentLearningMaterialQuestionSegmentationReview>(
    readString(value.question_segmentation_review_path),
    "question_segmentation_review_path",
    baseDir
  );
  const annotationTask = readOptionalJsonReference<StudentLearningMaterialGoldLabelAnnotationTask>(readString(value.annotation_task_path), "annotation_task_path", baseDir);
  const annotationImport = readOptionalJsonReference<StudentLearningMaterialGoldLabelAnnotationImport>(
    readString(value.annotation_import_path),
    "annotation_import_path",
    baseDir
  );
  const goldLabelReviewReport = readOptionalJsonReference<StudentLearningMaterialGoldLabelReviewReport>(
    readString(value.gold_label_review_report_path),
    "gold_label_review_report_path",
    baseDir
  );
  const analysis = readOptionalJsonReference<StudentLearningMaterialAnalysis>(readString(value.analysis_path), "analysis_path", baseDir);
  const userResult = readOptionalJsonReference<StudentLearningMaterialUserFacingResult>(readString(value.result_path), "result_path", baseDir);
  const monthlyReportInput = readOptionalJsonReference<StudentMonthlyReportFileInput>(
    readString(value.monthly_report_input_path),
    "monthly_report_input_path",
    baseDir
  );
  const monthlyReport = readOptionalJsonReference<StudentMonthlyReport>(readString(value.monthly_report_path), "monthly_report_path", baseDir);
  const deliveryBundle = readOptionalJsonReference<StudentLearningMaterialDeliveryBundle>(readString(value.delivery_bundle_path), "delivery_bundle_path", baseDir);
  const teacherReviewPacket = readOptionalJsonReference<StudentLearningMaterialTeacherReviewPacket>(
    readString(value.teacher_review_packet_path),
    "teacher_review_packet_path",
    baseDir
  );
  errors.push(
    ...packet.errors,
    ...externalVisionInput.errors,
    ...packageValue.errors,
    ...answerKeys.errors,
    ...rubrics.errors,
    ...providerTrialReport.errors,
    ...segmentationReview.errors,
    ...annotationTask.errors,
    ...annotationImport.errors,
    ...goldLabelReviewReport.errors,
    ...analysis.errors,
    ...userResult.errors,
    ...monthlyReportInput.errors,
    ...monthlyReport.errors,
    ...deliveryBundle.errors,
    ...teacherReviewPacket.errors
  );

  if (!packet.value || !packageValue.value) {
    return emptyCaseValidation(caseId, errors, warnings);
  }

  const packetValidation = validateVisionEvidencePacket(packet.value);
  errors.push(...packetValidation.errors.map((error) => `VisionEvidencePacket invalid: ${error}`));
  warnings.push(...packetValidation.warnings.map((warning) => `VisionEvidencePacket warning: ${warning}`));
  const nonK12Scope = detectExplicitNonK12Scope(packet.value);
  if (nonK12Scope.outOfScope) {
    errors.push(`VisionEvidencePacket explicit non-K12 scope detected: ${nonK12Scope.reasons.join(", ")}`);
  }
  if (externalVisionInput.value) validateExternalVisionInputArtifact(externalVisionInput.value, packet.value, errors, warnings);

  const readiness = buildQuestionEvidenceReadiness(packet.value, {
    answerKeys: answerKeys.value,
    rubrics: rubrics.value
  });
  const externalSideInputRefsByQuestionId = buildExternalSideInputRefsByQuestionId(readiness);
  const externalSideInputRefs = new Set([...externalSideInputRefsByQuestionId.values()].flatMap((refs) => refs));

  const packageValidation = validateStudentLearningMaterialGoldLabelPackage(packageValue.value, {
    sourcePacket: packet.value,
    allowedExternalEvidenceRefsByQuestionId: externalSideInputRefsByQuestionId
  });
  errors.push(...packageValidation.errors.map((error) => `gold label package invalid: ${error}`));
  warnings.push(...packageValidation.warnings.map((warning) => `gold label package warning: ${warning}`));

  const extracted = extractAdjudicatedGoldCaseFromLabelPackage(packageValue.value);
  if (!extracted.ok) {
    errors.push(...extracted.errors.map((error) => `cannot extract adjudicated gold: ${error}`));
    return emptyCaseValidation(caseId, errors, warnings, packet.value);
  }
  warnings.push(...extracted.warnings.map((warning) => `gold extraction warning: ${warning}`));

  if (extracted.gold.case_id !== caseId) errors.push(`case_id must match adjudicated_gold.case_id: ${caseId} != ${extracted.gold.case_id}`);
  if (packageValue.value.case_id !== caseId) errors.push(`case_id must match gold package case_id: ${caseId} != ${packageValue.value.case_id}`);
  if (packageValue.value.source_material_id !== packet.value.source_material_id) {
    errors.push(`gold package source_material_id must match VisionEvidencePacket source_material_id`);
  }
  if (packageValue.value.vision_packet_id && packageValue.value.vision_packet_id !== packet.value.plugin_run_id) {
    errors.push(`gold package vision_packet_id must match VisionEvidencePacket plugin_run_id`);
  }
  if (packageValue.value.material_id && packageValue.value.material_id !== packet.value.material_id) {
    errors.push(`gold package material_id must match VisionEvidencePacket material_id`);
  }
  if (packet.value.material_state !== "valid_student_material") {
    warnings.push(`VisionEvidencePacket material_state=${packet.value.material_state}; not a full valid_student_material case`);
  }
  if (segmentationReview.value) validateQuestionSegmentationReviewArtifact(segmentationReview.value, packet.value, extracted.gold, errors, warnings);
  if (providerTrialReport.value) validateProviderTrialReportArtifact(providerTrialReport.value, packet.value, segmentationReview.value, errors);
  if (annotationTask.value) validateAnnotationTaskArtifact(annotationTask.value, packet.value, segmentationReview.value, extracted.gold, errors, warnings);
  if (annotationImport.value) {
    validateAnnotationImportArtifact(
      annotationImport.value,
      packet.value,
      segmentationReview.value,
      packageValue.value,
      externalSideInputRefsByQuestionId,
      errors,
      warnings
    );
  }
  if (goldLabelReviewReport.value) {
    validateGoldLabelReviewReportArtifact(goldLabelReviewReport.value, packageValue.value, packet.value, externalSideInputRefsByQuestionId, errors, warnings);
  }
  if (analysis.value) validateAnalysisArtifact(analysis.value, packet.value, extracted.gold, [...externalSideInputRefs], externalSideInputRefsByQuestionId, errors, warnings);
  if (userResult.value) validateUserFacingResultArtifact(userResult.value, packet.value, analysis.value, errors);
  if (monthlyReportInput.value) validateMonthlyReportInputArtifact(monthlyReportInput.value, errors, warnings);
  if (monthlyReport.value) validateMonthlyReportArtifact(monthlyReport.value, analysis.value, userResult.value, monthlyReportInput.value, errors);
  if (deliveryBundle.value) validateDeliveryBundleArtifact(deliveryBundle.value, packet.value, analysis.value, userResult.value, monthlyReport.value, errors);
  if (teacherReviewPacket.value) validateTeacherReviewPacketArtifact(teacherReviewPacket.value, deliveryBundle.value, errors);

  const readinessByQuestionId = new Map(readiness.questions.map((question) => [question.question_id, question]));
  const packetQuestionIds = new Set(packet.value.questions.map((question) => question.question_id));
  const goldQuestionIds = new Set(extracted.gold.questions.map((question) => question.question_id));
  packetQuestionIds.forEach((questionId) => {
    if (!goldQuestionIds.has(questionId)) errors.push(`gold questions missing packet question_id=${questionId}`);
  });
  goldQuestionIds.forEach((questionId) => {
    if (!packetQuestionIds.has(questionId)) errors.push(`gold question_id=${questionId} missing from VisionEvidencePacket`);
  });

  validateSideInputQuestionIds(answerKeys.value, packetQuestionIds, "answer_keys_path", errors);
  validateSideInputQuestionIds(rubrics.value, packetQuestionIds, "rubrics_path", errors);
  validateQuestionEvidenceBasisRefs(packageValue.value.labels, packet.value, externalSideInputRefs, externalSideInputRefsByQuestionId, errors);
  const providerCandidateTrace = inspectProviderCandidateTrace(packet.value);

  extracted.gold.questions.forEach((question) => {
    const questionReadiness = readinessByQuestionId.get(question.question_id);
    if (!questionReadiness) return;
    if (question.definitive_judgement_allowed && !questionReadiness.definitive_judgement_allowed) {
      errors.push(`gold question_id=${question.question_id} allows definitive judgement but evidence readiness does not: ${questionReadiness.reasons.join(", ")}`);
    }
    if (!question.definitive_judgement_allowed && questionReadiness.definitive_judgement_allowed) {
      warnings.push(`gold question_id=${question.question_id} requires teacher review even though evidence readiness allows definitive judgement`);
    }
  });

  return {
    case_id: caseId,
    ok: errors.length === 0,
    errors,
    warnings,
    material_id: packet.value.material_id,
    material_state: packet.value.material_state,
    material_type: extracted.gold.material_classification.material_type,
    subject: extracted.gold.material_classification.subject,
    education_stage: extracted.gold.material_classification.education_stage,
    grade_candidate: extracted.gold.material_classification.grade_candidate,
    region_or_curriculum_candidate: extracted.gold.material_classification.region_or_curriculum_candidate,
    plugin_provider: packet.value.plugin_provider,
    vision_source_kind: packet.value.pipeline_trace?.preprocessing?.source_kind,
    is_mock_or_synthetic_source: isMockOrSyntheticVisionSource(packet.value),
    is_public_benchmark_source: isPublicBenchmarkVisionSource(packet.value),
    has_external_vision_input_artifact: Boolean(externalVisionInput.value),
    has_external_answer_keys: Boolean(answerKeys.value?.length),
    has_external_rubrics: Boolean(rubrics.value?.length),
    has_provider_trial_report_artifact: Boolean(providerTrialReport.value),
    provider_trial_report_readiness: providerTrialReport.value?.readiness,
    has_provider_candidate_trace: providerCandidateTrace.has_provider_candidate_trace,
    has_provider_benchmark_candidate: providerCandidateTrace.has_provider_benchmark_candidate,
    has_provider_candidate_source_urls: providerCandidateTrace.has_provider_candidate_source_urls,
    has_provider_license_review_notes: providerCandidateTrace.has_provider_license_review_notes,
    has_provider_document_or_ocr_candidate: providerCandidateTrace.has_provider_document_or_ocr_candidate,
    has_provider_layout_candidate: providerCandidateTrace.has_provider_layout_candidate,
    has_provider_formula_candidate: providerCandidateTrace.has_provider_formula_candidate,
    has_question_segmentation_review_artifact: Boolean(segmentationReview.value),
    has_annotation_task_artifact: Boolean(annotationTask.value),
    has_annotation_import_artifact: Boolean(annotationImport.value),
    has_gold_label_review_report_artifact: Boolean(goldLabelReviewReport.value),
    gold_label_review_ready_for_99: Boolean(goldLabelReviewReport.value?.readiness.ready_for_99_evaluation),
    gold_label_review_disagreement_count: goldLabelReviewReport.value?.agreement.disagreement_count,
    question_count: packet.value.questions.length,
    gold_question_count: extracted.gold.questions.length,
    definitive_gold_question_count: extracted.gold.questions.filter((question) => question.definitive_judgement_allowed).length,
    readiness_definitive_allowed_count: readiness.summary.definitive_allowed_count,
    readiness_teacher_review_required_count: readiness.summary.teacher_review_required_count,
    readiness_blocked_count: readiness.summary.blocked_count,
    has_analysis_artifact: Boolean(analysis.value),
    has_user_result_artifact: Boolean(userResult.value),
    has_monthly_report_input_artifact: Boolean(monthlyReportInput.value),
    has_monthly_report_artifact: Boolean(monthlyReport.value),
    has_monthly_report_previous_month_evidence: monthlyReport.value ? hasMonthlyReportPreviousMonthEvidence(monthlyReport.value) : false,
    has_delivery_bundle_artifact: Boolean(deliveryBundle.value),
    has_teacher_review_packet_artifact: Boolean(teacherReviewPacket.value)
  };
}

function validateAnalysisArtifact(
  analysis: StudentLearningMaterialAnalysis,
  packet: VisionEvidencePacket,
  gold: StudentLearningMaterialGoldCase,
  allowedExternalEvidenceRefs: string[],
  allowedExternalEvidenceRefsByQuestionId: Map<string, string[]>,
  errors: string[],
  warnings: string[]
) {
  const validation = validateStudentLearningMaterialAnalysis(analysis);
  errors.push(...validation.errors.map((error) => `analysis_path invalid: ${error}`));
  warnings.push(...validation.warnings.map((warning) => `analysis_path warning: ${warning}`));
  const questionCoverageValidation = validateStudentLearningMaterialAnalysisQuestionCoverageAgainstPacket(analysis, packet);
  errors.push(...questionCoverageValidation.errors.map((error) => `analysis_path ${error}`));
  warnings.push(...questionCoverageValidation.warnings.map((warning) => `analysis_path warning: ${warning}`));
  const evidenceRefValidation = validateStudentLearningMaterialAnalysisEvidenceRefsAgainstPacket(analysis, packet, {
    allowedExternalEvidenceRefs,
    allowedExternalEvidenceRefsByQuestionId
  });
  errors.push(...evidenceRefValidation.errors.map((error) => `analysis_path ${error}`));
  warnings.push(...evidenceRefValidation.warnings.map((warning) => `analysis_path warning: ${warning}`));
  const mistakeDiagnosisEvidenceValidation = validateStudentLearningMaterialAnalysisMistakeDiagnosisEvidenceAgainstPacket(analysis, packet);
  errors.push(...mistakeDiagnosisEvidenceValidation.errors.map((error) => `analysis_path ${error}`));
  warnings.push(...mistakeDiagnosisEvidenceValidation.warnings.map((warning) => `analysis_path warning: ${warning}`));
  const profileUpdateSuggestionValidation = validateStudentLearningMaterialAnalysisProfileUpdateSuggestionsAgainstPacket(analysis, packet);
  errors.push(...profileUpdateSuggestionValidation.errors.map((error) => `analysis_path ${error}`));
  warnings.push(...profileUpdateSuggestionValidation.warnings.map((warning) => `analysis_path warning: ${warning}`));

  if (analysis.source_material_id !== packet.source_material_id) {
    errors.push(`analysis_path source_material_id must match VisionEvidencePacket source_material_id`);
  }
  if (analysis.student_id !== packet.student_id) {
    errors.push(`analysis_path student_id must match VisionEvidencePacket student_id`);
  }
  if (analysis.material_state !== packet.material_state) {
    errors.push(`analysis_path material_state must match VisionEvidencePacket material_state`);
  }
  if (analysis.audit.vision_plugin_run_id !== packet.plugin_run_id) {
    errors.push(`analysis_path audit.vision_plugin_run_id must match VisionEvidencePacket plugin_run_id`);
  }
  if (analysis.material_classification.material_type !== gold.material_classification.material_type) {
    errors.push(`analysis_path material_type must match adjudicated gold`);
  }
  if (analysis.material_classification.subject !== gold.material_classification.subject) {
    errors.push(`analysis_path subject must match adjudicated gold`);
  }
  if (analysis.material_classification.education_stage !== gold.material_classification.education_stage) {
    errors.push(`analysis_path education_stage must match adjudicated gold`);
  }
  if (analysis.material_classification.grade_candidate !== gold.material_classification.grade_candidate) {
    errors.push(`analysis_path grade_candidate must match adjudicated gold`);
  }
  if (analysis.material_classification.region_or_curriculum_candidate !== gold.material_classification.region_or_curriculum_candidate) {
    errors.push(`analysis_path region_or_curriculum_candidate must match adjudicated gold`);
  }

  const analysisQuestionIds = new Set(analysis.question_analyses.map((question) => question.question_id));
  gold.questions.forEach((question) => {
    if (!analysisQuestionIds.has(question.question_id)) errors.push(`analysis_path missing gold question_id=${question.question_id}`);
  });
}

function validateExternalVisionInputArtifact(
  externalInput: ExternalVisionAdapterInput,
  packet: VisionEvidencePacket,
  errors: string[],
  warnings: string[]
) {
  const validation = validateExternalVisionAdapterInput(externalInput);
  errors.push(...validation.errors.map((error) => `external_vision_input_path invalid: ${error}`));
  warnings.push(...validation.warnings.map((warning) => `external_vision_input_path warning: ${warning}`));
  if (!validation.ok) return;

  const sourceValidation = validateExternalVisionInputAgainstVisionEvidencePacket(externalInput, packet);
  errors.push(...sourceValidation.errors);
  warnings.push(...sourceValidation.warnings);
}

export function validateExternalVisionInputAgainstVisionEvidencePacket(
  externalInput: ExternalVisionAdapterInput,
  packet: VisionEvidencePacket
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (externalInput.provider !== packet.plugin_provider) {
    errors.push("external_vision_input_path provider must match VisionEvidencePacket plugin_provider");
  }
  if (externalInput.providerRunId !== packet.plugin_run_id) {
    errors.push("external_vision_input_path providerRunId must match VisionEvidencePacket plugin_run_id");
  }
  if (externalInput.providerModelVersion !== packet.plugin_model_version) {
    errors.push("external_vision_input_path providerModelVersion must match VisionEvidencePacket plugin_model_version");
  }
  if (externalInput.materialId !== packet.material_id) {
    errors.push("external_vision_input_path materialId must match VisionEvidencePacket material_id");
  }
  if ((externalInput.sourceMaterialId ?? externalInput.materialId) !== packet.source_material_id) {
    errors.push("external_vision_input_path sourceMaterialId must match VisionEvidencePacket source_material_id");
  }
  if (externalInput.studentId !== packet.student_id) {
    errors.push("external_vision_input_path studentId must match VisionEvidencePacket student_id");
  }
  if (externalInput.teacherId && externalInput.teacherId !== packet.teacher_id) {
    errors.push("external_vision_input_path teacherId must match VisionEvidencePacket teacher_id");
  }
  if (externalInput.tenantId && externalInput.tenantId !== packet.tenant_id) {
    errors.push("external_vision_input_path tenantId must match VisionEvidencePacket tenant_id");
  }
  const packetSourceKind = packet.pipeline_trace?.preprocessing?.source_kind;
  if (packetSourceKind && (externalInput.sourceKind ?? "image") !== packetSourceKind) {
    errors.push("external_vision_input_path sourceKind must match VisionEvidencePacket preprocessing.source_kind");
  }
  if (!sameOrderedStrings(externalInput.pages.map((page) => page.page_id), packet.pages.map((page) => page.page_id))) {
    errors.push("external_vision_input_path pages must match VisionEvidencePacket pages in order");
  }
  if (!sameOrderedStrings(externalInput.questions.map((question) => question.question_id), packet.questions.map((question) => question.question_id))) {
    errors.push("external_vision_input_path questions must match VisionEvidencePacket questions in order");
  }
  validateExternalVisionDerivedPacketMatchesArtifact(externalInput, packet, errors);
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function validateExternalVisionDerivedPacketMatchesArtifact(
  externalInput: ExternalVisionAdapterInput,
  packet: VisionEvidencePacket,
  errors: string[]
) {
  const expectedPacket = createVisionEvidencePacketFromExternalProvider(externalInput);
  const comparisons: Array<[string, unknown, unknown]> = [
    ["material_state", packet.material_state, expectedPacket.material_state],
    ["student_identity_status", packet.student_identity_status, expectedPacket.student_identity_status],
    ["metadata", packet.metadata, expectedPacket.metadata],
    ["plugin_errors", packet.plugin_errors, expectedPacket.plugin_errors],
    ["pages", packet.pages, expectedPacket.pages],
    ["questions", packet.questions, expectedPacket.questions],
    ["evidences", packet.evidences, expectedPacket.evidences],
    ["gates", packet.gates, expectedPacket.gates],
    ["pipeline_trace.preprocessing", packet.pipeline_trace?.preprocessing, expectedPacket.pipeline_trace?.preprocessing],
    ["pipeline_trace.stages", packet.pipeline_trace?.stages, expectedPacket.pipeline_trace?.stages],
    ["pipeline_trace.question_segmentation_policy", packet.pipeline_trace?.question_segmentation_policy, expectedPacket.pipeline_trace?.question_segmentation_policy],
    ["pipeline_trace.evaluation_asset_policy", packet.pipeline_trace?.evaluation_asset_policy, expectedPacket.pipeline_trace?.evaluation_asset_policy]
  ];

  if (externalInput.createdAt && packet.created_at !== expectedPacket.created_at) {
    errors.push("external_vision_input_path derived created_at must match VisionEvidencePacket created_at");
  }

  comparisons.forEach(([fieldName, actual, expected]) => {
    if (!sameJsonValue(actual, expected)) {
      errors.push(`external_vision_input_path derived ${fieldName} must match VisionEvidencePacket ${fieldName}`);
    }
  });
}

function validateUserFacingResultArtifact(
  result: StudentLearningMaterialUserFacingResult,
  packet: VisionEvidencePacket,
  analysis: StudentLearningMaterialAnalysis | undefined,
  errors: string[]
) {
  const validation = validateStudentLearningMaterialUserFacingResult(result, {
    packet,
    analysis
  });
  errors.push(...validation.errors.map((error) => `result_path ${error}`));
}

function validateQuestionSegmentationReviewArtifact(
  review: StudentLearningMaterialQuestionSegmentationReview,
  packet: VisionEvidencePacket,
  gold: StudentLearningMaterialGoldCase,
  errors: string[],
  warnings: string[]
) {
  const validation = validateQuestionSegmentationReview(review, packet);
  errors.push(...validation.errors.map((error) => `question_segmentation_review_path invalid: ${error}`));
  warnings.push(...validation.warnings.map((warning) => `question_segmentation_review_path warning: ${warning}`));

  const reviewQuestionIds = new Set(review.questions.map((question) => question.question_id));
  gold.questions.forEach((question) => {
    if (!reviewQuestionIds.has(question.question_id)) {
      errors.push(`question_segmentation_review_path missing gold question_id=${question.question_id}`);
      return;
    }
    const reviewQuestion = review.questions.find((item) => item.question_id === question.question_id);
    if (question.definitive_judgement_allowed && reviewQuestion?.status !== "pass") {
      errors.push(`question_segmentation_review_path question_id=${question.question_id} must pass segmentation before definitive gold judgement`);
    }
  });
  if (review.summary.orphan_evidence_count > 0) {
    errors.push("question_segmentation_review_path must not contain orphan evidence for 99% asset validation");
  }
}

function validateProviderTrialReportArtifact(
  report: StudentLearningMaterialVisionProviderTrialReport,
  packet: VisionEvidencePacket,
  segmentationReview: StudentLearningMaterialQuestionSegmentationReview | undefined,
  errors: string[]
) {
  const validation = validateVisionProviderTrialReport(report, packet, segmentationReview);
  errors.push(...validation.errors.map((error) => `provider_trial_report_path invalid: ${error}`));
}

function validateAnnotationTaskArtifact(
  task: StudentLearningMaterialGoldLabelAnnotationTask,
  packet: VisionEvidencePacket,
  segmentationReview: StudentLearningMaterialQuestionSegmentationReview | undefined,
  gold: StudentLearningMaterialGoldCase,
  errors: string[],
  warnings: string[]
) {
  const validation = validateGoldLabelAnnotationTask(task, packet);
  errors.push(...validation.errors.map((error) => `annotation_task_path invalid: ${error}`));
  warnings.push(...validation.warnings.map((warning) => `annotation_task_path warning: ${warning}`));

  if (task.case_id !== gold.case_id) {
    errors.push(`annotation_task_path case_id must match adjudicated gold case_id`);
  }
  const annotationImportSkeleton = task.annotation_import_skeleton;
  if (!annotationImportSkeleton) return;
  if (annotationImportSkeleton.case_id !== gold.case_id) {
    errors.push(`annotation_task_path annotation_import_skeleton.case_id must match adjudicated gold case_id`);
  }
  if (annotationImportSkeleton.source_material_id !== packet.source_material_id) {
    errors.push(`annotation_task_path annotation_import_skeleton.source_material_id must match VisionEvidencePacket`);
  }
  if (annotationImportSkeleton.vision_packet_id !== packet.plugin_run_id) {
    errors.push(`annotation_task_path annotation_import_skeleton.vision_packet_id must match VisionEvidencePacket plugin_run_id`);
  }
  if (annotationImportSkeleton.material_id !== packet.material_id) {
    errors.push(`annotation_task_path annotation_import_skeleton.material_id must match VisionEvidencePacket material_id`);
  }

  const taskQuestionIds = new Set(task.questions.map((question) => question.question_id));
  gold.questions.forEach((question) => {
    if (!taskQuestionIds.has(question.question_id)) errors.push(`annotation_task_path missing gold question_id=${question.question_id}`);
  });

  if (segmentationReview) {
    const reviewByQuestionId = new Map(segmentationReview.questions.map((question) => [question.question_id, question]));
    task.questions.forEach((question) => {
      const reviewQuestion = reviewByQuestionId.get(question.question_id);
      if (!reviewQuestion) {
        errors.push(`annotation_task_path question_id=${question.question_id} missing from question_segmentation_review_path`);
        return;
      }
      if (question.segmentation_status !== reviewQuestion.status) {
        errors.push(`annotation_task_path question_id=${question.question_id} segmentation_status must match question_segmentation_review_path`);
      }
      if (question.definitive_judgement_allowed_suggestion && reviewQuestion.status !== "pass") {
        errors.push(`annotation_task_path question_id=${question.question_id} definitive suggestion requires pass segmentation review`);
      }
    });
  }
}

function validateAnnotationImportArtifact(
  annotationImport: StudentLearningMaterialGoldLabelAnnotationImport,
  packet: VisionEvidencePacket,
  segmentationReview: StudentLearningMaterialQuestionSegmentationReview | undefined,
  packageValue: StudentLearningMaterialGoldLabelPackage,
  allowedExternalEvidenceRefsByQuestionId: Map<string, string[]>,
  errors: string[],
  warnings: string[]
) {
  const conversion = createGoldLabelPackageFromAnnotationImport(annotationImport, packet, {
    requireAdjudication: true,
    questionSegmentationReview: segmentationReview,
    allowedExternalEvidenceRefsByQuestionId
  });

  if (!conversion.ok) {
    errors.push(...conversion.errors.map((error) => `annotation_import_path invalid: ${error}`));
    warnings.push(...conversion.warnings.map((warning) => `annotation_import_path warning: ${warning}`));
    return;
  }

  warnings.push(...conversion.warnings.map((warning) => `annotation_import_path warning: ${warning}`));
  errors.push(...conversion.validation.errors.map((error) => `annotation_import_path generated gold package invalid: ${error}`));
  warnings.push(...conversion.validation.warnings.map((warning) => `annotation_import_path generated gold package warning: ${warning}`));

  listGoldLabelPackageProvenanceDifferences(conversion.package, packageValue).forEach((difference) => {
    errors.push(`annotation_import_path generated ${difference} must match gold_label_package_path`);
  });
}

function validateGoldLabelReviewReportArtifact(
  report: StudentLearningMaterialGoldLabelReviewReport,
  packageValue: StudentLearningMaterialGoldLabelPackage,
  packet: VisionEvidencePacket,
  allowedExternalEvidenceRefsByQuestionId: Map<string, string[]>,
  errors: string[],
  warnings: string[]
) {
  const validation = validateGoldLabelReviewReport(report, packageValue, packet, {
    allowedExternalEvidenceRefsByQuestionId
  });
  errors.push(...validation.errors.map((error) => `gold_label_review_report_path invalid: ${error}`));
  warnings.push(...validation.warnings.map((warning) => `gold_label_review_report_path warning: ${warning}`));
  if (!report.readiness.ready_for_99_evaluation) {
    errors.push(`gold_label_review_report_path is not ready for 99% evaluation: ${report.readiness.blockers.join("；") || "unknown blocker"}`);
  }
}

function validateMonthlyReportInputArtifact(input: StudentMonthlyReportFileInput, errors: string[], warnings: string[]) {
  const validation = validateStudentMonthlyReportFileInput(input);
  errors.push(...validation.errors.map((error) => `monthly_report_input_path ${error}`));
  warnings.push(...validation.warnings.map((warning) => `monthly_report_input_path warning: ${warning}`));
}

function validateMonthlyReportArtifact(
  report: StudentMonthlyReport,
  analysis: StudentLearningMaterialAnalysis | undefined,
  result: StudentLearningMaterialUserFacingResult | undefined,
  monthlyReportInput: StudentMonthlyReportFileInput | undefined,
  errors: string[]
) {
  if (report.schema_version !== "student_monthly_report_v1") errors.push("monthly_report_path schema_version must be student_monthly_report_v1");
  if (report.report_type !== "student") errors.push("monthly_report_path report_type must be student");
  if (report.audience !== "parent") errors.push("monthly_report_path audience must be parent");
  if (report.evidence_timeline.length !== report.readiness.source_count) {
    errors.push("monthly_report_path evidence_timeline length must match readiness.source_count");
  }
  validateMonthlyReportComparisonEvidence(report, errors);
  if (analysis && report.month_label !== formatMonthLabel(analysis.monthly_report_snapshot.month)) {
    errors.push("monthly_report_path month_label must match analysis monthly_report_snapshot.month");
  }
  if (result && report.month_label !== formatMonthLabel(result.monthly_result.month)) {
    errors.push("monthly_report_path month_label must match result monthly_result.month");
  }
  const forbiddenTerms = forbiddenParentTerms.filter((term) => report.parent_message.includes(term));
  if (forbiddenTerms.length) {
    errors.push(`monthly_report_path parent_message contains forbidden expressions: ${forbiddenTerms.join(", ")}`);
  }
  if (monthlyReportInput) validateMonthlyReportAgainstInput(report, monthlyReportInput, errors);
}

function validateMonthlyReportAgainstInput(report: StudentMonthlyReport, input: StudentMonthlyReportFileInput, errors: string[]) {
  if (report.month_label !== formatMonthLabel(input.current_month)) {
    errors.push("monthly_report_path month_label must match monthly_report_input_path.current_month");
  }
  if (report.student_name !== input.student_name) {
    errors.push("monthly_report_path student_name must match monthly_report_input_path.student_name");
  }
  const expectedCurrentSourceCount = (input.snapshots?.length || 0) + (input.confirmed_sources?.length || 0);
  if (report.readiness.source_count !== expectedCurrentSourceCount) {
    errors.push("monthly_report_path readiness.source_count must match monthly_report_input_path current confirmed source count");
  }
  const expectedCurrentSourceIds = buildMonthlyReportInputCurrentSourceIds(input);
  const actualCurrentSourceIds = report.evidence_timeline.map((source) => source.id).filter((sourceId): sourceId is string => readString(sourceId) !== undefined);
  if (!sameOrderedStrings(actualCurrentSourceIds, expectedCurrentSourceIds)) {
    errors.push("monthly_report_path evidence_timeline source ids must match monthly_report_input_path current source ids");
  }
  const expectedPreviousSourceIds = buildMonthlyReportInputPreviousSourceIds(input);
  const actualPreviousSourceIds = Array.isArray(report.comparison_evidence?.previous_month_source_ids)
    ? report.comparison_evidence.previous_month_source_ids
        .map((sourceId) => readString(sourceId))
        .filter((sourceId): sourceId is string => sourceId !== undefined)
    : [];
  if (!sameOrderedStrings(actualPreviousSourceIds, expectedPreviousSourceIds)) {
    errors.push("monthly_report_path comparison_evidence.previous_month_source_ids must match monthly_report_input_path previous source ids");
  }
  const hasPreviousInputEvidence =
    (input.previous_month_snapshots?.length || 0) > 0 ||
    (input.previous_month_confirmed_sources?.length || 0) > 0 ||
    Boolean(input.previous_report);
  if (report.comparison_evidence.previous_month_evidence_status === "available" && !hasPreviousInputEvidence) {
    errors.push("monthly_report_path comparison_evidence available status requires previous-month evidence in monthly_report_input_path");
  }
}

function buildMonthlyReportInputCurrentSourceIds(input: StudentMonthlyReportFileInput) {
  return buildMonthlyReportInputSourceIds(input.snapshots, input.confirmed_sources);
}

function buildMonthlyReportInputPreviousSourceIds(input: StudentMonthlyReportFileInput) {
  return uniqueFilled([
    ...buildMonthlyReportInputSourceIds(input.previous_month_snapshots, input.previous_month_confirmed_sources),
    ...readPreviousReportEvidenceTimelineSourceIds(input.previous_report)
  ]);
}

function buildMonthlyReportInputSourceIds(
  snapshots: StudentMonthlyReportFileInput["snapshots"],
  sources: StudentMonthlyReportFileInput["confirmed_sources"]
) {
  return [
    ...(snapshots || []).map((snapshot) => ({
      sourceDate: readString(snapshot.material_date),
      sourceId: readString(snapshot.source_skill_run_id) || readString(snapshot.source_analysis_id)
    })),
    ...(sources || []).map((source) => ({
      sourceDate: readString(source.occurred_at) || readString(source.confirmed_at),
      sourceId: readString(source.id)
    }))
  ]
    .filter((source): source is { sourceDate: string; sourceId: string } => Boolean(source.sourceDate && source.sourceId))
    .sort((left, right) => left.sourceDate.localeCompare(right.sourceDate))
    .map((source) => source.sourceId);
}

function readPreviousReportEvidenceTimelineSourceIds(previousReport: StudentMonthlyReportFileInput["previous_report"]) {
  if (!Array.isArray(previousReport?.evidence_timeline)) return [];
  return uniqueFilled(previousReport.evidence_timeline.map((source) => readString(source.id)).filter((sourceId): sourceId is string => sourceId !== undefined));
}

function validateMonthlyReportComparisonEvidence(report: StudentMonthlyReport, errors: string[]) {
  const evidence = report.comparison_evidence;
  if (!isRecord(evidence)) {
    errors.push("monthly_report_path comparison_evidence is required");
    return;
  }
  if (evidence.current_month_source_count !== report.readiness.source_count) {
    errors.push("monthly_report_path comparison_evidence.current_month_source_count must match readiness.source_count");
  }
  if (evidence.previous_month_evidence_status !== "available" && evidence.previous_month_evidence_status !== "missing") {
    errors.push("monthly_report_path comparison_evidence.previous_month_evidence_status must be available or missing");
  }
  if (!Number.isInteger(evidence.previous_month_source_count) || evidence.previous_month_source_count < 0) {
    errors.push("monthly_report_path comparison_evidence.previous_month_source_count must be a non-negative integer");
  }
  if (!Array.isArray(evidence.previous_month_source_ids)) {
    errors.push("monthly_report_path comparison_evidence.previous_month_source_ids must be an array");
  }
  const previousMonthSourceIds = Array.isArray(evidence.previous_month_source_ids)
    ? evidence.previous_month_source_ids.filter((sourceId): sourceId is string => readString(sourceId) !== undefined).map((sourceId) => sourceId.trim())
    : [];
  const duplicatePreviousMonthSourceIds = findDuplicates(previousMonthSourceIds);
  if (Array.isArray(evidence.previous_month_source_ids) && evidence.previous_month_source_ids.some((sourceId) => !readString(sourceId))) {
    errors.push("monthly_report_path comparison_evidence.previous_month_source_ids must contain non-empty source ids");
  }
  if (duplicatePreviousMonthSourceIds.length) {
    errors.push(`monthly_report_path comparison_evidence.previous_month_source_ids duplicate source ids: ${duplicatePreviousMonthSourceIds.join(", ")}`);
  }
  if (Number.isInteger(evidence.previous_month_source_count) && evidence.previous_month_source_count !== previousMonthSourceIds.length) {
    errors.push("monthly_report_path comparison_evidence.previous_month_source_count must match previous_month_source_ids length");
  }

  const hasPreviousEvidence = hasMonthlyReportPreviousMonthEvidence(report);
  if (evidence.previous_month_evidence_status === "available" && !hasPreviousEvidence) {
    errors.push("monthly_report_path comparison_evidence available status requires previous-month source ids");
  }
  if (evidence.previous_month_evidence_status === "available" && previousMonthSourceIds.length === 0) {
    errors.push("monthly_report_path comparison_evidence available status requires replayable previous-month source ids");
  }
  if (evidence.previous_month_evidence_status === "missing" && evidence.previous_month_source_count > 0) {
    errors.push("monthly_report_path comparison_evidence missing status must not include previous-month source count");
  }
  if (evidence.previous_month_evidence_status === "missing" && previousMonthSourceIds.length > 0) {
    errors.push("monthly_report_path comparison_evidence missing status must not include previous-month source ids");
  }
  if (evidence.previous_month_evidence_status === "missing" && evidence.previous_month_report_used) {
    errors.push("monthly_report_path comparison_evidence missing status must not mark previous_month_report_used");
  }
  if (hasMonthlyTrendClaim(report) && !hasPreviousEvidence) {
    errors.push("monthly_report_path month_over_month_comparison makes a trend claim without replayable previous-month evidence");
  }
  if (!hasPreviousEvidence && !statesMissingPreviousMonthEvidence(report)) {
    errors.push("monthly_report_path month_over_month_comparison must state missing previous-month evidence when comparison_evidence is missing");
  }
}

function hasMonthlyReportPreviousMonthEvidence(report: StudentMonthlyReport) {
  const evidence = report.comparison_evidence;
  return (
    isRecord(evidence) &&
    evidence.previous_month_evidence_status === "available" &&
    typeof evidence.previous_month_source_count === "number" &&
    evidence.previous_month_source_count > 0 &&
    Array.isArray(evidence.previous_month_source_ids) &&
    evidence.previous_month_source_ids.some((sourceId) => readString(sourceId))
  );
}

function hasMonthlyTrendClaim(report: StudentMonthlyReport) {
  const comparison = report.month_over_month_comparison;
  const hasSignalArrays =
    comparison.improved_signals.length > 0 ||
    comparison.stable_signals.length > 0 ||
    comparison.repeated_issues.length > 0 ||
    comparison.new_issues.length > 0;
  const comparisonText = `${comparison.summary} ${comparison.parent_readable_comparison}`;
  return hasSignalArrays || /和上月相比|和上个月相比|较上月|相比.*积极变化|更稳定|提升|下降|退步/.test(comparisonText);
}

function statesMissingPreviousMonthEvidence(report: StudentMonthlyReport) {
  const comparison = report.month_over_month_comparison;
  const texts = [
    ...comparison.insufficient_evidence,
    comparison.summary,
    comparison.parent_readable_comparison,
    ...report.readiness.missing_sources
  ];
  return texts.some((text) => /缺少上月|上月可比.*不足|上月.*不足|不做强趋势|暂不做完整纵向/.test(text));
}

function validateDeliveryBundleArtifact(
  bundle: StudentLearningMaterialDeliveryBundle,
  packet: VisionEvidencePacket,
  analysis: StudentLearningMaterialAnalysis | undefined,
  result: StudentLearningMaterialUserFacingResult | undefined,
  monthlyReport: StudentMonthlyReport | undefined,
  errors: string[]
) {
  const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
    packet,
    analysis,
    result,
    monthlyReport
  });
  errors.push(...validation.errors.map((error) => `delivery_bundle_path ${error}`));
}

function validateTeacherReviewPacketArtifact(
  packet: StudentLearningMaterialTeacherReviewPacket,
  deliveryBundle: StudentLearningMaterialDeliveryBundle | undefined,
  errors: string[]
) {
  if (!deliveryBundle) {
    errors.push("teacher_review_packet_path requires delivery_bundle_path for same-source validation");
    return;
  }
  const validation = validateStudentLearningMaterialTeacherReviewPacket(packet, deliveryBundle);
  errors.push(...validation.errors.map((error) => `teacher_review_packet_path ${error}`));
}

function validateQuestionEvidenceBasisRefs(
  labels: HumanGoldLabel[],
  packet: VisionEvidencePacket,
  externalSideInputRefs: Set<string>,
  externalSideInputRefsByQuestionId: Map<string, string[]>,
  errors: string[]
) {
  const packetEvidenceRefs = new Set(packet.evidences.map((evidence) => evidence.evidence_ref));
  const packetEvidenceQuestionIds = new Map(packet.evidences.map((evidence) => [evidence.evidence_ref, evidence.question_id]));
  const packetQuestionIds = new Set(packet.questions.map((question) => question.question_id));
  labels.forEach((label) => {
    const bases = Array.isArray(label.question_evidence_basis) ? label.question_evidence_basis : [];
    bases.forEach((basis) => {
      if (!packetQuestionIds.has(basis.question_id)) {
        errors.push(`label ${label.label_id} question_evidence_basis references unknown question_id=${basis.question_id}`);
      }
      const studentTraceRefs = Array.isArray(basis.student_trace_evidence_refs) ? basis.student_trace_evidence_refs : [];
      studentTraceRefs.forEach((ref) => {
        if (!packetEvidenceRefs.has(ref)) {
          errors.push(`label ${label.label_id} student trace evidence_ref not found in VisionEvidencePacket: ${ref}`);
          return;
        }
        validatePacketEvidenceRefQuestionScope(label.label_id, basis.question_id, ref, packetEvidenceQuestionIds, "student trace", errors);
      });
      const answerBasisRefs = Array.isArray(basis.answer_key_or_rubric_evidence_refs) ? basis.answer_key_or_rubric_evidence_refs : [];
      answerBasisRefs.forEach((ref) => {
        if (packetEvidenceRefs.has(ref)) {
          validatePacketEvidenceRefQuestionScope(label.label_id, basis.question_id, ref, packetEvidenceQuestionIds, "answer/rubric", errors);
          return;
        }
        if (externalSideInputRefs.has(ref)) {
          validateExternalSideInputRefQuestionScope(label.label_id, basis.question_id, ref, externalSideInputRefsByQuestionId, "answer/rubric", errors);
          return;
        }
        if (!packetEvidenceRefs.has(ref) && !externalSideInputRefs.has(ref)) {
          errors.push(`label ${label.label_id} answer/rubric evidence_ref not found in VisionEvidencePacket or side inputs: ${ref}`);
        }
      });
      const teacherCorrectionRefs = Array.isArray(basis.teacher_correction_evidence_refs) ? basis.teacher_correction_evidence_refs : [];
      teacherCorrectionRefs.forEach((ref) => {
        if (!packetEvidenceRefs.has(ref)) {
          errors.push(`label ${label.label_id} teacher correction evidence_ref not found in VisionEvidencePacket: ${ref}`);
          return;
        }
        validatePacketEvidenceRefQuestionScope(label.label_id, basis.question_id, ref, packetEvidenceQuestionIds, "teacher correction", errors);
      });
    });
  });
}

function buildExternalSideInputRefsByQuestionId(readiness: ReturnType<typeof buildQuestionEvidenceReadiness>) {
  return new Map(
    readiness.questions.map((question) => [question.question_id, question.evidenceRefs.filter((ref) => ref.startsWith("side_input."))])
  );
}

function validatePacketEvidenceRefQuestionScope(
  labelId: string,
  basisQuestionId: string,
  ref: string,
  packetEvidenceQuestionIds: Map<string, string>,
  refKind: string,
  errors: string[]
) {
  const evidenceQuestionId = packetEvidenceQuestionIds.get(ref);
  if (evidenceQuestionId && evidenceQuestionId !== basisQuestionId) {
    errors.push(`label ${labelId} ${refKind} evidence_ref belongs to question_id=${evidenceQuestionId} but basis question_id=${basisQuestionId}: ${ref}`);
  }
}

function validateExternalSideInputRefQuestionScope(
  labelId: string,
  basisQuestionId: string,
  ref: string,
  externalSideInputRefsByQuestionId: Map<string, string[]>,
  refKind: string,
  errors: string[]
) {
  if (!externalSideInputRefsByQuestionId.get(basisQuestionId)?.includes(ref)) {
    errors.push(`label ${labelId} ${refKind} side input evidence_ref is not mapped to question_id=${basisQuestionId}: ${ref}`);
  }
}

function validateSideInputQuestionIds(values: unknown[] | undefined, packetQuestionIds: Set<string>, fieldName: string, errors: string[]) {
  if (!values) return;
  values.forEach((value, index) => {
    const questionId = extractExplicitQuestionId(value);
    if (!questionId) {
      errors.push(`${fieldName}[${index}] must include question_id or questionId`);
      return;
    }
    if (!packetQuestionIds.has(questionId)) {
      errors.push(`${fieldName}[${index}] question_id=${questionId} does not exist in VisionEvidencePacket`);
    }
  });
}

function buildValidationResult(input: {
  errors: string[];
  warnings: string[];
  cases: StudentLearningMaterialEvaluationAssetCaseValidation[];
  dataset_id?: string;
  dataset_kind?: StudentLearningMaterialEvaluationDatasetKind;
}): StudentLearningMaterialEvaluationAssetManifestValidation {
  const regionsOrCurricula = uniqueSorted(input.cases.map((item) => item.region_or_curriculum_candidate).filter((item): item is string => Boolean(item)));
  const regionCurriculumCoverage = buildMainlandK12RegionCurriculumCoverage(regionsOrCurricula);
  const summary = {
    case_count: input.cases.length,
    question_count: sum(input.cases, "question_count"),
    gold_question_count: sum(input.cases, "gold_question_count"),
    definitive_gold_question_count: sum(input.cases, "definitive_gold_question_count"),
    teacher_review_expected_question_count: input.cases.reduce(
      (total, item) => total + Math.max(0, item.gold_question_count - item.definitive_gold_question_count),
      0
    ),
    readiness_definitive_allowed_count: sum(input.cases, "readiness_definitive_allowed_count"),
    readiness_teacher_review_required_count: sum(input.cases, "readiness_teacher_review_required_count"),
    readiness_blocked_count: sum(input.cases, "readiness_blocked_count")
  };
  const coverage = {
    material_states: uniqueSorted(input.cases.map((item) => item.material_state).filter((item): item is MaterialState => Boolean(item))),
    material_types: uniqueSorted(input.cases.map((item) => item.material_type).filter((item): item is K12MaterialType => Boolean(item))),
    subjects: uniqueSorted(input.cases.map((item) => item.subject).filter((item): item is K12Subject => Boolean(item))),
    education_stages: uniqueSorted(input.cases.map((item) => item.education_stage).filter((item): item is K12EducationStage => Boolean(item))),
    grade_candidates: uniqueSorted(input.cases.map((item) => item.grade_candidate).filter((item): item is string => Boolean(item))),
    regions_or_curricula: regionsOrCurricula,
    region_or_curriculum_groups: regionCurriculumCoverage.region_groups,
    curriculum_version_families: regionCurriculumCoverage.curriculum_version_families,
    exam_scope_signals: regionCurriculumCoverage.exam_scope_signals,
    plugin_providers: uniqueSorted(input.cases.map((item) => item.plugin_provider).filter((item): item is string => Boolean(item))),
    vision_source_kinds: uniqueSorted(input.cases.map((item) => item.vision_source_kind).filter((item): item is VisionSourceKind => Boolean(item))),
    mock_or_synthetic_source_case_count: input.cases.filter((item) => item.is_mock_or_synthetic_source).length,
    public_benchmark_source_case_count: input.cases.filter((item) => item.is_public_benchmark_source).length,
    external_vision_input_artifact_case_count: input.cases.filter((item) => item.has_external_vision_input_artifact).length,
    external_answer_key_case_count: input.cases.filter((item) => item.has_external_answer_keys).length,
    external_rubric_case_count: input.cases.filter((item) => item.has_external_rubrics).length,
    provider_trial_report_artifact_case_count: input.cases.filter((item) => item.has_provider_trial_report_artifact).length,
    provider_trial_report_ready_case_count: input.cases.filter((item) => item.provider_trial_report_readiness === "ready_for_human_labeling").length,
    provider_trial_report_needs_evidence_completion_case_count: input.cases.filter((item) => item.provider_trial_report_readiness === "needs_evidence_completion").length,
    provider_trial_report_blocked_case_count: input.cases.filter((item) => item.provider_trial_report_readiness === "blocked").length,
    provider_candidate_trace_case_count: input.cases.filter((item) => item.has_provider_candidate_trace).length,
    provider_benchmark_candidate_case_count: input.cases.filter((item) => item.has_provider_benchmark_candidate).length,
    provider_candidate_source_url_case_count: input.cases.filter((item) => item.has_provider_candidate_source_urls).length,
    provider_license_review_note_case_count: input.cases.filter((item) => item.has_provider_license_review_notes).length,
    provider_document_or_ocr_candidate_case_count: input.cases.filter((item) => item.has_provider_document_or_ocr_candidate).length,
    provider_layout_candidate_case_count: input.cases.filter((item) => item.has_provider_layout_candidate).length,
    provider_formula_candidate_case_count: input.cases.filter((item) => item.has_provider_formula_candidate).length,
    question_segmentation_review_artifact_case_count: input.cases.filter((item) => item.has_question_segmentation_review_artifact).length,
    annotation_task_artifact_case_count: input.cases.filter((item) => item.has_annotation_task_artifact).length,
    annotation_import_artifact_case_count: input.cases.filter((item) => item.has_annotation_import_artifact).length,
    gold_label_review_report_artifact_case_count: input.cases.filter((item) => item.has_gold_label_review_report_artifact).length,
    gold_label_review_ready_case_count: input.cases.filter((item) => item.gold_label_review_ready_for_99).length,
    gold_label_review_disagreement_case_count: input.cases.filter((item) => (item.gold_label_review_disagreement_count ?? 0) > 0).length,
    human_gold_package_count: input.cases.filter((item) => item.gold_question_count > 0).length,
    analysis_artifact_case_count: input.cases.filter((item) => item.has_analysis_artifact).length,
    user_result_artifact_case_count: input.cases.filter((item) => item.has_user_result_artifact).length,
    monthly_report_input_artifact_case_count: input.cases.filter((item) => item.has_monthly_report_input_artifact).length,
    monthly_report_artifact_case_count: input.cases.filter((item) => item.has_monthly_report_artifact).length,
    monthly_report_previous_month_evidence_case_count: input.cases.filter((item) => item.has_monthly_report_previous_month_evidence).length,
    delivery_bundle_artifact_case_count: input.cases.filter((item) => item.has_delivery_bundle_artifact).length,
    teacher_review_packet_artifact_case_count: input.cases.filter((item) => item.has_teacher_review_packet_artifact).length
  };
  const claimReadiness = buildClaimReadiness({
    errors: input.errors,
    cases: input.cases,
    dataset_kind: input.dataset_kind,
    summary,
    coverage
  });
  const result = {
    ok: input.errors.length === 0 && input.cases.every((item) => item.ok),
    errors: input.errors,
    warnings: input.warnings,
    dataset_id: input.dataset_id,
    dataset_kind: input.dataset_kind,
    cases: input.cases,
    summary,
    coverage,
    claimReadiness
  };

  return {
    ...result,
    report: formatStudentLearningMaterialEvaluationAssetManifestReport(result)
  };
}

function emptyCaseValidation(caseId: string, errors: string[], warnings: string[], packet?: VisionEvidencePacket): StudentLearningMaterialEvaluationAssetCaseValidation {
  return {
    case_id: caseId,
    ok: false,
    errors,
    warnings,
    material_id: packet?.material_id,
    material_state: packet?.material_state,
    plugin_provider: packet?.plugin_provider,
    vision_source_kind: packet?.pipeline_trace?.preprocessing?.source_kind,
    is_mock_or_synthetic_source: packet ? isMockOrSyntheticVisionSource(packet) : false,
    is_public_benchmark_source: packet ? isPublicBenchmarkVisionSource(packet) : false,
    has_external_vision_input_artifact: false,
    has_external_answer_keys: false,
    has_external_rubrics: false,
    has_provider_trial_report_artifact: false,
    provider_trial_report_readiness: undefined,
    has_provider_candidate_trace: false,
    has_provider_benchmark_candidate: false,
    has_provider_candidate_source_urls: false,
    has_provider_license_review_notes: false,
    has_provider_document_or_ocr_candidate: false,
    has_provider_layout_candidate: false,
    has_provider_formula_candidate: false,
    has_question_segmentation_review_artifact: false,
    has_annotation_task_artifact: false,
    has_annotation_import_artifact: false,
    has_gold_label_review_report_artifact: false,
    gold_label_review_ready_for_99: false,
    gold_label_review_disagreement_count: undefined,
    question_count: packet?.questions.length ?? 0,
    gold_question_count: 0,
    definitive_gold_question_count: 0,
    readiness_definitive_allowed_count: 0,
    readiness_teacher_review_required_count: 0,
    readiness_blocked_count: 0,
    has_analysis_artifact: false,
    has_user_result_artifact: false,
    has_monthly_report_input_artifact: false,
    has_monthly_report_artifact: false,
    has_monthly_report_previous_month_evidence: false,
    has_delivery_bundle_artifact: false,
    has_teacher_review_packet_artifact: false
  };
}

function buildClaimReadiness(input: {
  errors: string[];
  cases: StudentLearningMaterialEvaluationAssetCaseValidation[];
  dataset_kind?: StudentLearningMaterialEvaluationDatasetKind;
  summary: StudentLearningMaterialEvaluationAssetManifestValidation["summary"];
  coverage: StudentLearningMaterialEvaluationAssetManifestValidation["coverage"];
}) {
  const policy = strictStudentLearningMaterialClaimPolicy;
  const blockers: string[] = [];
  const failedCases = input.cases.filter((item) => !item.ok).map((item) => item.case_id);
  const knownRegionsOrCurricula = input.coverage.regions_or_curricula.filter((item) => item !== "未识别");

  if (input.errors.length > 0 || failedCases.length > 0) {
    blockers.push(`资产清单仍有校验错误或失败 case：${failedCases.join(", ") || "manifest-level-errors"}。`);
  }
  if (policy.require_human_labeled_dataset && input.dataset_kind !== "human_labeled") {
    blockers.push("非 human_labeled 资产清单不能支撑 99% 宣称。");
  }
  if (input.dataset_kind === "human_labeled" && input.coverage.mock_or_synthetic_source_case_count > 0) {
    const mockCaseIds = input.cases
      .filter((item) => item.is_mock_or_synthetic_source)
      .map((item) => item.case_id)
      .join(", ");
    blockers.push(`human_labeled 资产包含 mock/synthetic Vision source：${mockCaseIds}。`);
  }
  if (input.dataset_kind === "human_labeled" && input.coverage.public_benchmark_source_case_count > 0) {
    const benchmarkCaseIds = input.cases
      .filter((item) => item.is_public_benchmark_source)
      .map((item) => item.case_id)
      .join(", ");
    blockers.push(`human_labeled 资产包含 public benchmark/source dataset：${benchmarkCaseIds}。公开 benchmark 只能作覆盖参考，不能替代真实脱敏学生材料 gold。`);
  }
  if (input.summary.case_count < policy.minimum_case_count) {
    blockers.push(`样本数不足：cases ${input.summary.case_count} < ${policy.minimum_case_count}。`);
  }
  if (input.summary.gold_question_count < policy.minimum_question_count) {
    blockers.push(`人工 gold 题目数不足：questions ${input.summary.gold_question_count} < ${policy.minimum_question_count}。`);
  }
  if (
    typeof policy.minimum_definitive_allowed_question_count === "number" &&
    input.summary.definitive_gold_question_count < policy.minimum_definitive_allowed_question_count
  ) {
    blockers.push(`可硬判 gold 题覆盖不足：definitiveGold ${input.summary.definitive_gold_question_count} < ${policy.minimum_definitive_allowed_question_count}。`);
  }
  if (
    typeof policy.minimum_teacher_review_expected_question_count === "number" &&
    input.summary.teacher_review_expected_question_count < policy.minimum_teacher_review_expected_question_count
  ) {
    blockers.push(
      `需老师复核 gold 题覆盖不足：teacherReviewExpected ${input.summary.teacher_review_expected_question_count} < ${policy.minimum_teacher_review_expected_question_count}。`
    );
  }
  if (typeof policy.minimum_material_type_count === "number" && input.coverage.material_types.length < policy.minimum_material_type_count) {
    blockers.push(`材料类型覆盖不足：materialTypes ${input.coverage.material_types.length} < ${policy.minimum_material_type_count}。`);
  }
  if (typeof policy.minimum_subject_count === "number" && input.coverage.subjects.length < policy.minimum_subject_count) {
    blockers.push(`学科覆盖不足：subjects ${input.coverage.subjects.length} < ${policy.minimum_subject_count}。`);
  }
  const requiredStages = policy.required_education_stages ?? [];
  const missingStages = requiredStages.filter((stage) => !input.coverage.education_stages.includes(stage));
  if (missingStages.length) blockers.push(`学段覆盖不足：缺少 ${missingStages.join(", ")}。`);
  if (typeof policy.minimum_region_or_curriculum_count === "number" && knownRegionsOrCurricula.length < policy.minimum_region_or_curriculum_count) {
    blockers.push(`地区/教材线索覆盖不足：knownRegionsOrCurricula ${knownRegionsOrCurricula.length} < ${policy.minimum_region_or_curriculum_count}。`);
  }
  if (
    typeof policy.minimum_region_or_curriculum_group_count === "number" &&
    input.coverage.region_or_curriculum_groups.length < policy.minimum_region_or_curriculum_group_count
  ) {
    blockers.push(
      `大陆区域覆盖不足：regionOrCurriculumGroups ${input.coverage.region_or_curriculum_groups.length} < ${policy.minimum_region_or_curriculum_group_count}。`
    );
  }
  if (
    typeof policy.minimum_curriculum_version_family_count === "number" &&
    input.coverage.curriculum_version_families.length < policy.minimum_curriculum_version_family_count
  ) {
    blockers.push(
      `教材版本族覆盖不足：curriculumVersionFamilies ${input.coverage.curriculum_version_families.length} < ${policy.minimum_curriculum_version_family_count}。`
    );
  }
  if (policy.require_exam_scope_signal && input.coverage.exam_scope_signals.length === 0) {
    blockers.push("全国卷/新高考等考试范围线索覆盖不足。");
  }
  if (input.coverage.human_gold_package_count < input.summary.case_count) {
    blockers.push(`人工 gold package 覆盖不足：humanGoldPackages ${input.coverage.human_gold_package_count} < cases ${input.summary.case_count}。`);
  }
  if (input.coverage.external_vision_input_artifact_case_count < input.summary.case_count) {
    blockers.push(
      `外部 Provider 输入 artifact 覆盖不足：externalVisionInput ${input.coverage.external_vision_input_artifact_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.provider_trial_report_artifact_case_count < input.summary.case_count) {
    blockers.push(
      `Provider 试跑报告覆盖不足：providerTrial ${input.coverage.provider_trial_report_artifact_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.provider_trial_report_blocked_case_count > 0) {
    const blockedCaseIds = input.cases
      .filter((item) => item.provider_trial_report_readiness === "blocked")
      .map((item) => item.case_id)
      .join(", ");
    blockers.push(`Provider 试跑报告仍有 blocked case：${blockedCaseIds}。`);
  }
  if (input.coverage.provider_candidate_trace_case_count < input.summary.case_count) {
    blockers.push(
      `Provider 候选评估覆盖不足：providerCandidateTrace ${input.coverage.provider_candidate_trace_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.provider_benchmark_candidate_case_count < input.summary.case_count) {
    blockers.push(
      `Provider benchmark/open-source 候选覆盖不足：benchmarkCandidates ${input.coverage.provider_benchmark_candidate_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.provider_candidate_source_url_case_count < input.summary.case_count) {
    blockers.push(
      `Provider 候选来源 URL 覆盖不足：sourceUrls ${input.coverage.provider_candidate_source_url_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.provider_license_review_note_case_count < input.summary.case_count) {
    blockers.push(
      `Provider 许可/部署复核备注覆盖不足：licenseNotes ${input.coverage.provider_license_review_note_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.provider_document_or_ocr_candidate_case_count < input.summary.case_count) {
    blockers.push(
      `Provider OCR/文档解析候选覆盖不足：documentOrOcr ${input.coverage.provider_document_or_ocr_candidate_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.provider_layout_candidate_case_count < input.summary.case_count) {
    blockers.push(
      `Provider layout 候选覆盖不足：layout ${input.coverage.provider_layout_candidate_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.provider_formula_candidate_case_count < input.summary.case_count) {
    blockers.push(
      `Provider 公式识别候选覆盖不足：formula ${input.coverage.provider_formula_candidate_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.question_segmentation_review_artifact_case_count < input.summary.case_count) {
    blockers.push(
      `题目切分 QA artifact 覆盖不足：segmentationReview ${input.coverage.question_segmentation_review_artifact_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.annotation_task_artifact_case_count < input.summary.case_count) {
    blockers.push(`脱敏标注任务包覆盖不足：annotationTask ${input.coverage.annotation_task_artifact_case_count} < cases ${input.summary.case_count}。`);
  }
  if (input.coverage.annotation_import_artifact_case_count < input.summary.case_count) {
    blockers.push(`人工标注导入 artifact 覆盖不足：annotationImport ${input.coverage.annotation_import_artifact_case_count} < cases ${input.summary.case_count}。`);
  }
  if (input.coverage.gold_label_review_report_artifact_case_count < input.summary.case_count) {
    blockers.push(
      `人工双标一致性报告覆盖不足：goldLabelReview ${input.coverage.gold_label_review_report_artifact_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.gold_label_review_ready_case_count < input.summary.case_count) {
    blockers.push(
      `人工双标一致性报告未全部 ready：goldLabelReviewReady ${input.coverage.gold_label_review_ready_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.analysis_artifact_case_count < input.summary.case_count) {
    blockers.push(`analysis_path artifact 覆盖不足：analysis ${input.coverage.analysis_artifact_case_count} < cases ${input.summary.case_count}。`);
  }
  if (input.coverage.user_result_artifact_case_count < input.summary.case_count) {
    blockers.push(`用户可见 result artifact 覆盖不足：userResult ${input.coverage.user_result_artifact_case_count} < cases ${input.summary.case_count}。`);
  }
  if (input.coverage.monthly_report_input_artifact_case_count < input.summary.case_count) {
    blockers.push(
      `月报输入 artifact 覆盖不足：monthlyReportInput ${input.coverage.monthly_report_input_artifact_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.monthly_report_artifact_case_count < input.summary.case_count) {
    blockers.push(`月报 artifact 覆盖不足：monthlyReport ${input.coverage.monthly_report_artifact_case_count} < cases ${input.summary.case_count}。`);
  }
  if (input.coverage.monthly_report_previous_month_evidence_case_count < input.summary.case_count) {
    blockers.push(
      `月报上月对比证据覆盖不足：monthlyComparisonEvidence ${input.coverage.monthly_report_previous_month_evidence_case_count} < cases ${input.summary.case_count}。`
    );
  }
  if (input.coverage.delivery_bundle_artifact_case_count < input.summary.case_count) {
    blockers.push(`交付包 artifact 覆盖不足：deliveryBundle ${input.coverage.delivery_bundle_artifact_case_count} < cases ${input.summary.case_count}。`);
  }
  if (input.coverage.teacher_review_packet_artifact_case_count < input.summary.case_count) {
    blockers.push(
      `老师复核包 artifact 覆盖不足：teacherReviewPacket ${input.coverage.teacher_review_packet_artifact_case_count} < cases ${input.summary.case_count}。`
    );
  }

  return {
    claimable99AssetReady: blockers.length === 0,
    blockers
  };
}

function readOptionalJsonReference<T>(path: string | undefined, fieldName: string, baseDir?: string): { value?: T; errors: string[] } {
  if (!path) return { errors: [] };
  return readJsonReference<T>(path, fieldName, baseDir);
}

function readOptionalJsonArray(path: string | undefined, fieldName: string, baseDir?: string): { value?: unknown[]; errors: string[] } {
  if (!path) return { errors: [] };
  const result = readJsonReference<unknown>(path, fieldName, baseDir);
  if (!result.value) return { errors: result.errors };
  return {
    value: Array.isArray(result.value) ? result.value : [result.value],
    errors: result.errors
  };
}

function readJsonReference<T>(path: string, fieldName: string, baseDir?: string): { value?: T; errors: string[] } {
  const filePath = baseDir ? resolve(baseDir, path) : resolve(path);
  try {
    return { value: JSON.parse(readFileSync(filePath, "utf8")) as T, errors: [] };
  } catch (error) {
    return { errors: [`${fieldName} cannot be read or parsed: ${formatError(error)}`] };
  }
}

function extractExplicitQuestionId(value: unknown) {
  if (!isRecord(value)) return undefined;
  return readString(value.question_id) || readString(value.questionId);
}

function readDatasetKind(value: unknown): StudentLearningMaterialEvaluationDatasetKind | undefined {
  return value === "synthetic" || value === "human_labeled" || value === "mixed" ? value : undefined;
}

function isMockOrSyntheticVisionSource(packet: VisionEvidencePacket) {
  const providerText = `${packet.plugin_provider} ${packet.plugin_model_version}`.toLowerCase();
  if (packet.pipeline_trace?.preprocessing?.source_kind === "mock") return true;
  if (providerText.includes("mock") || providerText.includes("synthetic")) return true;
  if (packet.pages.some((page) => startsWithMockOrSyntheticRef(page.page_image_ref))) return true;
  return packet.evidences.some((evidence) => startsWithMockOrSyntheticRef(evidence.evidence_ref) || startsWithMockOrSyntheticRef(evidence.crop_ref));
}

const publicBenchmarkSourcePatterns = [
  /public[-_\s]*benchmark/,
  /benchmark[-_\s]*dataset/,
  /k12[-_\s]*vista/,
  /k12[-_\s]*bench/,
  /k12[-_\s]*kgraph/,
  /e[-_\s]*eval/,
  /cmmu/,
  /cmm[-_\s]*math/,
  /cmmath/,
  /ocr[-_\s]*bench/,
  /math23k/,
  /mwp[-_\s]*toolkit/,
  /ape210k/
];

function isPublicBenchmarkVisionSource(packet: VisionEvidencePacket) {
  const sourceStrings = [
    packet.material_id,
    packet.source_material_id,
    ...collectMetadataStrings(packet.metadata)
  ];
  return sourceStrings.some((value) => publicBenchmarkSourcePatterns.some((pattern) => pattern.test(value.toLowerCase())));
}

function collectMetadataStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectMetadataStrings(item));
  if (!isRecord(value)) return [];
  return Object.values(value).flatMap((item) => collectMetadataStrings(item));
}

function inspectProviderCandidateTrace(packet: VisionEvidencePacket) {
  const selectedProvider = packet.pipeline_trace?.selected_provider;
  const candidates = Array.isArray(packet.pipeline_trace?.provider_candidates) ? packet.pipeline_trace.provider_candidates : [];
  const hasProviderCandidateTrace = Boolean(
    selectedProvider && candidates.some((candidate) => candidate.name === selectedProvider && candidate.fit === "primary_candidate")
  );
  const hasBenchmarkCandidate = candidates.some((candidate) => candidate.fit === "fallback_candidate" || candidate.fit === "benchmark_only");
  const hasProviderCandidateSourceUrls = hasProviderCandidateTrace && candidates.length > 0 && candidates.every((candidate) => Boolean(readString(candidate.evidence_source_url)));
  const hasLicenseReviewNotes = hasProviderCandidateTrace && candidates.length > 0 && candidates.every((candidate) => Boolean(readString(candidate.license_note)));
  const hasDocumentOrOcrCandidate = candidates.some((candidate) => candidate.role === "document_parser" || candidate.role === "ocr");
  const hasLayoutCandidate = candidates.some((candidate) => candidate.role === "layout" || candidate.role === "document_parser");
  const hasFormulaCandidate = candidates.some((candidate) => candidate.role === "formula");
  return {
    has_provider_candidate_trace: hasProviderCandidateTrace,
    has_provider_benchmark_candidate: hasBenchmarkCandidate,
    has_provider_candidate_source_urls: hasProviderCandidateSourceUrls,
    has_provider_license_review_notes: hasLicenseReviewNotes,
    has_provider_document_or_ocr_candidate: hasDocumentOrOcrCandidate,
    has_provider_layout_candidate: hasLayoutCandidate,
    has_provider_formula_candidate: hasFormulaCandidate
  };
}

function startsWithMockOrSyntheticRef(value: string | undefined) {
  return Boolean(value && (/^(mock|synthetic):\/\//.test(value) || /^(mock|synthetic)\./.test(value)));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

function sameOrderedStrings(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameJsonValue(left: unknown, right: unknown) {
  return JSON.stringify(normalizeJsonValue(left)) === JSON.stringify(normalizeJsonValue(right));
}

function normalizeJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeJsonValue(item));
  if (!isRecord(value)) return value;
  return Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = normalizeJsonValue(value[key]);
      return result;
    }, {});
}

function uniqueFilled(items: Array<string | undefined>) {
  return Array.from(new Set(items.filter((item): item is string => Boolean(item?.trim()))));
}

function sum(
  items: StudentLearningMaterialEvaluationAssetCaseValidation[],
  key: keyof Pick<
    StudentLearningMaterialEvaluationAssetCaseValidation,
    "question_count" | "definitive_gold_question_count" | "readiness_definitive_allowed_count" | "readiness_teacher_review_required_count" | "readiness_blocked_count"
    | "gold_question_count"
  >
) {
  return items.reduce((total, item) => total + item[key], 0);
}

function uniqueSorted<T extends string>(items: T[]) {
  return Array.from(new Set(items)).sort();
}

function formatMonthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return `${match[1]} 年 ${Number(match[2])} 月`;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
