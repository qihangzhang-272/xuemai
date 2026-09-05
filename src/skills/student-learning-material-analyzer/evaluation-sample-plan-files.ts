import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  StudentLearningMaterialEvaluationClaimAudit,
  StudentLearningMaterialEvaluationClaimAuditGap,
  StudentLearningMaterialEvaluationClaimAuditSampleTarget
} from "./evaluation-claim-audit-files";
import {
  generateStudentLearningMaterialEvaluationCasePackage,
  type GenerateStudentLearningMaterialEvaluationCasePackageResult
} from "./evaluation-case-package-files";

export type StudentLearningMaterialEvaluationSamplePlanItem = {
  plan_id: string;
  source_target_id: string;
  reason: string;
  suggested_case_count: number;
  minimum_question_goal?: number;
  suggested_case_attributes: StudentLearningMaterialEvaluationClaimAuditSampleTarget["suggested_case_attributes"];
  case_id_prefix: string;
  package_dir_template: string;
  first_case_package_command: string;
  follow_up_commands: string[];
  collection_requirements: string[];
  artifact_focus_notes: string[];
};

export type StudentLearningMaterialEvaluationSamplePlan = {
  schema_version: "student_learning_material_evaluation_sample_plan.v0.1";
  source_audit_path: string;
  dataset_id?: string;
  dataset_kind?: string;
  generated_at: string;
  claimable99Correctness: boolean;
  plan_status: "ready_for_formal_eval" | "fix_dataset_load" | "collect_more_real_samples";
  claim_boundary: {
    plan_is_not_correctness_evidence: true;
    no_99_claim_until_eval_claimable: true;
    requires_real_anonymized_student_materials: true;
    public_benchmarks_and_mock_sources_not_allowed: true;
  };
  recommended_batch: {
    package_root_dir: string;
    case_plan_count: number;
    largest_single_target_case_count: number;
    plans: StudentLearningMaterialEvaluationSamplePlanItem[];
  };
  report: string;
};

export type GenerateStudentLearningMaterialEvaluationSamplePlanInput = {
  auditPath: string;
  outputPath?: string;
  packageRootDir?: string;
  generatedAt?: string;
};

export type StudentLearningMaterialEvaluationSamplePackageBatch = {
  schema_version: "student_learning_material_evaluation_sample_package_batch.v0.1";
  source_sample_plan_path: string;
  generated_at: string;
  dataset_id?: string;
  package_root_dir: string;
  requested_plan_count: number;
  generated_case_count: number;
  skipped_reason?: string;
  claim_boundary: StudentLearningMaterialEvaluationSamplePlan["claim_boundary"];
  cases: Array<
    GenerateStudentLearningMaterialEvaluationCasePackageResult & {
      source_plan_id: string;
      source_target_id: string;
      ordinal: number;
    }
  >;
  report: string;
};

export type GenerateStudentLearningMaterialEvaluationSamplePackagesInput = {
  samplePlanPath: string;
  outputPath?: string;
  packageRootDir?: string;
  createdAt?: string;
  maxCasesPerPlan?: number;
  maxTotalCases?: number;
};

export async function generateStudentLearningMaterialEvaluationSamplePlanFromAuditFile(
  input: GenerateStudentLearningMaterialEvaluationSamplePlanInput
): Promise<StudentLearningMaterialEvaluationSamplePlan> {
  const auditPath = path.resolve(input.auditPath);
  const audit = JSON.parse(await readFile(auditPath, "utf8")) as StudentLearningMaterialEvaluationClaimAudit;
  const packageRootDir = input.packageRootDir || path.join("real-samples", safePathSegment(audit.dataset_id || "dataset"));
  const plans = audit.next_sample_targets.map((target) => buildSamplePlanItem(target, audit, packageRootDir));
  const planWithoutReport: Omit<StudentLearningMaterialEvaluationSamplePlan, "report"> = {
    schema_version: "student_learning_material_evaluation_sample_plan.v0.1",
    source_audit_path: auditPath,
    ...(audit.dataset_id ? { dataset_id: audit.dataset_id } : {}),
    ...(audit.dataset_kind ? { dataset_kind: audit.dataset_kind } : {}),
    generated_at: input.generatedAt || new Date().toISOString(),
    claimable99Correctness: audit.claimable99Correctness,
    plan_status: audit.load_errors.length > 0 ? "fix_dataset_load" : audit.claimable99Correctness ? "ready_for_formal_eval" : "collect_more_real_samples",
    claim_boundary: {
      plan_is_not_correctness_evidence: true,
      no_99_claim_until_eval_claimable: true,
      requires_real_anonymized_student_materials: true,
      public_benchmarks_and_mock_sources_not_allowed: true
    },
    recommended_batch: {
      package_root_dir: packageRootDir,
      case_plan_count: plans.length,
      largest_single_target_case_count: plans.reduce((max, item) => Math.max(max, item.suggested_case_count), 0),
      plans
    }
  };
  const plan = {
    ...planWithoutReport,
    report: formatStudentLearningMaterialEvaluationSamplePlanReport(planWithoutReport)
  };
  if (input.outputPath) await writeJsonFile(path.resolve(input.outputPath), plan);
  return plan;
}

