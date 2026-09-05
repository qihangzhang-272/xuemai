import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditStudentLearningMaterialEvaluationClaimFromFile
} from "../src/skills/student-learning-material-analyzer/evaluation-claim-audit-files";
import {
  generateStudentLearningMaterialEvaluationSamplePackagesFromPlanFile,
  generateStudentLearningMaterialEvaluationSamplePlanFromAuditFile,
  type StudentLearningMaterialEvaluationSamplePackageBatch,
  type StudentLearningMaterialEvaluationSamplePlan
} from "../src/skills/student-learning-material-analyzer/evaluation-sample-plan-files";
import type { StudentLearningMaterialEvaluationDatasetFile } from "../src/skills/student-learning-material-analyzer/evaluation-files";

const syntheticDatasetPath = path.resolve("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json");

describe("student learning material evaluation sample plan", () => {
  it("turns claim audit targets into a real-sample collection batch plan", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-sample-plan-"));
    try {
      const auditPath = path.join(tempDir, "claim-audit.json");
      const outputPath = path.join(tempDir, "sample-plan.json");
      const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({
        datasetPath: syntheticDatasetPath,
        outputPath: auditPath
      });

      const plan = await generateStudentLearningMaterialEvaluationSamplePlanFromAuditFile({
        auditPath,
        outputPath,
        packageRootDir: "real-samples/k12-claim",
        generatedAt: "2026-06-20T18:30:00+08:00"
      });
      const written = JSON.parse(await readFile(outputPath, "utf8")) as StudentLearningMaterialEvaluationSamplePlan;

      expect(audit.claimable99Correctness).toBe(false);
      expect(plan.schema_version).toBe("student_learning_material_evaluation_sample_plan.v0.1");
      expect(plan.claimable99Correctness).toBe(false);
      expect(plan.plan_status).toBe("collect_more_real_samples");
      expect(plan.claim_boundary).toEqual({
        plan_is_not_correctness_evidence: true,
        no_99_claim_until_eval_claimable: true,
        requires_real_anonymized_student_materials: true,
        public_benchmarks_and_mock_sources_not_allowed: true
      });
      expect(plan.recommended_batch.package_root_dir).toBe("real-samples/k12-claim");
      expect(plan.recommended_batch.plans.map((item) => item.source_target_id)).toEqual(
        expect.arrayContaining(["more_cases", "more_questions", "collect_material_type_homework", "collect_subject_语文"])
      );
      const moreCases = plan.recommended_batch.plans.find((item) => item.source_target_id === "more_cases");
      expect(moreCases?.suggested_case_count).toBeGreaterThan(1);
      expect(moreCases?.first_case_package_command).toContain("npm run generate:k12-eval-case-package");
      expect(moreCases?.follow_up_commands.join("\n")).toContain("inspect:k12-eval-case-package");
      expect(moreCases?.collection_requirements.join("\n")).toContain("real anonymized mainland China K12 student materials");
      expect(moreCases?.collection_requirements.join("\n")).toContain("Do not use public benchmark");
      expect(written.report).toContain("plan.status=collect_more_real_samples");
      expect(written.report).toContain("claimBoundary.planIsEvidence=no");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps asset-focused targets actionable without turning them into correctness evidence", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-sample-plan-assets-"));
    try {
      const datasetPath = path.join(tempDir, "dataset.json");
      const auditPath = path.join(tempDir, "claim-audit.json");
      const dataset = JSON.parse(await readFile(syntheticDatasetPath, "utf8")) as StudentLearningMaterialEvaluationDatasetFile;
      dataset.dataset_kind = "human_labeled";
      dataset.review_protocol = {
        double_labeled: true,
        adjudicated: true,
        anonymized: true,
        reviewer_roles: ["教研标注员", "授课老师"]
      };
      dataset.asset_preflight = {
        claimable99AssetReady: false,
        blockers: [
          "外部 Provider 输入 artifact 覆盖不足：externalVisionInput 0 < cases 1。",
          "月报上月对比证据覆盖不足：monthlyComparisonEvidence 0 < cases 1。",
          "老师复核包 artifact 覆盖不足：teacherReviewPacket 0 < cases 1。",
          "human_labeled 资产仍包含 mock/synthetic Vision source，不能支撑 99% claim。"
        ]
      };
      await writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
      await auditStudentLearningMaterialEvaluationClaimFromFile({ datasetPath, outputPath: auditPath });

      const plan = await generateStudentLearningMaterialEvaluationSamplePlanFromAuditFile({
        auditPath,
        packageRootDir: "real-samples/asset-fixes"
      });

      expect(plan.recommended_batch.plans.map((item) => item.source_target_id)).toEqual(
        expect.arrayContaining([
          "complete_external_provider_inputs",
          "complete_monthly_comparison_evidence",
          "complete_teacher_review_packets",
          "replace_mock_vision_sources"
        ])
      );
      expect(plan.recommended_batch.plans.find((item) => item.source_target_id === "complete_external_provider_inputs")?.artifact_focus_notes.join("\n")).toContain(
        "Provider adapter input"
      );
      expect(plan.recommended_batch.plans.find((item) => item.source_target_id === "complete_monthly_comparison_evidence")?.artifact_focus_notes.join("\n")).toContain(
        "previous-month source ids"
      );
      expect(plan.recommended_batch.plans.find((item) => item.source_target_id === "complete_teacher_review_packets")?.artifact_focus_notes.join("\n")).toContain(
        "cannot auto-send or auto-archive"
      );
      expect(plan.recommended_batch.plans.find((item) => item.source_target_id === "replace_mock_vision_sources")?.collection_requirements.join("\n")).toContain(
        "Do not use public benchmark"
      );
      expect(plan.report).toContain("artifactFocus=");
      expect(plan.claim_boundary.no_99_claim_until_eval_claimable).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes an empty collection plan when the audit is already claimable under the supplied policy", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-sample-plan-pass-"));
    try {
      const datasetPath = path.join(tempDir, "dataset.json");
      const auditPath = path.join(tempDir, "claim-audit.json");
      const dataset = JSON.parse(await readFile(syntheticDatasetPath, "utf8")) as StudentLearningMaterialEvaluationDatasetFile;
      dataset.dataset_id = "human-labeled-local-policy";
      dataset.dataset_kind = "human_labeled";
      dataset.review_protocol = {
        double_labeled: true,
        adjudicated: true,
        anonymized: true,
        reviewer_roles: ["教研标注员", "授课老师"]
      };
      dataset.asset_preflight = {
        claimable99AssetReady: true,
        manifest_id: "human-labeled-local-policy",
        checked_at: "2026-06-20T00:00:00+08:00",
        blockers: []
      };
      dataset.cases = dataset.cases.map((caseItem, index) => {
        if ("gold" in caseItem && "analysis" in caseItem) {
          return {
            gold: caseItem.gold,
            analysis: caseItem.analysis,
            asset_manifest_case_id: `human-labeled-local-policy-case-${index + 1}`,
            gold_label_package_path: `human-review/case-${index + 1}/gold-label-package.json`,
            analysis_path: `artifacts/case-${index + 1}/analysis.json`
          };
        }
        return caseItem;
      });
      await writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
      await auditStudentLearningMaterialEvaluationClaimFromFile({
        datasetPath,
        outputPath: auditPath,
        claimPolicy: {
          minimum_case_count: 1,
          minimum_question_count: 2,
          minimum_definitive_allowed_question_count: 1,
          minimum_teacher_review_expected_question_count: 1,
          minimum_material_type_count: 1,
          minimum_subject_count: 1,
          required_education_stages: ["middle"],
          minimum_region_or_curriculum_count: 1,
          require_human_labeled_dataset: true,
          require_double_labeled: true,
          require_adjudicated: true,
          require_anonymized: true,
          require_asset_preflight_ready: true
        }
      });

      const plan = await generateStudentLearningMaterialEvaluationSamplePlanFromAuditFile({ auditPath });

      expect(plan.claimable99Correctness).toBe(true);
      expect(plan.plan_status).toBe("ready_for_formal_eval");
      expect(plan.recommended_batch.case_plan_count).toBe(0);
      expect(plan.recommended_batch.plans).toEqual([]);
      expect(plan.report).toContain("targets=none");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("can generate privacy-safe case package scaffolds from a sample plan", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-sample-packages-"));
    try {
      const auditPath = path.join(tempDir, "claim-audit.json");
      const samplePlanPath = path.join(tempDir, "sample-plan.json");
      const batchPath = path.join(tempDir, "sample-package-batch.json");
      await auditStudentLearningMaterialEvaluationClaimFromFile({
        datasetPath: syntheticDatasetPath,
        outputPath: auditPath
      });
      await generateStudentLearningMaterialEvaluationSamplePlanFromAuditFile({
        auditPath,
        outputPath: samplePlanPath,
        packageRootDir: path.join(tempDir, "real-samples"),
        generatedAt: "2026-06-20T19:00:00+08:00"
      });

      const batch = await generateStudentLearningMaterialEvaluationSamplePackagesFromPlanFile({
        samplePlanPath,
        outputPath: batchPath,
        createdAt: "2026-06-20T19:05:00+08:00",
        maxCasesPerPlan: 1,
        maxTotalCases: 2
      });
      const written = JSON.parse(await readFile(batchPath, "utf8")) as StudentLearningMaterialEvaluationSamplePackageBatch;
      const firstCase = batch.cases[0];
      const firstPackage = JSON.parse(await readFile(firstCase.casePackagePath, "utf8")) as {
        case_id: string;
        dataset_kind: string;
        description: string;
        privacy_boundary: {
          raw_student_materials_allowed_in_package: boolean;
          do_not_commit_raw_student_materials: boolean;
        };
        artifact_paths: {
          external_vision_input_path: string;
          monthly_report_input_path: string;
          teacher_review_packet_path: string;
        };
        helper_paths: {
          external_vision_input_template_path: string;
        };
        command_sequence: Array<{ step_id: string }>;
      };
      const firstTemplate = JSON.parse(await readFile(firstCase.externalVisionInputTemplatePath, "utf8")) as {
        privacy_boundary: {
          template_is_not_claim_evidence: boolean;
          do_not_copy_raw_student_materials_into_package: boolean;
        };
      };

      expect(batch.generated_case_count).toBe(2);
      expect(batch.claim_boundary.plan_is_not_correctness_evidence).toBe(true);
      expect(batch.report).toContain("claimBoundary.planIsEvidence=no");
      expect(written.generated_case_count).toBe(2);
      expect(firstCase.source_target_id).toBeTruthy();
      expect(firstPackage.case_id).toBe(firstCase.caseId);
      expect(firstPackage.dataset_kind).toBe("human_labeled");
      expect(firstPackage.description).toContain("This scaffold is not correctness evidence");
      expect(firstPackage.privacy_boundary.raw_student_materials_allowed_in_package).toBe(false);
      expect(firstPackage.privacy_boundary.do_not_commit_raw_student_materials).toBe(true);
      expect(firstPackage.artifact_paths.external_vision_input_path).toBe("provider/external-vision-input.json");
      expect(firstPackage.artifact_paths.monthly_report_input_path).toBe("human-review/monthly-report-input.json");
      expect(firstPackage.artifact_paths.teacher_review_packet_path).toBe("artifacts/teacher-review-packet.json");
      expect(firstPackage.helper_paths.external_vision_input_template_path).toBe("provider/external-vision-input.template.json");
      expect(firstPackage.command_sequence.map((step) => step.step_id)).toContain("evaluation_asset_manifest");
      expect(firstTemplate.privacy_boundary.template_is_not_claim_evidence).toBe(true);
      expect(firstTemplate.privacy_boundary.do_not_copy_raw_student_materials_into_package).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("does not generate package scaffolds when the sample plan is already claimable", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-sample-packages-empty-"));
    try {
      const samplePlanPath = path.join(tempDir, "sample-plan.json");
      const plan: StudentLearningMaterialEvaluationSamplePlan = {
        schema_version: "student_learning_material_evaluation_sample_plan.v0.1",
        source_audit_path: path.join(tempDir, "claim-audit.json"),
        dataset_id: "human-labeled-local-policy",
        dataset_kind: "human_labeled",
        generated_at: "2026-06-20T19:10:00+08:00",
        claimable99Correctness: true,
        plan_status: "ready_for_formal_eval",
        claim_boundary: {
          plan_is_not_correctness_evidence: true,
          no_99_claim_until_eval_claimable: true,
          requires_real_anonymized_student_materials: true,
          public_benchmarks_and_mock_sources_not_allowed: true
        },
        recommended_batch: {
          package_root_dir: path.join(tempDir, "real-samples"),
          case_plan_count: 0,
          largest_single_target_case_count: 0,
          plans: []
        },
        report: "ready"
      };
      await writeFile(samplePlanPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

      const batch = await generateStudentLearningMaterialEvaluationSamplePackagesFromPlanFile({ samplePlanPath });

      expect(batch.generated_case_count).toBe(0);
      expect(batch.skipped_reason).toBe("sample_plan_status=ready_for_formal_eval");
      expect(batch.cases).toEqual([]);
      expect(batch.report).toContain("generatedCaseCount=0");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates a sample plan from the audit specified by env vars", async () => {
    const auditPath = process.env.XUEMAI_EVAL_SAMPLE_PLAN_AUDIT;

    if (!auditPath) {
      if (process.env.XUEMAI_EVAL_SAMPLE_PLAN_REQUIRED === "1") {
        throw new Error("Set XUEMAI_EVAL_SAMPLE_PLAN_AUDIT=/absolute/path/to/claim-audit.json");
      }
      expect(auditPath).toBeUndefined();
      return;
    }

    const plan = await generateStudentLearningMaterialEvaluationSamplePlanFromAuditFile({
      auditPath,
      outputPath: process.env.XUEMAI_EVAL_SAMPLE_PLAN_OUTPUT,
      packageRootDir: process.env.XUEMAI_EVAL_SAMPLE_PLAN_PACKAGE_ROOT
    });

    console.log(`\n${plan.report}`);
    expect(plan.schema_version).toBe("student_learning_material_evaluation_sample_plan.v0.1");
  });

  it("generates sample packages from the sample plan specified by env vars", async () => {
    const samplePlanPath = process.env.XUEMAI_EVAL_SAMPLE_PACKAGE_PLAN;

    if (!samplePlanPath) {
      if (process.env.XUEMAI_EVAL_SAMPLE_PACKAGE_REQUIRED === "1") {
        throw new Error("Set XUEMAI_EVAL_SAMPLE_PACKAGE_PLAN=/absolute/path/to/sample-plan.json");
      }
      expect(samplePlanPath).toBeUndefined();
      return;
    }

    const batch = await generateStudentLearningMaterialEvaluationSamplePackagesFromPlanFile({
      samplePlanPath,
      outputPath: process.env.XUEMAI_EVAL_SAMPLE_PACKAGE_OUTPUT,
      packageRootDir: process.env.XUEMAI_EVAL_SAMPLE_PACKAGE_ROOT,
      maxCasesPerPlan: readOptionalNumber(process.env.XUEMAI_EVAL_SAMPLE_PACKAGE_MAX_CASES_PER_PLAN),
      maxTotalCases: readOptionalNumber(process.env.XUEMAI_EVAL_SAMPLE_PACKAGE_MAX_TOTAL_CASES)
    });

    console.log(`\n${batch.report}`);
    expect(batch.schema_version).toBe("student_learning_material_evaluation_sample_package_batch.v0.1");
  });
});

function readOptionalNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
