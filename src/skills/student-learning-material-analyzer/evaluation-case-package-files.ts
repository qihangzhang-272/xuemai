import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StudentLearningMaterialEvaluationDatasetKind } from "./evaluation";
import type { StudentLearningMaterialEvaluationAssetManifestCase } from "./evaluation-assets";

export type StudentLearningMaterialEvaluationCasePackageArtifactPaths = {
  external_vision_input_path: string;
  vision_packet_path: string;
  answer_keys_path?: string;
  rubrics_path?: string;
  provider_trial_report_path: string;
  question_segmentation_review_path: string;
  annotation_task_path: string;
  annotation_import_path: string;
  gold_label_package_path: string;
  gold_label_review_report_path: string;
  analysis_path: string;
  result_path: string;
  monthly_report_input_path: string;
  monthly_report_path: string;
  delivery_bundle_path: string;
  teacher_review_packet_path: string;
  evaluation_asset_cases_path: string;
};

export type StudentLearningMaterialEvaluationCasePackageHelperPaths = {
  external_vision_input_template_path: string;
};

export type StudentLearningMaterialExternalVisionInputMappingTemplate = {
  schema_version: "student_learning_material_external_vision_input_mapping_template.v0.1";
  case_id: string;
  dataset_id: string;
  target_artifact_path: string;
  privacy_boundary: {
    template_is_not_claim_evidence: true;
    do_not_copy_raw_student_materials_into_package: true;
    do_not_store_raw_ocr_fulltext_in_helper_notes: true;
    replace_placeholders_with_real_anonymized_provider_output: true;
  };
  provider_input_contract: {
    required_identity_fields: string[];
    required_collections: string[];
    required_question_fields: string[];
    required_evidence_fields: string[];
    required_provider_candidate_roles: Array<"document_parser_or_ocr" | "layout" | "formula">;
  };
  mapping_rules: string[];
  provider_trace_requirements: string[];
  example_non_executable_shape: Record<string, unknown>;
};

export type StudentLearningMaterialEvaluationCasePackage = {
  schema_version: "student_learning_material_evaluation_case_package.v0.1";
  case_id: string;
  dataset_id: string;
  dataset_kind: StudentLearningMaterialEvaluationDatasetKind;
  description?: string;
  created_at: string;
  package_dir: string;
  privacy_boundary: {
    raw_student_materials_allowed_in_package: false;
    raw_images_excluded_from_gold_file: true;
    anonymization_required_before_gold: true;
    do_not_commit_raw_student_materials: true;
  };
  artifact_paths: StudentLearningMaterialEvaluationCasePackageArtifactPaths;
  helper_paths: StudentLearningMaterialEvaluationCasePackageHelperPaths;
  evaluation_asset_case: StudentLearningMaterialEvaluationAssetManifestCase;
  command_sequence: Array<{
    step_id: string;
    command: string;
    required_inputs: string[];
    outputs: string[];
    purpose: string;
  }>;
  checklist: Array<{
    item_id: string;
    status: "pending";
    required_for_99: boolean;
    evidence_path?: string;
  }>;
};

export type GenerateStudentLearningMaterialEvaluationCasePackageInput = {
  packageDir: string;
  caseId: string;
  datasetId: string;
  datasetKind?: StudentLearningMaterialEvaluationDatasetKind;
  description?: string;
  createdAt?: string;
  answerKeysPath?: string;
  rubricsPath?: string;
  overwriteExisting?: boolean;
};

export type GenerateStudentLearningMaterialEvaluationCasePackageResult = {
  packageDir: string;
  casePackagePath: string;
  evaluationAssetCasesPath: string;
  externalVisionInputTemplatePath: string;
  caseId: string;
  datasetId: string;
  datasetKind: StudentLearningMaterialEvaluationDatasetKind;
  artifactPathCount: number;
  helperPathCount: number;
  checklistCount: number;
};