export async function generateStudentLearningMaterialEvaluationSamplePackagesFromPlanFile(
  input: GenerateStudentLearningMaterialEvaluationSamplePackagesInput
): Promise<StudentLearningMaterialEvaluationSamplePackageBatch> {
  const samplePlanPath = path.resolve(input.samplePlanPath);
  const plan = JSON.parse(await readFile(samplePlanPath, "utf8")) as StudentLearningMaterialEvaluationSamplePlan;
  const packageRootDir = input.packageRootDir || plan.recommended_batch.package_root_dir;
  const maxCasesPerPlan = input.maxCasesPerPlan ?? Number.POSITIVE_INFINITY;
  const maxTotalCases = input.maxTotalCases ?? Number.POSITIVE_INFINITY;
  const cases: StudentLearningMaterialEvaluationSamplePackageBatch["cases"] = [];
  const skippedReason = plan.plan_status === "collect_more_real_samples" ? undefined : `sample_plan_status=${plan.plan_status}`;

  if (!skippedReason) {
    for (const planItem of plan.recommended_batch.plans) {
      const caseCount = Math.min(planItem.suggested_case_count, maxCasesPerPlan, maxTotalCases - cases.length);
      for (let index = 1; index <= caseCount; index += 1) {
        const caseId = `${planItem.case_id_prefix}-${String(index).padStart(3, "0")}`;
        const packageDir = path.resolve(packageRootDir, caseId);
        const result = await generateStudentLearningMaterialEvaluationCasePackage({
          packageDir,
          caseId,
          datasetId: plan.dataset_id || "human-labeled-k12-materials",
          datasetKind: "human_labeled",
          description: buildCasePackageDescription(planItem),
          createdAt: input.createdAt
        });
        cases.push({
          ...result,
          source_plan_id: planItem.plan_id,
          source_target_id: planItem.source_target_id,
          ordinal: index
        });
      }
      if (cases.length >= maxTotalCases) break;
    }
  }

  const batchWithoutReport: Omit<StudentLearningMaterialEvaluationSamplePackageBatch, "report"> = {
    schema_version: "student_learning_material_evaluation_sample_package_batch.v0.1",
    source_sample_plan_path: samplePlanPath,
    generated_at: input.createdAt || new Date().toISOString(),
    ...(plan.dataset_id ? { dataset_id: plan.dataset_id } : {}),
    package_root_dir: packageRootDir,
    requested_plan_count: plan.recommended_batch.case_plan_count,
    generated_case_count: cases.length,
    ...(skippedReason ? { skipped_reason: skippedReason } : {}),
    claim_boundary: plan.claim_boundary,
    cases
  };
  const batch = {
    ...batchWithoutReport,
    report: formatStudentLearningMaterialEvaluationSamplePackageBatchReport(batchWithoutReport)
  };
  if (input.outputPath) await writeJsonFile(path.resolve(input.outputPath), batch);
  return batch;
}

export function formatStudentLearningMaterialEvaluationSamplePlanReport(
  plan: Omit<StudentLearningMaterialEvaluationSamplePlan, "report">
) {
  return [
    "StudentLearningMaterialEvaluation real-sample collection plan",
    `dataset.id=${plan.dataset_id || "unknown"}`,
    `dataset.kind=${plan.dataset_kind || "unknown"}`,
    `claimable99Correctness=${plan.claimable99Correctness ? "yes" : "no"}`,
    `plan.status=${plan.plan_status}`,
    `claimBoundary.planIsEvidence=no`,
    `packageRootDir=${plan.recommended_batch.package_root_dir}`,
    `casePlanCount=${plan.recommended_batch.case_plan_count}`,
    `largestSingleTargetCaseCount=${plan.recommended_batch.largest_single_target_case_count}`,
    `targets=${plan.recommended_batch.plans.map((item) => item.source_target_id).join(", ") || "none"}`,
    `artifactFocus=${formatArtifactFocus(plan.recommended_batch.plans)}`
  ].join("\n");
}

