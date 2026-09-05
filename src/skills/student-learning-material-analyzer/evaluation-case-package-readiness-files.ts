import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
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
  validateStudentLearningMaterialEvaluationAssetManifestFromFile,
  validateExternalVisionInputAgainstVisionEvidencePacket,
  type StudentLearningMaterialEvaluationAssetManifestCase,
  type StudentLearningMaterialEvaluationAssetManifestValidation
} from "./evaluation-assets";
import {
  formatStudentLearningMaterialClaimPolicyRequirements,
  strictStudentLearningMaterialClaimPolicy
} from "./evaluation";
import {
  buildCommandSequence,
  type StudentLearningMaterialEvaluationCasePackage
} from "./evaluation-case-package-files";
import {
  createGoldLabelPackageFromAnnotationImport,
  type StudentLearningMaterialGoldLabelAnnotationImport
} from "./gold-label-annotation-import";
import {
  validateGoldLabelAnnotationTask,
  type StudentLearningMaterialGoldLabelAnnotationTask
} from "./gold-label-annotation-task";
import {
  validateGoldLabelReviewReport,
  type StudentLearningMaterialGoldLabelReviewReport
} from "./gold-label-review-report";
import {
  listGoldLabelPackageProvenanceDifferences,
  validateStudentLearningMaterialGoldLabelPackage,
  type StudentLearningMaterialGoldLabelPackage
} from "./gold-labeling";
import {
  buildQuestionEvidenceReadiness,
  validateAnalysisAgainstQuestionEvidenceReadiness
} from "./question-evidence-readiness";
import {
  validateQuestionSegmentationReview,
  type StudentLearningMaterialQuestionSegmentationReview
} from "./question-segmentation-review";
import {
  validateStudentLearningMaterialTeacherReviewPacket,
  type StudentLearningMaterialTeacherReviewPacket
} from "./teacher-review-packet";
import type { StudentLearningMaterialAnalysis, VisionEvidencePacket } from "./types";
import {
  checkEvidenceCoverage,
  checkWechatFeedbackSafety,
  validateStudentLearningMaterialAnalysis,
  validateStudentLearningMaterialAnalysisEvidenceRefsAgainstPacket,
  validateStudentLearningMaterialAnalysisMistakeDiagnosisEvidenceAgainstPacket,
  validateStudentLearningMaterialAnalysisProfileUpdateSuggestionsAgainstPacket,
  validateStudentLearningMaterialAnalysisQuestionCoverageAgainstPacket,
  validateVisionEvidencePacket
} from "./validators";
import {
  validateExternalVisionAdapterInput,
  type ExternalVisionAdapterInput
} from "./vision-adapter";
import {
  validateVisionProviderTrialReport,
  type StudentLearningMaterialVisionProviderTrialReport,
  type VisionProviderTrialReadiness
} from "./vision-provider-trial-report";
import {
  validateStudentLearningMaterialUserFacingResult,
  type StudentLearningMaterialUserFacingResult
} from "./user-facing-result";

export type StudentLearningMaterialEvaluationCasePackageArtifactStatus = {
  path_key: string;
  path: string;
  absolute_path: string;
  exists: boolean;
  path_boundary_ok: boolean;
};

export type StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus = {
  path_key: string;
  path: string;
  absolute_path: string;
  validator_id:
    | "case_package_artifact_paths"
    | "case_package_command_sequence"
    | "external_vision_adapter_input"
    | "vision_evidence_packet"
    | "answer_keys_side_input"
    | "rubrics_side_input"
    | "question_segmentation_review"
    | "vision_provider_trial_report"
    | "gold_label_annotation_task"
    | "gold_label_annotation_import"
    | "gold_label_package"
    | "gold_label_review_report"
    | "student_learning_material_analysis"
    | "student_learning_material_user_facing_result"
    | "student_monthly_report_input"
    | "student_monthly_report"
    | "student_learning_material_delivery_bundle"
    | "student_learning_material_teacher_review_packet"
    | "evaluation_asset_cases";
  validation_ok: boolean;
  errors: string[];
  warnings: string[];
};

export type StudentLearningMaterialEvaluationCasePackageCommandStatus = {
  step_id: string;
  command: string;
  status: "complete" | "ready_to_run" | "blocked_missing_inputs";
  missing_inputs: string[];
  missing_outputs: string[];
  outputs_present: string[];
  purpose: string;
};

export type StudentLearningMaterialEvaluationCasePackageChecklistStatus = {
  item_id: string;
  required_for_99: boolean;
  evidence_path?: string;
  status: "present" | "missing";
};

export type StudentLearningMaterialEvaluationCasePackageArtifactGroupStatus = {
  group_id:
    | "ocr_vision"
    | "question_segmentation"
    | "human_gold"
    | "analysis_result"
    | "monthly_comparison"
    | "teacher_delivery"
    | "asset_manifest";
  required_path_keys: string[];
  present_count: number;
  required_count: number;
  missing_path_keys: string[];
  status: "complete" | "missing";
};

export type StudentLearningMaterialEvaluationCasePackageReadiness = {
  schema_version: "student_learning_material_evaluation_case_package_readiness.v0.1";
  package_dir: string;
  case_package_path: string;
  case_id: string;
  dataset_id: string;
  dataset_kind: string;
  privacy_boundary_ok: boolean;
  privacy_errors: string[];
  artifact_statuses: StudentLearningMaterialEvaluationCasePackageArtifactStatus[];
  artifact_validation_statuses: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus[];
  artifact_group_statuses: StudentLearningMaterialEvaluationCasePackageArtifactGroupStatus[];
  command_statuses: StudentLearningMaterialEvaluationCasePackageCommandStatus[];
  checklist_statuses: StudentLearningMaterialEvaluationCasePackageChecklistStatus[];
  next_action: {
    status:
      | "fix_privacy_boundary"
      | "fix_artifact_validation"
      | "complete_checklist_evidence"
      | "fix_provider_trial_readiness"
      | "provide_missing_input"
      | "run_next_command"
      | "run_asset_preflight"
      | "fix_asset_preflight"
      | "ready_for_dataset_eval";
    step_id?: string;
    checklist_item_id?: string;
    command?: string;
    reason: string;
  };
  provider_trial_readiness?: {
    path: string;
    readiness: VisionProviderTrialReadiness;
    blockers: string[];
    warnings: string[];
    next_steps: string[];
  };
  asset_preflight?: {
    manifest_path: string;
    exists: boolean;
    validation_ok: boolean;
    claimable99AssetReady: boolean;
    blockers: string[];
    errors: string[];
    warnings: string[];
  };
  claim_readiness: {
    claimable99_from_case_package: false;
    asset_preflight_claimable99_ready: boolean;
    dataset_eval_required: true;
    blockers: string[];
  };
  report: string;
};

export type InspectStudentLearningMaterialEvaluationCasePackageInput = {
  packageDir?: string;
  casePackagePath?: string;
  assetManifestPath?: string;
  outputPath?: string;
};

const forbiddenPackageRootNames = new Set([
  "raw",
  "raw-images",
  "source-images",
  "student-materials",
  "student_materials",
  "original-images",
  "original_materials"
]);
const forbiddenRawMaterialExtensions = new Set([
  ".bmp",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".tif",
  ".tiff",
  ".webp"
]);

export async function inspectStudentLearningMaterialEvaluationCasePackage(
  input: InspectStudentLearningMaterialEvaluationCasePackageInput
): Promise<StudentLearningMaterialEvaluationCasePackageReadiness> {
  const packageDir = path.resolve(input.packageDir || (input.casePackagePath ? path.dirname(input.casePackagePath) : ""));
  if (!packageDir) throw new Error("packageDir or casePackagePath is required");

  const casePackagePath = path.resolve(input.casePackagePath || path.join(packageDir, "case-package.json"));
  const casePackage = await readJsonFile<StudentLearningMaterialEvaluationCasePackage>(casePackagePath);
  const privacyErrors = await inspectPrivacyBoundary(casePackage, packageDir);
  const artifactStatuses = await inspectArtifactStatuses(casePackage, packageDir);
  const artifactValidationStatuses = await inspectArtifactValidationStatuses(casePackage, artifactStatuses, casePackagePath);
  const providerTrialReadiness = await inspectProviderTrialReadiness(artifactStatuses, artifactValidationStatuses);
  const artifactGroupStatuses = buildArtifactGroupStatuses(artifactStatuses);
  const commandStatuses = await inspectCommandStatuses(casePackage, packageDir);
  const checklistStatuses = await inspectChecklistStatuses(casePackage, packageDir);
  const assetPreflight = await inspectAssetPreflight(input.assetManifestPath || path.join(packageDir, "evaluation-assets.json"));
  const claimBlockers = buildClaimBlockers({
    privacyErrors,
    artifactStatuses,
    artifactValidationStatuses,
    checklistStatuses,
    providerTrialReadiness,
    assetPreflight
  });
  const nextAction = buildNextAction({
    privacyErrors,
    artifactValidationStatuses,
    checklistStatuses,
    providerTrialReadiness,
    commandStatuses,
    assetPreflight
  });
  const readinessWithoutReport: Omit<StudentLearningMaterialEvaluationCasePackageReadiness, "report"> = {
    schema_version: "student_learning_material_evaluation_case_package_readiness.v0.1",
    package_dir: packageDir,
    case_package_path: casePackagePath,
    case_id: casePackage.case_id,
    dataset_id: casePackage.dataset_id,
    dataset_kind: casePackage.dataset_kind,
    privacy_boundary_ok: privacyErrors.length === 0,
    privacy_errors: privacyErrors,
    artifact_statuses: artifactStatuses,
    artifact_validation_statuses: artifactValidationStatuses,
    artifact_group_statuses: artifactGroupStatuses,
    command_statuses: commandStatuses,
    checklist_statuses: checklistStatuses,
    next_action: nextAction,
    provider_trial_readiness: providerTrialReadiness,
    asset_preflight: assetPreflight,
    claim_readiness: {
      claimable99_from_case_package: false,
      asset_preflight_claimable99_ready: assetPreflight.claimable99AssetReady,
      dataset_eval_required: true,
      blockers: claimBlockers
    }
  };
  const readiness = {
    ...readinessWithoutReport,
    report: formatStudentLearningMaterialEvaluationCasePackageReadinessReport(readinessWithoutReport)
  };

  if (input.outputPath) {
    await writeJsonFile(path.resolve(input.outputPath), readiness);
  }
  return readiness;
}