export async function generateStudentLearningMaterialEvaluationCasePackage(
  input: GenerateStudentLearningMaterialEvaluationCasePackageInput
): Promise<GenerateStudentLearningMaterialEvaluationCasePackageResult> {
  const packageDir = path.resolve(input.packageDir);
  const packageValue = buildStudentLearningMaterialEvaluationCasePackage({
    ...input,
    packageDir
  });
  const casePackagePath = path.join(packageDir, "case-package.json");
  const evaluationAssetCasesPath = path.join(packageDir, packageValue.artifact_paths.evaluation_asset_cases_path);
  const externalVisionInputTemplatePath = path.join(packageDir, packageValue.helper_paths.external_vision_input_template_path);
  const casesFile = {
    dataset_id: packageValue.dataset_id,
    dataset_kind: packageValue.dataset_kind,
    ...(packageValue.description ? { description: packageValue.description } : {}),
    cases: [packageValue.evaluation_asset_case]
  };

  await mkdir(path.dirname(casePackagePath), { recursive: true });
  await mkdir(path.dirname(evaluationAssetCasesPath), { recursive: true });
  await mkdir(path.dirname(externalVisionInputTemplatePath), { recursive: true });
  await writeJsonFile(casePackagePath, packageValue);
  await writeJsonFile(evaluationAssetCasesPath, casesFile);
  await writeJsonFile(externalVisionInputTemplatePath, buildExternalVisionInputMappingTemplate(packageValue));

  return {
    packageDir,
    casePackagePath,
    evaluationAssetCasesPath,
    externalVisionInputTemplatePath,
    caseId: packageValue.case_id,
    datasetId: packageValue.dataset_id,
    datasetKind: packageValue.dataset_kind,
    artifactPathCount: Object.keys(packageValue.artifact_paths).length,
    helperPathCount: Object.keys(packageValue.helper_paths).length,
    checklistCount: packageValue.checklist.length
  };
}

export function buildStudentLearningMaterialEvaluationCasePackage(
  input: GenerateStudentLearningMaterialEvaluationCasePackageInput
): StudentLearningMaterialEvaluationCasePackage {
  const datasetKind = input.datasetKind ?? "human_labeled";
  const artifactPaths: StudentLearningMaterialEvaluationCasePackageArtifactPaths = {
    external_vision_input_path: "provider/external-vision-input.json",
    vision_packet_path: "artifacts/vision-packet.json",
    ...(input.answerKeysPath ? { answer_keys_path: input.answerKeysPath } : {}),
    ...(input.rubricsPath ? { rubrics_path: input.rubricsPath } : {}),
    provider_trial_report_path: "artifacts/provider-trial-report.json",
    question_segmentation_review_path: "artifacts/question-segmentation-review.json",
    annotation_task_path: "artifacts/annotation-task.json",
    annotation_import_path: "human-review/annotation-import.json",
    gold_label_package_path: "human-review/gold-label-package.json",
    gold_label_review_report_path: "human-review/gold-label-review-report.json",
    analysis_path: "artifacts/analysis.json",
    result_path: "artifacts/result.json",
    monthly_report_input_path: "human-review/monthly-report-input.json",
    monthly_report_path: "artifacts/monthly-report.json",
    delivery_bundle_path: "artifacts/delivery-bundle.json",
    teacher_review_packet_path: "artifacts/teacher-review-packet.json",
    evaluation_asset_cases_path: "evaluation-assets.cases.json"
  };
  const helperPaths: StudentLearningMaterialEvaluationCasePackageHelperPaths = {
    external_vision_input_template_path: "provider/external-vision-input.template.json"
  };
  const evaluationAssetCase: StudentLearningMaterialEvaluationAssetManifestCase = {
    case_id: input.caseId,
    external_vision_input_path: artifactPaths.external_vision_input_path,
    vision_packet_path: artifactPaths.vision_packet_path,
    ...(artifactPaths.answer_keys_path ? { answer_keys_path: artifactPaths.answer_keys_path } : {}),
    ...(artifactPaths.rubrics_path ? { rubrics_path: artifactPaths.rubrics_path } : {}),
    gold_label_package_path: artifactPaths.gold_label_package_path,
    provider_trial_report_path: artifactPaths.provider_trial_report_path,
    question_segmentation_review_path: artifactPaths.question_segmentation_review_path,
    annotation_task_path: artifactPaths.annotation_task_path,
    annotation_import_path: artifactPaths.annotation_import_path,
    gold_label_review_report_path: artifactPaths.gold_label_review_report_path,
    analysis_path: artifactPaths.analysis_path,
    result_path: artifactPaths.result_path,
    monthly_report_input_path: artifactPaths.monthly_report_input_path,
    monthly_report_path: artifactPaths.monthly_report_path,
    delivery_bundle_path: artifactPaths.delivery_bundle_path,
    teacher_review_packet_path: artifactPaths.teacher_review_packet_path
  };

  return {
    schema_version: "student_learning_material_evaluation_case_package.v0.1",
    case_id: input.caseId,
    dataset_id: input.datasetId,
    dataset_kind: datasetKind,
    ...(input.description ? { description: input.description } : {}),
    created_at: input.createdAt ?? new Date().toISOString(),
    package_dir: path.resolve(input.packageDir),
    privacy_boundary: {
      raw_student_materials_allowed_in_package: false,
      raw_images_excluded_from_gold_file: true,
      anonymization_required_before_gold: true,
      do_not_commit_raw_student_materials: true
    },
    artifact_paths: artifactPaths,
    helper_paths: helperPaths,
    evaluation_asset_case: evaluationAssetCase,
    command_sequence: buildCommandSequence(artifactPaths),
    checklist: buildChecklist(artifactPaths)
  };
}