export function formatStudentLearningMaterialEvaluationSamplePackageBatchReport(
  batch: Omit<StudentLearningMaterialEvaluationSamplePackageBatch, "report">
) {
  return [
    "StudentLearningMaterialEvaluation real-sample case package batch",
    `dataset.id=${batch.dataset_id || "unknown"}`,
    `packageRootDir=${batch.package_root_dir}`,
    `requestedPlanCount=${batch.requested_plan_count}`,
    `generatedCaseCount=${batch.generated_case_count}`,
    `skippedReason=${batch.skipped_reason || "none"}`,
    `claimBoundary.planIsEvidence=no`,
    `caseIds=${batch.cases.map((item) => item.caseId).join(", ") || "none"}`
  ].join("\n");
}

function buildSamplePlanItem(
  target: StudentLearningMaterialEvaluationClaimAuditSampleTarget,
  audit: StudentLearningMaterialEvaluationClaimAudit,
  packageRootDir: string
): StudentLearningMaterialEvaluationSamplePlanItem {
  const gap = audit.gaps.find((item) => item.next_sample_target?.target_id === target.target_id);
  const suggestedCaseCount = estimateSuggestedCaseCount(target, gap);
  const remainingQuestionGoal = estimateRemainingQuestionGoal(gap);
  const caseIdPrefix = safePathSegment(target.target_id);
  const firstCaseId = `${caseIdPrefix}-001`;
  const packageDir = path.join(packageRootDir, firstCaseId);
  const datasetId = audit.dataset_id || "human-labeled-k12-materials";
  return {
    plan_id: `plan_${caseIdPrefix}`,
    source_target_id: target.target_id,
    reason: target.reason,
    suggested_case_count: suggestedCaseCount,
    ...(remainingQuestionGoal ? { minimum_question_goal: remainingQuestionGoal } : {}),
    suggested_case_attributes: target.suggested_case_attributes,
    case_id_prefix: caseIdPrefix,
    package_dir_template: path.join(packageRootDir, `${caseIdPrefix}-NNN`),
    first_case_package_command:
      `XUEMAI_EVAL_CASE_PACKAGE_DIR=${packageDir} ` +
      `XUEMAI_EVAL_CASE_ID=${firstCaseId} ` +
      `XUEMAI_EVAL_CASE_DATASET_ID=${datasetId} ` +
      "npm run generate:k12-eval-case-package",
    follow_up_commands: buildFollowUpCommands(packageDir),
    collection_requirements: buildCollectionRequirements(target),
    artifact_focus_notes: buildArtifactFocusNotes(target)
  };
}

function estimateSuggestedCaseCount(
  target: StudentLearningMaterialEvaluationClaimAuditSampleTarget,
  gap: StudentLearningMaterialEvaluationClaimAuditGap | undefined
) {
  const remaining = numericGapRemaining(gap);
  if (target.target_id === "more_cases" && remaining) return remaining;
  if (target.target_id === "more_questions" && remaining) return Math.max(1, Math.ceil(remaining / 6));
  if (target.target_id === "more_definitive_allowed_questions" && remaining) return Math.max(1, Math.ceil(remaining / 4));
  if (target.target_id === "more_teacher_review_questions" && remaining) return Math.max(1, Math.ceil(remaining / 4));
  return 1;
}

function estimateRemainingQuestionGoal(gap: StudentLearningMaterialEvaluationClaimAuditGap | undefined) {
  if (!gap) return undefined;
  if (!gap.gap_id.includes("question_count") && !gap.gap_id.includes("question_count_insufficient")) return undefined;
  return numericGapRemaining(gap);
}

function numericGapRemaining(gap: StudentLearningMaterialEvaluationClaimAuditGap | undefined) {
  if (!gap || typeof gap.current !== "number" || typeof gap.required !== "number") return undefined;
  return Math.max(0, gap.required - gap.current);
}

function buildFollowUpCommands(packageDir: string) {
  return [
    `XUEMAI_EVAL_CASE_PACKAGE_READINESS_DIR=${packageDir} npm run inspect:k12-eval-case-package`,
    "After adding each artifact, rerun inspect:k12-eval-case-package before advancing to the next generated command.",
    "After all package artifacts validate, build the asset manifest, run validate:k12-eval-assets, generate:k12-eval-dataset, audit:k12-eval-claim, then eval:k12-material."
  ];
}

function buildCollectionRequirements(target: StudentLearningMaterialEvaluationClaimAuditSampleTarget) {
  const attributes = target.suggested_case_attributes;
  return [
    "Use real anonymized mainland China K12 student materials with visible student answer, correction, teacher mark, or note traces.",
    "Do not use public benchmark, mock, synthetic, blank template, teacher resource, university, adult, vocational, international-curriculum, or exam-prep materials outside mainland K12.",
    "Keep raw images/PDFs outside the case package; only put redacted Provider adapter input and derived artifacts under the package.",
    attributes.material_type ? `Target material_type=${attributes.material_type}.` : "",
    attributes.subject ? `Target subject=${attributes.subject}.` : "",
    attributes.education_stage ? `Target education_stage=${attributes.education_stage}.` : "",
    attributes.region_or_curriculum_candidate ? `Target region_or_curriculum_candidate=${attributes.region_or_curriculum_candidate}.` : "",
    attributes.question_mix === "definitive_allowed" ? "Prefer clear same-question answer/rubric/teacher-correction basis so definitive judgement can be evaluated." : "",
    attributes.question_mix === "teacher_review_expected" ? "Include ambiguous or insufficient-evidence questions to verify teacher-review routing." : "",
    attributes.question_mix === "mixed" ? "Include both definitive-ready and teacher-review-routing questions when possible." : ""
  ].filter((item) => item.length > 0);
}

