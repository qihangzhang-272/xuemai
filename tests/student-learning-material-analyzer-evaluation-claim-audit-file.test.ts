import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditStudentLearningMaterialEvaluationClaimFromFile,
  type StudentLearningMaterialEvaluationClaimAudit
} from "../src/skills/student-learning-material-analyzer/evaluation-claim-audit-files";
import type { StudentLearningMaterialEvaluationDatasetFile } from "../src/skills/student-learning-material-analyzer/evaluation-files";

const syntheticDatasetPath = path.resolve("tests/fixtures/student-learning-material-evaluation/synthetic-smoke-dataset.json");

describe("student learning material evaluation claim audit", () => {
  it("turns a synthetic smoke dataset into structured 99% claim gaps", async () => {
    const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({
      datasetPath: syntheticDatasetPath
    });

    expect(audit.claimable99Correctness).toBe(false);
    expect(audit.gaps.map((gap) => gap.gap_id)).toEqual(
      expect.arrayContaining([
        "dataset_kind_not_human_labeled",
        "case_count_insufficient",
        "question_count_insufficient",
        "material_type_coverage_insufficient",
        "subject_coverage_insufficient",
        "region_or_curriculum_coverage_insufficient",
        "region_or_curriculum_group_coverage_insufficient",
        "curriculum_version_family_coverage_insufficient",
        "exam_scope_signal_missing",
        "asset_preflight_not_claim_ready"
      ])
    );
    expect(audit.next_sample_targets.map((target) => target.target_id)).toEqual(
      expect.arrayContaining([
        "more_cases",
        "more_questions",
        "collect_material_type_homework",
        "collect_subject_语文",
        "collect_region_group_华北",
        "collect_curriculum_family_国家统编_部编",
        "collect_exam_scope_全国卷"
      ])
    );
    expect(audit.report).toContain("claimable99Correctness=no");
    expect(audit.report).toContain("claimPolicy.requirements=");
    expect(audit.report).toContain("minimumRegionOrCurriculumGroups:4");
    expect(audit.report).toContain("minimumCurriculumVersionFamilies:2");
    expect(audit.report).toContain("requireExamScopeSignal:true");
    expect(audit.report).toContain("coverage.regionOrCurriculumGroups=");
    expect(audit.report).toContain("coverage.curriculumVersionFamilies=");
    expect(audit.report).toContain("coverage.examScopeSignals=");
    expect(audit.report).toContain("gaps=");
  });

  it("keeps asset preflight blockers visible in the audit", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-claim-audit-"));
    try {
      const datasetPath = path.join(tempDir, "dataset.json");
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
          "Provider 试跑报告覆盖不足：providerTrial 0 < cases 1。",
          "人工标注导入 artifact 覆盖不足：annotationImport 0 < cases 1。",
          "月报输入 artifact 覆盖不足：monthlyReportInput 0 < cases 1。",
          "月报上月对比证据覆盖不足：monthlyComparisonEvidence 0 < cases 1。",
          "老师复核包 artifact 覆盖不足：teacherReviewPacket 0 < cases 1。"
        ]
      };
      await writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

      const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({ datasetPath });

      expect(audit.asset_preflight).toEqual(
        expect.objectContaining({
          claimable99AssetReady: false,
          blockers: [
            "外部 Provider 输入 artifact 覆盖不足：externalVisionInput 0 < cases 1。",
            "Provider 试跑报告覆盖不足：providerTrial 0 < cases 1。",
            "人工标注导入 artifact 覆盖不足：annotationImport 0 < cases 1。",
            "月报输入 artifact 覆盖不足：monthlyReportInput 0 < cases 1。",
            "月报上月对比证据覆盖不足：monthlyComparisonEvidence 0 < cases 1。",
            "老师复核包 artifact 覆盖不足：teacherReviewPacket 0 < cases 1。"
          ]
        })
      );
      expect(audit.gaps.map((gap) => gap.gap_id)).toEqual(
        expect.arrayContaining([
          "asset_preflight_not_claim_ready",
          "asset_preflight_external_provider_input_missing",
          "asset_preflight_provider_trial_missing_or_blocked",
          "asset_preflight_annotation_import_missing_or_mismatched",
          "asset_preflight_monthly_report_input_missing",
          "asset_preflight_monthly_comparison_evidence_missing",
          "asset_preflight_teacher_review_packet_missing"
        ])
      );
      expect(audit.next_sample_targets.map((target) => target.target_id)).toEqual(
        expect.arrayContaining([
          "complete_provider_trial_reports",
          "complete_external_provider_inputs",
          "complete_annotation_imports",
          "complete_monthly_report_inputs",
          "complete_monthly_comparison_evidence",
          "complete_teacher_review_packets"
        ])
      );
      expect(audit.next_sample_targets.find((target) => target.target_id === "complete_annotation_imports")?.suggested_case_attributes).toEqual(
        expect.objectContaining({
          artifact_focus: "annotation_import"
        })
      );
      expect(audit.next_sample_targets.find((target) => target.target_id === "complete_external_provider_inputs")?.suggested_case_attributes).toEqual(
        expect.objectContaining({
          artifact_focus: "external_provider_input"
        })
      );
      expect(audit.report).toContain("artifactFocusTargets=");
      expect(audit.report).toContain("complete_external_provider_inputs:external_provider_input");
      expect(audit.report).toContain("complete_provider_trial_reports:ocr_vision_provider_trial");
      expect(audit.report).toContain("complete_annotation_imports:annotation_import");
      expect(audit.report).toContain("complete_monthly_report_inputs:monthly_report_input");
      expect(audit.report).toContain("complete_monthly_comparison_evidence:monthly_comparison_evidence");
      expect(audit.report).toContain("complete_teacher_review_packets:teacher_review_packet");
      expect(audit.dataset_warnings.join(" ")).toContain("Provider 试跑报告覆盖不足");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("does not confuse missing monthly report input with a missing monthly report output", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-claim-audit-monthly-input-"));
    try {
      const datasetPath = path.join(tempDir, "dataset.json");
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
        blockers: ["月报输入 artifact 覆盖不足：monthlyReportInput 0 < cases 1。"]
      };
      await writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

      const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({ datasetPath });

      expect(audit.gaps.map((gap) => gap.gap_id)).toContain("asset_preflight_monthly_report_input_missing");
      expect(audit.gaps.map((gap) => gap.gap_id)).not.toContain("asset_preflight_monthly_report_missing");
      expect(audit.next_sample_targets.map((target) => target.target_id)).toContain("complete_monthly_report_inputs");
      expect(audit.report).toContain("complete_monthly_report_inputs:monthly_report_input");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("turns public benchmark source blockers into replacement targets", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-claim-audit-public-benchmark-"));
    try {
      const datasetPath = path.join(tempDir, "dataset.json");
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
          "human_labeled 资产包含 public benchmark/source dataset：case-k12vista-001。公开 benchmark 只能作覆盖参考，不能替代真实脱敏学生材料 gold。"
        ]
      };
      await writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

      const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({ datasetPath });

      expect(audit.gaps.map((gap) => gap.gap_id)).toContain("asset_preflight_public_benchmark_source");
      expect(audit.next_sample_targets.map((target) => target.target_id)).toContain("replace_public_benchmark_sources");
      expect(
        audit.next_sample_targets.find((target) => target.target_id === "replace_public_benchmark_sources")?.suggested_case_attributes
      ).toEqual(
        expect.objectContaining({
          artifact_focus: "replace_public_benchmark_source"
        })
      );
      expect(audit.report).toContain("replace_public_benchmark_sources:replace_public_benchmark_source");
      expect(audit.dataset_warnings.join(" ")).toContain("public benchmark/source dataset");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("turns provider role coverage blockers into a provider trace completion target", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-claim-audit-provider-role-"));
    try {
      const datasetPath = path.join(tempDir, "dataset.json");
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
          "Provider 公式识别候选覆盖不足：formula 0 < cases 1。",
          "coverage.providerRoleCoverage=documentOrOcr:1, layout:1, formula:0"
        ]
      };
      await writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

      const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({ datasetPath });

      expect(audit.gaps.map((gap) => gap.gap_id)).toContain("asset_preflight_provider_role_coverage_missing");
      expect(audit.next_sample_targets.map((target) => target.target_id)).toContain("complete_provider_role_coverage");
      expect(audit.next_sample_targets.find((target) => target.target_id === "complete_provider_role_coverage")?.suggested_case_attributes).toEqual(
        expect.objectContaining({
          artifact_focus: "provider_role_coverage"
        })
      );
      expect(audit.report).toContain("complete_provider_role_coverage:provider_role_coverage");
      expect(audit.dataset_warnings.join(" ")).toContain("Provider 公式识别候选覆盖不足");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("turns missing case artifact provenance into a dataset regeneration target", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-claim-audit-provenance-"));
    try {
      const datasetPath = path.join(tempDir, "dataset.json");
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
      await writeFile(datasetPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

      const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({
        datasetPath,
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

      expect(audit.claimable99Correctness).toBe(false);
      expect(audit.gaps.map((gap) => gap.gap_id)).toContain("asset_preflight_case_artifact_provenance_missing");
      expect(audit.next_sample_targets.map((target) => target.target_id)).toContain("regenerate_dataset_from_asset_manifest");
      expect(audit.report).toContain("regenerate_dataset_from_asset_manifest:case_artifact_provenance");
      expect(audit.dataset_warnings.join(" ")).toContain("asset manifest case provenance");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("can write a passing audit under an explicit tiny local policy", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-claim-audit-pass-"));
    try {
      const datasetPath = path.join(tempDir, "dataset.json");
      const outputPath = path.join(tempDir, "claim-audit.json");
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

      const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({
        datasetPath,
        outputPath,
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
      const written = JSON.parse(await readFile(outputPath, "utf8")) as StudentLearningMaterialEvaluationClaimAudit;

      expect(audit.claimable99Correctness).toBe(true);
      expect(audit.gaps).toEqual([]);
      expect(audit.next_sample_targets).toEqual([]);
      expect(written.dataset_id).toBe("human-labeled-local-policy");
      expect(written.claimable99Correctness).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("audits the dataset specified by env vars", async () => {
    const datasetPath = process.env.XUEMAI_EVAL_CLAIM_AUDIT_DATASET;

    if (!datasetPath) {
      if (process.env.XUEMAI_EVAL_CLAIM_AUDIT_REQUIRED === "1") {
        throw new Error("Set XUEMAI_EVAL_CLAIM_AUDIT_DATASET=/absolute/path/to/student-learning-material-evaluation-dataset.json");
      }
      expect(datasetPath).toBeUndefined();
      return;
    }

    const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({
      datasetPath,
      outputPath: process.env.XUEMAI_EVAL_CLAIM_AUDIT_OUTPUT
    });

    console.log(`\n${audit.report}`);
    expect(audit.load_errors).toEqual([]);
    if (process.env.XUEMAI_EVAL_CLAIM_AUDIT_REQUIRE_CLAIMABLE === "1") {
      expect(audit.claimable99Correctness, audit.report).toBe(true);
    }
  });
});
