import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDegradedAnalysis } from "../src/skills/student-learning-material-analyzer/degraded-analysis";
import { auditStudentLearningMaterialEvaluationClaimFromFile } from "../src/skills/student-learning-material-analyzer/evaluation-claim-audit-files";
import { generateStudentLearningMaterialEvaluationDatasetFromAssetsFile } from "../src/skills/student-learning-material-analyzer/evaluation-dataset-from-assets-files";
import { loadStudentLearningMaterialEvaluationDatasetBundleFromFile } from "../src/skills/student-learning-material-analyzer/evaluation-files";
import type { StudentLearningMaterialAnalysis, VisionEvidencePacket } from "../src/skills/student-learning-material-analyzer/types";

const fixtureDir = path.resolve("tests/fixtures/student-learning-material-evaluation/synthetic-asset-manifest");

describe("student learning material evaluation dataset generator from asset manifest", () => {
  it("writes an eval dataset with asset preflight metadata from a validated manifest", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-dataset-from-assets-"));
    const manifestPath = path.join(tempDir, "manifest.json");
    const datasetPath = path.join(tempDir, "dataset.json");
    const packetPath = path.join(tempDir, "vision-packet.json");
    const goldPath = path.join(tempDir, "gold-label-package.json");
    const analysisPath = path.join(tempDir, "analysis.json");

    try {
      await copyFile(path.join(fixtureDir, "vision-packet.json"), packetPath);
      await copyFile(path.join(fixtureDir, "gold-label-package.json"), goldPath);
      const packet = JSON.parse(await readFile(packetPath, "utf8")) as VisionEvidencePacket;
      await writeFile(analysisPath, `${JSON.stringify(createAnalysisForDataset(packet), null, 2)}\n`, "utf8");
      await writeFile(
        manifestPath,
        `${JSON.stringify(
          {
            fixture_schema: "student_learning_material_evaluation_assets.v0.1",
            dataset_id: "dataset-from-assets-smoke",
            dataset_kind: "human_labeled",
            description: "Synthetic asset manifest used to test dataset generation.",
            cases: [
              {
                case_id: "synthetic-asset-case-001",
                vision_packet_path: "vision-packet.json",
                gold_label_package_path: "gold-label-package.json",
                analysis_path: "analysis.json"
              }
            ]
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const result = await generateStudentLearningMaterialEvaluationDatasetFromAssetsFile({
        manifestInputPath: manifestPath,
        datasetOutputPath: datasetPath,
        checkedAt: "2026-06-20T13:00:00+08:00"
      });
      const dataset = JSON.parse(await readFile(datasetPath, "utf8"));
      const loaded = loadStudentLearningMaterialEvaluationDatasetBundleFromFile(datasetPath);
      const audit = await auditStudentLearningMaterialEvaluationClaimFromFile({ datasetPath });

      expect(result.datasetLoadOk, result.datasetLoadErrors.join("；")).toBe(true);
      expect(result.assetPreflightReady).toBe(false);
      expect(result.claimable99Correctness).toBe(false);
      expect(result.assetPreflightBlockers.join(" ")).toContain("human_labeled 资产包含 mock/synthetic Vision source");
      expect(dataset).toEqual(
        expect.objectContaining({
          fixture_schema: "student_learning_material_evaluation_dataset.v0.1",
          dataset_id: "dataset-from-assets-smoke",
          dataset_kind: "human_labeled",
          asset_preflight: expect.objectContaining({
            claimable99AssetReady: false,
            manifest_id: "dataset-from-assets-smoke",
            checked_at: "2026-06-20T13:00:00+08:00"
          })
        })
      );
      expect(dataset.cases[0]).toEqual({
        asset_manifest_case_id: "synthetic-asset-case-001",
        gold_label_package_path: "gold-label-package.json",
        analysis_path: "analysis.json"
      });
      expect(loaded.ok).toBe(true);
      expect(audit.claimable99Correctness).toBe(false);
      expect(audit.asset_preflight).toEqual(
        expect.objectContaining({
          claimable99AssetReady: false
        })
      );
      expect(audit.gaps.map((gap) => gap.gap_id)).toEqual(
        expect.arrayContaining([
          "asset_preflight_not_claim_ready",
          "asset_preflight_mock_or_synthetic_vision_source",
          "asset_preflight_external_provider_input_missing",
          "asset_preflight_provider_trial_missing_or_blocked",
          "asset_preflight_monthly_comparison_evidence_missing"
        ])
      );
      expect(audit.next_sample_targets.map((target) => target.target_id)).toEqual(
        expect.arrayContaining([
          "replace_mock_vision_sources",
          "complete_external_provider_inputs",
          "complete_provider_trial_reports",
          "complete_monthly_comparison_evidence"
        ])
      );
      expect(audit.report).toContain("assetPreflight.ready=no");
      expect(audit.report).toContain("replace_mock_vision_sources:replace_mock_vision_source");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps generated asset preflight identity aligned when overriding dataset id", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "xuemai-eval-dataset-custom-id-"));
    const manifestPath = path.join(tempDir, "manifest.json");
    const datasetPath = path.join(tempDir, "dataset.json");
    const packetPath = path.join(tempDir, "vision-packet.json");
    const goldPath = path.join(tempDir, "gold-label-package.json");
    const analysisPath = path.join(tempDir, "analysis.json");

    try {
      await copyFile(path.join(fixtureDir, "vision-packet.json"), packetPath);
      await copyFile(path.join(fixtureDir, "gold-label-package.json"), goldPath);
      const packet = JSON.parse(await readFile(packetPath, "utf8")) as VisionEvidencePacket;
      await writeFile(analysisPath, `${JSON.stringify(createAnalysisForDataset(packet), null, 2)}\n`, "utf8");
      await writeFile(
        manifestPath,
        `${JSON.stringify(
          {
            fixture_schema: "student_learning_material_evaluation_assets.v0.1",
            dataset_id: "source-asset-manifest-id",
            dataset_kind: "human_labeled",
            cases: [
              {
                case_id: "synthetic-asset-case-001",
                vision_packet_path: "vision-packet.json",
                gold_label_package_path: "gold-label-package.json",
                analysis_path: "analysis.json"
              }
            ]
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      const result = await generateStudentLearningMaterialEvaluationDatasetFromAssetsFile({
        manifestInputPath: manifestPath,
        datasetOutputPath: datasetPath,
        datasetId: "custom-eval-dataset-id",
        checkedAt: "2026-06-20T13:20:00+08:00"
      });
      const dataset = JSON.parse(await readFile(datasetPath, "utf8"));

      expect(result.datasetLoadOk, result.datasetLoadErrors.join("；")).toBe(true);
      expect(dataset).toEqual(
        expect.objectContaining({
          dataset_id: "custom-eval-dataset-id",
          asset_preflight: expect.objectContaining({
            manifest_id: "custom-eval-dataset-id",
            source_manifest_id: "source-asset-manifest-id",
            checked_at: "2026-06-20T13:20:00+08:00"
          })
        })
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("generates the eval dataset specified by env vars", async () => {
    const manifestInputPath = process.env.XUEMAI_EVAL_DATASET_ASSET_MANIFEST;
    const datasetOutputPath = process.env.XUEMAI_EVAL_DATASET_OUTPUT;

    if (!manifestInputPath || !datasetOutputPath) {
      if (process.env.XUEMAI_EVAL_DATASET_GENERATE_REQUIRED === "1") {
        throw new Error("Set XUEMAI_EVAL_DATASET_ASSET_MANIFEST=/absolute/path/to/evaluation-assets.json and XUEMAI_EVAL_DATASET_OUTPUT=/absolute/path/to/dataset.json");
      }
      expect(manifestInputPath || datasetOutputPath).toBeUndefined();
      return;
    }

    const result = await generateStudentLearningMaterialEvaluationDatasetFromAssetsFile({
      manifestInputPath,
      datasetOutputPath,
      datasetId: process.env.XUEMAI_EVAL_DATASET_ID,
      description: process.env.XUEMAI_EVAL_DATASET_DESCRIPTION,
      checkedAt: process.env.XUEMAI_EVAL_DATASET_PREFLIGHT_CHECKED_AT,
      modelUnderTest:
        process.env.XUEMAI_EVAL_MODEL_PROVIDER && process.env.XUEMAI_EVAL_MODEL_NAME
          ? {
              provider_name: process.env.XUEMAI_EVAL_MODEL_PROVIDER,
              model_name: process.env.XUEMAI_EVAL_MODEL_NAME,
              prompt_version: process.env.XUEMAI_EVAL_PROMPT_VERSION
            }
          : undefined,
      makePathsRelativeToDataset: process.env.XUEMAI_EVAL_DATASET_KEEP_MANIFEST_PATHS !== "1"
    });

    console.log(
      [
        "StudentLearningMaterialEvaluation dataset generated",
        `datasetOutputPath=${result.datasetOutputPath}`,
        `datasetId=${result.datasetId}`,
        `datasetKind=${result.datasetKind}`,
        `caseCount=${result.caseCount}`,
        `assetPreflightReady=${result.assetPreflightReady}`,
        `claimable99Correctness=${result.claimable99Correctness}`,
        `assetPreflightBlockers=${result.assetPreflightBlockers.length}`
      ].join("\n")
    );

    expect(result.datasetOutputPath).toBe(path.resolve(datasetOutputPath));
    expect(result.datasetLoadOk, result.datasetLoadErrors.join("；")).toBe(true);
  });
});

function createAnalysisForDataset(packet: VisionEvidencePacket): StudentLearningMaterialAnalysis {
  const analysis = createDegradedAnalysis({
    analysisId: "analysis-synthetic-asset-case-001",
    packet,
    reasons: ["model_output_invalid"],
    message: "Synthetic analysis artifact for dataset generation."
  });
  analysis.material_classification = {
    material_type: "exam",
    subject: "数学",
    education_stage: "middle",
    grade_candidate: "初二",
    region_or_curriculum_candidate: "未识别",
    classification_confidence: 0.9,
    evidenceRefs: ["synthetic.asset.q001.stem"]
  };
  analysis.teacher_professional_report.report_title = "初二数学试卷专业测评型学情报告";
  analysis.monthly_report_snapshot.subject = "数学";
  analysis.monthly_report_snapshot.material_type = "exam";
  return analysis;
}