function buildArtifactFocusNotes(target: StudentLearningMaterialEvaluationClaimAuditSampleTarget) {
  const focus = target.suggested_case_attributes.artifact_focus;
  if (!focus) return ["This target is primarily about dataset coverage; still complete the full OCR/Vision, human-gold, monthly, delivery, and teacher-review chain."];
  const notes: Record<NonNullable<StudentLearningMaterialEvaluationClaimAuditSampleTarget["suggested_case_attributes"]["artifact_focus"]>, string[]> = {
    external_provider_input: ["Save normalized real OCR/Layout/Vision Provider adapter input before generating VisionEvidencePacket."],
    ocr_vision_provider_trial: ["Generate Provider trial report and fix readiness blockers before human labeling."],
    provider_candidate_trace: ["Record selected provider, fallback/benchmark candidates, evidence source URLs, and license/deployment notes."],
    provider_role_coverage: ["Cover OCR/document-parser, layout, and formula Provider roles in VisionEvidencePacket pipeline_trace."],
    question_segmentation_review: ["Generate question segmentation QA and resolve unstable boundaries or missing crop refs before definitive gold."],
    human_gold_package: ["Complete anonymized, double-labeled, adjudicated final gold package aligned to the same VisionEvidencePacket."],
    annotation_task: ["Generate redacted annotation task package without raw OCR/full text leakage."],
    annotation_import: ["Normalize Label Studio/CVAT/manual export into annotation-import.json and regenerate matching final gold package."],
    gold_label_review_report: ["Generate ready gold label review report and resolve double-label/adjudication blockers."],
    analysis_artifact: ["Generate replayable StudentLearningMaterialAnalysis artifact from validated evidence only."],
    user_result_artifact: ["Generate validated user-facing teacher report, parent feedback, and monthly result artifact."],
    monthly_report_input: ["Prepare teacher-confirmed monthly input with replayable current and previous-month source metadata."],
    monthly_report: ["Generate monthly report from confirmed input and validate comparison_evidence."],
    monthly_comparison_evidence: ["Provide replayable previous-month source ids or explicit no-baseline evidence; do not invent trends."],
    delivery_bundle: ["Generate validated teacher delivery bundle after result and monthly report."],
    teacher_review_packet: ["Generate teacher review packet so UI actions require confirmation and cannot auto-send or auto-archive."],
    replace_mock_vision_source: ["Replace mock/synthetic VisionEvidencePacket sources with real anonymized Provider output."],
    replace_public_benchmark_source: ["Replace public benchmark/source-dataset cases with real anonymized student work."],
    asset_preflight: ["Run validate:k12-eval-assets and resolve blockers before dataset generation."],
    case_artifact_provenance: ["Regenerate dataset from the preflighted asset manifest so per-case gold/analysis paths remain replayable."]
  };
  return notes[focus];
}

function buildCasePackageDescription(planItem: StudentLearningMaterialEvaluationSamplePlanItem) {
  const attrs = planItem.suggested_case_attributes;
  const details = [
    `source_target=${planItem.source_target_id}`,
    attrs.material_type ? `material_type=${attrs.material_type}` : "",
    attrs.subject ? `subject=${attrs.subject}` : "",
    attrs.education_stage ? `education_stage=${attrs.education_stage}` : "",
    attrs.region_or_curriculum_candidate ? `region_or_curriculum=${attrs.region_or_curriculum_candidate}` : "",
    attrs.question_mix ? `question_mix=${attrs.question_mix}` : "",
    attrs.artifact_focus ? `artifact_focus=${attrs.artifact_focus}` : ""
  ].filter(Boolean);
  return `Generated from claim-audit sample plan; ${details.join("; ")}. This scaffold is not correctness evidence.`;
}

function formatArtifactFocus(plans: StudentLearningMaterialEvaluationSamplePlanItem[]) {
  const entries = plans
    .filter((item) => item.suggested_case_attributes.artifact_focus)
    .map((item) => `${item.source_target_id}:${item.suggested_case_attributes.artifact_focus}`);
  return entries.join(", ") || "none";
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "_");
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