function buildExternalVisionInputMappingTemplate(
  casePackage: StudentLearningMaterialEvaluationCasePackage
): StudentLearningMaterialExternalVisionInputMappingTemplate {
  return {
    schema_version: "student_learning_material_external_vision_input_mapping_template.v0.1",
    case_id: casePackage.case_id,
    dataset_id: casePackage.dataset_id,
    target_artifact_path: casePackage.artifact_paths.external_vision_input_path,
    privacy_boundary: {
      template_is_not_claim_evidence: true,
      do_not_copy_raw_student_materials_into_package: true,
      do_not_store_raw_ocr_fulltext_in_helper_notes: true,
      replace_placeholders_with_real_anonymized_provider_output: true
    },
    provider_input_contract: {
      required_identity_fields: [
        "provider",
        "providerRunId",
        "providerModelVersion",
        "materialId",
        "studentId"
      ],
      required_collections: ["pages", "questions"],
      required_question_fields: ["question_id", "page_id", "regions", "evidences", "confidence"],
      required_evidence_fields: ["evidence_id", "evidence_type", "page_id", "question_id", "confidence"],
      required_provider_candidate_roles: ["document_parser_or_ocr", "layout", "formula"]
    },
    mapping_rules: [
      "Write the real anonymized Provider output to target_artifact_path, not to this template path.",
      "Use stable page_id, question_id, region_id, evidence_id values that can be replayed across Provider trial, segmentation review, human labels, analysis, monthly, delivery, and teacher review artifacts.",
      "Keep question order identical to the visible material order; uncertain question boundaries must keep confidence low or risk_flags populated so downstream review can block hard judgement.",
      "Attach crop_ref or bbox/polygon to question regions and visual evidence whenever available; missing crop_ref keeps definitive correctness on the teacher-review path.",
      "Evidence text fields may contain OCR snippets needed for reasoning, but do not copy raw full-page OCR or raw student material into helper notes, case package prose, or gold labels.",
      "Use materialStateHint=valid_student_material only when student answer, correction, teacher mark, or note traces exist; blank templates and teacher resources must stay blocked or needs_review.",
      "Before asset preflight, ensure the generated VisionEvidencePacket pipeline_trace.provider_candidates covers OCR/document-parser, layout, and formula roles with replayable source and license/deployment notes."
    ],
    provider_trace_requirements: [
      "The normalized VisionEvidencePacket must record the selected provider as the primary candidate.",
      "The Provider candidate trace must include at least one fallback or benchmark candidate with evidence_source_url and license/deployment review notes.",
      "The Provider candidate trace must cover OCR/document-parser, layout, and formula roles; validate:k12-eval-assets reports coverage.providerRoleCoverage and blocks 99% readiness when any role is missing.",
      "Switching OCR/Vision Provider later requires baseline and candidate Provider trial reports on the same material."
    ],
    example_non_executable_shape: {
      provider: "paddleocr",
      providerRunId: "<real-provider-run-id>",
      providerModelVersion: "<provider-model-or-pipeline-version>",
      materialId: `${casePackage.case_id}_material_anonymized`,
      sourceMaterialId: `${casePackage.case_id}_source_anonymized`,
      studentId: `${casePackage.case_id}_student_anonymized`,
      teacherId: "<optional-teacher-id>",
      tenantId: "<optional-tenant-id>",
      sourceKind: "image",
      materialStateHint: "valid_student_material",
      pages: [
        {
          page_id: "p01",
          page_index: 1,
          page_image_ref: "<redacted-or-private-storage-ref-outside-gold-json>",
          image_quality_confidence: 0.9,
          quality_flags: []
        }
      ],
      questions: [
        {
          question_id: "q001",
          question_number: "1",
          page_id: "p01",
          regions: [
            {
              region_id: "reg_p01_q001",
              region_role: "question_region",
              page_id: "p01",
              bbox: {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                coord_space: "normalized"
              },
              crop_ref: "<crop-ref-created-by-provider-or-review-tool>",
              confidence: 0.9
            }
          ],
          evidences: [
            {
              evidence_id: "ev_q001_stem",
              evidence_type: "question_stem",
              page_id: "p01",
              question_id: "q001",
              region_id: "reg_p01_q001",
              confidence: 0.9,
              risk_flags: []
            }
          ],
          confidence: 0.9,
          risk_flags: []
        }
      ]
    }
  };
}