export function formatStudentLearningMaterialEvaluationCasePackageReadinessReport(
  result: Omit<StudentLearningMaterialEvaluationCasePackageReadiness, "report">
) {
  const commandCounts = countCommandStatuses(result.command_statuses);
  const checklistCounts = countChecklistStatuses(result.checklist_statuses);
  const missingChecklist = result.checklist_statuses.filter((item) => item.status === "missing").map((item) => item.item_id);
  const providerRoleCoverageChecklist =
    result.checklist_statuses.find((item) => item.item_id === "provider_candidate_role_coverage_document_layout_formula")?.status ??
    "not_declared";
  const providerTrialReadiness = result.provider_trial_readiness?.readiness ?? "none";
  return [
    `StudentLearningMaterialEvaluation case package readiness`,
    `case.id=${result.case_id}`,
    `dataset.id=${result.dataset_id}`,
    `dataset.kind=${result.dataset_kind}`,
    `privacyBoundary=${result.privacy_boundary_ok ? "pass" : "fail"}`,
    `artifacts.present=${result.artifact_statuses.filter((item) => item.exists).length}/${result.artifact_statuses.length}`,
    `artifactValidations=${formatArtifactValidationSummary(result.artifact_validation_statuses)}`,
    `artifactGroups=${formatArtifactGroupSummary(result.artifact_group_statuses)}`,
    `commands.complete=${commandCounts.complete}, ready=${commandCounts.ready_to_run}, blocked=${commandCounts.blocked_missing_inputs}`,
    `checklist.present=${checklistCounts.present}, missing=${checklistCounts.missing}`,
    `providerRoleCoverageChecklist=${providerRoleCoverageChecklist}`,
    `checklist.missing=${missingChecklist.join(",") || "none"}`,
    `providerTrialReadiness=${providerTrialReadiness}`,
    `nextAction=${result.next_action.status}${result.next_action.step_id ? `:${result.next_action.step_id}` : result.next_action.checklist_item_id ? `:${result.next_action.checklist_item_id}` : ""}`,
    `assetPreflight.exists=${result.asset_preflight?.exists ? "yes" : "no"}`,
    `assetPreflight.claimable99AssetReady=${result.asset_preflight?.claimable99AssetReady ? "yes" : "no"}`,
    `claimPolicy.requirements=${formatStudentLearningMaterialClaimPolicyRequirements(strictStudentLearningMaterialClaimPolicy)}`,
    `claimable99.fromCasePackage=no`,
    `claimReadiness.blockers=${result.claim_readiness.blockers.join("；") || "none"}`,
    `privacyErrors=${result.privacy_errors.join("；") || "none"}`,
    `nextCommand=${result.next_action.command || "none"}`
  ].join("\n");
}

async function inspectPrivacyBoundary(casePackage: StudentLearningMaterialEvaluationCasePackage, packageDir: string) {
  const errors: string[] = [];
  if (casePackage.privacy_boundary?.raw_student_materials_allowed_in_package !== false) {
    errors.push("privacy_boundary.raw_student_materials_allowed_in_package must be false");
  }
  if (casePackage.privacy_boundary?.raw_images_excluded_from_gold_file !== true) {
    errors.push("privacy_boundary.raw_images_excluded_from_gold_file must be true");
  }
  if (casePackage.privacy_boundary?.anonymization_required_before_gold !== true) {
    errors.push("privacy_boundary.anonymization_required_before_gold must be true");
  }
  if (casePackage.privacy_boundary?.do_not_commit_raw_student_materials !== true) {
    errors.push("privacy_boundary.do_not_commit_raw_student_materials must be true");
  }

  try {
    const rootEntries = await readdir(packageDir);
    const forbiddenEntries = rootEntries.filter((entry) => forbiddenPackageRootNames.has(entry.toLowerCase()));
    if (forbiddenEntries.length) {
      errors.push(`case package must not contain raw student material directories: ${forbiddenEntries.join(", ")}`);
    }
    const scan = await scanPackagePrivacyRisks(packageDir);
    if (scan.forbidden_directories.length) {
      errors.push(`case package must not contain raw student material directories anywhere in the package: ${scan.forbidden_directories.join(", ")}`);
    }
    if (scan.raw_material_files.length) {
      errors.push(`case package must not contain raw student material files: ${scan.raw_material_files.join(", ")}`);
    }
  } catch (error) {
    errors.push(`cannot inspect package directory: ${formatError(error)}`);
  }
  return errors;
}

async function scanPackagePrivacyRisks(packageDir: string) {
  const risks = {
    forbidden_directories: [] as string[],
    raw_material_files: [] as string[]
  };

  async function walk(currentDir: string, relativeDir = "") {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (forbiddenPackageRootNames.has(entry.name.toLowerCase())) {
          risks.forbidden_directories.push(relativePath);
          continue;
        }
        await walk(absolutePath, relativePath);
        continue;
      }
      if (entry.isFile() && forbiddenRawMaterialExtensions.has(path.extname(entry.name).toLowerCase())) {
        risks.raw_material_files.push(relativePath);
      }
    }
  }

  await walk(packageDir);
  risks.forbidden_directories.sort();
  risks.raw_material_files.sort();
  return risks;
}

async function inspectArtifactStatuses(casePackage: StudentLearningMaterialEvaluationCasePackage, packageDir: string) {
  const entries = Object.entries({
    ...(casePackage.artifact_paths || {}),
    ...(casePackage.evaluation_asset_case?.answer_keys_path && !casePackage.artifact_paths?.answer_keys_path
      ? { answer_keys_path: casePackage.evaluation_asset_case.answer_keys_path }
      : {}),
    ...(casePackage.evaluation_asset_case?.rubrics_path && !casePackage.artifact_paths?.rubrics_path
      ? { rubrics_path: casePackage.evaluation_asset_case.rubrics_path }
      : {})
  });
  const statuses: StudentLearningMaterialEvaluationCasePackageArtifactStatus[] = [];
  for (const [pathKey, filePath] of entries) {
    const pathBoundaryOk = isSafePackageRelativePath(filePath);
    const absolutePath = pathBoundaryOk ? path.resolve(packageDir, filePath) : path.resolve(packageDir);
    statuses.push({
      path_key: pathKey,
      path: String(filePath),
      absolute_path: absolutePath,
      exists: pathBoundaryOk ? await fileExists(absolutePath) : false,
      path_boundary_ok: pathBoundaryOk
    });
  }
  return statuses;
}