export function buildCommandSequence(paths: StudentLearningMaterialEvaluationCasePackageArtifactPaths) {
  return [
    {
      step_id: "normalize_external_vision",
      command: `XUEMAI_EXTERNAL_VISION_INPUT=${paths.external_vision_input_path} XUEMAI_VISION_PACKET_OUTPUT=${paths.vision_packet_path} npm run generate:k12-vision-packet`,
      required_inputs: [paths.external_vision_input_path],
      outputs: [paths.vision_packet_path],
      purpose: "Normalize real OCR/Layout/Vision provider output into VisionEvidencePacket."
    },
    {
      step_id: "provider_trial_report",
      command: `XUEMAI_VISION_PACKET=${paths.vision_packet_path} XUEMAI_PROVIDER_TRIAL_REPORT_OUTPUT=${paths.provider_trial_report_path} npm run generate:k12-provider-trial-report`,
      required_inputs: [paths.vision_packet_path],
      outputs: [paths.provider_trial_report_path],
      purpose: "Check provider readiness before labeling or text reasoning."
    },
    {
      step_id: "question_segmentation_review",
      command: `XUEMAI_VISION_PACKET=${paths.vision_packet_path} XUEMAI_QUESTION_SEGMENTATION_REVIEW_OUTPUT=${paths.question_segmentation_review_path} npm run generate:k12-question-segmentation-review`,
      required_inputs: [paths.vision_packet_path],
      outputs: [paths.question_segmentation_review_path],
      purpose: "Audit question boundaries, crop refs, and per-question segmentation readiness."
    },
    {
      step_id: "annotation_task",
      command: `XUEMAI_VISION_PACKET=${paths.vision_packet_path} XUEMAI_QUESTION_SEGMENTATION_REVIEW=${paths.question_segmentation_review_path} XUEMAI_GOLD_LABEL_ANNOTATION_TASK_OUTPUT=${paths.annotation_task_path} npm run generate:k12-gold-label-annotation-task`,
      required_inputs: [paths.vision_packet_path, paths.question_segmentation_review_path],
      outputs: [paths.annotation_task_path],
      purpose: "Create redacted upstream human-labeling task."
    },
    {
      step_id: "gold_label_package",
      command: `${buildOptionalSideInputEnv(paths)}XUEMAI_GOLD_LABEL_ANNOTATION_IMPORT=${paths.annotation_import_path} XUEMAI_VISION_PACKET=${paths.vision_packet_path} XUEMAI_QUESTION_SEGMENTATION_REVIEW=${paths.question_segmentation_review_path} XUEMAI_GOLD_LABEL_PACKAGE_OUTPUT=${paths.gold_label_package_path} npm run generate:k12-gold-label-package`,
      required_inputs: [
        paths.annotation_import_path,
        paths.vision_packet_path,
        paths.question_segmentation_review_path,
        ...(paths.answer_keys_path ? [paths.answer_keys_path] : []),
        ...(paths.rubrics_path ? [paths.rubrics_path] : [])
      ],
      outputs: [paths.gold_label_package_path],
      purpose: "Convert normalized double-labeled and adjudicated human labels into final gold package."
    },
    {
      step_id: "gold_label_review_report",
      command: `${buildOptionalSideInputEnv(paths)}XUEMAI_GOLD_LABEL_PACKAGE=${paths.gold_label_package_path} XUEMAI_VISION_PACKET=${paths.vision_packet_path} XUEMAI_GOLD_LABEL_REVIEW_REPORT_OUTPUT=${paths.gold_label_review_report_path} npm run generate:k12-gold-label-review-report`,
      required_inputs: [
        paths.gold_label_package_path,
        paths.vision_packet_path,
        ...(paths.answer_keys_path ? [paths.answer_keys_path] : []),
        ...(paths.rubrics_path ? [paths.rubrics_path] : [])
      ],
      outputs: [paths.gold_label_review_report_path],
      purpose: "Record double-label agreement, adjudication status, and human-review readiness."
    },
    {
      step_id: "analysis_output",
      command: `${buildOptionalSideInputEnv(paths)}XUEMAI_VISION_PACKET=${paths.vision_packet_path} XUEMAI_ANALYSIS_OUTPUT=${paths.analysis_path} npm run generate:k12-analysis-output`,
      required_inputs: [
        paths.vision_packet_path,
        ...(paths.answer_keys_path ? [paths.answer_keys_path] : []),
        ...(paths.rubrics_path ? [paths.rubrics_path] : [])
      ],
      outputs: [paths.analysis_path],
      purpose: "Generate structured StudentLearningMaterialAnalysis from evidence packet."
    },
    {
      step_id: "user_result",
      command: `XUEMAI_ANALYSIS_INPUT=${paths.analysis_path} XUEMAI_RESULT_OUTPUT=${paths.result_path} npm run generate:k12-user-result`,
      required_inputs: [paths.analysis_path],
      outputs: [paths.result_path],
      purpose: "Assemble teacher professional report, parent feedback, and monthly result artifact."
    },
    {
      step_id: "monthly_report",
      command: `XUEMAI_MONTHLY_REPORT_INPUT=${paths.monthly_report_input_path} XUEMAI_MONTHLY_REPORT_OUTPUT=${paths.monthly_report_path} npm run generate:k12-monthly-report`,
      required_inputs: [paths.monthly_report_input_path],
      outputs: [paths.monthly_report_path],
      purpose: "Generate monthly report artifact from teacher-confirmed current-month sources and replayable previous-month comparison evidence."
    },
    {
      step_id: "delivery_bundle",
      command: `XUEMAI_RESULT_INPUT=${paths.result_path} XUEMAI_MONTHLY_REPORT_INPUT=${paths.monthly_report_path} XUEMAI_DELIVERY_BUNDLE_OUTPUT=${paths.delivery_bundle_path} npm run generate:k12-delivery-bundle`,
      required_inputs: [paths.result_path, paths.monthly_report_path],
      outputs: [paths.delivery_bundle_path],
      purpose: "Package teacher-facing report, parent feedback, statuses, safeguards, and source map."
    },
    {
      step_id: "teacher_review_packet",
      command: `XUEMAI_DELIVERY_BUNDLE_INPUT=${paths.delivery_bundle_path} XUEMAI_TEACHER_REVIEW_PACKET_OUTPUT=${paths.teacher_review_packet_path} npm run generate:k12-teacher-review-packet`,
      required_inputs: [paths.delivery_bundle_path],
      outputs: [paths.teacher_review_packet_path],
      purpose: "Wrap delivery bundle as a teacher-reviewable SkillCard and analysis-detail handoff packet."
    },
    {
      step_id: "evaluation_asset_manifest",
      command: `XUEMAI_EVAL_ASSET_MANIFEST_CASES=${paths.evaluation_asset_cases_path} XUEMAI_EVAL_ASSET_MANIFEST_OUTPUT=evaluation-assets.json npm run generate:k12-eval-assets-manifest`,
      required_inputs: [paths.evaluation_asset_cases_path],
      outputs: ["evaluation-assets.json"],
      purpose: "Create replayable evaluation asset manifest for preflight."
    }
  ];
}

function buildOptionalSideInputEnv(paths: StudentLearningMaterialEvaluationCasePackageArtifactPaths) {
  const env = [
    paths.answer_keys_path ? `XUEMAI_ANSWER_KEYS=${paths.answer_keys_path}` : "",
    paths.rubrics_path ? `XUEMAI_RUBRICS=${paths.rubrics_path}` : ""
  ]
    .filter(Boolean)
    .join(" ");
  return env ? `${env} ` : "";
}

function buildChecklist(paths: StudentLearningMaterialEvaluationCasePackageArtifactPaths) {
  return [
    {
      item_id: "real_provider_output_anonymized",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.external_vision_input_path
    },
    {
      item_id: "vision_packet_validated",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.vision_packet_path
    },
    {
      item_id: "provider_trial_ready",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.provider_trial_report_path
    },
    {
      item_id: "provider_candidate_role_coverage_document_layout_formula",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.vision_packet_path
    },
    {
      item_id: "question_segmentation_reviewed",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.question_segmentation_review_path
    },
    {
      item_id: "human_annotation_task_redacted",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.annotation_task_path
    },
    {
      item_id: "annotation_import_normalized_and_source_text_safe",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.annotation_import_path
    },
    {
      item_id: "double_labeled_adjudicated_gold",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.gold_label_package_path
    },
    {
      item_id: "gold_label_review_ready",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.gold_label_review_report_path
    },
    {
      item_id: "monthly_report_input_prepared_with_previous_month_evidence",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.monthly_report_input_path
    },
    {
      item_id: "monthly_previous_month_evidence_available_or_explicitly_missing",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.monthly_report_path
    },
    {
      item_id: "teacher_parent_delivery_artifacts_valid",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.delivery_bundle_path
    },
    {
      item_id: "teacher_review_packet_actions_safe",
      status: "pending" as const,
      required_for_99: true,
      evidence_path: paths.teacher_review_packet_path
    }
  ];
}

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