async function inspectArtifactValidationStatuses(
  casePackage: StudentLearningMaterialEvaluationCasePackage,
  artifactStatuses: StudentLearningMaterialEvaluationCasePackageArtifactStatus[],
  casePackagePath: string
) {
  const statuses: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus[] = [];
  const casePackagePathValidation = validateCasePackageArtifactPathsAgainstEvaluationAssetCase(casePackage);
  statuses.push({
    path_key: "case_package",
    path: casePackagePath,
    absolute_path: casePackagePath,
    validator_id: "case_package_artifact_paths",
    validation_ok: casePackagePathValidation.ok,
    errors: casePackagePathValidation.errors,
    warnings: casePackagePathValidation.warnings
  });
  const commandSequenceValidation = validateCasePackageCommandSequence(casePackage);
  statuses.push({
    path_key: "case_package_command_sequence",
    path: casePackagePath,
    absolute_path: casePackagePath,
    validator_id: "case_package_command_sequence",
    validation_ok: commandSequenceValidation.ok,
    errors: commandSequenceValidation.errors,
    warnings: commandSequenceValidation.warnings
  });

  const evaluationAssetCasesStatus = artifactStatuses.find((item) => item.path_key === "evaluation_asset_cases_path");
  if (evaluationAssetCasesStatus?.exists && evaluationAssetCasesStatus.path_boundary_ok) {
    const validation = await validateEvaluationAssetCasesFileAgainstCasePackage(casePackage, evaluationAssetCasesStatus.absolute_path);
    statuses.push({
      path_key: evaluationAssetCasesStatus.path_key,
      path: evaluationAssetCasesStatus.path,
      absolute_path: evaluationAssetCasesStatus.absolute_path,
      validator_id: "evaluation_asset_cases",
      validation_ok: validation.ok,
      errors: validation.errors,
      warnings: validation.warnings
    });
  }

  const externalVisionInputStatus = artifactStatuses.find((item) => item.path_key === "external_vision_input_path");
  let externalVisionInput: ExternalVisionAdapterInput | undefined;
  let externalVisionInputValidationStatus: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus | undefined;
  if (externalVisionInputStatus?.exists && externalVisionInputStatus.path_boundary_ok) {
    try {
      externalVisionInput = await readJsonFile<ExternalVisionAdapterInput>(externalVisionInputStatus.absolute_path);
      const validation = validateExternalVisionAdapterInput(externalVisionInput);
      externalVisionInputValidationStatus = {
        path_key: externalVisionInputStatus.path_key,
        path: externalVisionInputStatus.path,
        absolute_path: externalVisionInputStatus.absolute_path,
        validator_id: "external_vision_adapter_input",
        validation_ok: validation.ok,
        errors: validation.errors,
        warnings: validation.warnings
      };
      statuses.push(externalVisionInputValidationStatus);
      if (!validation.ok) externalVisionInput = undefined;
    } catch (error) {
      externalVisionInputValidationStatus = {
        path_key: externalVisionInputStatus.path_key,
        path: externalVisionInputStatus.path,
        absolute_path: externalVisionInputStatus.absolute_path,
        validator_id: "external_vision_adapter_input",
        validation_ok: false,
        errors: [`cannot read or parse ExternalVisionAdapterInput: ${formatError(error)}`],
        warnings: []
      };
      statuses.push(externalVisionInputValidationStatus);
    }
  }

  const visionPacketStatus = artifactStatuses.find((item) => item.path_key === "vision_packet_path");
  let packet: VisionEvidencePacket | undefined;
  if (visionPacketStatus?.exists && visionPacketStatus.path_boundary_ok) {
    try {
      packet = await readJsonFile<VisionEvidencePacket>(visionPacketStatus.absolute_path);
      const validation = validateVisionEvidencePacket(packet);
      statuses.push({
        path_key: visionPacketStatus.path_key,
        path: visionPacketStatus.path,
        absolute_path: visionPacketStatus.absolute_path,
        validator_id: "vision_evidence_packet",
        validation_ok: validation.ok,
        errors: validation.errors,
        warnings: validation.warnings
      });
      if (!validation.ok) packet = undefined;
    } catch (error) {
      statuses.push({
        path_key: visionPacketStatus.path_key,
        path: visionPacketStatus.path,
        absolute_path: visionPacketStatus.absolute_path,
        validator_id: "vision_evidence_packet",
        validation_ok: false,
        errors: [`cannot read or parse VisionEvidencePacket: ${formatError(error)}`],
        warnings: []
      });
    }
  }

  if (externalVisionInput && externalVisionInputValidationStatus && packet) {
    const sourceValidation = validateExternalVisionInputAgainstVisionEvidencePacket(externalVisionInput, packet);
    externalVisionInputValidationStatus.errors.push(...sourceValidation.errors);
    externalVisionInputValidationStatus.warnings.push(...sourceValidation.warnings);
    externalVisionInputValidationStatus.validation_ok = externalVisionInputValidationStatus.errors.length === 0;
  }

  const packetQuestionIds = packet ? new Set(packet.questions.map((question) => question.question_id)) : undefined;
  const answerKeys = await readOptionalSideInputArtifact(artifactStatuses, statuses, "answer_keys_path", "answer_keys_side_input", packetQuestionIds);
  const rubrics = await readOptionalSideInputArtifact(artifactStatuses, statuses, "rubrics_path", "rubrics_side_input", packetQuestionIds);
  const allowedExternalEvidenceRefsByQuestionId = packet
    ? buildExternalSideInputRefsByQuestionId(
        buildQuestionEvidenceReadiness(packet, {
          answerKeys,
          rubrics
        })
      )
    : undefined;

  const segmentationReviewStatus = artifactStatuses.find((item) => item.path_key === "question_segmentation_review_path");
  let segmentationReview: StudentLearningMaterialQuestionSegmentationReview | undefined;
  if (segmentationReviewStatus?.exists && segmentationReviewStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: segmentationReviewStatus.path_key,
        path: segmentationReviewStatus.path,
        absolute_path: segmentationReviewStatus.absolute_path,
        validator_id: "question_segmentation_review",
        validation_ok: false,
        errors: ["question_segmentation_review_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else {
      try {
        segmentationReview = await readJsonFile<StudentLearningMaterialQuestionSegmentationReview>(segmentationReviewStatus.absolute_path);
        const validation = validateQuestionSegmentationReview(segmentationReview, packet);
        statuses.push({
          path_key: segmentationReviewStatus.path_key,
          path: segmentationReviewStatus.path,
          absolute_path: segmentationReviewStatus.absolute_path,
          validator_id: "question_segmentation_review",
          validation_ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings
        });
        if (!validation.ok) segmentationReview = undefined;
      } catch (error) {
        statuses.push({
          path_key: segmentationReviewStatus.path_key,
          path: segmentationReviewStatus.path,
          absolute_path: segmentationReviewStatus.absolute_path,
          validator_id: "question_segmentation_review",
          validation_ok: false,
          errors: [`cannot read or parse question segmentation review: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const providerTrialReportStatus = artifactStatuses.find((item) => item.path_key === "provider_trial_report_path");
  if (providerTrialReportStatus?.exists && providerTrialReportStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: providerTrialReportStatus.path_key,
        path: providerTrialReportStatus.path,
        absolute_path: providerTrialReportStatus.absolute_path,
        validator_id: "vision_provider_trial_report",
        validation_ok: false,
        errors: ["provider_trial_report_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else {
      try {
        const report = await readJsonFile<StudentLearningMaterialVisionProviderTrialReport>(providerTrialReportStatus.absolute_path);
        const validation = validateVisionProviderTrialReport(report, packet, segmentationReview);
        statuses.push({
          path_key: providerTrialReportStatus.path_key,
          path: providerTrialReportStatus.path,
          absolute_path: providerTrialReportStatus.absolute_path,
          validator_id: "vision_provider_trial_report",
          validation_ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings
        });
      } catch (error) {
        statuses.push({
          path_key: providerTrialReportStatus.path_key,
          path: providerTrialReportStatus.path,
          absolute_path: providerTrialReportStatus.absolute_path,
          validator_id: "vision_provider_trial_report",
          validation_ok: false,
          errors: [`cannot read or parse provider trial report: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const annotationTaskStatus = artifactStatuses.find((item) => item.path_key === "annotation_task_path");
  if (annotationTaskStatus?.exists && annotationTaskStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: annotationTaskStatus.path_key,
        path: annotationTaskStatus.path,
        absolute_path: annotationTaskStatus.absolute_path,
        validator_id: "gold_label_annotation_task",
        validation_ok: false,
        errors: ["annotation_task_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else if (!segmentationReview) {
      statuses.push({
        path_key: annotationTaskStatus.path_key,
        path: annotationTaskStatus.path,
        absolute_path: annotationTaskStatus.absolute_path,
        validator_id: "gold_label_annotation_task",
        validation_ok: false,
        errors: ["annotation_task_path requires a valid question_segmentation_review_path for same-source validation"],
        warnings: []
      });
    } else {
      try {
        const task = await readJsonFile<StudentLearningMaterialGoldLabelAnnotationTask>(annotationTaskStatus.absolute_path);
        const validation = validateGoldLabelAnnotationTask(task, packet);
        statuses.push({
          path_key: annotationTaskStatus.path_key,
          path: annotationTaskStatus.path,
          absolute_path: annotationTaskStatus.absolute_path,
          validator_id: "gold_label_annotation_task",
          validation_ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings
        });
      } catch (error) {
        statuses.push({
          path_key: annotationTaskStatus.path_key,
          path: annotationTaskStatus.path,
          absolute_path: annotationTaskStatus.absolute_path,
          validator_id: "gold_label_annotation_task",
          validation_ok: false,
          errors: [`cannot read or parse gold label annotation task: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const annotationImportStatus = artifactStatuses.find((item) => item.path_key === "annotation_import_path");
  let convertedGoldLabelPackage: StudentLearningMaterialGoldLabelPackage | undefined;
  if (annotationImportStatus?.exists && annotationImportStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: annotationImportStatus.path_key,
        path: annotationImportStatus.path,
        absolute_path: annotationImportStatus.absolute_path,
        validator_id: "gold_label_annotation_import",
        validation_ok: false,
        errors: ["annotation_import_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else if (!segmentationReview) {
      statuses.push({
        path_key: annotationImportStatus.path_key,
        path: annotationImportStatus.path,
        absolute_path: annotationImportStatus.absolute_path,
        validator_id: "gold_label_annotation_import",
        validation_ok: false,
        errors: ["annotation_import_path requires a valid question_segmentation_review_path for final gold conversion"],
        warnings: []
      });
    } else {
      try {
        const annotationImport = await readJsonFile<StudentLearningMaterialGoldLabelAnnotationImport>(annotationImportStatus.absolute_path);
        const conversion = createGoldLabelPackageFromAnnotationImport(annotationImport, packet, {
          requireAdjudication: true,
          questionSegmentationReview: segmentationReview,
          allowedExternalEvidenceRefsByQuestionId
        });
        if (!conversion.ok) {
          statuses.push({
            path_key: annotationImportStatus.path_key,
            path: annotationImportStatus.path,
            absolute_path: annotationImportStatus.absolute_path,
            validator_id: "gold_label_annotation_import",
            validation_ok: false,
            errors: conversion.errors,
            warnings: conversion.warnings
          });
        } else {
          convertedGoldLabelPackage = conversion.package;
          statuses.push({
            path_key: annotationImportStatus.path_key,
            path: annotationImportStatus.path,
            absolute_path: annotationImportStatus.absolute_path,
            validator_id: "gold_label_annotation_import",
            validation_ok: conversion.validation.ok,
            errors: conversion.validation.errors,
            warnings: [...conversion.warnings, ...conversion.validation.warnings]
          });
        }
      } catch (error) {
        statuses.push({
          path_key: annotationImportStatus.path_key,
          path: annotationImportStatus.path,
          absolute_path: annotationImportStatus.absolute_path,
          validator_id: "gold_label_annotation_import",
          validation_ok: false,
          errors: [`cannot read or parse gold label annotation import: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const goldLabelPackageStatus = artifactStatuses.find((item) => item.path_key === "gold_label_package_path");
  let goldLabelPackage: StudentLearningMaterialGoldLabelPackage | undefined;
  if (goldLabelPackageStatus?.exists && goldLabelPackageStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: goldLabelPackageStatus.path_key,
        path: goldLabelPackageStatus.path,
        absolute_path: goldLabelPackageStatus.absolute_path,
        validator_id: "gold_label_package",
        validation_ok: false,
        errors: ["gold_label_package_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else {
      try {
        const packageValue = await readJsonFile<StudentLearningMaterialGoldLabelPackage>(goldLabelPackageStatus.absolute_path);
        const validation = validateStudentLearningMaterialGoldLabelPackage(packageValue, {
          requireAdjudication: true,
          sourcePacket: packet,
          allowedExternalEvidenceRefsByQuestionId
        });
        const errors = [...validation.errors];
        if (convertedGoldLabelPackage && JSON.stringify(packageValue) !== JSON.stringify(convertedGoldLabelPackage)) {
          errors.push("gold_label_package_path must match package regenerated from annotation_import_path");
          listGoldLabelPackageProvenanceDifferences(packageValue, convertedGoldLabelPackage).forEach((difference) => {
            errors.push(`gold_label_package_path ${difference} must match package regenerated from annotation_import_path`);
          });
        }
        statuses.push({
          path_key: goldLabelPackageStatus.path_key,
          path: goldLabelPackageStatus.path,
          absolute_path: goldLabelPackageStatus.absolute_path,
          validator_id: "gold_label_package",
          validation_ok: errors.length === 0,
          errors,
          warnings: validation.warnings
        });
        if (errors.length === 0) goldLabelPackage = packageValue;
      } catch (error) {
        statuses.push({
          path_key: goldLabelPackageStatus.path_key,
          path: goldLabelPackageStatus.path,
          absolute_path: goldLabelPackageStatus.absolute_path,
          validator_id: "gold_label_package",
          validation_ok: false,
          errors: [`cannot read or parse gold label package: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const goldLabelReviewReportStatus = artifactStatuses.find((item) => item.path_key === "gold_label_review_report_path");
  if (goldLabelReviewReportStatus?.exists && goldLabelReviewReportStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: goldLabelReviewReportStatus.path_key,
        path: goldLabelReviewReportStatus.path,
        absolute_path: goldLabelReviewReportStatus.absolute_path,
        validator_id: "gold_label_review_report",
        validation_ok: false,
        errors: ["gold_label_review_report_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else if (!goldLabelPackage) {
      statuses.push({
        path_key: goldLabelReviewReportStatus.path_key,
        path: goldLabelReviewReportStatus.path,
        absolute_path: goldLabelReviewReportStatus.absolute_path,
        validator_id: "gold_label_review_report",
        validation_ok: false,
        errors: ["gold_label_review_report_path requires a valid gold_label_package_path for package-aligned validation"],
        warnings: []
      });
    } else {
      try {
        const report = await readJsonFile<StudentLearningMaterialGoldLabelReviewReport>(goldLabelReviewReportStatus.absolute_path);
        const validation = validateGoldLabelReviewReport(report, goldLabelPackage, packet, {
          allowedExternalEvidenceRefsByQuestionId
        });
        const errors = [...validation.errors];
        if (report.readiness?.ready_for_99_evaluation !== true) {
          const blockers = Array.isArray(report.readiness?.blockers) ? report.readiness.blockers.join("；") : "report is not ready";
          errors.push(`gold_label_review_report_path must be ready_for_99_evaluation: ${blockers || "report is not ready"}`);
        }
        statuses.push({
          path_key: goldLabelReviewReportStatus.path_key,
          path: goldLabelReviewReportStatus.path,
          absolute_path: goldLabelReviewReportStatus.absolute_path,
          validator_id: "gold_label_review_report",
          validation_ok: errors.length === 0,
          errors,
          warnings: validation.warnings
        });
      } catch (error) {
        statuses.push({
          path_key: goldLabelReviewReportStatus.path_key,
          path: goldLabelReviewReportStatus.path,
          absolute_path: goldLabelReviewReportStatus.absolute_path,
          validator_id: "gold_label_review_report",
          validation_ok: false,
          errors: [`cannot read or parse gold label review report: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const analysisStatus = artifactStatuses.find((item) => item.path_key === "analysis_path");
  let analysis: StudentLearningMaterialAnalysis | undefined;
  if (analysisStatus?.exists && analysisStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: analysisStatus.path_key,
        path: analysisStatus.path,
        absolute_path: analysisStatus.absolute_path,
        validator_id: "student_learning_material_analysis",
        validation_ok: false,
        errors: ["analysis_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else {
      try {
        const candidate = await readJsonFile<StudentLearningMaterialAnalysis>(analysisStatus.absolute_path);
        const validation = validateAnalysisArtifact(candidate, packet, {
          answerKeys,
          rubrics
        });
        statuses.push({
          path_key: analysisStatus.path_key,
          path: analysisStatus.path,
          absolute_path: analysisStatus.absolute_path,
          validator_id: "student_learning_material_analysis",
          validation_ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings
        });
        if (validation.ok) analysis = candidate;
      } catch (error) {
        statuses.push({
          path_key: analysisStatus.path_key,
          path: analysisStatus.path,
          absolute_path: analysisStatus.absolute_path,
          validator_id: "student_learning_material_analysis",
          validation_ok: false,
          errors: [`cannot read or parse StudentLearningMaterialAnalysis: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const resultStatus = artifactStatuses.find((item) => item.path_key === "result_path");
  let userFacingResult: StudentLearningMaterialUserFacingResult | undefined;
  if (resultStatus?.exists && resultStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: resultStatus.path_key,
        path: resultStatus.path,
        absolute_path: resultStatus.absolute_path,
        validator_id: "student_learning_material_user_facing_result",
        validation_ok: false,
        errors: ["result_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else if (!analysis) {
      statuses.push({
        path_key: resultStatus.path_key,
        path: resultStatus.path,
        absolute_path: resultStatus.absolute_path,
        validator_id: "student_learning_material_user_facing_result",
        validation_ok: false,
        errors: ["result_path requires a valid analysis_path for analysis-aligned validation"],
        warnings: []
      });
    } else {
      try {
        const result = await readJsonFile<StudentLearningMaterialUserFacingResult>(resultStatus.absolute_path);
        const validation = validateStudentLearningMaterialUserFacingResult(result, {
          analysis,
          packet
        });
        statuses.push({
          path_key: resultStatus.path_key,
          path: resultStatus.path,
          absolute_path: resultStatus.absolute_path,
          validator_id: "student_learning_material_user_facing_result",
          validation_ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings
        });
        if (validation.ok) userFacingResult = result;
      } catch (error) {
        statuses.push({
          path_key: resultStatus.path_key,
          path: resultStatus.path,
          absolute_path: resultStatus.absolute_path,
          validator_id: "student_learning_material_user_facing_result",
          validation_ok: false,
          errors: [`cannot read or parse user-facing result: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const monthlyReportInputStatus = artifactStatuses.find((item) => item.path_key === "monthly_report_input_path");
  let monthlyReportInputOk = false;
  let monthlyReportInput: StudentMonthlyReportFileInput | undefined;
  if (monthlyReportInputStatus?.exists && monthlyReportInputStatus.path_boundary_ok) {
    try {
      const input = await readJsonFile<StudentMonthlyReportFileInput>(monthlyReportInputStatus.absolute_path);
      const validation = validateStudentMonthlyReportInputArtifact(input);
      statuses.push({
        path_key: monthlyReportInputStatus.path_key,
        path: monthlyReportInputStatus.path,
        absolute_path: monthlyReportInputStatus.absolute_path,
        validator_id: "student_monthly_report_input",
        validation_ok: validation.ok,
        errors: validation.errors,
        warnings: validation.warnings
      });
      monthlyReportInputOk = validation.ok;
      if (validation.ok) monthlyReportInput = input;
    } catch (error) {
      statuses.push({
        path_key: monthlyReportInputStatus.path_key,
        path: monthlyReportInputStatus.path,
        absolute_path: monthlyReportInputStatus.absolute_path,
        validator_id: "student_monthly_report_input",
        validation_ok: false,
        errors: [`cannot read or parse monthly report input: ${formatError(error)}`],
        warnings: []
      });
    }
  }

  const monthlyReportStatus = artifactStatuses.find((item) => item.path_key === "monthly_report_path");
  let monthlyReport: StudentMonthlyReport | undefined;
  if (monthlyReportStatus?.exists && monthlyReportStatus.path_boundary_ok) {
    if (!monthlyReportInputStatus?.exists || !monthlyReportInputOk) {
      statuses.push({
        path_key: monthlyReportStatus.path_key,
        path: monthlyReportStatus.path,
        absolute_path: monthlyReportStatus.absolute_path,
        validator_id: "student_monthly_report",
        validation_ok: false,
        errors: ["monthly_report_path requires a valid monthly_report_input_path for replayable generation input"],
        warnings: []
      });
    } else if (!analysis) {
      statuses.push({
        path_key: monthlyReportStatus.path_key,
        path: monthlyReportStatus.path,
        absolute_path: monthlyReportStatus.absolute_path,
        validator_id: "student_monthly_report",
        validation_ok: false,
        errors: ["monthly_report_path requires a valid analysis_path for month alignment"],
        warnings: []
      });
    } else if (!userFacingResult) {
      statuses.push({
        path_key: monthlyReportStatus.path_key,
        path: monthlyReportStatus.path,
        absolute_path: monthlyReportStatus.absolute_path,
        validator_id: "student_monthly_report",
        validation_ok: false,
        errors: ["monthly_report_path requires a valid result_path for monthly-result alignment"],
        warnings: []
      });
    } else {
      try {
        const report = await readJsonFile<StudentMonthlyReport>(monthlyReportStatus.absolute_path);
        const validation = validateMonthlyReportArtifact(report, analysis, userFacingResult, monthlyReportInput);
        statuses.push({
          path_key: monthlyReportStatus.path_key,
          path: monthlyReportStatus.path,
          absolute_path: monthlyReportStatus.absolute_path,
          validator_id: "student_monthly_report",
          validation_ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings
        });
        if (validation.ok) monthlyReport = report;
      } catch (error) {
        statuses.push({
          path_key: monthlyReportStatus.path_key,
          path: monthlyReportStatus.path,
          absolute_path: monthlyReportStatus.absolute_path,
          validator_id: "student_monthly_report",
          validation_ok: false,
          errors: [`cannot read or parse monthly report: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const deliveryBundleStatus = artifactStatuses.find((item) => item.path_key === "delivery_bundle_path");
  let deliveryBundle: StudentLearningMaterialDeliveryBundle | undefined;
  if (deliveryBundleStatus?.exists && deliveryBundleStatus.path_boundary_ok) {
    if (!packet) {
      statuses.push({
        path_key: deliveryBundleStatus.path_key,
        path: deliveryBundleStatus.path,
        absolute_path: deliveryBundleStatus.absolute_path,
        validator_id: "student_learning_material_delivery_bundle",
        validation_ok: false,
        errors: ["delivery_bundle_path requires a valid vision_packet_path for same-source validation"],
        warnings: []
      });
    } else if (!analysis) {
      statuses.push({
        path_key: deliveryBundleStatus.path_key,
        path: deliveryBundleStatus.path,
        absolute_path: deliveryBundleStatus.absolute_path,
        validator_id: "student_learning_material_delivery_bundle",
        validation_ok: false,
        errors: ["delivery_bundle_path requires a valid analysis_path for analysis-aligned validation"],
        warnings: []
      });
    } else if (!userFacingResult) {
      statuses.push({
        path_key: deliveryBundleStatus.path_key,
        path: deliveryBundleStatus.path,
        absolute_path: deliveryBundleStatus.absolute_path,
        validator_id: "student_learning_material_delivery_bundle",
        validation_ok: false,
        errors: ["delivery_bundle_path requires a valid result_path for final-result validation"],
        warnings: []
      });
    } else if (!monthlyReport) {
      statuses.push({
        path_key: deliveryBundleStatus.path_key,
        path: deliveryBundleStatus.path,
        absolute_path: deliveryBundleStatus.absolute_path,
        validator_id: "student_learning_material_delivery_bundle",
        validation_ok: false,
        errors: ["delivery_bundle_path requires a valid monthly_report_path for monthly-comparison handoff"],
        warnings: []
      });
    } else {
      try {
        const bundle = await readJsonFile<StudentLearningMaterialDeliveryBundle>(deliveryBundleStatus.absolute_path);
        const validation = validateStudentLearningMaterialDeliveryBundle(bundle, {
          packet,
          analysis,
          result: userFacingResult,
          monthlyReport
        });
        statuses.push({
          path_key: deliveryBundleStatus.path_key,
          path: deliveryBundleStatus.path,
          absolute_path: deliveryBundleStatus.absolute_path,
          validator_id: "student_learning_material_delivery_bundle",
          validation_ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings
        });
        if (validation.ok) deliveryBundle = bundle;
      } catch (error) {
        statuses.push({
          path_key: deliveryBundleStatus.path_key,
          path: deliveryBundleStatus.path,
          absolute_path: deliveryBundleStatus.absolute_path,
          validator_id: "student_learning_material_delivery_bundle",
          validation_ok: false,
          errors: [`cannot read or parse delivery bundle: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }

  const teacherReviewPacketStatus = artifactStatuses.find((item) => item.path_key === "teacher_review_packet_path");
  if (teacherReviewPacketStatus?.exists && teacherReviewPacketStatus.path_boundary_ok) {
    if (!deliveryBundle) {
      statuses.push({
        path_key: teacherReviewPacketStatus.path_key,
        path: teacherReviewPacketStatus.path,
        absolute_path: teacherReviewPacketStatus.absolute_path,
        validator_id: "student_learning_material_teacher_review_packet",
        validation_ok: false,
        errors: ["teacher_review_packet_path requires a valid delivery_bundle_path for review-action validation"],
        warnings: []
      });
    } else {
      try {
        const packetValue = await readJsonFile<StudentLearningMaterialTeacherReviewPacket>(teacherReviewPacketStatus.absolute_path);
        const validation = validateStudentLearningMaterialTeacherReviewPacket(packetValue, deliveryBundle);
        statuses.push({
          path_key: teacherReviewPacketStatus.path_key,
          path: teacherReviewPacketStatus.path,
          absolute_path: teacherReviewPacketStatus.absolute_path,
          validator_id: "student_learning_material_teacher_review_packet",
          validation_ok: validation.ok,
          errors: validation.errors,
          warnings: validation.warnings
        });
      } catch (error) {
        statuses.push({
          path_key: teacherReviewPacketStatus.path_key,
          path: teacherReviewPacketStatus.path,
          absolute_path: teacherReviewPacketStatus.absolute_path,
          validator_id: "student_learning_material_teacher_review_packet",
          validation_ok: false,
          errors: [`cannot read or parse teacher review packet: ${formatError(error)}`],
          warnings: []
        });
      }
    }
  }
  return statuses;
}

const evaluationAssetManifestCaseKeys: Array<keyof StudentLearningMaterialEvaluationAssetManifestCase> = [
  "case_id",
  "external_vision_input_path",
  "vision_packet_path",
  "gold_label_package_path",
  "answer_keys_path",
  "rubrics_path",
  "provider_trial_report_path",
  "question_segmentation_review_path",
  "annotation_task_path",
  "annotation_import_path",
  "gold_label_review_report_path",
  "analysis_path",
  "result_path",
  "monthly_report_input_path",
  "monthly_report_path",
  "delivery_bundle_path",
  "teacher_review_packet_path"
];

const casePackageArtifactPathKeys: Array<keyof StudentLearningMaterialEvaluationAssetManifestCase> = [
  "external_vision_input_path",
  "vision_packet_path",
  "gold_label_package_path",
  "answer_keys_path",
  "rubrics_path",
  "provider_trial_report_path",
  "question_segmentation_review_path",
  "annotation_task_path",
  "annotation_import_path",
  "gold_label_review_report_path",
  "analysis_path",
  "result_path",
  "monthly_report_input_path",
  "monthly_report_path",
  "delivery_bundle_path",
  "teacher_review_packet_path"
];

function validateCasePackageArtifactPathsAgainstEvaluationAssetCase(casePackage: StudentLearningMaterialEvaluationCasePackage) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const artifactPaths: Record<string, unknown> = isRecord(casePackage.artifact_paths) ? casePackage.artifact_paths : {};
  const evaluationAssetCase = casePackage.evaluation_asset_case;
  if (!isRecord(evaluationAssetCase)) {
    errors.push("evaluation_asset_case is required");
    return { ok: false, errors, warnings };
  }
  if (readString(evaluationAssetCase.case_id) !== casePackage.case_id) {
    errors.push("evaluation_asset_case.case_id must match case_id");
  }
  for (const key of casePackageArtifactPathKeys) {
    const artifactPathValue = readOptionalString(artifactPaths[key]);
    const evaluationCaseValue = readOptionalString(evaluationAssetCase[key]);
    if (evaluationCaseValue !== artifactPathValue) {
      errors.push(`evaluation_asset_case.${key} must match artifact_paths.${key}`);
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function validateCasePackageCommandSequence(casePackage: StudentLearningMaterialEvaluationCasePackage) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(casePackage.artifact_paths)) {
    errors.push("artifact_paths is required before command_sequence can be validated");
    return { ok: false, errors, warnings };
  }
  const expectedSteps = buildCommandSequence(casePackage.artifact_paths);
  const actualSteps = casePackage.command_sequence;
  if (!Array.isArray(actualSteps)) {
    errors.push("command_sequence must be an array");
    return { ok: false, errors, warnings };
  }
  if (actualSteps.length !== expectedSteps.length) {
    errors.push(`command_sequence must contain ${expectedSteps.length} steps`);
  }
  const maxSteps = Math.max(actualSteps.length, expectedSteps.length);
  for (let index = 0; index < maxSteps; index += 1) {
    const actualStep = actualSteps[index];
    const expectedStep = expectedSteps[index];
    const stepLabel = expectedStep?.step_id || (isRecord(actualStep) ? readString(actualStep.step_id) : "") || `index ${index}`;
    if (!isRecord(actualStep)) {
      errors.push(`command_sequence[${index}] must be an object for ${stepLabel}`);
      continue;
    }
    if (!expectedStep) {
      errors.push(`command_sequence[${index}] is unexpected: ${readString(actualStep.step_id) || "missing step_id"}`);
      continue;
    }
    compareCommandSequenceField(actualStep.step_id, expectedStep.step_id, `command_sequence[${index}].step_id`, errors);
    compareCommandSequenceField(actualStep.command, expectedStep.command, `command_sequence[${index}].command`, errors);
    compareCommandSequenceStringArray(actualStep.required_inputs, expectedStep.required_inputs, `command_sequence[${index}].required_inputs`, errors);
    compareCommandSequenceStringArray(actualStep.outputs, expectedStep.outputs, `command_sequence[${index}].outputs`, errors);
    compareCommandSequenceField(actualStep.purpose, expectedStep.purpose, `command_sequence[${index}].purpose`, errors);
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function compareCommandSequenceField(actual: unknown, expected: string, fieldPath: string, errors: string[]) {
  if (readString(actual) !== expected) {
    errors.push(`${fieldPath} must match generated case-package command sequence`);
  }
}

function compareCommandSequenceStringArray(actual: unknown, expected: string[], fieldPath: string, errors: string[]) {
  if (!Array.isArray(actual)) {
    errors.push(`${fieldPath} must be an array`);
    return;
  }
  const actualStrings = actual.map((item) => readString(item));
  if (!sameOrderedStrings(actualStrings, expected)) {
    errors.push(`${fieldPath} must match generated case-package command sequence`);
  }
}

async function validateEvaluationAssetCasesFileAgainstCasePackage(
  casePackage: StudentLearningMaterialEvaluationCasePackage,
  filePath: string
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    const value = await readJsonFile<unknown>(filePath);
    if (!isRecord(value)) {
      return {
        ok: false,
        errors: ["evaluation_asset_cases_path must be an object with dataset_id, dataset_kind, and cases[] for case package provenance"],
        warnings
      };
    }

    if (readString(value.dataset_id) !== casePackage.dataset_id) {
      errors.push("dataset_id must match case-package dataset_id");
    }
    if (readString(value.dataset_kind) !== casePackage.dataset_kind) {
      errors.push("dataset_kind must match case-package dataset_kind");
    }
    const expectedDescription = typeof casePackage.description === "string" ? casePackage.description : undefined;
    const actualDescription = typeof value.description === "string" ? value.description : undefined;
    if (expectedDescription !== actualDescription) {
      errors.push("description must match case-package description");
    }

    if (!Array.isArray(value.cases)) {
      errors.push("cases must be an array");
    } else {
      if (value.cases.length !== 1) {
        errors.push("cases must contain exactly one case for this case package");
      }
      const expectedCase = casePackage.evaluation_asset_case;
      if (!isRecord(expectedCase)) {
        errors.push("case-package evaluation_asset_case is required");
      } else {
        validateEvaluationAssetManifestCaseMatchesExpected(value.cases[0], expectedCase, errors);
      }
    }
  } catch (error) {
    errors.push(`cannot read or parse evaluation asset cases file: ${formatError(error)}`);
  }
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function validateEvaluationAssetManifestCaseMatchesExpected(
  actualCase: unknown,
  expectedCase: StudentLearningMaterialEvaluationAssetManifestCase,
  errors: string[]
) {
  if (!isRecord(actualCase)) {
    errors.push("cases[0] must be an object");
    return;
  }

  const unexpectedKeys = new Set(Object.keys(actualCase));
  for (const key of evaluationAssetManifestCaseKeys) {
    unexpectedKeys.delete(key);
    const expectedValue = readOptionalString(expectedCase[key]);
    const actualValue = readOptionalString(actualCase[key]);
    if (actualValue !== expectedValue) {
      errors.push(`cases[0].${key} must match case-package evaluation_asset_case.${key}`);
    }
  }
  if (unexpectedKeys.size) {
    errors.push(`cases[0] has unexpected fields: ${Array.from(unexpectedKeys).sort().join(", ")}`);
  }
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

async function readOptionalSideInputArtifact(
  artifactStatuses: StudentLearningMaterialEvaluationCasePackageArtifactStatus[],
  validationStatuses: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus[],
  pathKey: "answer_keys_path" | "rubrics_path",
  validatorId: "answer_keys_side_input" | "rubrics_side_input",
  packetQuestionIds: Set<string> | undefined
) {
  const sideInputStatus = artifactStatuses.find((item) => item.path_key === pathKey);
  if (!sideInputStatus?.exists || !sideInputStatus.path_boundary_ok) return undefined;

  try {
    const value = await readJsonFile<unknown>(sideInputStatus.absolute_path);
    const values = Array.isArray(value) ? value : [value];
    const errors: string[] = [];
    if (packetQuestionIds) validateSideInputQuestionIds(values, packetQuestionIds, pathKey, errors);
    validationStatuses.push({
      path_key: sideInputStatus.path_key,
      path: sideInputStatus.path,
      absolute_path: sideInputStatus.absolute_path,
      validator_id: validatorId,
      validation_ok: errors.length === 0,
      errors,
      warnings: []
    });
    return values;
  } catch (error) {
    validationStatuses.push({
      path_key: sideInputStatus.path_key,
      path: sideInputStatus.path,
      absolute_path: sideInputStatus.absolute_path,
      validator_id: validatorId,
      validation_ok: false,
      errors: [`cannot read or parse side input JSON: ${formatError(error)}`],
      warnings: []
    });
    return undefined;
  }
}

function validateAnalysisArtifact(
  analysis: StudentLearningMaterialAnalysis,
  packet: VisionEvidencePacket,
  sideInputs?: { answerKeys?: unknown[]; rubrics?: unknown[] }
) {
  const schemaValidation = validateStudentLearningMaterialAnalysis(analysis);
  const evidenceCoverage = checkEvidenceCoverage(analysis);
  const questionEvidenceReadiness = buildQuestionEvidenceReadiness(packet, sideInputs);
  const allowedExternalEvidenceRefsByQuestionId = buildExternalSideInputRefsByQuestionId(questionEvidenceReadiness);
  const packetEvidenceRefsValidation = validateStudentLearningMaterialAnalysisEvidenceRefsAgainstPacket(analysis, packet, {
    allowedExternalEvidenceRefs: [...allowedExternalEvidenceRefsByQuestionId.values()].flat(),
    allowedExternalEvidenceRefsByQuestionId
  });
  const packetQuestionValidation = validateStudentLearningMaterialAnalysisQuestionCoverageAgainstPacket(analysis, packet);
  const questionReadinessValidation = validateAnalysisAgainstQuestionEvidenceReadiness(analysis, questionEvidenceReadiness);
  const mistakeDiagnosisEvidenceValidation = validateStudentLearningMaterialAnalysisMistakeDiagnosisEvidenceAgainstPacket(analysis, packet);
  const profileUpdateSuggestionValidation = validateStudentLearningMaterialAnalysisProfileUpdateSuggestionsAgainstPacket(analysis, packet);
  const feedbackSafety = checkWechatFeedbackSafety(analysis.wechat_parent_feedback_draft);
  return {
    ok:
      schemaValidation.ok &&
      evidenceCoverage.ok &&
      packetEvidenceRefsValidation.ok &&
      packetQuestionValidation.ok &&
      questionReadinessValidation.ok &&
      mistakeDiagnosisEvidenceValidation.ok &&
      profileUpdateSuggestionValidation.ok &&
      feedbackSafety.ok,
    errors: uniqueStrings([
      ...schemaValidation.errors,
      ...evidenceCoverage.errors,
      ...packetEvidenceRefsValidation.errors,
      ...packetQuestionValidation.errors,
      ...questionReadinessValidation.errors,
      ...mistakeDiagnosisEvidenceValidation.errors,
      ...profileUpdateSuggestionValidation.errors,
      ...feedbackSafety.errors
    ]),
    warnings: uniqueStrings([
      ...schemaValidation.warnings,
      ...evidenceCoverage.warnings,
      ...packetEvidenceRefsValidation.warnings,
      ...packetQuestionValidation.warnings,
      ...questionReadinessValidation.warnings,
      ...mistakeDiagnosisEvidenceValidation.warnings,
      ...profileUpdateSuggestionValidation.warnings,
      ...feedbackSafety.warnings
    ])
  };
}

function buildExternalSideInputRefsByQuestionId(readiness: ReturnType<typeof buildQuestionEvidenceReadiness>) {
  return new Map(
    readiness.questions.map((question) => [question.question_id, question.evidenceRefs.filter((ref) => ref.startsWith("side_input."))])
  );
}

function validateSideInputQuestionIds(values: unknown[], packetQuestionIds: Set<string>, fieldName: string, errors: string[]) {
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

function extractExplicitQuestionId(value: unknown) {
  if (!isRecord(value)) return undefined;
  return readString(value.question_id) || readString(value.questionId) || undefined;
}

function validateStudentMonthlyReportInputArtifact(input: unknown) {
  return validateStudentMonthlyReportFileInput(input);
}

function validateMonthlyReportArtifact(
  value: unknown,
  analysis: StudentLearningMaterialAnalysis,
  result: StudentLearningMaterialUserFacingResult,
  monthlyReportInput: StudentMonthlyReportFileInput | undefined
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["monthly report must be an object"], warnings };
  }
  const report = value as StudentMonthlyReport;
  if (report.schema_version !== "student_monthly_report_v1") errors.push("schema_version must be student_monthly_report_v1");
  if (report.report_type !== "student") errors.push("report_type must be student");
  if (report.audience !== "parent") errors.push("audience must be parent");
  if (!isRecord(report.readiness)) {
    errors.push("readiness is required");
  } else if (!Number.isInteger(report.readiness.source_count) || report.readiness.source_count < 0) {
    errors.push("readiness.source_count must be a non-negative integer");
  }
  if (!Array.isArray(report.evidence_timeline)) {
    errors.push("evidence_timeline must be an array");
  } else if (Number.isInteger(report.readiness?.source_count) && report.evidence_timeline.length !== report.readiness.source_count) {
    errors.push("evidence_timeline length must match readiness.source_count");
  }
  validateMonthlyReportComparisonEvidence(report, errors);
  if (report.month_label !== formatMonthLabel(analysis.monthly_report_snapshot.month)) {
    errors.push("month_label must match analysis monthly_report_snapshot.month");
  }
  if (report.month_label !== formatMonthLabel(result.monthly_result.month)) {
    errors.push("month_label must match result monthly_result.month");
  }
  const parentMessage = readString(report.parent_message);
  const forbiddenTerms = forbiddenParentTerms.filter((term) => parentMessage.includes(term));
  if (forbiddenTerms.length) errors.push(`parent_message contains forbidden expressions: ${forbiddenTerms.join(", ")}`);
  if (monthlyReportInput) validateMonthlyReportAgainstInput(report, monthlyReportInput, errors);
  return { ok: errors.length === 0, errors, warnings };
}

function validateMonthlyReportAgainstInput(report: StudentMonthlyReport, input: StudentMonthlyReportFileInput, errors: string[]) {
  if (report.month_label !== formatMonthLabel(input.current_month)) {
    errors.push("month_label must match monthly_report_input_path.current_month");
  }
  if (report.student_name !== input.student_name) {
    errors.push("student_name must match monthly_report_input_path.student_name");
  }
  const expectedCurrentSourceCount = (input.snapshots?.length || 0) + (input.confirmed_sources?.length || 0);
  if (isRecord(report.readiness) && report.readiness.source_count !== expectedCurrentSourceCount) {
    errors.push("readiness.source_count must match monthly_report_input_path current confirmed source count");
  }
  const expectedCurrentSourceIds = buildMonthlyReportInputCurrentSourceIds(input);
  const actualCurrentSourceIds = Array.isArray(report.evidence_timeline)
    ? report.evidence_timeline.map((source) => readString(source.id)).filter((sourceId) => sourceId.length > 0)
    : [];
  if (!sameOrderedStrings(actualCurrentSourceIds, expectedCurrentSourceIds)) {
    errors.push("evidence_timeline source ids must match monthly_report_input_path current source ids");
  }
  const expectedPreviousSourceIds = buildMonthlyReportInputPreviousSourceIds(input);
  const actualPreviousSourceIds = Array.isArray(report.comparison_evidence?.previous_month_source_ids)
    ? report.comparison_evidence.previous_month_source_ids.map((sourceId) => readString(sourceId)).filter((sourceId) => sourceId.length > 0)
    : [];
  if (!sameOrderedStrings(actualPreviousSourceIds, expectedPreviousSourceIds)) {
    errors.push("comparison_evidence.previous_month_source_ids must match monthly_report_input_path previous source ids");
  }
  const hasPreviousInputEvidence =
    (input.previous_month_snapshots?.length || 0) > 0 ||
    (input.previous_month_confirmed_sources?.length || 0) > 0 ||
    Boolean(input.previous_report);
  if (report.comparison_evidence.previous_month_evidence_status === "available" && !hasPreviousInputEvidence) {
    errors.push("comparison_evidence available status requires previous-month evidence in monthly_report_input_path");
  }
}

function validateMonthlyReportComparisonEvidence(report: StudentMonthlyReport, errors: string[]) {
  const evidence = report.comparison_evidence;
  if (!isRecord(evidence)) {
    errors.push("comparison_evidence is required");
    return;
  }
  if (Number.isInteger(report.readiness?.source_count) && evidence.current_month_source_count !== report.readiness.source_count) {
    errors.push("comparison_evidence.current_month_source_count must match readiness.source_count");
  }
  if (evidence.previous_month_evidence_status !== "available" && evidence.previous_month_evidence_status !== "missing") {
    errors.push("comparison_evidence.previous_month_evidence_status must be available or missing");
  }
  if (!Number.isInteger(evidence.previous_month_source_count) || evidence.previous_month_source_count < 0) {
    errors.push("comparison_evidence.previous_month_source_count must be a non-negative integer");
  }
  if (!Array.isArray(evidence.previous_month_source_ids)) {
    errors.push("comparison_evidence.previous_month_source_ids must be an array");
  }
  const previousMonthSourceIds = Array.isArray(evidence.previous_month_source_ids)
    ? evidence.previous_month_source_ids.filter((sourceId): sourceId is string => readString(sourceId).length > 0).map((sourceId) => sourceId.trim())
    : [];
  if (Array.isArray(evidence.previous_month_source_ids) && evidence.previous_month_source_ids.some((sourceId) => !readString(sourceId))) {
    errors.push("comparison_evidence.previous_month_source_ids must contain non-empty source ids");
  }
  const duplicates = findDuplicates(previousMonthSourceIds);
  if (duplicates.length) errors.push(`comparison_evidence.previous_month_source_ids duplicate source ids: ${duplicates.join(", ")}`);
  if (Number.isInteger(evidence.previous_month_source_count) && evidence.previous_month_source_count !== previousMonthSourceIds.length) {
    errors.push("comparison_evidence.previous_month_source_count must match previous_month_source_ids length");
  }

  const hasPreviousEvidence = hasMonthlyReportPreviousMonthEvidence(report);
  if (evidence.previous_month_evidence_status === "available" && !hasPreviousEvidence) {
    errors.push("comparison_evidence available status requires replayable previous-month source ids");
  }
  if (evidence.previous_month_evidence_status === "missing" && evidence.previous_month_source_count > 0) {
    errors.push("comparison_evidence missing status must not include previous-month source count");
  }
  if (evidence.previous_month_evidence_status === "missing" && previousMonthSourceIds.length > 0) {
    errors.push("comparison_evidence missing status must not include previous-month source ids");
  }
  if (evidence.previous_month_evidence_status === "missing" && evidence.previous_month_report_used) {
    errors.push("comparison_evidence missing status must not mark previous_month_report_used");
  }
  if (hasMonthlyTrendClaim(report) && !hasPreviousEvidence) {
    errors.push("month_over_month_comparison makes a trend claim without replayable previous-month evidence");
  }
  if (!hasPreviousEvidence && !statesMissingPreviousMonthEvidence(report)) {
    errors.push("month_over_month_comparison must state missing previous-month evidence when comparison_evidence is missing");
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
  if (!isRecord(comparison)) return false;
  const hasSignalArrays =
    safeArray(comparison.improved_signals).length > 0 ||
    safeArray(comparison.stable_signals).length > 0 ||
    safeArray(comparison.repeated_issues).length > 0 ||
    safeArray(comparison.new_issues).length > 0;
  const comparisonText = `${readString(comparison.summary)} ${readString(comparison.parent_readable_comparison)}`;
  return hasSignalArrays || /和上月相比|和上个月相比|较上月|相比.*积极变化|更稳定|提升|下降|退步/.test(comparisonText);
}

function statesMissingPreviousMonthEvidence(report: StudentMonthlyReport) {
  const comparison = report.month_over_month_comparison;
  const readinessMissingSources = isRecord(report.readiness) ? report.readiness.missing_sources : undefined;
  const texts = [
    ...safeStringArray(isRecord(comparison) ? comparison.insufficient_evidence : undefined),
    readString(isRecord(comparison) ? comparison.summary : undefined),
    readString(isRecord(comparison) ? comparison.parent_readable_comparison : undefined),
    ...safeStringArray(readinessMissingSources)
  ];
  return texts.some((text) => /缺少上月|上月可比.*不足|上月.*不足|不做强趋势|暂不做完整纵向/.test(text));
}

function buildArtifactGroupStatuses(
  artifactStatuses: StudentLearningMaterialEvaluationCasePackageArtifactStatus[]
): StudentLearningMaterialEvaluationCasePackageArtifactGroupStatus[] {
  const byPathKey = new Map(artifactStatuses.map((item) => [item.path_key, item]));
  const groups: Array<{
    group_id: StudentLearningMaterialEvaluationCasePackageArtifactGroupStatus["group_id"];
    required_path_keys: string[];
  }> = [
    {
      group_id: "ocr_vision",
      required_path_keys: ["external_vision_input_path", "vision_packet_path", "provider_trial_report_path"]
    },
    {
      group_id: "question_segmentation",
      required_path_keys: ["question_segmentation_review_path"]
    },
    {
      group_id: "human_gold",
      required_path_keys: [
        "annotation_task_path",
        "annotation_import_path",
        "gold_label_package_path",
        "gold_label_review_report_path"
      ]
    },
    {
      group_id: "analysis_result",
      required_path_keys: ["analysis_path", "result_path"]
    },
    {
      group_id: "monthly_comparison",
      required_path_keys: ["monthly_report_input_path", "monthly_report_path"]
    },
    {
      group_id: "teacher_delivery",
      required_path_keys: ["delivery_bundle_path", "teacher_review_packet_path"]
    },
    {
      group_id: "asset_manifest",
      required_path_keys: ["evaluation_asset_cases_path"]
    }
  ];

  return groups.map((group) => {
    const missingPathKeys = group.required_path_keys.filter((pathKey) => !byPathKey.get(pathKey)?.exists);
    return {
      group_id: group.group_id,
      required_path_keys: group.required_path_keys,
      present_count: group.required_path_keys.length - missingPathKeys.length,
      required_count: group.required_path_keys.length,
      missing_path_keys: missingPathKeys,
      status: missingPathKeys.length === 0 ? "complete" : "missing"
    };
  });
}

function formatArtifactGroupSummary(groups: StudentLearningMaterialEvaluationCasePackageArtifactGroupStatus[]) {
  return groups
    .map((group) => `${group.group_id}:${group.status}:${group.present_count}/${group.required_count}`)
    .join(", ");
}

function formatArtifactValidationSummary(statuses: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus[]) {
  if (!statuses.length) return "none";
  return statuses.map((status) => `${status.path_key}:${status.validation_ok ? "pass" : "fail"}:${status.errors.length}e/${status.warnings.length}w`).join(", ");
}

async function inspectCommandStatuses(casePackage: StudentLearningMaterialEvaluationCasePackage, packageDir: string) {
  const statuses: StudentLearningMaterialEvaluationCasePackageCommandStatus[] = [];
  for (const step of casePackage.command_sequence || []) {
    const missingInputs = await missingExistingFiles(step.required_inputs || [], packageDir);
    const missingOutputs = await missingExistingFiles(step.outputs || [], packageDir);
    const outputsPresent = (step.outputs || []).filter((filePath) => !missingOutputs.includes(filePath));
    statuses.push({
      step_id: step.step_id,
      command: step.command,
      status: missingOutputs.length === 0 ? "complete" : missingInputs.length === 0 ? "ready_to_run" : "blocked_missing_inputs",
      missing_inputs: missingInputs,
      missing_outputs: missingOutputs,
      outputs_present: outputsPresent,
      purpose: step.purpose
    });
  }
  return statuses;
}

async function inspectChecklistStatuses(casePackage: StudentLearningMaterialEvaluationCasePackage, packageDir: string) {
  const statuses: StudentLearningMaterialEvaluationCasePackageChecklistStatus[] = [];
  for (const item of casePackage.checklist || []) {
    const evidencePath = item.evidence_path;
    const status = await inspectChecklistItemStatus({
      itemId: item.item_id,
      evidencePath,
      packageDir
    });
    statuses.push({
      item_id: item.item_id,
      required_for_99: item.required_for_99,
      ...(evidencePath ? { evidence_path: evidencePath } : {}),
      status
    });
  }
  return statuses;
}

async function inspectChecklistItemStatus(input: {
  itemId: string;
  evidencePath?: string;
  packageDir: string;
}): Promise<StudentLearningMaterialEvaluationCasePackageChecklistStatus["status"]> {
  if (!input.evidencePath || !isSafePackageRelativePath(input.evidencePath)) return "missing";
  const absolutePath = path.resolve(input.packageDir, input.evidencePath);
  if (!(await fileExists(absolutePath))) return "missing";
  if (input.itemId === "provider_candidate_role_coverage_document_layout_formula") {
    return (await visionPacketHasProviderCandidateRoleCoverage(absolutePath)) ? "present" : "missing";
  }
  return "present";
}

async function visionPacketHasProviderCandidateRoleCoverage(visionPacketPath: string) {
  try {
    const packet = await readJsonFile<VisionEvidencePacket>(visionPacketPath);
    const candidates = Array.isArray(packet.pipeline_trace?.provider_candidates) ? packet.pipeline_trace.provider_candidates : [];
    const hasDocumentOrOcr = candidates.some((candidate) => candidate.role === "document_parser" || candidate.role === "ocr");
    const hasLayout = candidates.some((candidate) => candidate.role === "layout" || candidate.role === "document_parser");
    const hasFormula = candidates.some((candidate) => candidate.role === "formula");
    return hasDocumentOrOcr && hasLayout && hasFormula;
  } catch {
    return false;
  }
}

async function inspectAssetPreflight(manifestPath: string) {
  const absolutePath = path.resolve(manifestPath);
  const exists = await fileExists(absolutePath);
  if (!exists) {
    return {
      manifest_path: absolutePath,
      exists: false,
      validation_ok: false,
      claimable99AssetReady: false,
      blockers: ["evaluation asset manifest is missing"],
      errors: [],
      warnings: []
    };
  }

  const validation = validateStudentLearningMaterialEvaluationAssetManifestFromFile(absolutePath) as StudentLearningMaterialEvaluationAssetManifestValidation;
  return {
    manifest_path: absolutePath,
    exists: true,
    validation_ok: validation.ok,
    claimable99AssetReady: validation.claimReadiness.claimable99AssetReady,
    blockers: validation.claimReadiness.blockers,
    errors: validation.errors,
    warnings: validation.warnings
  };
}

async function inspectProviderTrialReadiness(
  artifactStatuses: StudentLearningMaterialEvaluationCasePackageArtifactStatus[],
  artifactValidationStatuses: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus[]
): Promise<StudentLearningMaterialEvaluationCasePackageReadiness["provider_trial_readiness"]> {
  const providerTrialReportStatus = artifactStatuses.find((item) => item.path_key === "provider_trial_report_path");
  if (!providerTrialReportStatus?.exists || !providerTrialReportStatus.path_boundary_ok) return undefined;
  const validationStatus = artifactValidationStatuses.find((item) => item.path_key === "provider_trial_report_path");
  if (!validationStatus?.validation_ok) return undefined;
  try {
    const report = await readJsonFile<StudentLearningMaterialVisionProviderTrialReport>(providerTrialReportStatus.absolute_path);
    if (
      report.readiness !== "ready_for_human_labeling" &&
      report.readiness !== "needs_evidence_completion" &&
      report.readiness !== "blocked"
    ) {
      return undefined;
    }
    return {
      path: providerTrialReportStatus.path,
      readiness: report.readiness,
      blockers: Array.isArray(report.blockers) ? report.blockers : [],
      warnings: Array.isArray(report.warnings) ? report.warnings : [],
      next_steps: Array.isArray(report.next_steps) ? report.next_steps : []
    };
  } catch {
    return undefined;
  }
}

function buildClaimBlockers(input: {
  privacyErrors: string[];
  artifactStatuses: StudentLearningMaterialEvaluationCasePackageArtifactStatus[];
  artifactValidationStatuses: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus[];
  checklistStatuses: StudentLearningMaterialEvaluationCasePackageChecklistStatus[];
  providerTrialReadiness: StudentLearningMaterialEvaluationCasePackageReadiness["provider_trial_readiness"];
  assetPreflight: StudentLearningMaterialEvaluationCasePackageReadiness["asset_preflight"];
}) {
  const blockers: string[] = [];
  blockers.push("case package scaffold alone is not 99% evidence; run human-labeled dataset eval after asset preflight");
  blockers.push(...input.privacyErrors);
  const unsafePaths = input.artifactStatuses.filter((item) => !item.path_boundary_ok).map((item) => item.path_key);
  if (unsafePaths.length) blockers.push(`artifact paths must stay inside package: ${unsafePaths.join(", ")}`);
  const invalidArtifacts = input.artifactValidationStatuses.filter((item) => !item.validation_ok);
  blockers.push(
    ...invalidArtifacts.map(
      (item) => `${item.path_key} validation must pass before downstream labeling or reasoning: ${item.errors[0] || "artifact validation failed"}`
    )
  );
  const missingChecklist = input.checklistStatuses.filter((item) => item.required_for_99 && item.status === "missing").map((item) => item.item_id);
  if (missingChecklist.length) blockers.push(`missing required 99 evidence: ${missingChecklist.join(", ")}`);
  if (input.providerTrialReadiness?.readiness === "blocked") {
    blockers.push(
      `provider trial report readiness is blocked: ${
        input.providerTrialReadiness.blockers[0] || "fix Provider output before downstream labeling or reasoning"
      }`
    );
  }
  if (!input.assetPreflight?.exists) {
    blockers.push("evaluation-assets.json must be generated and validated");
  } else if (!input.assetPreflight.validation_ok) {
    blockers.push("evaluation asset manifest validation must pass");
  } else if (!input.assetPreflight.claimable99AssetReady) {
    blockers.push(...input.assetPreflight.blockers);
  }
  return Array.from(new Set(blockers));
}

function buildNextAction(input: {
  privacyErrors: string[];
  artifactValidationStatuses: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus[];
  checklistStatuses: StudentLearningMaterialEvaluationCasePackageChecklistStatus[];
  providerTrialReadiness: StudentLearningMaterialEvaluationCasePackageReadiness["provider_trial_readiness"];
  commandStatuses: StudentLearningMaterialEvaluationCasePackageCommandStatus[];
  assetPreflight: StudentLearningMaterialEvaluationCasePackageReadiness["asset_preflight"];
}): StudentLearningMaterialEvaluationCasePackageReadiness["next_action"] {
  if (input.privacyErrors.length) {
    return {
      status: "fix_privacy_boundary",
      reason: input.privacyErrors[0]
    };
  }
  const firstInvalidArtifact = input.artifactValidationStatuses.find((item) => !item.validation_ok);
  if (firstInvalidArtifact) {
    return {
      status: "fix_artifact_validation",
      reason: `${firstInvalidArtifact.path_key}: ${firstInvalidArtifact.errors[0] || "artifact validation failed"}`
    };
  }
  const actionableMissingChecklist = findActionableMissingChecklist(input.checklistStatuses, input.artifactValidationStatuses);
  if (actionableMissingChecklist) {
    return {
      status: "complete_checklist_evidence",
      checklist_item_id: actionableMissingChecklist.item_id,
      reason: formatChecklistNextActionReason(actionableMissingChecklist)
    };
  }
  if (input.providerTrialReadiness?.readiness === "blocked") {
    return {
      status: "fix_provider_trial_readiness",
      reason:
        input.providerTrialReadiness.blockers[0] ||
        "Provider trial report is blocked; regenerate OCR/Layout/Vision output before downstream labeling or reasoning."
    };
  }
  const firstIncompleteStep = input.commandStatuses.find((step) => step.status !== "complete");
  if (firstIncompleteStep?.status === "ready_to_run") {
    return {
      status: "run_next_command",
      step_id: firstIncompleteStep.step_id,
      command: firstIncompleteStep.command,
      reason: `all required inputs are present for ${firstIncompleteStep.step_id}`
    };
  }
  if (firstIncompleteStep?.status === "blocked_missing_inputs") {
    return {
      status: "provide_missing_input",
      step_id: firstIncompleteStep.step_id,
      command: firstIncompleteStep.command,
      reason: `missing inputs: ${firstIncompleteStep.missing_inputs.join(", ")}`
    };
  }
  if (!input.assetPreflight?.exists) {
    return {
      status: "run_asset_preflight",
      reason: "generate evaluation-assets.json and run validate:k12-eval-assets before dataset evaluation"
    };
  }
  if (!input.assetPreflight.validation_ok || !input.assetPreflight.claimable99AssetReady) {
    return {
      status: "fix_asset_preflight",
      reason: input.assetPreflight.errors[0] || input.assetPreflight.blockers[0] || "asset preflight is not claim-ready"
    };
  }
  return {
    status: "ready_for_dataset_eval",
    reason: "asset preflight is claim-ready; generate the dataset and run eval:k12-material"
  };
}

function findActionableMissingChecklist(
  checklistStatuses: StudentLearningMaterialEvaluationCasePackageChecklistStatus[],
  artifactValidationStatuses: StudentLearningMaterialEvaluationCasePackageArtifactValidationStatus[]
) {
  const providerRoleCoverage = checklistStatuses.find(
    (item) => item.item_id === "provider_candidate_role_coverage_document_layout_formula" && item.status === "missing"
  );
  if (!providerRoleCoverage) return undefined;
  const visionPacketValidation = artifactValidationStatuses.find((item) => item.path_key === "vision_packet_path");
  if (visionPacketValidation?.validation_ok) return providerRoleCoverage;
  return undefined;
}

function formatChecklistNextActionReason(item: StudentLearningMaterialEvaluationCasePackageChecklistStatus) {
  if (item.item_id === "provider_candidate_role_coverage_document_layout_formula") {
    return "VisionEvidencePacket pipeline_trace.provider_candidates must include OCR/document-parser, layout, and formula candidates before Provider trial, human labeling, or asset preflight.";
  }
  return `${item.item_id} evidence must be completed before asset preflight.`;
}

async function missingExistingFiles(filePaths: string[], packageDir: string) {
  const missing: string[] = [];
  for (const filePath of filePaths) {
    if (!isSafePackageRelativePath(filePath) || !(await fileExists(path.resolve(packageDir, filePath)))) {
      missing.push(filePath);
    }
  }
  return missing;
}

function isSafePackageRelativePath(filePath: unknown) {
  if (typeof filePath !== "string" || !filePath.trim()) return false;
  if (path.isAbsolute(filePath)) return false;
  const normalized = path.normalize(filePath);
  if (normalized === "." || normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) return false;
  return true;
}

async function fileExists(filePath: string) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

function countCommandStatuses(commandStatuses: StudentLearningMaterialEvaluationCasePackageCommandStatus[]) {
  return commandStatuses.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    {
      complete: 0,
      ready_to_run: 0,
      blocked_missing_inputs: 0
    }
  );
}

function countChecklistStatuses(checklistStatuses: StudentLearningMaterialEvaluationCasePackageChecklistStatus[]) {
  return checklistStatuses.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    {
      present: 0,
      missing: 0
    }
  );
}

const forbiddenParentTerms = ["严重", "很差", "完全不会", "保证提分", "不认真", "基础很差", "一定能提高", "一定提升", "孩子不行", "家长必须"];

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter((item) => item.trim().length > 0)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function safeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function safeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
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

function buildMonthlyReportInputCurrentSourceIds(input: StudentMonthlyReportFileInput) {
  return buildMonthlyReportInputSourceIds(input.snapshots, input.confirmed_sources);
}

function buildMonthlyReportInputPreviousSourceIds(input: StudentMonthlyReportFileInput) {
  return uniqueStrings([
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
    .filter((source): source is { sourceDate: string; sourceId: string } => source.sourceDate.length > 0 && source.sourceId.length > 0)
    .sort((left, right) => left.sourceDate.localeCompare(right.sourceDate))
    .map((source) => source.sourceId);
}

function readPreviousReportEvidenceTimelineSourceIds(previousReport: StudentMonthlyReportFileInput["previous_report"]) {
  if (!Array.isArray(previousReport?.evidence_timeline)) return [];
  return uniqueStrings(previousReport.evidence_timeline.map((source) => readString(source.id)));
}

function formatMonthLabel(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return `${match[1]} 年 ${Number(match[2])} 月`;
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
